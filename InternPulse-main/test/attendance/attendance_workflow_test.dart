import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/models/attendance_model.dart';

void main() {
  group('Attendance Workflow & Session Management Tests', () {
    test('Check-in session creation initializes valid attendance state', () {
      final now = DateTime(2026, 3, 10, 9, 2);
      final session = AttendanceModel(
        id: 'att-sess-001',
        studentId: 'std-2026-001',
        assignmentId: 'asg-zoho-001',
        sessionDate: DateTime(2026, 3, 10),
        checkInAt: now,
        status: 'present',
        isVerified: true,
        notes: 'Verified via workplace geofence radius',
        createdAt: now,
        updatedAt: now,
      );

      expect(session.id, 'att-sess-001');
      expect(session.studentId, 'std-2026-001');
      expect(session.checkInAt, isNotNull);
      expect(session.checkOutAt, isNull);
      expect(session.status, 'present');
      expect(session.isPresent, true);
      expect(session.isVerified, true);
      expect(session.totalHours, isNull);
    });

    test('Check-out session completion computes hours worked', () {
      final checkIn = DateTime(2026, 3, 10, 9, 0);
      final checkOut = DateTime(2026, 3, 10, 17, 30);
      final duration = checkOut.difference(checkIn);
      final totalHours = (duration.inMinutes / 60.0 * 10).round() / 10.0;

      final session = AttendanceModel(
        id: 'att-sess-001',
        studentId: 'std-2026-001',
        assignmentId: 'asg-zoho-001',
        sessionDate: DateTime(2026, 3, 10),
        checkInAt: checkIn,
        checkOutAt: checkOut,
        totalHours: totalHours,
        status: 'present',
        isVerified: true,
        notes: 'Check-out successfully completed on site',
        createdAt: checkIn,
        updatedAt: checkOut,
      );

      expect(session.checkOutAt, isNotNull);
      expect(session.totalHours, 8.5);
      expect(session.totalHours!, greaterThanOrEqualTo(8.0));
      expect(session.status, 'present');

      final map = session.toMap();
      expect(map['total_hours'], 8.5);
      expect(map['check_out_at'], checkOut.toIso8601String());
    });

    test('AttendanceModel parses absent and half-day status codes', () {
      final absent = AttendanceModel.fromMap({
        'assignment_id': 'asg-01',
        'student_id': 'std-01',
        'session_date': '2026-03-09',
        'status': 'absent',
        'is_verified': false,
      }, 'att-absent');

      expect(absent.isPresent, false);
      expect(absent.status, 'absent');

      final halfDay = AttendanceModel.fromMap({
        'assignment_id': 'asg-01',
        'student_id': 'std-01',
        'session_date': '2026-03-08',
        'check_in_at': '2026-03-08T09:00:00.000Z',
        'check_out_at': '2026-03-08T13:00:00.000Z',
        'total_hours': 4.0,
        'status': 'half_day',
        'is_verified': true,
      }, 'att-half');

      expect(halfDay.isPresent, false);
      expect(halfDay.totalHours, 4.0);
      expect(halfDay.isVerified, true);
    });
  });
}

