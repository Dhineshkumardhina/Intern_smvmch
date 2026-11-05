import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/models/attendance_model.dart';

void main() {
  group('AttendanceModel Tests', () {
    test('deserializes Map correctly from Supabase attendance_sessions', () {
      final map = {
        'assignment_id': 'asg-789',
        'student_id': 'std-456',
        'session_date': '2026-03-01',
        'check_in_at': '2026-03-01T09:00:00.000Z',
        'check_out_at': '2026-03-01T17:30:00.000Z',
        'total_hours': 8.5,
        'status': 'present',
        'is_verified': true,
        'notes': 'On-site mobile testing',
      };

      final model = AttendanceModel.fromMap(map, 'att-123');

      expect(model.id, 'att-123');
      expect(model.studentId, 'std-456');
      expect(model.assignmentId, 'asg-789');
      expect(model.totalHours, 8.5);
      expect(model.status, 'present');
      expect(model.isVerified, true);
      expect(model.isPresent, true);
    });

    test('serializes to Map matching Supabase schema', () {
      final model = AttendanceModel(
        id: 'att-write',
        studentId: 'std-1',
        assignmentId: 'asg-1',
        sessionDate: DateTime(2026, 3, 1),
        checkInAt: DateTime(2026, 3, 1, 9, 0),
        status: 'present',
        createdAt: DateTime(2026, 3, 1, 9, 0),
        updatedAt: DateTime(2026, 3, 1, 9, 0),
      );

      final map = model.toMap();
      expect(map['id'], 'att-write');
      expect(map['student_id'], 'std-1');
      expect(map['assignment_id'], 'asg-1');
      expect(map['status'], 'present');
    });
  });
}
