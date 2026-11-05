import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/models/notification_model.dart';

void main() {
  group('NotificationModel Tests', () {
    test('deserializes notification item from Map', () {
      final map = {
        'recipient_id': 'usr-1',
        'title': 'Geofence Verification Passed',
        'message': 'Your on-site attendance at TCS Siruseri has been logged.',
        'notification_type': 'attendance',
        'is_read': false,
        'created_at': '2026-03-01T09:30:00.000Z',
      };

      final model = NotificationModel.fromMap(map, 'notif-101');

      expect(model.id, 'notif-101');
      expect(model.title, 'Geofence Verification Passed');
      expect(model.isRead, false);
      expect(model.notificationType, 'attendance');

      final serialized = model.toMap();
      expect(serialized['id'], 'notif-101');
      expect(serialized['title'], 'Geofence Verification Passed');
      expect(serialized['is_read'], false);
    });
  });
}
