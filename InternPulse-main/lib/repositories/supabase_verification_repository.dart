import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/supabase_auth_service.dart';
import '../core/network/network_retry.dart';
import '../models/location_verification_model.dart';
import 'verification_repository.dart';

class SupabaseVerificationRepository implements VerificationRepository {
  final SupabaseClient? _client;

  SupabaseVerificationRepository([SupabaseClient? client])
      : _client = client ?? SupabaseAuthService().client;

  SupabaseClient get _ensureClient {
    final c = _client ?? SupabaseAuthService().client;
    if (c == null) {
      throw const ServerException('Backend database connection is not available.');
    }
    return c;
  }

  @override
  Future<List<LocationVerificationModel>> getVerificationHistory(
    String studentId, {
    int limit = 50,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      final res = await client
          .from('location_verifications')
          .select()
          .eq('student_id', studentId)
          .order('created_at', ascending: false)
          .limit(limit);

      final list = res as List<dynamic>;
      return list.map((item) => LocationVerificationModel.fromMap(item, item['id'] ?? '')).toList();
    }, operationName: 'getVerificationHistory');
  }

  @override
  Future<LocationVerificationModel> recordVerification({
    required String assignmentId,
    required String studentId,
    required String eventType,
    required double latitude,
    required double longitude,
    double? accuracyMeters,
    String? locationId,
    String? sessionId,
    bool isMockLocation = false,
    Map<String, dynamic>? deviceMetadata,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final nowIso = DateTime.now().toIso8601String();

      final res = await client
          .from('location_verifications')
          .insert({
            'assignment_id': assignmentId,
            'student_id': studentId,
            'session_id': sessionId,
            'location_id': locationId,
            'event_type': eventType,
            'requested_at': nowIso,
            'responded_at': nowIso,
            'captured_latitude': latitude,
            'captured_longitude': longitude,
            'accuracy_meters': accuracyMeters,
            'is_mock_location': isMockLocation,
            'device_metadata': deviceMetadata ?? {},
            'status': isMockLocation ? 'spoof_detected' : 'pending',
          })
          .select()
          .single();

      return LocationVerificationModel.fromMap(res, res['id'] ?? '');
    }, operationName: 'recordVerification');
  }

  @override
  Stream<List<LocationVerificationModel>> watchVerifications(String studentId) {
    try {
      final client = _ensureClient;
      return client
          .from('location_verifications')
          .stream(primaryKey: ['id'])
          .eq('student_id', studentId)
          .order('created_at', ascending: false)
          .map((list) => list.map((item) => LocationVerificationModel.fromMap(item, item['id'] ?? '')).toList());
    } catch (e) {
      debugPrint('[SupabaseVerificationRepository] Stream fallback note: $e');
      return Stream.fromFuture(getVerificationHistory(studentId));
    }
  }
}

