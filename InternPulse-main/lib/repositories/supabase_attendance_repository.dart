import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/supabase_auth_service.dart';
import '../core/network/network_retry.dart';
import '../models/attendance_model.dart';
import 'attendance_repository.dart';

class SupabaseAttendanceRepository implements AttendanceRepository {
  final SupabaseClient? _client;

  SupabaseAttendanceRepository([SupabaseClient? client])
      : _client = client ?? SupabaseAuthService().client;

  SupabaseClient get _ensureClient {
    final c = _client ?? SupabaseAuthService().client;
    if (c == null) {
      throw const ServerException('Backend database connection is not available.');
    }
    return c;
  }

  @override
  Future<List<AttendanceModel>> getAttendanceHistory(
    String studentId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      var query = client
          .from('attendance_sessions')
          .select()
          .eq('student_id', studentId);

      if (startDate != null) {
        query = query.gte('session_date', startDate.toIso8601String().split('T').first);
      }
      if (endDate != null) {
        query = query.lte('session_date', endDate.toIso8601String().split('T').first);
      }

      final res = await query.order('session_date', ascending: false);
      final list = res as List<dynamic>;

      return list.map((item) => AttendanceModel.fromMap(item, item['id'] ?? '')).toList();
    }, operationName: 'getAttendanceHistory');
  }

  @override
  Future<AttendanceModel?> getTodayAttendance(String studentId) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final todayStr = DateTime.now().toIso8601String().split('T').first;

      final res = await client
          .from('attendance_sessions')
          .select()
          .eq('student_id', studentId)
          .eq('session_date', todayStr)
          .maybeSingle();

      if (res == null) return null;
      return AttendanceModel.fromMap(res, res['id'] ?? '');
    }, operationName: 'getTodayAttendance');
  }

  @override
  Future<AttendanceModel> checkIn({
    required String studentId,
    required String assignmentId,
    String? locationId,
    double? latitude,
    double? longitude,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final todayStr = DateTime.now().toIso8601String().split('T').first;
      final nowIso = DateTime.now().toIso8601String();

      final res = await client
          .from('attendance_sessions')
          .insert({
            'student_id': studentId,
            'assignment_id': assignmentId,
            'session_date': todayStr,
            'check_in_at': nowIso,
            'check_in_location_id': locationId,
            'status': 'present',
            'is_verified': false,
            'notes': 'Mobile check-in submitted',
          })
          .select()
          .single();

      return AttendanceModel.fromMap(res, res['id'] ?? '');
    }, operationName: 'checkIn');
  }

  @override
  Future<AttendanceModel> checkOut({
    required String sessionId,
    String? locationId,
    double? latitude,
    double? longitude,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final nowIso = DateTime.now().toIso8601String();

      final res = await client
          .from('attendance_sessions')
          .update({
            'check_out_at': nowIso,
            'check_out_location_id': locationId,
            'updated_at': nowIso,
          })
          .eq('id', sessionId)
          .select()
          .single();

      return AttendanceModel.fromMap(res, res['id'] ?? sessionId);
    }, operationName: 'checkOut');
  }

  @override
  Stream<List<AttendanceModel>> watchAttendanceHistory(String studentId) {
    try {
      final client = _ensureClient;
      return client
          .from('attendance_sessions')
          .stream(primaryKey: ['id'])
          .eq('student_id', studentId)
          .order('session_date', ascending: false)
          .map((list) => list.map((item) => AttendanceModel.fromMap(item, item['id'] ?? '')).toList());
    } catch (e) {
      debugPrint('[SupabaseAttendanceRepository] Stream fallback notice: $e');
      return Stream.fromFuture(getAttendanceHistory(studentId));
    }
  }
}

