import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/supabase_auth_service.dart';
import '../core/geolocation/geolocation_types.dart';
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
    required double? latitude,
    required double? longitude,
    double? accuracyMeters,
    double? distanceMeters,
    double? geofenceRadiusMeters,
    VerificationResultState? verificationResult,
    ConnectivityStatus? connectivityStatus,
    BatteryOptimizationStatus? batteryOptimizationStatus,
    bool consentVerified = true,
    bool withinMonitoringWindow = true,
    String? locationId,
    String? sessionId,
    bool isMockLocation = false,
    Map<String, dynamic>? deviceMetadata,
    String? remarks,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final nowIso = DateTime.now().toIso8601String();

      final resultState = verificationResult ??
          (isMockLocation
              ? VerificationResultState.verificationPending
              : (latitude != null && longitude != null
                  ? VerificationResultState.withinGeofence
                  : VerificationResultState.locationUnavailable));

      final payload = <String, dynamic>{
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
        'distance_to_center_meters': distanceMeters,
        'geofence_radius_meters': geofenceRadiusMeters,
        'verification_result': resultState.toDbString(),
        'connectivity_status': (connectivityStatus ?? ConnectivityStatus.wifi).toDbString(),
        'battery_optimization_status':
            (batteryOptimizationStatus ?? BatteryOptimizationStatus.optimized).toDbString(),
        'consent_verified': consentVerified,
        'within_monitoring_window': withinMonitoringWindow,
        'is_mock_location': isMockLocation,
        'device_metadata': deviceMetadata ?? {},
        'remarks': remarks,
        'status': isMockLocation
            ? 'spoof_detected'
            : (resultState == VerificationResultState.withinGeofence ? 'verified' : 'pending'),
      };

      final res = await client
          .from('location_verifications')
          .insert(payload)
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
