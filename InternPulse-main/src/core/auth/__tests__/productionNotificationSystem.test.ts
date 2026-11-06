import { describe, it, expect, beforeEach } from 'vitest';
import {
  notificationService,
  NotificationService,
} from '../../notifications/notificationService';
import {
  fcmGateway,
  FcmGateway,
} from '../../notifications/fcmGateway';
import {
  NotificationAuthorizationPolicy,
} from '../../notifications/notificationAuthorizationPolicy';
import {
  NOTIFICATION_EVENT_TYPES,
  NotificationEventType,
} from '../../notifications/notificationTypes';
import { AuthUser } from '../authUser';

/**
 * Phase 9: InternPulse Production Notification System Test Suite
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Verifies:
 * 1. All 10 Canonical Notification Events dispatch
 * 2. Recipient Role Scoping (HOD, Mentor, Student)
 * 3. Violation vs Technical Failure clear discrimination
 * 4. Deduplication & Idempotent delivery
 * 5. FCM Push Delivery with Exponential Backoff Retries
 * 6. FCM Expired Device Token Invalidation
 * 7. User Preferences & Quiet Hours (with URGENT bypass)
 * 8. Strict Privacy: Zero raw coordinates in push payloads
 * 9. Read/Unread State tracking & Historical Preservation
 */
describe('Phase 9: Production Notification System Test Suite', () => {
  // Test Actors
  const studentUser: AuthUser = {
    id: 'usr-student-001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@smvec.ac.in',
    role: 'student',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'Computer Science and Business Systems',
    isActive: true,
  };

  const mentorUser: AuthUser = {
    id: 'usr-mentor-001',
    mentorId: 'MENTOR_CSEBS_01',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@smvec.ac.in',
    role: 'mentor',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'Computer Science and Business Systems',
    isActive: true,
  };

  const otherMentorUser: AuthUser = {
    id: 'usr-mentor-002',
    mentorId: 'MENTOR_CSEBS_02',
    name: 'Prof. Rajesh S',
    email: 'rajesh.mentor@smvec.ac.in',
    role: 'mentor',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'Computer Science and Business Systems',
    isActive: true,
  };

  const hodUser: AuthUser = {
    id: 'usr-hod-001',
    name: 'Dr. Senthamilselvan',
    email: 'hod.csebs@smvec.ac.in',
    role: 'hod',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'Computer Science and Business Systems',
    isActive: true,
  };

  beforeEach(() => {
    notificationService.reset();
  });

  // =========================================================================
  // 1. The 10 Canonical Notification Events
  // =========================================================================
  describe('1. Canonical Notification Events Completeness', () => {
    it('defines all 10 canonical notification events', () => {
      const expectedEvents: NotificationEventType[] = [
        'new_internship_assignment',
        'upcoming_verification',
        'verification_request',
        'successful_verification',
        'confirmed_outside_geofence',
        'missed_verification',
        'gps_disabled',
        'location_permission_revoked',
        'student_device_offline',
        'internship_assignment_updated',
      ];

      expectedEvents.forEach((evt) => {
        expect(Object.values(NOTIFICATION_EVENT_TYPES)).toContain(evt);
      });
      expect(expectedEvents).toHaveLength(10);
    });

    it('dispatches all 10 events with tailored titles and messages', async () => {
      const events: NotificationEventType[] = [
        'new_internship_assignment',
        'upcoming_verification',
        'verification_request',
        'successful_verification',
        'confirmed_outside_geofence',
        'missed_verification',
        'gps_disabled',
        'location_permission_revoked',
        'student_device_offline',
        'internship_assignment_updated',
      ];

      for (const eventType of events) {
        const res = await notificationService.dispatchEvent({
          eventType,
          studentId: studentUser.id,
          mentorId: mentorUser.id,
          hodId: hodUser.id,
          entityId: `entity-${eventType}`,
        });

        expect(res.dispatchedCount).toBeGreaterThan(0);
        const record = res.records[0];
        expect(record.notificationType).toBe(eventType);
        expect(record.title).toBeDefined();
        expect(record.message).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 2. Clear Discrimination: Violations vs Technical Failures
  // =========================================================================
  describe('2. Discrimination: Violations vs Technical Failures', () => {
    it('categorizes confirmed_outside_geofence strictly as VIOLATION with URGENT priority', async () => {
      const res = await notificationService.dispatchEvent({
        eventType: 'confirmed_outside_geofence',
        studentId: studentUser.id,
        mentorId: mentorUser.id,
        hodId: hodUser.id,
        entityId: 'ver-violation-001',
      });

      expect(res.dispatchedCount).toBe(3); // Student, Mentor, HOD
      res.records.forEach((record) => {
        expect(record.category).toBe('VIOLATION');
        expect(record.priority).toBe('URGENT');
      });
    });

    it('categorizes sensor and connectivity dropouts strictly as TECHNICAL_FAILURE', async () => {
      const techEvents: NotificationEventType[] = [
        'gps_disabled',
        'location_permission_revoked',
        'student_device_offline',
      ];

      for (const eventType of techEvents) {
        const res = await notificationService.dispatchEvent({
          eventType,
          studentId: studentUser.id,
          mentorId: mentorUser.id,
          entityId: `tech-${eventType}`,
        });

        res.records.forEach((record) => {
          expect(record.category).toBe('TECHNICAL_FAILURE');
          expect(record.category).not.toBe('VIOLATION');
          expect(record.priority).toBe('HIGH');
        });
      }
    });

    it('categorizes missed verification strictly as non-punitive ATTENDANCE_PROMPT', async () => {
      const res = await notificationService.dispatchEvent({
        eventType: 'missed_verification',
        studentId: studentUser.id,
        mentorId: mentorUser.id,
        entityId: 'sch-window-001',
      });

      res.records.forEach((record) => {
        expect(record.category).toBe('ATTENDANCE_PROMPT');
        expect(record.category).not.toBe('VIOLATION');
        expect(record.message).toContain('not proof of absence');
      });
    });
  });

  // =========================================================================
  // 3. Recipient Scoping & Role-Based Authorization
  // =========================================================================
  describe('3. Recipient Scoping & Role-Based Authorization', () => {
    it('restricts student notifications strictly to personal target', () => {
      const recipients = NotificationAuthorizationPolicy.determineRecipientsForEvent({
        eventType: 'verification_request',
        studentId: studentUser.id,
        mentorId: mentorUser.id,
      });

      // Verification requests go strictly to student
      expect(recipients).toEqual([studentUser.id]);
    });

    it('escalates confirmed outside geofence alerts to Student, Assigned Mentor, and Department HOD', () => {
      const recipients = NotificationAuthorizationPolicy.determineRecipientsForEvent({
        eventType: 'confirmed_outside_geofence',
        studentId: studentUser.id,
        mentorId: mentorUser.id,
        hodId: hodUser.id,
      });

      expect(recipients).toContain(studentUser.id);
      expect(recipients).toContain(mentorUser.id);
      expect(recipients).toContain(hodUser.id);
    });

    it('prevents mentors from receiving alerts for students assigned to other mentors', () => {
      const isAuthorized = NotificationAuthorizationPolicy.isMentorAuthorizedForStudent(
        otherMentorUser.mentorId!,
        mentorUser.mentorId!
      );
      expect(isAuthorized).toBe(false);
    });

    it('enforces RBAC policy: Students cannot read another student notifications', () => {
      const otherStudentNotification = {
        id: 'notif-002',
        recipientId: 'usr-student-999',
        title: 'Confidential',
        message: 'Personal Check',
        notificationType: 'verification_request' as NotificationEventType,
        category: 'ATTENDANCE_PROMPT' as const,
        priority: 'NORMAL' as const,
        payload: {},
        isRead: false,
        deliveryStatus: 'DELIVERED' as const,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      const canRead = NotificationAuthorizationPolicy.canReadNotification(
        studentUser,
        otherStudentNotification
      );
      expect(canRead).toBe(false);
    });
  });

  // =========================================================================
  // 4. Deduplication & Idempotent Delivery
  // =========================================================================
  describe('4. Deduplication & Idempotent Delivery', () => {
    it('suppresses duplicate notifications with matching deduplication keys', async () => {
      // First dispatch
      const res1 = await notificationService.dispatchEvent({
        eventType: 'verification_request',
        studentId: studentUser.id,
        entityId: 'window-101',
      });
      expect(res1.dispatchedCount).toBe(1);
      expect(res1.suppressedCount).toBe(0);

      // Immediate second dispatch for identical window
      const res2 = await notificationService.dispatchEvent({
        eventType: 'verification_request',
        studentId: studentUser.id,
        entityId: 'window-101',
      });
      expect(res2.dispatchedCount).toBe(0);
      expect(res2.suppressedCount).toBe(1); // Duplicate prevented!

      // Total notifications in database for student remains 1
      const history = notificationService.getNotificationHistory(studentUser.id);
      expect(history).toHaveLength(1);
    });
  });

  // =========================================================================
  // 5. FCM Push Delivery with Exponential Backoff Retry Handling
  // =========================================================================
  describe('5. FCM Push Delivery with Exponential Backoff Retry Handling', () => {
    it('retries FCM delivery with exponential backoff on transient network failures', async () => {
      const customGateway = new FcmGateway({ maxRetries: 3, initialBackoffMs: 10 });
      const testService = new NotificationService(customGateway);

      const deviceToken = 'fcm_token_retry_test';
      testService.registerDeviceToken(studentUser.id, 'dev-001', deviceToken);

      // Simulate 2 transient network failures (will succeed on 3rd attempt)
      customGateway.simulateTransientFailures(deviceToken, 2);

      const res = await testService.dispatchEvent({
        eventType: 'verification_request',
        studentId: studentUser.id,
        entityId: 'window-retry',
      });

      expect(res.dispatchedCount).toBe(1);
      const record = res.records[0];
      expect(record.deliveryStatus).toBe('DELIVERED');
    });

    it('marks delivery as FAILED when retries are exhausted', async () => {
      const customGateway = new FcmGateway({ maxRetries: 2, initialBackoffMs: 5 });
      const testService = new NotificationService(customGateway);

      const deviceToken = 'fcm_token_fail_test';
      testService.registerDeviceToken(studentUser.id, 'dev-002', deviceToken);

      // Simulate 5 failures (exceeds maxRetries = 2)
      customGateway.simulateTransientFailures(deviceToken, 5);

      const res = await testService.dispatchEvent({
        eventType: 'verification_request',
        studentId: studentUser.id,
        entityId: 'window-fail',
      });

      expect(res.dispatchedCount).toBe(1);
      const record = res.records[0];
      expect(record.deliveryStatus).toBe('FAILED');
      expect(record.retryCount).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 6. Expired Device Token Invalidation
  // =========================================================================
  describe('6. Expired Device Token Invalidation', () => {
    it('automatically invalidates expired / unregistered FCM tokens', async () => {
      const customGateway = new FcmGateway();
      const testService = new NotificationService(customGateway);

      const expiredToken = 'expired_fcm_token_12345';
      testService.registerDeviceToken(studentUser.id, 'dev-old', expiredToken);
      customGateway.registerExpiredToken(expiredToken);

      // Initially active
      expect(testService.getActiveTokensForUser(studentUser.id)).toHaveLength(1);

      // Dispatch notification
      await testService.dispatchEvent({
        eventType: 'upcoming_verification',
        studentId: studentUser.id,
        entityId: 'sch-upcoming-1',
      });

      // Gateway detects expired token -> service invalidates it
      const activeTokens = testService.getActiveTokensForUser(studentUser.id);
      expect(activeTokens).toHaveLength(0); // Token purged from active pool
    });
  });

  // =========================================================================
  // 7. Notification Preferences & Quiet Hours
  // =========================================================================
  describe('7. Notification Preferences & Quiet Hours', () => {
    it('respects user opt-out for specific categories', async () => {
      notificationService.setPreferences(studentUser.id, {
        assignmentAlerts: false, // Opt out of assignment updates
      });

      const res = await notificationService.dispatchEvent({
        eventType: 'internship_assignment_updated',
        studentId: studentUser.id,
        entityId: 'asg-opt-out',
      });

      expect(res.suppressedCount).toBe(1);
      expect(res.dispatchedCount).toBe(0);
    });

    it('bypasses user preferences and quiet hours for URGENT geofence violations', async () => {
      // User disabled all push and set quiet hours
      notificationService.setPreferences(studentUser.id, {
        pushEnabled: false,
        inAppEnabled: false,
        quietHoursEnabled: true,
      });

      // Violation alert MUST penetrate quiet hours and opt-outs
      const res = await notificationService.dispatchEvent({
        eventType: 'confirmed_outside_geofence',
        studentId: studentUser.id,
        entityId: 'ver-urgent-bypass',
      });

      expect(res.dispatchedCount).toBeGreaterThan(0);
      const studentRec = res.records.find((r) => r.recipientId === studentUser.id);
      expect(studentRec?.priority).toBe('URGENT');
    });
  });

  // =========================================================================
  // 8. Privacy: Zero Raw Coordinates in Push Payloads
  // =========================================================================
  describe('8. Privacy Protection: Zero Raw GPS Coordinates in Payloads', () => {
    it('sanitizes and strips raw latitude/longitude before dispatching payload', async () => {
      const res = await notificationService.dispatchEvent({
        eventType: 'confirmed_outside_geofence',
        studentId: studentUser.id,
        entityId: 'asg-priv-001',
        metadata: {
          latitude: 12.8284,
          longitude: 80.2198,
          distanceMeters: 450.0,
          companyName: 'TCS Siruseri',
        },
      });

      const record = res.records[0];
      expect(record.payload.latitude).toBeUndefined();
      expect(record.payload.longitude).toBeUndefined();
      expect(record.payload.companyName).toBe('TCS Siruseri');
      expect(record.payload.distanceMeters).toBe(450.0);
    });

    it('FCM Gateway throws security exception if raw coordinates are passed in push payload', async () => {
      const customGateway = new FcmGateway();

      const illegalPayload = {
        notification: { title: 'Breach', body: 'Coords' },
        data: {
          notificationId: 'notif-leak',
          notificationType: 'confirmed_outside_geofence' as NotificationEventType,
          category: 'VIOLATION' as const,
          priority: 'URGENT' as const,
          latitude: 12.8284, // ILLEGAL LEAK
        } as any,
      };

      await expect(
        customGateway.sendPushNotification('token-test', illegalPayload)
      ).rejects.toThrow('SECURITY EXCEPTION: Push notification payload contains sensitive GPS coordinates');
    });
  });

  // =========================================================================
  // 9. Read/Unread State & Historical History
  // =========================================================================
  describe('9. Read/Unread State & Historical Preservation', () => {
    it('tracks read and unread counts accurately', async () => {
      await notificationService.dispatchEvent({
        eventType: 'verification_request',
        studentId: studentUser.id,
        entityId: 'win-1',
      });
      await notificationService.dispatchEvent({
        eventType: 'upcoming_verification',
        studentId: studentUser.id,
        entityId: 'win-2',
      });

      expect(notificationService.getUnreadCount(studentUser.id)).toBe(2);

      const history = notificationService.getNotificationHistory(studentUser.id);
      expect(history).toHaveLength(2);

      // Mark first as read
      notificationService.markAsRead(history[0].id, studentUser.id);
      expect(notificationService.getUnreadCount(studentUser.id)).toBe(1);

      // Mark all as read
      notificationService.markAllAsRead(studentUser.id);
      expect(notificationService.getUnreadCount(studentUser.id)).toBe(0);
    });
  });
});

