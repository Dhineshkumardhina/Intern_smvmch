import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/models/location_verification_model.dart';

void main() {
  group('LocationVerificationModel Tests', () {
    test('deserializes verification record correctly from Map', () {
      final map = {
        'session_id': 'sess-300',
        'assignment_id': 'asg-200',
        'student_id': 'std-100',
        'location_id': 'loc-500',
        'event_type': 'scheduled',
        'requested_at': '2026-03-01T10:15:00.000Z',
        'responded_at': '2026-03-01T10:15:05.000Z',
        'captured_latitude': 12.8284,
        'captured_longitude': 80.2198,
        'accuracy_meters': 8.5,
        'distance_to_center_meters': 45.2,
        'is_within_geofence': true,
        'is_mock_location': false,
        'status': 'verified',
        'created_at': '2026-03-01T10:15:00.000Z',
      };

      final model = LocationVerificationModel.fromMap(map, 'ver-001');

      expect(model.id, 'ver-001');
      expect(model.isWithinGeofence, true);
      expect(model.isMockLocation, false);
      expect(model.accuracyMeters, 8.5);
      expect(model.distanceToCenterMeters, 45.2);
      expect(model.status, 'verified');
      expect(model.isVerified, true);
      expect(model.isViolation, false);
    });

    test('flags rejection when mock location detected or out of bounds', () {
      final map = {
        'assignment_id': 'asg-200',
        'student_id': 'std-100',
        'event_type': 'automated',
        'requested_at': '2026-03-01T10:15:00.000Z',
        'is_mock_location': true,
        'status': 'spoof_detected',
        'created_at': '2026-03-01T10:15:00.000Z',
      };

      final model = LocationVerificationModel.fromMap(map, 'ver-mock');

      expect(model.isMockLocation, true);
      expect(model.isViolation, true);
      expect(model.isVerified, false);
    });
  });
}
