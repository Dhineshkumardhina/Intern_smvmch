/**
 * Notification Authorization Policy
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Enforces Role-Based Access Control and Recipient Scoping:
 * - HOD: Department-wide and institutional alerts
 * - MENTOR: Alerts restricted strictly to assigned students
 * - STUDENT: Personal alerts only
 */

import { AuthUser } from '../auth/authUser';
import { NotificationRecord, NotificationEventType } from './notificationTypes';
import { canonicalizeInstitutionId } from '../../data/initialData';

export class NotificationAuthorizationPolicy {
  /**
   * Verifies if an actor can read a notification record
   */
  public static canReadNotification(actor: AuthUser, notification: NotificationRecord): boolean {
    if (!actor.isActive) return false;

    // Platform Super Admin has cross-tenant audit visibility
    if (actor.role === 'platform_super_admin') {
      return true;
    }

    // Tenant boundary check: If notification belongs to an institution, non-platform actors must match
    if (notification.institutionId) {
      const actorInst = canonicalizeInstitutionId(actor.institutionId || actor.college);
      const notifInst = canonicalizeInstitutionId(notification.institutionId);
      if (actorInst && notifInst && actorInst !== notifInst) {
        return false;
      }
    }

    // 1. Direct Recipient Access (All roles can read their own personal notifications)
    if (notification.recipientId === actor.id) {
      return true;
    }

    // 2. Institution Admins have institution-wide audit access
    if (actor.role === 'admin' || actor.role === 'super_admin') {
      return true;
    }

    // 3. HODs can read department-level alerts
    if (actor.role === 'hod') {
      const studentDept = notification.payload?.departmentCode;
      if (studentDept && studentDept === actor.departmentCode) {
        return true;
      }
    }

    // Students and Mentors cannot read other users' direct inbox notifications
    return false;
  }

  /**
   * Verifies if a notification event is authorized to be dispatched to a mentor
   */
  public static isMentorAuthorizedForStudent(
    mentorId: string,
    studentMentorId: string
  ): boolean {
    return mentorId === studentMentorId;
  }

  /**
   * Evaluates appropriate recipients for a system event
   */
  public static determineRecipientsForEvent(params: {
    eventType: NotificationEventType;
    studentId: string;
    mentorId?: string | null;
    hodId?: string | null;
  }): string[] {
    const recipients: string[] = [];

    switch (params.eventType) {
      // Events targeted to Student Only
      case 'upcoming_verification':
      case 'verification_request':
        recipients.push(params.studentId);
        break;

      // Events targeted to Student & Assigned Mentor
      case 'successful_verification':
      case 'missed_verification':
      case 'gps_disabled':
      case 'location_permission_revoked':
      case 'student_device_offline':
        recipients.push(params.studentId);
        if (params.mentorId) {
          recipients.push(params.mentorId);
        }
        break;

      // Confirmed Violations escalate to Student, Mentor, AND Department HOD
      case 'confirmed_outside_geofence':
        recipients.push(params.studentId);
        if (params.mentorId) {
          recipients.push(params.mentorId);
        }
        if (params.hodId) {
          recipients.push(params.hodId);
        }
        break;

      // Administrative Placements: Student, Mentor, and HOD
      case 'new_internship_assignment':
      case 'internship_assignment_updated':
        recipients.push(params.studentId);
        if (params.mentorId) {
          recipients.push(params.mentorId);
        }
        if (params.hodId) {
          recipients.push(params.hodId);
        }
        break;
    }

    // Deduplicate array
    return Array.from(new Set(recipients));
  }
}

