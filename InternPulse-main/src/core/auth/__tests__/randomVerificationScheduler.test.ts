import { describe, it, expect, beforeEach } from 'vitest';
import {
  VerificationSchedulerEngine,
  verificationSchedulerEngine,
} from '../../scheduler/verificationSchedulerEngine';
import {
  generateRandomizedDailyWindows,
  parseTimeToMinutes,
  constructIsoUtcTimestamp,
  getTimezoneOffsetMinutes,
} from '../../scheduler/randomWindowGenerator';
import {
  EligibleAssignment,
  ScheduleVerificationState,
  SCHEDULE_VERIFICATION_STATES,
} from '../../scheduler/schedulerTypes';
import { AssignedGeofenceTarget, StudentConsent } from '../../geolocation/geolocationTypes';

/**
 * Phase 8: Server-Side Randomized Location Verification Scheduler Test Suite
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Comprehensive Verification:
 * 1. 5 Randomized windows per eligible student distributed within monitoring hours
 * 2. Unpredictable intervals, no overlaps, and zero duplicate checks
 * 3. Inactive assignment and date-bound safeguards
 * 4. Precise timezone conversions (Asia/Kolkata UTC+05:30)
 * 5. Push notification dispatch when window opens
 * 6. Location submission & timestamp recording
 * 7. In-window retry support for hardware/GPS failures
 * 8. Missed window handling & the Fairness Rule (Missed != Out of Bounds)
 * 9. Anti-prediction API safeguards protecting check secrecy
 */
describe('Phase 8: Server-Side Randomized Verification Scheduler Test Suite', () => {
  // Test Assignment: Harish V at TCS Siruseri Innovation Hub
  const activeAssignment: EligibleAssignment = {
    assignmentId: 'asg-tcs-001',
    studentId: 'usr-student-001',
    locationId: 'loc-tcs-001',
    monitoringStartTime: '09:00:00',
    monitoringEndTime: '18:00:00',
    startDate: '2026-01-05',
    endDate: '2026-06-30',
    assignmentStatus: 'active',
    timezone: 'Asia/Kolkata',
  };

  const geofenceTarget: AssignedGeofenceTarget = {
    assignmentId: 'asg-tcs-001',
    studentId: 'usr-student-001',
    locationId: 'loc-tcs-001',
    targetLatitude: 12.8284,
    targetLongitude: 80.2198,
    geofenceRadiusMeters: 200.0,
    monitoringStartTime: '09:00:00',
    monitoringEndTime: '18:00:00',
    startDate: '2026-01-05',
    endDate: '2026-06-30',
  };

  const validConsent: StudentConsent = {
    studentId: 'usr-student-001',
    consentGiven: true,
    consentTimestamp: '2026-01-05T08:00:00.000Z',
    consentVersion: 'v1.0-SMVEC',
  };

  const targetDate = '2026-03-05';

  beforeEach(() => {
    verificationSchedulerEngine.reset();
  });

  // =========================================================================
  // 1. Canonical Verification States
  // =========================================================================
  describe('1. Canonical Verification States Completeness', () => {
    it('defines all 8 canonical verification schedule states', () => {
      const expectedStates: ScheduleVerificationState[] = [
        'SCHEDULED',
        'OPEN',
        'SUBMITTED',
        'VERIFIED',
        'MISSED',
        'LOCATION_UNAVAILABLE',
        'EXPIRED',
        'CANCELLED',
      ];

      expectedStates.forEach((state) => {
        expect(SCHEDULE_VERIFICATION_STATES[state]).toBe(state);
      });
      expect(Object.keys(SCHEDULE_VERIFICATION_STATES)).toHaveLength(8);
    });
  });

  // =========================================================================
  // 2. Schedule Generation & 5-Window Guarantee
  // =========================================================================
  describe('2. Schedule Generation & Five-Window Distribution', () => {
    it('generates exactly 5 randomized verification windows per eligible student', () => {
      const windows = generateRandomizedDailyWindows(activeAssignment, targetDate);

      expect(windows).toHaveLength(5);
      expect(windows.every((w) => w.studentId === activeAssignment.studentId)).toBe(true);
      expect(windows.every((w) => w.targetDate === targetDate)).toBe(true);
      expect(windows.every((w) => w.status === 'SCHEDULED')).toBe(true);
    });

    it('distributes all 5 windows strictly within configured monitoring hours (09:00 - 18:00)', () => {
      const windows = generateRandomizedDailyWindows(activeAssignment, targetDate);

      // In IST (UTC+05:30):
      // 09:00:00 IST = 03:30:00 UTC
      // 18:00:00 IST = 12:30:00 UTC
      const shiftStartUtcMillis = new Date(`${targetDate}T03:30:00.000Z`).getTime();
      const shiftEndUtcMillis = new Date(`${targetDate}T12:30:00.000Z`).getTime();

      windows.forEach((w, index) => {
        const startMillis = new Date(w.windowStart).getTime();
        const endMillis = new Date(w.windowEnd).getTime();

        // Must start at or after shift start
        expect(startMillis).toBeGreaterThanOrEqual(shiftStartUtcMillis);
        // Must end at or before shift end
        expect(endMillis).toBeLessThanOrEqual(shiftEndUtcMillis);
        // Window duration must be exactly 15 minutes (900,000 ms)
        expect(endMillis - startMillis).toBe(15 * 60 * 1000);
        // Correct window index
        expect(w.windowIndex).toBe(index + 1);
      });
    });

    it('guarantees windows never overlap and maintain minimum separation buffer', () => {
      const windows = generateRandomizedDailyWindows(activeAssignment, targetDate, {
        minBufferBetweenWindowsMinutes: 20,
      });

      for (let i = 0; i < windows.length - 1; i++) {
        const currentEnd = new Date(windows[i].windowEnd).getTime();
        const nextStart = new Date(windows[i + 1].windowStart).getTime();

        // Gap between windows must be at least 20 minutes
        const gapMinutes = (nextStart - currentEnd) / 60000;
        expect(gapMinutes).toBeGreaterThanOrEqual(20);
      }
    });

    it('randomizes window times across different days (unpredictable intervals)', () => {
      // Generate schedules for day 1 and day 2
      const day1 = generateRandomizedDailyWindows(activeAssignment, '2026-03-05', { randomSeed: 1234 });
      const day2 = generateRandomizedDailyWindows(activeAssignment, '2026-03-06', { randomSeed: 9876 });

      expect(day1).toHaveLength(5);
      expect(day2).toHaveLength(5);

      // Compare start times: at least one window should have distinct minute offsets
      const day1MinuteOffsets = day1.map((w) => new Date(w.windowStart).getUTCMinutes());
      const day2MinuteOffsets = day2.map((w) => new Date(w.windowStart).getUTCMinutes());

      const isIdentical = day1MinuteOffsets.every((min, idx) => min === day2MinuteOffsets[idx]);
      expect(isIdentical).toBe(false);
    });
  });

  // =========================================================================
  // 3. Scheduler Reliability & Duplicate Prevention (Idempotency)
  // =========================================================================
  describe('3. Scheduler Reliability & Duplicate Prevention', () => {
    it('ensures idempotent schedule generation without duplicate records', () => {
      // First generation run
      const run1 = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      expect(run1.generatedCount).toBe(5);
      expect(run1.existingCount).toBe(0);

      // Second generation run for the exact same date & assignment
      const run2 = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      expect(run2.generatedCount).toBe(0); // No new duplicates inserted
      expect(run2.existingCount).toBe(5); // Retained existing 5 windows

      // Total schedules in repository remains exactly 5
      const auditSchedules = verificationSchedulerEngine.getAuditSchedulesForMentorOrHod({
        assignmentId: activeAssignment.assignmentId,
        targetDate,
      });
      expect(auditSchedules).toHaveLength(5);
    });

    it('generates 5 windows per eligible student across batch student cohort', () => {
      const student2: EligibleAssignment = {
        ...activeAssignment,
        assignmentId: 'asg-tcs-002',
        studentId: 'usr-student-002',
      };
      const student3: EligibleAssignment = {
        ...activeAssignment,
        assignmentId: 'asg-tcs-003',
        studentId: 'usr-student-003',
      };

      const result = verificationSchedulerEngine.generateDailySchedules(
        [activeAssignment, student2, student3],
        targetDate
      );

      expect(result.generatedCount).toBe(15); // 3 students x 5 windows = 15
      const allSchedules = verificationSchedulerEngine.getAuditSchedulesForMentorOrHod({ targetDate });
      expect(allSchedules).toHaveLength(15);
    });
  });

  // =========================================================================
  // 4. Inactive Assignment & Date Boundary Safeguards
  // =========================================================================
  describe('4. Inactive Assignment & Date Boundary Safeguards', () => {
    it('prevents schedule generation for inactive or completed assignments', () => {
      const inactiveAssignment: EligibleAssignment = {
        ...activeAssignment,
        assignmentStatus: 'completed',
      };

      const windows = generateRandomizedDailyWindows(inactiveAssignment, targetDate);
      expect(windows).toHaveLength(0);

      const res = verificationSchedulerEngine.generateDailySchedules([inactiveAssignment], targetDate);
      expect(res.generatedCount).toBe(0);
    });

    it('prevents schedule generation prior to assignment start date', () => {
      // Start date is 2026-01-05; target date in December 2025
      const preDate = '2025-12-20';
      const windows = generateRandomizedDailyWindows(activeAssignment, preDate);
      expect(windows).toHaveLength(0);
    });

    it('prevents schedule generation after assignment end date', () => {
      // End date is 2026-06-30; target date in July 2026
      const postDate = '2026-07-15';
      const windows = generateRandomizedDailyWindows(activeAssignment, postDate);
      expect(windows).toHaveLength(0);
    });
  });

  // =========================================================================
  // 5. Timezone Correctness
  // =========================================================================
  describe('5. Timezone Handling & Precision', () => {
    it('accurately converts Indian Standard Time (Asia/Kolkata +05:30) to UTC ISO timestamps', () => {
      expect(getTimezoneOffsetMinutes('Asia/Kolkata')).toBe(330);

      // 09:00:00 IST = 540 minutes from midnight IST
      // 540 - 330 = 210 minutes from midnight UTC = 03:30:00 UTC
      const isoStart = constructIsoUtcTimestamp('2026-03-05', 540, 'Asia/Kolkata');
      expect(isoStart).toBe('2026-03-05T03:30:00.000Z');

      // 18:00:00 IST = 1080 minutes from midnight IST
      // 1080 - 330 = 750 minutes from midnight UTC = 12:30:00 UTC
      const isoEnd = constructIsoUtcTimestamp('2026-03-05', 1080, 'Asia/Kolkata');
      expect(isoEnd).toBe('2026-03-05T12:30:00.000Z');
    });

    it('supports UTC timezone directly without offset shift', () => {
      expect(getTimezoneOffsetMinutes('UTC')).toBe(0);
      const isoUtc = constructIsoUtcTimestamp('2026-03-05', 540, 'UTC');
      expect(isoUtc).toBe('2026-03-05T09:00:00.000Z');
    });
  });

  // =========================================================================
  // 6. Push Notification Dispatch on Window Open
  // =========================================================================
  describe('6. Push Notification Dispatch & Window Transitions', () => {
    it('dispatches push notification when verification window opens', () => {
      // Generate schedules
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];

      // Time before window 1 opens
      const beforeWindow = new Date(new Date(window1.windowStart).getTime() - 60000);
      const resBefore = verificationSchedulerEngine.processWindowTransitions(beforeWindow);
      expect(resBefore.openedCount).toBe(0);
      expect(resBefore.dispatchedNotifications).toHaveLength(0);

      // Time exactly at window 1 open
      const atWindowOpen = new Date(new Date(window1.windowStart).getTime() + 1000);
      const resOpen = verificationSchedulerEngine.processWindowTransitions(atWindowOpen);

      expect(resOpen.openedCount).toBe(1);
      expect(resOpen.dispatchedNotifications).toHaveLength(1);

      const notif = resOpen.dispatchedNotifications[0];
      expect(notif.recipientId).toBe(activeAssignment.studentId);
      expect(notif.notificationType).toBe('verification_request');
      expect(notif.title).toContain('Attendance Verification Prompt');
      expect(notif.payload.scheduleId).toBe(window1.id);

      // Verify schedule window status updated to OPEN
      expect(window1.status).toBe('OPEN');
      expect(window1.notificationDispatchedAt).toBeDefined();
    });
  });

  // =========================================================================
  // 7. Student Location Submission & Outcome Recording
  // =========================================================================
  describe('7. Student Location Submission & Outcome Recording', () => {
    it('records valid location submission and updates window to VERIFIED', async () => {
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];

      // Open the window
      const openTime = new Date(new Date(window1.windowStart).getTime() + 30000);
      verificationSchedulerEngine.processWindowTransitions(openTime);
      expect(window1.status).toBe('OPEN');

      // Student submits inside-geofence location
      const response = await verificationSchedulerEngine.submitLocationTelemetry(
        {
          scheduleId: window1.id,
          studentId: activeAssignment.studentId,
          measurement: {
            latitude: geofenceTarget.targetLatitude,
            longitude: geofenceTarget.targetLongitude,
            accuracyMeters: 6.0,
            timestamp: openTime,
            gpsAvailable: true,
            permissionStatus: 'GRANTED',
            connectivityStatus: 'WIFI',
          },
        },
        geofenceTarget,
        validConsent
      );

      expect(response.success).toBe(true);
      expect(response.scheduleStatus).toBe('VERIFIED');
      expect(response.verificationResult).toBe('WITHIN_GEOFENCE');
      expect(window1.status).toBe('VERIFIED');
      expect(window1.submissionTimestamp).toBe(openTime.toISOString());
      expect(window1.verificationId).toBeDefined();
    });

    it('rejects submissions before window opens', async () => {
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];

      const earlyTime = new Date(new Date(window1.windowStart).getTime() - 120000);

      await expect(
        verificationSchedulerEngine.submitLocationTelemetry(
          {
            scheduleId: window1.id,
            studentId: activeAssignment.studentId,
            measurement: {
              latitude: geofenceTarget.targetLatitude,
              longitude: geofenceTarget.targetLongitude,
              accuracyMeters: 5.0,
              timestamp: earlyTime,
              gpsAvailable: true,
              permissionStatus: 'GRANTED',
              connectivityStatus: 'WIFI',
            },
          },
          geofenceTarget,
          validConsent
        )
      ).rejects.toThrow('Scheduled window has not opened yet');
    });

    it('rejects submissions after window closes as EXPIRED', async () => {
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];

      // Open the window first
      const openTime = new Date(new Date(window1.windowStart).getTime() + 10000);
      verificationSchedulerEngine.processWindowTransitions(openTime);

      // Submission arrives after windowEnd
      const lateTime = new Date(new Date(window1.windowEnd).getTime() + 5000);

      const response = await verificationSchedulerEngine.submitLocationTelemetry(
        {
          scheduleId: window1.id,
          studentId: activeAssignment.studentId,
          measurement: {
            latitude: geofenceTarget.targetLatitude,
            longitude: geofenceTarget.targetLongitude,
            accuracyMeters: 5.0,
            timestamp: lateTime,
            gpsAvailable: true,
            permissionStatus: 'GRANTED',
            connectivityStatus: 'WIFI',
          },
        },
        geofenceTarget,
        validConsent
      );

      expect(response.success).toBe(false);
      expect(response.scheduleStatus).toBe('EXPIRED');
      expect(response.message).toContain('already expired');
    });
  });

  // =========================================================================
  // 8. In-Window Retry Handling for Hardware Failures
  // =========================================================================
  describe('8. In-Window Retry Handling for Location/Hardware Failures', () => {
    it('supports in-window retries when location fix is unavailable or GPS disabled', async () => {
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];

      // Open window
      const openTime = new Date(new Date(window1.windowStart).getTime() + 20000);
      verificationSchedulerEngine.processWindowTransitions(openTime);

      // Attempt 1: GPS disabled
      const attempt1 = await verificationSchedulerEngine.submitLocationTelemetry(
        {
          scheduleId: window1.id,
          studentId: activeAssignment.studentId,
          measurement: {
            latitude: null,
            longitude: null,
            accuracyMeters: null,
            timestamp: openTime,
            gpsAvailable: false, // GPS off
            permissionStatus: 'GRANTED',
            connectivityStatus: 'WIFI',
          },
        },
        geofenceTarget,
        validConsent
      );

      expect(attempt1.success).toBe(false);
      expect(attempt1.scheduleStatus).toBe('LOCATION_UNAVAILABLE');
      expect(attempt1.verificationResult).toBe('GPS_DISABLED');
      expect(attempt1.retryAllowed).toBe(true);
      expect(attempt1.remainingRetries).toBe(2);
      expect(window1.retryCount).toBe(1);

      // Attempt 2: Student turns on GPS and retries inside the same open window
      const retryTime = new Date(openTime.getTime() + 60000);
      const attempt2 = await verificationSchedulerEngine.submitLocationTelemetry(
        {
          scheduleId: window1.id,
          studentId: activeAssignment.studentId,
          measurement: {
            latitude: geofenceTarget.targetLatitude,
            longitude: geofenceTarget.targetLongitude,
            accuracyMeters: 8.0,
            timestamp: retryTime,
            gpsAvailable: true, // Fixed!
            permissionStatus: 'GRANTED',
            connectivityStatus: 'WIFI',
          },
        },
        geofenceTarget,
        validConsent
      );

      expect(attempt2.success).toBe(true);
      expect(attempt2.scheduleStatus).toBe('VERIFIED');
      expect(attempt2.verificationResult).toBe('WITHIN_GEOFENCE');
      expect(window1.status).toBe('VERIFIED');
    });
  });

  // =========================================================================
  // 9. Missed Window Handling & The Fairness Rule
  // =========================================================================
  describe('9. Missed Window Handling & The Fairness Rule', () => {
    it('FAIRNESS RULE: Transitions unattended open window to MISSED without accusing student of out-of-bounds', () => {
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];

      // 1. Window opens
      const openTime = new Date(new Date(window1.windowStart).getTime() + 1000);
      verificationSchedulerEngine.processWindowTransitions(openTime);
      expect(window1.status).toBe('OPEN');

      // 2. Student never responds. Wall clock advances past windowEnd
      const postWindowTime = new Date(new Date(window1.windowEnd).getTime() + 1000);
      const sweepRes = verificationSchedulerEngine.processWindowTransitions(postWindowTime);

      expect(sweepRes.missedCount).toBe(1);
      expect(window1.status).toBe('MISSED');
      expect(window1.missedReason).toContain('A missed check is not proof of leaving the workplace');

      // CRITICAL FAIRNESS CHECK: Window status is MISSED, NOT OUTSIDE_GEOFENCE
      expect(window1.status).not.toBe('SUBMITTED');
    });

    it('cleanly distinguishes confirmed out-of-bounds from missed check and hardware failures', async () => {
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];
      const window2 = schedules[1];

      // Case A: Confirmed Out-of-bounds (Valid GPS fix 1200m away with 8m accuracy)
      const openTime1 = new Date(new Date(window1.windowStart).getTime() + 10000);
      verificationSchedulerEngine.processWindowTransitions(openTime1);

      const outOfBoundsRes = await verificationSchedulerEngine.submitLocationTelemetry(
        {
          scheduleId: window1.id,
          studentId: activeAssignment.studentId,
          measurement: {
            latitude: 12.8390, // ~1300m away
            longitude: 80.2250,
            accuracyMeters: 8.0,
            timestamp: openTime1,
            gpsAvailable: true,
            permissionStatus: 'GRANTED',
            connectivityStatus: 'CELLULAR',
          },
        },
        geofenceTarget,
        validConsent
      );

      expect(outOfBoundsRes.verificationResult).toBe('OUTSIDE_GEOFENCE');
      expect(window1.status).toBe('SUBMITTED');

      // Case B: Missed check on window 2
      const openTime2 = new Date(new Date(window2.windowStart).getTime() + 10000);
      verificationSchedulerEngine.processWindowTransitions(openTime2);
      const postWindow2 = new Date(new Date(window2.windowEnd).getTime() + 5000);
      verificationSchedulerEngine.processWindowTransitions(postWindow2);

      expect(window2.status).toBe('MISSED');

      // These two cases are completely distinct in reporting and database audit
      expect(window1.status).not.toBe(window2.status);
    });
  });

  // =========================================================================
  // 10. Anti-Prediction API Safeguards
  // =========================================================================
  describe('10. Anti-Prediction API Safeguards', () => {
    it('STUDENT API: Strictly hides future SCHEDULED windows to prevent predicting check times', () => {
      const { schedules } = verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);
      const window1 = schedules[0];

      // Current time is before window 1 opens
      const earlyMorning = new Date(new Date(window1.windowStart).getTime() - 3600000); // 1 hour before

      // Student calls API
      const studentView = verificationSchedulerEngine.getStudentVisibleSchedules(
        activeAssignment.studentId,
        earlyMorning
      );

      // Student sees NOTHING because all 5 checks are in future SCHEDULED state
      expect(studentView).toHaveLength(0);

      // Now time advances and window 1 opens
      const atWindow1 = new Date(new Date(window1.windowStart).getTime() + 1000);
      verificationSchedulerEngine.processWindowTransitions(atWindow1);

      const studentViewDuringWindow1 = verificationSchedulerEngine.getStudentVisibleSchedules(
        activeAssignment.studentId,
        atWindow1
      );

      // Student only sees Window 1 (which is currently OPEN). Windows 2-5 remain hidden!
      expect(studentViewDuringWindow1).toHaveLength(1);
      expect(studentViewDuringWindow1[0].id).toBe(window1.id);
      expect(studentViewDuringWindow1[0].status).toBe('OPEN');
    });

    it('MENTOR & HOD AUDIT API: Allows mentors to audit the full daily schedule of all 5 windows', () => {
      verificationSchedulerEngine.generateDailySchedules([activeAssignment], targetDate);

      const mentorAuditView = verificationSchedulerEngine.getAuditSchedulesForMentorOrHod({
        assignmentId: activeAssignment.assignmentId,
        targetDate,
      });

      // Mentor sees all 5 windows for oversight and compliance auditing
      expect(mentorAuditView).toHaveLength(5);
      expect(mentorAuditView.every((w) => w.assignmentId === activeAssignment.assignmentId)).toBe(true);
    });
  });
});

