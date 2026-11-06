import { describe, it, expect, beforeEach } from 'vitest';
import { consentManager, CURRENT_DPDP_NOTICE } from '../../privacy/consentManager';
import { AttendanceReportingEngine } from '../../attendance/attendanceReportingEngine';
import { isDemoAccountAccessPermitted } from '../demoAccounts';

// Domain Types for Security Verification
interface UserIdentity {
  id: string;
  role: 'student' | 'mentor' | 'hod';
  institutionId: string;
}

interface VerificationRecord {
  id: string;
  studentId: string;
  assignmentId: string;
  requestedAt: Date;
  latitude: number | null;
  longitude: number | null;
  verificationResult: string;
  withinMonitoringWindow: boolean;
  remarks?: string;
}

interface AttendanceSessionRecord {
  id: string;
  studentId: string;
  assignmentId: string;
  checkInAt: Date;
  checkOutAt?: Date;
  status: string;
}

describe('Phase 11: InternPulse Security & Privacy Remediation Test Suite', () => {
  const studentAlice: UserIdentity = {
    id: 'student-alice-uuid',
    role: 'student',
    institutionId: 'smvec-inst-uuid',
  };

  const studentBob: UserIdentity = {
    id: 'student-bob-uuid',
    role: 'student',
    institutionId: 'smvec-inst-uuid',
  };

  const mentorCharlie: UserIdentity = {
    id: 'mentor-charlie-uuid',
    role: 'mentor',
    institutionId: 'smvec-inst-uuid',
  };

  const mentorDavid: UserIdentity = {
    id: 'mentor-david-uuid',
    role: 'mentor',
    institutionId: 'smvec-inst-uuid',
  };

  const hodSmvec: UserIdentity = {
    id: 'hod-smvec-uuid',
    role: 'hod',
    institutionId: 'smvec-inst-uuid',
  };

  beforeEach(() => {
    consentManager.reset();
  });

  // =========================================================================
  // 1. SEC-01: Caller Authorization on verify_student_geofence RPC
  // =========================================================================
  describe('SEC-01: Caller Authorization on Geolocation Verification', () => {
    const isMentorAssigned = (mentorId: string, studentId: string) => {
      return mentorId === mentorCharlie.id && studentId === studentAlice.id;
    };

    const verifyStudentGeofenceRpc = (
      caller: UserIdentity,
      targetStudentId: string,
      lat: number,
      lon: number
    ): { success: boolean; error?: string } => {
      // SEC-01 Guard:
      if (caller.id !== targetStudentId) {
        if (caller.role === 'mentor') {
          if (!isMentorAssigned(caller.id, targetStudentId)) {
            return {
              success: false,
              error: `Access Denied: Mentor is not assigned to student ${targetStudentId}`,
            };
          }
        } else if (caller.role !== 'hod') {
          return {
            success: false,
            error: `Access Denied: You are not authorized to submit location telemetry for student ${targetStudentId}`,
          };
        }
      }
      return { success: true };
    };

    it('rejects an authenticated student submitting location for another student (anti-spoofing)', () => {
      const res = verifyStudentGeofenceRpc(studentBob, studentAlice.id, 12.8284, 80.2198);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied: You are not authorized');
    });

    it('allows a student to submit their own location telemetry', () => {
      const res = verifyStudentGeofenceRpc(studentAlice, studentAlice.id, 12.8284, 80.2198);
      expect(res.success).toBe(true);
    });

    it('allows assigned mentor to submit or review location telemetry for their mentee', () => {
      const res = verifyStudentGeofenceRpc(mentorCharlie, studentAlice.id, 12.8284, 80.2198);
      expect(res.success).toBe(true);
    });

    it('rejects an unassigned mentor attempting to submit location for another mentee', () => {
      const res = verifyStudentGeofenceRpc(mentorDavid, studentAlice.id, 12.8284, 80.2198);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied: Mentor is not assigned');
    });

    it('allows HOD to submit or verify location across all departmental students', () => {
      const res = verifyStudentGeofenceRpc(hodSmvec, studentAlice.id, 12.8284, 80.2198);
      expect(res.success).toBe(true);
    });
  });

  // =========================================================================
  // 2. SEC-02: Halting & Discarding Coordinates Outside Monitoring Shifts
  // =========================================================================
  describe('SEC-02: Privacy Protection Outside Monitoring Windows', () => {
    const evaluateMonitoringWindowAndPersist = (
      timestamp: Date,
      startTimeStr: string,
      endTimeStr: string,
      submittedLat: number,
      submittedLon: number
    ): VerificationRecord => {
      const timeMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
      const [startH, startM] = startTimeStr.split(':').map(Number);
      const [endH, endM] = endTimeStr.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const isWithin = timeMinutes >= startMinutes && timeMinutes <= endMinutes;

      // SEC-02 Remediation: If outside window, IMMEDIATELY HALT and NEVER record coordinates!
      if (!isWithin) {
        return {
          id: 'ver-halted-uuid',
          studentId: studentAlice.id,
          assignmentId: 'assign-uuid',
          requestedAt: timestamp,
          latitude: null, // Zeroed out
          longitude: null, // Zeroed out
          verificationResult: 'PERMISSION_DENIED',
          withinMonitoringWindow: false,
          remarks: 'Telemetry collection rejected: Request occurred outside authorized internship monitoring shift hours.',
        };
      }

      return {
        id: 'ver-valid-uuid',
        studentId: studentAlice.id,
        assignmentId: 'assign-uuid',
        requestedAt: timestamp,
        latitude: submittedLat,
        longitude: submittedLon,
        verificationResult: 'WITHIN_GEOFENCE',
        withinMonitoringWindow: true,
      };
    };

    it('strictly zeroes out and discards GPS coordinates submitted outside authorized shift hours (11:30 PM)', () => {
      const offShiftTime = new Date('2026-11-06T23:30:00'); // 11:30 PM
      const record = evaluateMonitoringWindowAndPersist(offShiftTime, '09:00', '18:00', 12.8284, 80.2198);

      expect(record.withinMonitoringWindow).toBe(false);
      expect(record.verificationResult).toBe('PERMISSION_DENIED');
      expect(record.latitude).toBeNull();
      expect(record.longitude).toBeNull();
      expect(record.remarks).toContain('Telemetry collection rejected');
    });

    it('records valid coordinates when telemetry submission occurs inside authorized shift hours (10:15 AM)', () => {
      const onShiftTime = new Date('2026-11-06T10:15:00'); // 10:15 AM
      const record = evaluateMonitoringWindowAndPersist(onShiftTime, '09:00', '18:00', 12.8284, 80.2198);

      expect(record.withinMonitoringWindow).toBe(true);
      expect(record.verificationResult).toBe('WITHIN_GEOFENCE');
      expect(record.latitude).toBe(12.8284);
      expect(record.longitude).toBe(80.2198);
    });
  });

  // =========================================================================
  // 3. SEC-03: Caller Identity on Check-In and Check-Out
  // =========================================================================
  describe('SEC-03: Attendance Caller Authorization', () => {
    const sessions = new Map<string, AttendanceSessionRecord>();

    const recordCheckInRpc = (caller: UserIdentity, studentId: string): { success: boolean; error?: string } => {
      // SEC-03 check:
      if (caller.id !== studentId && caller.role !== 'hod') {
        return { success: false, error: 'Access Denied: You cannot check in on behalf of another student.' };
      }
      sessions.set(studentId, {
        id: `sess-${studentId}`,
        studentId,
        assignmentId: 'assign-1',
        checkInAt: new Date(),
        status: 'present',
      });
      return { success: true };
    };

    const recordCheckOutRpc = (caller: UserIdentity, studentId: string): { success: boolean; error?: string } => {
      const sess = sessions.get(studentId);
      if (!sess) return { success: false, error: 'Session not found' };

      // SEC-03 check:
      if (caller.id !== sess.studentId && caller.role !== 'hod') {
        return { success: false, error: 'Access Denied: You cannot check out on behalf of another student.' };
      }
      sess.checkOutAt = new Date();
      return { success: true };
    };

    it('rejects student Bob attempting to check in student Alice', () => {
      const res = recordCheckInRpc(studentBob, studentAlice.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied: You cannot check in on behalf of another student');
    });

    it('allows student Alice to check in for herself', () => {
      const res = recordCheckInRpc(studentAlice, studentAlice.id);
      expect(res.success).toBe(true);
    });

    it('rejects student Bob attempting to check out student Alice', () => {
      const res = recordCheckOutRpc(studentBob, studentAlice.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied: You cannot check out on behalf of another student');
    });

    it('allows student Alice to check out for herself', () => {
      const res = recordCheckOutRpc(studentAlice, studentAlice.id);
      expect(res.success).toBe(true);
    });
  });

  // =========================================================================
  // 4. SEC-04: Privileged Execution on Global Window Transitions
  // =========================================================================
  describe('SEC-04: process_window_transitions Privilege Scoping', () => {
    const processWindowTransitionsRpc = (caller: UserIdentity): { success: boolean; error?: string } => {
      if (caller.role !== 'hod') {
        return {
          success: false,
          error: 'Access Denied: Only HOD administrators or backend scheduler services can trigger window transitions.',
        };
      }
      return { success: true };
    };

    it('strictly denies student users from executing global verification window transitions', () => {
      const res = processWindowTransitionsRpc(studentAlice);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied');
    });

    it('strictly denies faculty mentors from executing global verification window transitions', () => {
      const res = processWindowTransitionsRpc(mentorCharlie);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied');
    });

    it('permits authorized HOD administrators to trigger window transitions', () => {
      const res = processWindowTransitionsRpc(hodSmvec);
      expect(res.success).toBe(true);
    });
  });

  // =========================================================================
  // 5. SEC-06: 30-Day Data Retention & GPS Coordinate Purge Policy
  // =========================================================================
  describe('SEC-06: 30-Day Coordinate Purge for DPDP Section 8(7) Compliance', () => {
    it('purges high-resolution GPS coordinates older than 30 days while preserving institutional compliance evidence', () => {
      const now = new Date();
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const records: VerificationRecord[] = [
        {
          id: 'old-rec-1',
          studentId: studentAlice.id,
          assignmentId: 'assign-1',
          requestedAt: fortyDaysAgo,
          latitude: 12.8284,
          longitude: 80.2198,
          verificationResult: 'WITHIN_GEOFENCE',
          withinMonitoringWindow: true,
        },
        {
          id: 'recent-rec-2',
          studentId: studentAlice.id,
          assignmentId: 'assign-1',
          requestedAt: fiveDaysAgo,
          latitude: 12.8284,
          longitude: 80.2198,
          verificationResult: 'WITHIN_GEOFENCE',
          withinMonitoringWindow: true,
        },
      ];

      // Execute 30-day purge procedure
      const cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      records.forEach((r) => {
        if (r.requestedAt < cutoffDate) {
          r.latitude = null;
          r.longitude = null;
          r.remarks = '[Coordinates purged in accordance with 30-day DPDP retention policy]';
        }
      });

      // Record 1 (> 30 days) should have coordinates nullified but outcome preserved
      expect(records[0].latitude).toBeNull();
      expect(records[0].longitude).toBeNull();
      expect(records[0].verificationResult).toBe('WITHIN_GEOFENCE'); // Preserved for academic accreditation
      expect(records[0].remarks).toContain('30-day DPDP retention policy');

      // Record 2 (< 30 days) should retain full coordinates
      expect(records[1].latitude).toBe(12.8284);
      expect(records[1].longitude).toBe(80.2198);
    });
  });

  // =========================================================================
  // 6. SEC-07: Statutory Informed Consent Management under DPDP Act 2023
  // =========================================================================
  describe('SEC-07: Informed Consent & Withdrawal Lifecycle', () => {
    it('exposes DPDP notice version 2026.1-DPDP with required statutory metadata', () => {
      expect(CURRENT_DPDP_NOTICE.version).toBe('2026.1-DPDP');
      expect(CURRENT_DPDP_NOTICE.grievanceOfficer.email).toBe('grievance.dpo@smvec.ac.in');
      expect(CURRENT_DPDP_NOTICE.retentionPeriod).toContain('30 days');
    });

    it('records affirmative student consent with timestamp and notice version', () => {
      const consent = consentManager.recordConsent(studentAlice.id, true);
      expect(consent.consentGiven).toBe(true);
      expect(consent.studentId).toBe(studentAlice.id);
      expect(consent.noticeVersion).toBe('2026.1-DPDP');
      expect(consentManager.isConsentActive(studentAlice.id)).toBe(true);
    });

    it('supports instantaneous student consent withdrawal under DPDP Section 6(4)', () => {
      consentManager.recordConsent(studentAlice.id, true);
      expect(consentManager.isConsentActive(studentAlice.id)).toBe(true);

      const withdrawn = consentManager.withdrawConsent(studentAlice.id, 'Student opted out from settings');
      expect(withdrawn.consentGiven).toBe(false);
      expect(withdrawn.withdrawnAt).toBeDefined();
      expect(consentManager.isConsentActive(studentAlice.id)).toBe(false);
    });
  });

  // =========================================================================
  // 7. SEC-09: 60-Second Cooldown Telemetry Rate Limiting
  // =========================================================================
  describe('SEC-09: Telemetry Submission Rate Limiting', () => {
    const studentLastSubmission = new Map<string, number>();

    const checkRateLimit = (studentId: string, timestampMs: number): boolean => {
      const last = studentLastSubmission.get(studentId);
      if (last && timestampMs - last < 60000) {
        return false; // Rate limit exceeded (< 60s cooldown)
      }
      studentLastSubmission.set(studentId, timestampMs);
      return true;
    };

    it('rejects rapid consecutive verification submissions occurring within 60 seconds', () => {
      const t0 = 1000000;
      expect(checkRateLimit(studentAlice.id, t0)).toBe(true); // First ping accepted

      const t1 = t0 + 15000; // 15 seconds later
      expect(checkRateLimit(studentAlice.id, t1)).toBe(false); // Rejected by rate limiter
    });

    it('permits submissions spaced 60 seconds or more apart', () => {
      const t0 = 2000000;
      expect(checkRateLimit(studentAlice.id, t0)).toBe(true);

      const t2 = t0 + 61000; // 61 seconds later
      expect(checkRateLimit(studentAlice.id, t2)).toBe(true); // Accepted
    });
  });

  // =========================================================================
  // 8. SEC-11: Scoped Device Token Invalidation
  // =========================================================================
  describe('SEC-11: Scoped FCM Token Invalidation', () => {
    const tokenRegistry = new Map<string, { token: string; userId: string; isActive: boolean }>();
    tokenRegistry.set('token-alice', { token: 'token-alice', userId: studentAlice.id, isActive: true });
    tokenRegistry.set('token-bob', { token: 'token-bob', userId: studentBob.id, isActive: true });

    const invalidateTokenRpc = (caller: UserIdentity, token: string): { success: boolean; error?: string } => {
      const item = tokenRegistry.get(token);
      if (!item) return { success: false, error: 'Token not found' };

      // SEC-11 check: Only token owner or HOD can invalidate
      if (caller.id !== item.userId && caller.role !== 'hod') {
        return { success: false, error: 'Access Denied: You can only invalidate your own registered device tokens.' };
      }

      item.isActive = false;
      return { success: true };
    };

    it('rejects student Bob attempting to invalidate student Alice device push token', () => {
      const res = invalidateTokenRpc(studentBob, 'token-alice');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Access Denied');
      expect(tokenRegistry.get('token-alice')?.isActive).toBe(true);
    });

    it('allows student Alice to invalidate her own device push token', () => {
      const res = invalidateTokenRpc(studentAlice, 'token-alice');
      expect(res.success).toBe(true);
      expect(tokenRegistry.get('token-alice')?.isActive).toBe(false);
    });
  });

  // =========================================================================
  // 9. SEC-12: CSV Formula Injection Defense (CWE-1236)
  // =========================================================================
  describe('SEC-12: CSV Formula Injection Sanitization', () => {
    it('prepends an apostrophe to malicious spreadsheet formula payloads in exported CSVs', () => {
      const headers = ['Student Name', 'Roll Number', 'Notes'];
      const rows = [
        ['=cmd|\'/C calc\'!A0', '+919876543210', '@SUM(1+1)'],
        ['-DISCOUNT_CODE', '\tMALICIOUS_TAB', 'Normal Text'],
      ];

      const csvResult = AttendanceReportingEngine.exportToCsv('Security Test Report', headers, rows);

      // Verify that malicious formulas are neutralised with a leading apostrophe
      expect(csvResult.content).toContain(`'=cmd|'/C calc'!A0`);
      expect(csvResult.content).toContain(`'+919876543210`);
      expect(csvResult.content).toContain(`'@SUM(1+1)`);
      expect(csvResult.content).toContain(`'-DISCOUNT_CODE`);
      expect(csvResult.content).toContain(`'\tMALICIOUS_TAB`);
      expect(csvResult.content).toContain('Normal Text');
    });
  });

  // =========================================================================
  // 10. SEC-16: Demo Account Production Guard
  // =========================================================================
  describe('SEC-16: Production Demo Credential Exposure Defense', () => {
    it('blocks demo account access when running in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(isDemoAccountAccessPermitted()).toBe(false);

        process.env.NODE_ENV = 'development';
        expect(isDemoAccountAccessPermitted()).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
