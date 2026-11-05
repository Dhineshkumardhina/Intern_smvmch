import '../models/attendance_model.dart';

abstract class AttendanceRepository {
  /// Fetches attendance sessions for a student within an optional date range
  Future<List<AttendanceModel>> getAttendanceHistory(
    String studentId, {
    DateTime? startDate,
    DateTime? endDate,
  });

  /// Fetches the attendance record for the current day, if one exists
  Future<AttendanceModel?> getTodayAttendance(String studentId);

  /// Performs check-in for the current day's session
  Future<AttendanceModel> checkIn({
    required String studentId,
    required String assignmentId,
    String? locationId,
    double? latitude,
    double? longitude,
  });

  /// Performs check-out to conclude the attendance session
  Future<AttendanceModel> checkOut({
    required String sessionId,
    String? locationId,
    double? latitude,
    double? longitude,
  });

  /// Realtime stream of attendance updates for a student
  Stream<List<AttendanceModel>> watchAttendanceHistory(String studentId);
}

