/**
 * Phase 9: InternPulse Production Notification System Types
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 */

/**
 * 10 Canonical Notification Event Types
 */
export type NotificationEventType =
  | 'new_internship_assignment'
  | 'upcoming_verification'
  | 'verification_request'
  | 'successful_verification'
  | 'confirmed_outside_geofence'
  | 'missed_verification'
  | 'gps_disabled'
  | 'location_permission_revoked'
  | 'student_device_offline'
  | 'internship_assignment_updated';

export const NOTIFICATION_EVENT_TYPES: Record<string, NotificationEventType> = {
  NEW_INTERNSHIP_ASSIGNMENT: 'new_internship_assignment',
  UPCOMING_VERIFICATION: 'upcoming_verification',
  VERIFICATION_REQUEST: 'verification_request',
  SUCCESSFUL_VERIFICATION: 'successful_verification',
  CONFIRMED_OUTSIDE_GEOFENCE: 'confirmed_outside_geofence',
  MISSED_VERIFICATION: 'missed_verification',
  GPS_DISABLED: 'gps_disabled',
  LOCATION_PERMISSION_REVOKED: 'location_permission_revoked',
  STUDENT_DEVICE_OFFLINE: 'student_device_offline',
  INTERNSHIP_ASSIGNMENT_UPDATED: 'internship_assignment_updated',
};

/**
 * Classification Categories for Clean Violation vs Technical Failure Discrimination
 */
export type NotificationCategory =
  | 'VIOLATION' // Confirmed boundary breach
  | 'TECHNICAL_FAILURE' // GPS disabled, location unavailable, permission revoked, device offline
  | 'ATTENDANCE_PROMPT' // Verification request, upcoming verification, successful check
  | 'SYSTEM_UPDATE'; // New assignment, assignment updated

/**
 * Delivery Priority
 */
export type NotificationPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

/**
 * Delivery Status
 */
export type NotificationDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED';

/**
 * Recipient Role Scope
 */
export type RecipientRole = 'student' | 'mentor' | 'hod' | 'admin';

/**
 * Core Notification Record
 */
export interface NotificationRecord {
  id: string;
  institutionId?: string;
  recipientId: string;
  senderId?: string | null;
  title: string;
  message: string;
  notificationType: NotificationEventType;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl?: string | null;
  payload: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  deliveryStatus: NotificationDeliveryStatus;
  deduplicationKey?: string | null;
  retryCount: number;
  createdAt: string;
}

/**
 * Firebase Cloud Messaging (FCM) Device Token
 */
export interface FcmDeviceToken {
  id: string;
  userId: string;
  deviceId: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  isActive: boolean;
  failureCount: number;
  lastSeenAt: string;
  expiredAt?: string | null;
  createdAt: string;
}

/**
 * User Notification Preferences
 */
export interface UserNotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  verificationAlerts: boolean;
  assignmentAlerts: boolean;
  technicalAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // "22:00:00"
  quietHoursEnd?: string; // "07:00:00"
}

/**
 * Opaque FCM Payload (Strictly Excludes Raw GPS Coordinates)
 */
export interface FcmPushPayload {
  notification: {
    title: string;
    body: string;
  };
  data: {
    notificationId: string;
    notificationType: NotificationEventType;
    category: NotificationCategory;
    priority: NotificationPriority;
    actionUrl?: string;
    assignmentId?: string;
    scheduleId?: string;
    // CRITICAL: Raw coordinates (latitude, longitude) MUST NEVER be present!
  };
}

/**
 * FCM Delivery Result
 */
export interface FcmDeliveryResult {
  success: boolean;
  token: string;
  messageId?: string;
  error?: string;
  isTokenExpired?: boolean;
}

