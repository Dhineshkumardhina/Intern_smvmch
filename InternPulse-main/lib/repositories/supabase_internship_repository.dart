import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/supabase_auth_service.dart';
import '../core/constants/status_constants.dart';
import '../core/network/network_retry.dart';
import '../models/internship_model.dart';
import '../models/location_model.dart';
import 'internship_repository.dart';

class SupabaseInternshipRepository implements InternshipRepository {
  final SupabaseClient? _client;

  SupabaseInternshipRepository([SupabaseClient? client])
      : _client = client ?? SupabaseAuthService().client;

  SupabaseClient get _ensureClient {
    final c = _client ?? SupabaseAuthService().client;
    if (c == null) {
      throw const ServerException('Backend database connection is not available.');
    }
    return c;
  }

  @override
  Future<InternshipModel?> getActiveAssignment(String studentId) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      // First query active assignment by student_id or profile_id
      final res = await client
          .from('internship_assignments')
          .select('''
            *,
            internship_locations (
              id,
              location_name,
              company_name,
              address,
              latitude,
              longitude,
              geofence_radius_meters,
              monitoring_start_time,
              monitoring_end_time
            )
          ''')
          .or('student_id.eq.$studentId')
          .eq('status', 'active')
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (res == null) return null;

      final locData = res['internship_locations'] as Map<String, dynamic>?;

      return InternshipModel(
        id: res['id'] ?? '',
        studentId: studentId,
        companyName: locData?['company_name'] ?? res['company_name'] ?? res['role_title'] ?? 'Host Organization',
        role: res['role_title'] ?? 'Intern',
        description: res['notes'] ?? 'Institutional Internship Placement',
        startDate: DateTime.tryParse(res['start_date']?.toString() ?? '') ?? DateTime.now(),
        endDate: DateTime.tryParse(res['end_date']?.toString() ?? '') ?? DateTime.now().add(const Duration(days: 180)),
        mentorId: res['mentor_id'],
        status: res['status'] == 'active' ? InternshipStatus.onTrack : InternshipStatus.completed,
        overallProgress: 0.0,
        createdAt: DateTime.tryParse(res['created_at']?.toString() ?? '') ?? DateTime.now(),
        updatedAt: DateTime.tryParse(res['updated_at']?.toString() ?? '') ?? DateTime.now(),
        locationId: res['location_id'],
        locationName: locData?['location_name'],
        locationAddress: locData?['address'],
        geofenceRadiusMeters: (locData?['geofence_radius_meters'] as num?)?.toDouble() ?? 200.0,
        latitude: (locData?['latitude'] as num?)?.toDouble(),
        longitude: (locData?['longitude'] as num?)?.toDouble(),
        monitoringStartTime: res['monitoring_start_time'] ?? locData?['monitoring_start_time'] ?? '09:00:00',
        monitoringEndTime: res['monitoring_end_time'] ?? locData?['monitoring_end_time'] ?? '18:00:00',
        requiredDailyHours: (res['required_daily_hours'] as num?)?.toDouble() ?? 8.0,
        assignedAt: res['assigned_at'] != null ? DateTime.tryParse(res['assigned_at'].toString()) : null,
        assignedBy: res['assigned_by'],
        assignmentStatus: res['status'] ?? 'active',
      );
    }, operationName: 'getActiveAssignment');
  }

  @override
  Future<List<InternshipModel>> getAssignmentHistory(String studentId) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      final res = await client
          .from('internship_assignments')
          .select('''
            *,
            internship_locations (
              id,
              location_name,
              company_name,
              address,
              latitude,
              longitude,
              geofence_radius_meters,
              monitoring_start_time,
              monitoring_end_time
            )
          ''')
          .eq('student_id', studentId)
          .order('start_date', ascending: false);

      final list = res as List<dynamic>;
      return list.map((item) {
        final loc = item['internship_locations'] as Map<String, dynamic>?;
        return InternshipModel(
          id: item['id'] ?? '',
          studentId: studentId,
          companyName: loc?['company_name'] ?? item['role_title'] ?? 'Host Organization',
          role: item['role_title'] ?? 'Intern',
          description: item['notes'] ?? 'Placement Term',
          startDate: DateTime.tryParse(item['start_date']?.toString() ?? '') ?? DateTime.now(),
          endDate: DateTime.tryParse(item['end_date']?.toString() ?? '') ?? DateTime.now(),
          mentorId: item['mentor_id'],
          status: item['status'] == 'active' ? InternshipStatus.onTrack : InternshipStatus.completed,
          overallProgress: item['status'] == 'completed' ? 100.0 : 0.0,
          createdAt: DateTime.tryParse(item['created_at']?.toString() ?? '') ?? DateTime.now(),
          updatedAt: DateTime.tryParse(item['updated_at']?.toString() ?? '') ?? DateTime.now(),
          locationId: item['location_id'],
          locationName: loc?['location_name'],
          locationAddress: loc?['address'],
          geofenceRadiusMeters: (loc?['geofence_radius_meters'] as num?)?.toDouble(),
          latitude: (loc?['latitude'] as num?)?.toDouble(),
          longitude: (loc?['longitude'] as num?)?.toDouble(),
          monitoringStartTime: item['monitoring_start_time'] ?? loc?['monitoring_start_time'],
          monitoringEndTime: item['monitoring_end_time'] ?? loc?['monitoring_end_time'],
          requiredDailyHours: (item['required_daily_hours'] as num?)?.toDouble() ?? 8.0,
          assignedAt: item['assigned_at'] != null ? DateTime.tryParse(item['assigned_at'].toString()) : null,
          assignedBy: item['assigned_by'],
          assignmentStatus: item['status'],
        );
      }).toList();
    }, operationName: 'getAssignmentHistory');
  }

  @override
  Future<LocationModel?> getLocationById(String locationId) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      final res = await client
          .from('internship_locations')
          .select()
          .eq('id', locationId)
          .maybeSingle();

      if (res == null) return null;
      return LocationModel.fromMap(res, res['id'] ?? locationId);
    }, operationName: 'getLocationById');
  }

  @override
  Future<List<LocationModel>> getApprovedLocations({String? departmentCode}) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      var query = client
          .from('internship_locations')
          .select()
          .eq('status', 'active')
          .eq('is_active', true);

      if (departmentCode != null && departmentCode != 'ALL') {
        query = query.eq('department_code', departmentCode);
      }

      final res = await query.order('location_name');
      final list = res as List<dynamic>;
      return list.map((item) => LocationModel.fromMap(item, item['id'] ?? '')).toList();
    }, operationName: 'getApprovedLocations');
  }

  @override
  Stream<InternshipModel?> watchActiveAssignment(String studentId) {
    try {
      final client = _ensureClient;
      return client
          .from('internship_assignments')
          .stream(primaryKey: ['id'])
          .eq('student_id', studentId)
          .asyncMap((list) async {
            final active = list.where((item) => item['status'] == 'active').toList();
            if (active.isEmpty) return null;
            return getActiveAssignment(studentId);
          });
    } catch (e) {
      debugPrint('[SupabaseInternshipRepository] Realtime stream notice: $e');
      return Stream.fromFuture(getActiveAssignment(studentId));
    }
  }
}

