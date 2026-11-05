import 'dart:async';
import '../models/student_model.dart';
import '../core/constants/status_constants.dart';
import 'base_repository.dart';

abstract class StudentRepository extends BaseRepository<StudentModel> {
  /// Stream students assigned to a specific mentor in real time
  Stream<List<StudentModel>> watchStudentsForMentor(String mentorId);

  /// Stream students flagged as at-risk (delayed, blocked, inactive)
  Stream<List<StudentModel>> watchAtRiskStudents({String? departmentCode});

  /// Stream students filtered by department and academic year
  Stream<List<StudentModel>> watchStudentsByDepartment({
    required String departmentCode,
    String? academicYear,
    InternshipStatus? status,
  });

  /// Update student overall progress & status
  Future<void> updateStudentStatus({
    required String studentId,
    required InternshipStatus status,
    required double overallProgress,
  });
}
