/**
 * InternPulse Production Notification Service
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Implements:
 * 1. 10 Canonical Notification Events dispatch
 * 2. Violation vs Technical Failure clean discrimination
 * 3. Deduplication & Idempotent dispatching
 * 4. User Notification Preferences & Quiet Hours
 * 5. FCM Device Token Lifecycle & Expired Token Invalidation
 * 6. Sensitive Data Sanitization (Excludes raw GPS coordinates)
 * 7. Read/Unread State tracking & Historical Preservation
 */

import {
  NotificationRecord,
  NotificationEventType,
  NotificationCategory,
  NotificationPriority,
  FcmDeviceToken,
  UserNotificationPreferences,
  FcmPushPayload,
} from './notificationTypes';
import { FcmGateway, fcmGateway } from './fcmGateway';
import { NotificationAuthorizationPolicy } from './notificationAuthorizationPolicy';
import { getSupabaseClient } from '../../lib/supabase';
import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy, ForbiddenException } from '../auth/rbac/authorizationPolicy';
import { canonicalizeInstitutionId } from '../../data/initialData';

export interface DispatchEventParams {
  eventType: NotificationEventType;
  studentId: string;
  institutionId?: string;
  mentorId?: string | null;
  hodId?: string | null;
  senderId?: string | null;
  title?: string;
  message?: string;
  actionUrl?: string;
  entityId?: string; // assignmentId or scheduleId
  metadata?: Record<string, any>;
  customDeduplicationKey?: string;
  forceUrgent?: boolean;
}

export class NotificationService {
  private notifications: NotificationRecord[] = [];
  private deviceTokens: FcmDeviceToken[] = [];
  private userPreferences: Map<string, UserNotificationPreferences> = new Map();
  private gateway: FcmGateway;

  constructor(gateway: FcmGateway = fcmGateway) {
    this.gateway = gateway;
  }

  /**
   * Resets internal stores for testing
   */
  public reset(): void {
    this.notifications = [];
    this.deviceTokens = [];
    this.userPreferences.clear();
  }

  // =========================================================================
  // 1. Device Token Lifecycle (Register, Update, Invalidate)
  // =========================================================================

  public registerDeviceToken(
    userId: string,
    deviceId: string,
    token: string,
    platform: 'android' | 'ios' | 'web' = 'android'
  ): FcmDeviceToken {
    const existing = this.deviceTokens.find(
      (t) => t.userId === userId && t.deviceId === deviceId
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.token = token;
      existing.isActive = true;
      existing.expiredAt = null;
      existing.failureCount = 0;
      existing.lastSeenAt = now;
      return existing;
    }

    const newToken: FcmDeviceToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      deviceId,
      token,
      platform,
      isActive: true,
      failureCount: 0,
      lastSeenAt: now,
      createdAt: now,
    };

    this.deviceTokens.push(newToken);
    return newToken;
  }

  public invalidateDeviceToken(token: string, _reason: string = 'Token Expired'): void {
    const found = this.deviceTokens.find((t) => t.token === token);
    if (found) {
      found.isActive = false;
      found.expiredAt = new Date().toISOString();
      found.failureCount += 1;
    }
  }

  public getActiveTokensForUser(userId: string): FcmDeviceToken[] {
    return this.deviceTokens.filter((t) => t.userId === userId && t.isActive);
  }

  // =========================================================================
  // 2. User Notification Preferences
  // =========================================================================

  public setPreferences(
    userId: string,
    prefs: Partial<UserNotificationPreferences>
  ): UserNotificationPreferences {
    const existing = this.userPreferences.get(userId) ?? {
      userId,
      pushEnabled: true,
      inAppEnabled: true,
      verificationAlerts: true,
      assignmentAlerts: true,
      technicalAlerts: true,
      quietHoursEnabled: false,
    };

    const updated = { ...existing, ...prefs };
    this.userPreferences.set(userId, updated);
    return updated;
  }

  public getPreferences(userId: string): UserNotificationPreferences {
    return (
      this.userPreferences.get(userId) ?? {
        userId,
        pushEnabled: true,
        inAppEnabled: true,
        verificationAlerts: true,
        assignmentAlerts: true,
        technicalAlerts: true,
        quietHoursEnabled: false,
      }
    );
  }

  // =========================================================================
  // 3. Event Categorization & Message Formulation
  // =========================================================================

  public categorizeEvent(eventType: NotificationEventType): {
    category: NotificationCategory;
    defaultPriority: NotificationPriority;
  } {
    switch (eventType) {
      case 'confirmed_outside_geofence':
        return { category: 'VIOLATION', defaultPriority: 'URGENT' };

      case 'gps_disabled':
      case 'location_permission_revoked':
      case 'student_device_offline':
        return { category: 'TECHNICAL_FAILURE', defaultPriority: 'HIGH' };

      case 'verification_request':
      case 'upcoming_verification':
      case 'successful_verification':
      case 'missed_verification':
        return { category: 'ATTENDANCE_PROMPT', defaultPriority: 'NORMAL' };

      case 'new_internship_assignment':
      case 'internship_assignment_updated':
      default:
        return { category: 'SYSTEM_UPDATE', defaultPriority: 'NORMAL' };
    }
  }

  private getDefaultText(eventType: NotificationEventType): { title: string; message: string } {
    switch (eventType) {
      case 'new_internship_assignment':
        return {
          title: 'New Internship Assignment',
          message: 'An approved workplace placement and geofence schedule have been assigned to you.',
        };
      case 'upcoming_verification':
        return {
          title: 'Upcoming Verification Window',
          message: 'An attendance verification opportunity will begin shortly during your shift.',
        };
      case 'verification_request':
        return {
          title: 'Attendance Verification Prompt',
          message: 'A 15-minute verification window is now open. Please submit your workplace location.',
        };
      case 'successful_verification':
        return {
          title: 'Presence Verified',
          message: 'Your workplace location has been successfully verified within the approved geofence.',
        };
      case 'confirmed_outside_geofence':
        return {
          title: 'Geofence Boundary Alert',
          message: 'Confirmed location outside the approved workplace geofence radius.',
        };
      case 'missed_verification':
        return {
          title: 'Missed Verification Window',
          message: 'A verification window closed without a response. (Notice: This is not proof of absence).',
        };
      case 'gps_disabled':
        return {
          title: 'GPS Sensor Disabled',
          message: 'Device location sensor is switched off. Please enable GPS in device settings.',
        };
      case 'location_permission_revoked':
        return {
          title: 'Location Permission Required',
          message: 'Location permissions have been revoked. Please restore permissions to verify attendance.',
        };
      case 'student_device_offline':
        return {
          title: 'Device Offline',
          message: 'Network connectivity is unavailable. Verification telemetry will retry upon reconnection.',
        };
      case 'internship_assignment_updated':
        return {
          title: 'Assignment Updated',
          message: 'Your internship placement parameters or monitoring schedule have been modified.',
        };
      default:
        return { title: 'InternPulse Alert', message: 'You have a new institutional alert.' };
    }
  }

  // =========================================================================
  // 4. Dispatch Orchestration & Deduplication
  // =========================================================================

  public async dispatchEvent(params: DispatchEventParams): Promise<{
    dispatchedCount: number;
    suppressedCount: number;
    records: NotificationRecord[];
  }> {
    const { category, defaultPriority } = this.categorizeEvent(params.eventType);
    const priority = params.forceUrgent ? 'URGENT' : defaultPriority;
    const defaultText = this.getDefaultText(params.eventType);
    const title = params.title ?? defaultText.title;
    const message = params.message ?? defaultText.message;

    // 1. Determine authorized recipients per RBAC rules
    const recipients = NotificationAuthorizationPolicy.determineRecipientsForEvent({
      eventType: params.eventType,
      studentId: params.studentId,
      mentorId: params.mentorId,
      hodId: params.hodId,
    });

    let dispatchedCount = 0;
    let suppressedCount = 0;
    const createdRecords: NotificationRecord[] = [];

    for (const recipientId of recipients) {
      // 2. Deduplication Check
      const dedupKey =
        params.customDeduplicationKey ??
        `${recipientId}_${params.eventType}_${params.entityId ?? 'general'}`;

      const isDuplicate = this.notifications.some(
        (n) => n.recipientId === recipientId && n.deduplicationKey === dedupKey
      );

      if (isDuplicate) {
        suppressedCount++;
        continue;
      }

      // 3. User Preferences & Quiet Hours Check
      const prefs = this.getPreferences(recipientId);
      if (!this.shouldDeliverToUser(prefs, category, priority)) {
        suppressedCount++;
        continue;
      }

      // 4. Sanitize Payload (Strip raw coordinates)
      const sanitizedPayload = { ...(params.metadata ?? {}) };
      delete sanitizedPayload.latitude;
      delete sanitizedPayload.longitude;
      delete sanitizedPayload.captured_latitude;
      delete sanitizedPayload.captured_longitude;
      delete sanitizedPayload.coords;

      // 5. Persist Notification Record
      const instId = canonicalizeInstitutionId(params.institutionId || params.metadata?.institutionId || 'inst-smvec-001');
      const record: NotificationRecord = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        institutionId: instId,
        recipientId,
        senderId: params.senderId ?? null,
        title,
        message,
        notificationType: params.eventType,
        category,
        priority,
        actionUrl: params.actionUrl ?? '/student/attendance',
        payload: sanitizedPayload,
        isRead: false,
        deliveryStatus: 'PENDING',
        deduplicationKey: dedupKey,
        retryCount: 0,
        createdAt: new Date().toISOString(),
      };

      this.notifications.push(record);

      // 6. Push Delivery via FCM
      if (prefs.pushEnabled) {
        await this.deliverPushNotification(recipientId, record);
      } else {
        record.deliveryStatus = 'DELIVERED'; // In-app delivered
      }

      dispatchedCount++;
      createdRecords.push(record);
    }

    return { dispatchedCount, suppressedCount, records: createdRecords };
  }

  /**
   * Delivers push notification to active device tokens of a user
   */
  private async deliverPushNotification(
    recipientId: string,
    record: NotificationRecord
  ): Promise<void> {
    const activeTokens = this.getActiveTokensForUser(recipientId);
    if (activeTokens.length === 0) {
      record.deliveryStatus = 'DELIVERED'; // In-app only
      return;
    }

    const pushPayload: FcmPushPayload = {
      notification: {
        title: record.title,
        body: record.message,
      },
      data: {
        notificationId: record.id,
        notificationType: record.notificationType,
        category: record.category,
        priority: record.priority,
        actionUrl: record.actionUrl ?? '',
      },
    };

    for (const tokenItem of activeTokens) {
      const result = await this.gateway.sendPushNotification(tokenItem.token, pushPayload);

      if (result.success) {
        record.deliveryStatus = 'DELIVERED';
      } else if (result.isTokenExpired) {
        // Automatically invalidate expired FCM token
        this.invalidateDeviceToken(tokenItem.token, result.error);
      } else {
        record.retryCount += 1;
        record.deliveryStatus = 'FAILED';
      }
    }
  }

  /**
   * Evaluates if user preferences and quiet hours permit delivery
   */
  private shouldDeliverToUser(
    prefs: UserNotificationPreferences,
    category: NotificationCategory,
    priority: NotificationPriority
  ): boolean {
    // URGENT violations bypass quiet hours and opt-outs
    if (priority === 'URGENT' || category === 'VIOLATION') {
      return true;
    }

    if (!prefs.inAppEnabled && !prefs.pushEnabled) {
      return false;
    }

    if (category === 'ATTENDANCE_PROMPT' && !prefs.verificationAlerts) {
      return false;
    }
    if (category === 'SYSTEM_UPDATE' && !prefs.assignmentAlerts) {
      return false;
    }
    if (category === 'TECHNICAL_FAILURE' && !prefs.technicalAlerts) {
      return false;
    }

    // Quiet hours check
    if (prefs.quietHoursEnabled && prefs.quietHoursStart && prefs.quietHoursEnd) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = prefs.quietHoursStart.split(':').map(Number);
      const [eh, em] = prefs.quietHoursEnd.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (startMin > endMin) {
        // Overnight (e.g. 22:00 to 07:00)
        if (currentMinutes >= startMin || currentMinutes <= endMin) {
          return false;
        }
      } else {
        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          return false;
        }
      }
    }

    return true;
  }

  // =========================================================================
  // 5. Read/Unread State & Querying
  // =========================================================================

  public markAsRead(notificationId: string, recipientId: string): boolean {
    const item = this.notifications.find(
      (n) => n.id === notificationId && n.recipientId === recipientId
    );
    if (!item) return false;

    item.isRead = true;
    item.readAt = new Date().toISOString();
    return true;
  }

  public markAllAsRead(recipientId: string): number {
    const unread = this.notifications.filter((n) => n.recipientId === recipientId && !n.isRead);
    const now = new Date().toISOString();
    unread.forEach((n) => {
      n.isRead = true;
      n.readAt = now;
    });
    return unread.length;
  }

  public getUnreadCount(recipientId: string): number {
    return this.notifications.filter((n) => n.recipientId === recipientId && !n.isRead).length;
  }

  public getNotificationHistory(
    recipientId: string,
    filter: {
      category?: NotificationCategory;
      eventType?: NotificationEventType;
      unreadOnly?: boolean;
      limit?: number;
    } = {},
    caller?: AuthUser
  ): NotificationRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.id !== recipientId) {
        if (caller.role !== 'admin' && caller.role !== 'super_admin' && caller.role !== 'platform_super_admin') {
          throw new ForbiddenException(`Access denied. Cannot read notifications belonging to user '${recipientId}'.`);
        }
        if (caller.role !== 'platform_super_admin') {
          const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
          const firstRec = this.notifications.find(n => n.recipientId === recipientId);
          if (firstRec && firstRec.institutionId) {
            const notifInst = canonicalizeInstitutionId(firstRec.institutionId);
            if (callerInst !== notifInst) {
              throw new ForbiddenException(`Tenant Isolation Violation: Cannot access notification history of user in another institution.`);
            }
          }
        }
      }
    }

    let items = this.notifications.filter((n) => n.recipientId === recipientId);

    if (filter.category) {
      items = items.filter((n) => n.category === filter.category);
    }
    if (filter.eventType) {
      items = items.filter((n) => n.notificationType === filter.eventType);
    }
    if (filter.unreadOnly) {
      items = items.filter((n) => !n.isRead);
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter.limit && filter.limit > 0) {
      items = items.slice(0, filter.limit);
    }

    return items;
  }

  /**
   * Returns all institutional notifications for administrative delivery analytics.
   */
  public getAllNotifications(caller?: any): NotificationRecord[] {
    if (caller !== undefined) {
      if (caller.role !== 'admin' && caller.role !== 'super_admin' && caller.role !== 'platform_super_admin') {
        throw new ForbiddenException('Access denied. Only Super Admin can access all notification delivery logs.');
      }
      if (caller.role !== 'platform_super_admin') {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        return this.notifications.filter(n => !n.institutionId || canonicalizeInstitutionId(n.institutionId) === callerInst);
      }
    }
    return [...this.notifications];
  }

  /**
   * Injects or seeds notification records for testing and analytics calibration
   */
  public seedNotifications(records: NotificationRecord[]): void {
    this.notifications.push(...records);
  }
}

export const notificationService = new NotificationService();

