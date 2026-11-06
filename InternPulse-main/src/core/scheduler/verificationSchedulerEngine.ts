/**
 * Server-Side Randomized Verification Scheduler Engine
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Implements:
 * 1. Schedule Generation & Stratified Random Distribution (5 windows/day)
 * 2. Window State Machine (SCHEDULED -> OPEN -> SUBMITTED/VERIFIED/MISSED/EXPIRED)
 * 3. Push Notification Dispatch on Window Open
 * 4. Location Telemetry Submission & In-Window Retry Handling
 * 5. Missed Window Discrimination (Non-penalizing vs Confirmed Violation)
 * 6. Anti-Prediction API Safeguards
 */

import {
  VerificationScheduleWindow,
  EligibleAssignment,
  ScheduleGenerationOptions,
  PushNotificationRecord,
  ScheduleSubmissionPayload,
  ScheduleSubmissionResponse,
} from './schedulerTypes';
import { generateRandomizedDailyWindows } from './randomWindowGenerator';
import {
  AssignedGeofenceTarget,
  StudentConsent,
  DeviceLocationMeasurement,
} from '../geolocation/geolocationTypes';
import {
  GeolocationVerificationEngine,
  geolocationVerificationEngine,
} from '../geolocation/geolocationVerificationEngine';
import {
  GeolocationVerificationRepository,
  geolocationVerificationRepository,
} from '../geolocation/geolocationVerificationRepository';
import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy, ForbiddenException } from '../auth/rbac/authorizationPolicy';
import { canonicalizeInstitutionId, DEFAULT_INSTITUTIONS } from '../../data/initialData';

export class VerificationSchedulerEngine {
  private inMemorySchedules: VerificationScheduleWindow[] = [];
  private inMemoryNotifications: PushNotificationRecord[] = [];
  private geoEngine: GeolocationVerificationEngine;
  private geoRepo: GeolocationVerificationRepository;

  constructor(
    geoEngine: GeolocationVerificationEngine = geolocationVerificationEngine,
    geoRepo: GeolocationVerificationRepository = geolocationVerificationRepository
  ) {
    this.geoEngine = geoEngine;
    this.geoRepo = geoRepo;
  }

  /**
   * Resets scheduler state for clean testing
   */
  public reset(): void {
    this.inMemorySchedules = [];
    this.inMemoryNotifications = [];
  }

  // =========================================================================
  // 1. Schedule Generation & Idempotency
  // =========================================================================

  /**
   * Generates and idempotently stores 5 daily verification windows per eligible assignment
   */
  public generateDailySchedules(
    assignments: EligibleAssignment[],
    targetDate: string,
    options: ScheduleGenerationOptions = {},
    targetInstitutionId?: string
  ): { generatedCount: number; existingCount: number; schedules: VerificationScheduleWindow[] } {
    let generatedCount = 0;
    let existingCount = 0;
    const allSchedules: VerificationScheduleWindow[] = [];

    let filteredAssignments = assignments;
    if (targetInstitutionId) {
      const targetInst = canonicalizeInstitutionId(targetInstitutionId);
      filteredAssignments = assignments.filter(a => canonicalizeInstitutionId(a.institutionId) === targetInst);
    }

    for (const assignment of filteredAssignments) {
      // 0. Skip assignments belonging to suspended institutions (Failure / Rollback isolation)
      if (assignment.institutionId) {
        const inst = DEFAULT_INSTITUTIONS.find(i => canonicalizeInstitutionId(i.id) === canonicalizeInstitutionId(assignment.institutionId));
        if (inst && inst.status === 'suspended') {
          continue;
        }
      }

      // 1. Skip inactive assignments
      if (assignment.assignmentStatus !== 'active') {
        continue;
      }

      // 2. Check if schedules already exist for this assignment on the target date (Idempotency)
      const existing = this.inMemorySchedules.filter(
        (s) => s.assignmentId === assignment.assignmentId && s.targetDate === targetDate
      );

      if (existing.length >= (options.windowsPerDay ?? 5)) {
        existingCount += existing.length;
        allSchedules.push(...existing);
        continue;
      }

      // 3. Generate 5 stratified randomized windows
      const newWindows = generateRandomizedDailyWindows(assignment, targetDate, options);
      if (newWindows.length > 0) {
        // If partial existed, purge to ensure clean 5-window generation
        if (existing.length > 0) {
          this.inMemorySchedules = this.inMemorySchedules.filter(
            (s) => !(s.assignmentId === assignment.assignmentId && s.targetDate === targetDate)
          );
        }

        this.inMemorySchedules.push(...newWindows);
        generatedCount += newWindows.length;
        allSchedules.push(...newWindows);
      }
    }

    return { generatedCount, existingCount, schedules: allSchedules };
  }

  // =========================================================================
  // 2. Window State Transitions (Server Cron / Sweep Execution)
  // =========================================================================

  /**
   * Sweeps schedules and processes state transitions based on current wall-clock time:
   * - SCHEDULED -> OPEN (dispatches push notification)
   * - OPEN -> MISSED (if window expired without submission)
   */
  public processWindowTransitions(
    currentTimestamp: string | Date = new Date(),
    targetInstitutionId?: string
  ): {
    openedCount: number;
    missedCount: number;
    dispatchedNotifications: PushNotificationRecord[];
  } {
    const nowMillis =
      typeof currentTimestamp === 'string'
        ? new Date(currentTimestamp).getTime()
        : currentTimestamp.getTime();
    const nowIso = new Date(nowMillis).toISOString();

    let openedCount = 0;
    let missedCount = 0;
    const newlyDispatched: PushNotificationRecord[] = [];

    for (const window of this.inMemorySchedules) {
      // Failure / Rollback Guard: Suppress window transitions and pushes for suspended institutions
      if (window.institutionId) {
        const inst = DEFAULT_INSTITUTIONS.find(i => canonicalizeInstitutionId(i.id) === canonicalizeInstitutionId(window.institutionId));
        if (inst && inst.status === 'suspended') {
          continue;
        }
      }

      if (targetInstitutionId) {
        const targetInst = canonicalizeInstitutionId(targetInstitutionId);
        if (canonicalizeInstitutionId(window.institutionId) !== targetInst) {
          continue;
        }
      }
      const startMillis = new Date(window.windowStart).getTime();
      const endMillis = new Date(window.windowEnd).getTime();

      // Transition 1: SCHEDULED -> OPEN
      if (window.status === 'SCHEDULED' && nowMillis >= startMillis && nowMillis < endMillis) {
        window.status = 'OPEN';
        window.notificationDispatchedAt = nowIso;
        window.updatedAt = nowIso;
        openedCount++;

        // Dispatch server-side push notification
        const notification: PushNotificationRecord = {
          id: `notif-${window.id}-${Date.now()}`,
          recipientId: window.studentId,
          title: 'Internship Attendance Verification Prompt',
          message: 'A 15-minute verification window has opened. Please submit your workplace location.',
          notificationType: 'verification_request',
          actionUrl: '/student/attendance',
          payload: {
            scheduleId: window.id,
            assignmentId: window.assignmentId,
            windowStart: window.windowStart,
            windowEnd: window.windowEnd,
          },
          dispatchedAt: nowIso,
        };

        this.inMemoryNotifications.push(notification);
        newlyDispatched.push(notification);
      }

      // Transition 2: OPEN -> MISSED (Unattended expiration)
      if (window.status === 'OPEN' && nowMillis >= endMillis) {
        window.status = 'MISSED';
        window.missedReason =
          'Verification window expired without student location submission. (Notice: A missed check is not proof of leaving the workplace).';
        window.updatedAt = nowIso;
        missedCount++;
      }

      // Transition 3: LOCATION_UNAVAILABLE -> EXPIRED (If retry window closed)
      if (window.status === 'LOCATION_UNAVAILABLE' && nowMillis >= endMillis) {
        window.status = 'EXPIRED';
        window.missedReason =
          'Verification window closed after location retry attempts were exhausted or timed out.';
        window.updatedAt = nowIso;
      }
    }

    return {
      openedCount,
      missedCount,
      dispatchedNotifications: newlyDispatched,
    };
  }

  // =========================================================================
  // 3. Location Submission & In-Window Retry Handling
  // =========================================================================

  /**
   * Accepts student location submission for an open verification window
   */
  public async submitLocationTelemetry(
    payload: ScheduleSubmissionPayload,
    target: AssignedGeofenceTarget,
    consent?: StudentConsent | null,
    caller?: AuthUser
  ): Promise<ScheduleSubmissionResponse> {
    const window = this.inMemorySchedules.find((s) => s.id === payload.scheduleId);
    if (!window) {
      throw new Error(`Verification schedule window not found: ${payload.scheduleId}`);
    }

    if (caller) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student' && caller.id !== window.studentId) {
        throw new ForbiddenException(`Access denied. Cannot submit location for student '${window.studentId}'.`);
      }
      if (window.institutionId && caller.role !== 'platform_super_admin') {
        AuthorizationPolicy.validateInstitutionScope(caller, window.institutionId);
      }
    }

    if (target.institutionId && window.institutionId) {
      if (canonicalizeInstitutionId(target.institutionId) !== canonicalizeInstitutionId(window.institutionId)) {
        throw new ForbiddenException(`Tenant Isolation Violation: Target geofence institution does not match window institution.`);
      }
    }

    const submissionTime = payload.measurement.timestamp
      ? new Date(payload.measurement.timestamp)
      : new Date();
    const submissionMillis = submissionTime.getTime();
    const windowStartMillis = new Date(window.windowStart).getTime();
    const windowEndMillis = new Date(window.windowEnd).getTime();

    // 1. Validate Window Timing
    if (submissionMillis < windowStartMillis) {
      throw new Error('Verification rejected: Scheduled window has not opened yet.');
    }

    if (submissionMillis >= windowEndMillis) {
      window.status = 'EXPIRED';
      window.updatedAt = new Date().toISOString();
      return {
        success: false,
        scheduleStatus: 'EXPIRED',
        retryAllowed: false,
        remainingRetries: 0,
        message: 'Verification window has already expired. Submission rejected.',
        scheduleWindow: window,
      };
    }

    // 2. Validate Window State (Allow submissions in OPEN or retries in LOCATION_UNAVAILABLE)
    if (window.status !== 'OPEN' && window.status !== 'LOCATION_UNAVAILABLE') {
      throw new Error(`Cannot submit telemetry to window in "${window.status}" state.`);
    }

    // Record submission timestamp
    window.submissionTimestamp = submissionTime.toISOString();
    window.updatedAt = new Date().toISOString();

    // 3. Evaluate Telemetry through Geolocation Verification Engine
    const evalResult = await this.geoRepo.recordVerification(target, payload.measurement, consent);

    // 4. Handle Failure Conditions & Support Retries
    if (
      evalResult.verificationResult === 'LOCATION_UNAVAILABLE' ||
      evalResult.verificationResult === 'GPS_DISABLED' ||
      evalResult.verificationResult === 'LOW_ACCURACY' ||
      evalResult.verificationResult === 'NETWORK_UNAVAILABLE' ||
      evalResult.verificationResult === 'PERMISSION_DENIED'
    ) {
      window.retryCount += 1;
      const canRetry = window.retryCount < window.maxRetries && submissionMillis < windowEndMillis;
      window.status = 'LOCATION_UNAVAILABLE';
      window.verificationId = evalResult.id;
      window.missedReason = evalResult.remarks;

      return {
        success: false,
        scheduleStatus: 'LOCATION_UNAVAILABLE',
        verificationResult: evalResult.verificationResult,
        retryAllowed: canRetry,
        remainingRetries: Math.max(0, window.maxRetries - window.retryCount),
        message: `Location verification failed (${evalResult.verificationResult}). ${
          canRetry
            ? `Retry allowed within the remaining window duration (${window.maxRetries - window.retryCount} retries left).`
            : 'Retry limit reached or window closing.'
        }`,
        scheduleWindow: window,
      };
    }

    // 5. Successful Location Fix
    if (evalResult.verificationResult === 'WITHIN_GEOFENCE') {
      window.status = 'VERIFIED';
      window.verificationId = evalResult.id;
      return {
        success: true,
        scheduleStatus: 'VERIFIED',
        verificationResult: 'WITHIN_GEOFENCE',
        retryAllowed: false,
        remainingRetries: 0,
        message: 'Student physical presence successfully verified within workplace geofence radius.',
        scheduleWindow: window,
      };
    }

    if (evalResult.verificationResult === 'OUTSIDE_GEOFENCE') {
      window.status = 'SUBMITTED';
      window.verificationId = evalResult.id;
      return {
        success: false,
        scheduleStatus: 'SUBMITTED',
        verificationResult: 'OUTSIDE_GEOFENCE',
        retryAllowed: false,
        remainingRetries: 0,
        message: 'Telemetry received: Location confirmed outside approved workplace geofence.',
        scheduleWindow: window,
      };
    }

    // Default fallback
    window.status = 'SUBMITTED';
    window.verificationId = evalResult.id;
    return {
      success: true,
      scheduleStatus: 'SUBMITTED',
      verificationResult: evalResult.verificationResult,
      retryAllowed: false,
      remainingRetries: 0,
      message: evalResult.remarks,
      scheduleWindow: window,
    };
  }

  // =========================================================================
  // 4. Fairness & Anti-Prediction API Safeguards
  // =========================================================================

  /**
   * Student API: Returns ONLY windows that have already opened or past states.
   * STRICTLY EXCLUDES future SCHEDULED windows to prevent students predicting check times!
   */
  public getStudentVisibleSchedules(
    studentId: string,
    currentTimestamp: string | Date = new Date()
  ): VerificationScheduleWindow[] {
    const nowMillis =
      typeof currentTimestamp === 'string'
        ? new Date(currentTimestamp).getTime()
        : currentTimestamp.getTime();

    return this.inMemorySchedules
      .filter((w) => w.studentId === studentId)
      .filter((w) => {
        // Exclude future SCHEDULED windows
        if (w.status === 'SCHEDULED') {
          return new Date(w.windowStart).getTime() <= nowMillis;
        }
        return true;
      })
      .sort((a, b) => new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime());
  }

  /**
   * Mentor & HOD Audit API: Returns full schedule for inspection and compliance
   */
  public getAuditSchedulesForMentorOrHod(filter: {
    assignmentId?: string;
    studentId?: string;
    targetDate?: string;
  } = {}): VerificationScheduleWindow[] {
    return this.inMemorySchedules
      .filter((w) => {
        if (filter.assignmentId && w.assignmentId !== filter.assignmentId) return false;
        if (filter.studentId && w.studentId !== filter.studentId) return false;
        if (filter.targetDate && w.targetDate !== filter.targetDate) return false;
        return true;
      })
      .sort((a, b) => new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime());
  }

  /**
   * Retrieves dispatched push notifications
   */
  public getDispatchedNotifications(recipientId?: string): PushNotificationRecord[] {
    if (recipientId) {
      return this.inMemoryNotifications.filter((n) => n.recipientId === recipientId);
    }
    return [...this.inMemoryNotifications];
  }
}

export const verificationSchedulerEngine = new VerificationSchedulerEngine();

