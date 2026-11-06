import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/models/notification_model.dart';

void main() {
  group('Notification System & Categorization Tests', () {
    test('Correctly distinguishes confirmed violations from technical failures', () {
      final violationNotif = NotificationModel.fromMap({
        'recipient_id': 'mentor-001',
        'title': 'Geofence Breach Confirmed',
        'message': 'Student verified 12.5km outside designated internship perimeter.',
        'notification_type': 'confirmed_outside_geofence',
      }, 'notif-viol-01');

      expect(violationNotif.isViolation, true);
      expect(violationNotif.isTechnicalFailure, false);
      expect(violationNotif.category, 'VIOLATION');

      final gpsDisabledNotif = NotificationModel.fromMap({
        'recipient_id': 'student-001',
        'title': 'Location Hardware Inactive',
        'message': 'Device GPS is disabled. Please enable location services.',
        'notification_type': 'gps_disabled',
      }, 'notif-tech-01');

      expect(gpsDisabledNotif.isViolation, false);
      expect(gpsDisabledNotif.isTechnicalFailure, true);
      expect(gpsDisabledNotif.category, 'TECHNICAL_FAILURE');

      final networkOfflineNotif = NotificationModel.fromMap({
        'recipient_id': 'mentor-001',
        'title': 'Device Offline',
        'message': 'Student device offline during scheduled verification window.',
        'notification_type': 'student_device_offline',
      }, 'notif-tech-02');

      expect(networkOfflineNotif.isViolation, false);
      expect(networkOfflineNotif.isTechnicalFailure, true);
    });

    test('Verification prompt notification deserializes payload and deduplication key', () {
      final notif = NotificationModel.fromMap({
        'recipient_id': 'std-2026-001',
        'title': 'Random Verification Required',
        'message': 'Please confirm your location within the next 15 minutes.',
        'notification_type': 'verification_request',
        'category': 'ATTENDANCE_PROMPT',
        'priority': 'URGENT',
        'action_url': '/student/verify',
        'deduplication_key': 'ver-win-20260310-01-std-001',
        'payload': {
          'window_id': 'win-001',
          'expires_at': '2026-03-10T10:30:00.000Z',
          'geofence_id': 'loc-est-001',
        },
      }, 'notif-prompt-01');

      expect(notif.priority, 'URGENT');
      expect(notif.actionUrl, '/student/verify');
      expect(notif.deduplicationKey, 'ver-win-20260310-01-std-001');
      expect(notif.payload['window_id'], 'win-001');
      expect(notif.payload['geofence_id'], 'loc-est-001');
      expect(notif.isRead, false);
    });

    test('Read state toggle and serialization', () {
      final readAt = DateTime.now();
      final notif = NotificationModel(
        id: 'notif-read-01',
        recipientId: 'std-01',
        title: 'Weekly Attendance Summary',
        message: 'Your weekly attendance has been approved by your mentor.',
        notificationType: 'system_announcement',
        isRead: true,
        readAt: readAt,
        createdAt: readAt.subtract(const Duration(hours: 2)),
      );

      final map = notif.toMap();
      expect(map['is_read'], true);
      expect(map['read_at'], readAt.toIso8601String());
      expect(map['title'], 'Weekly Attendance Summary');
    });
  });
}

