import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/supabase_auth_service.dart';
import '../core/constants/status_constants.dart';
import '../core/network/network_retry.dart';
import '../models/student_model.dart';
import 'student_repository.dart';

class SupabaseStudentRepository implements StudentRepository {
  final SupabaseClient? _client;

  SupabaseStudentRepository([SupabaseClient? client])
      : _client = client ?? SupabaseAuthService().client;

  SupabaseClient get _ensureClient {
    final c = _client ?? SupabaseAuthService().client;
    if (c == null) {
      throw const ServerException('Backend database connection is not available.');
    }
    return c;
  }

  @override
  Future<StudentModel?> getById(String id) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      final res = await client
          .from('profiles')
          .select('''
            *,
            students (
              id,
              register_number,
              academic_year,
              current_semester,
              status,
              cgpa
            )
          ''')
          .or('id.eq.$id,student_id.eq.$id')
          .maybeSingle();

      if (res == null) return null;
      return _mapToStudentModel(res);
    }, operationName: 'getById');
  }

  @override
  Stream<StudentModel?> watchById(String id) {
    try {
      final client = _ensureClient;
      return client
          .from('profiles')
          .stream(primaryKey: ['id'])
          .eq('id', id)
          .asyncMap((list) async {
            if (list.isEmpty) return null;
            return getById(id);
          });
    } catch (e) {
      debugPrint('[SupabaseStudentRepository] Stream fallback note: $e');
      return Stream.fromFuture(getById(id));
    }
  }

  @override
  Stream<List<StudentModel>> watchAll() {
    try {
      final client = _ensureClient;
      return client
          .from('profiles')
          .stream(primaryKey: ['id'])
          .eq('role', 'student')
          .asyncMap((list) async {
            return list.map((item) => _mapToStudentModel(item)).toList();
          });
    } catch (e) {
      debugPrint('[SupabaseStudentRepository] Stream all fallback note: $e');
      return Stream.value([]);
    }
  }

  @override
  Future<void> save(StudentModel item) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      await client.from('profiles').upsert({
        'id': item.userId,
        'full_name': item.name,
        'email': item.email,
        'phone': item.phone,
        'department_code': item.departmentCode,
        'student_id': item.studentId,
        'updated_at': DateTime.now().toIso8601String(),
      });
    }, operationName: 'save');
  }

  @override
  Future<void> delete(String id) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      await client.from('profiles').delete().eq('id', id);
    }, operationName: 'delete');
  }

  @override
  Stream<List<StudentModel>> watchStudentsForMentor(String mentorId) {
    try {
      final client = _ensureClient;
      return client
          .from('students')
          .stream(primaryKey: ['id'])
          .eq('mentor_id', mentorId)
          .asyncMap((_) async {
            final res = await client
                .from('profiles')
                .select()
                .eq('mentor_id', mentorId)
                .eq('role', 'student');
            final list = res as List<dynamic>;
            return list.map((item) => _mapToStudentModel(item)).toList();
          });
    } catch (e) {
      debugPrint('[SupabaseStudentRepository] Mentor mentees fallback note: $e');
      return Stream.value([]);
    }
  }

  @override
  Stream<List<StudentModel>> watchAtRiskStudents({String? departmentCode}) {
    try {
      final client = _ensureClient;
      var query = client.from('students').stream(primaryKey: ['id']);
      return query.asyncMap((_) async {
        var pQuery = client
            .from('profiles')
            .select()
            .eq('role', 'student')
            .or('status.eq.delayed,status.eq.blocked,status.eq.inactive');
        if (departmentCode != null && departmentCode != 'ALL') {
          pQuery = pQuery.eq('department_code', departmentCode);
        }
        final res = await pQuery;
        final list = res as List<dynamic>;
        return list.map((item) => _mapToStudentModel(item)).toList();
      });
    } catch (e) {
      debugPrint('[SupabaseStudentRepository] At risk stream fallback note: $e');
      return Stream.value([]);
    }
  }

  @override
  Stream<List<StudentModel>> watchStudentsByDepartment({
    required String departmentCode,
    String? academicYear,
    InternshipStatus? status,
  }) {
    try {
      final client = _ensureClient;
      return client
          .from('profiles')
          .stream(primaryKey: ['id'])
          .eq('department_code', departmentCode)
          .eq('role', 'student')
          .asyncMap((list) async {
            var items = list.map((item) => _mapToStudentModel(item)).toList();
            if (academicYear != null) {
              items = items.where((s) => s.academicYear == academicYear).toList();
            }
            if (status != null) {
              items = items.where((s) => s.status == status).toList();
            }
            return items;
          });
    } catch (e) {
      debugPrint('[SupabaseStudentRepository] Department students fallback note: $e');
      return Stream.value([]);
    }
  }

  @override
  Future<void> updateStudentStatus({
    required String studentId,
    required InternshipStatus status,
    required double overallProgress,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final nowIso = DateTime.now().toIso8601String();

      await client.from('students').update({
        'status': status.name,
        'updated_at': nowIso,
      }).eq('register_number', studentId);
    }, operationName: 'updateStudentStatus');
  }

  StudentModel _mapToStudentModel(Map<String, dynamic> data) {
    final studentData = (data['students'] as List<dynamic>?)?.firstOrNull as Map<String, dynamic>? ??
        data['students'] as Map<String, dynamic>?;

    return StudentModel(
      id: studentData?['id'] ?? data['id'] ?? '',
      userId: data['id'] ?? '',
      studentId: studentData?['register_number'] ?? data['student_id'] ?? data['register_number'] ?? '',
      name: data['full_name'] ?? data['name'] ?? 'Student Intern',
      email: data['email'] ?? '',
      collegeId: data['institution_id'] ?? 'a0000000-0000-0000-0000-000000000001',
      departmentCode: (data['department_code'] ?? 'CSEBS').toString().toUpperCase(),
      departmentName: data['department_name'] ?? (data['department_code'] ?? 'CSEBS'),
      academicYear: studentData?['academic_year'] ?? data['academic_year'] ?? '3rd Year',
      phone: data['phone'] ?? '',
      profilePhoto: data['profile_photo'] ?? data['photo_url'],
      mentorIds: data['mentor_id'] != null ? [data['mentor_id']] : [],
      status: InternshipStatus.fromString(studentData?['status'] ?? data['status']),
      overallProgress: 0.0,
      createdAt: DateTime.tryParse(data['created_at']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(data['updated_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

