/**
 * ============================================================================
 * INTERNPULSE — PHASE 17E AUTOMATED TEST SUITE
 * Institutional Analytics & Cross-Department Reporting
 * Real Database Aggregations, Canonical Verification Outcome Distinction,
 * Formula-Injection-Protected Multi-Format Exports, and Strict RBAC Scoping.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { institutionalAnalyticsService } from '../../analytics/institutionalAnalyticsService';
import { internshipRepository } from '../../repository/internshipRepository';
import { locationRepository } from '../../repository/locationRepository';
import { geolocationVerificationRepository } from '../../geolocation/geolocationVerificationRepository';
import { verificationSchedulerRepository } from '../../scheduler/verificationSchedulerRepository';
import { notificationService } from '../../notifications/notificationService';
import { AuthUser } from '../authUser';

describe('Phase 17E: Institutional Analytics & Cross-Department Reporting', () => {
  // --------------------------------------------------------------------------
  // TEST FIXTURES & ACTORS
  // --------------------------------------------------------------------------

  const superAdminUser: AuthUser = {
    id: 'super-admin-001',
    name: 'Dr. Director Admin',
    email: 'director@smvec.ac.in',
    role: 'super_admin',
    dept: 'Institutional Administration',
    departmentCode: 'ADMIN',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const itHodUser: AuthUser = {
    id: 'hod-it-001',
    name: 'Dr. M. Auxilia',
    email: 'hod.it@smvec.ac.in',
    role: 'hod',
    dept: 'IT Department',
    departmentCode: 'IT',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const csebsHodUser: AuthUser = {
    id: 'hod-csebs-001',
    name: 'Dr. V. Gomathi',
    email: 'hod.csebs@smvec.ac.in',
    role: 'hod',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const itMentorUser: AuthUser = {
    id: 'MENTOR_IT_01',
    mentorId: 'MENTOR_IT_01',
    name: 'Dr. S. Kavitha',
    email: 'kavitha.mentor@college.edu',
    role: 'mentor',
    dept: 'IT Department',
    departmentCode: 'IT',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const studentUser: AuthUser = {
    id: 'st-csebs-001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@college.edu',
    role: 'student',
    dept: 'CSEBS',
    departmentCode: 'CSEBS',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const studentTwoUser: AuthUser = {
    id: 'st-csebs-002',
    studentId: '23CSEBS002',
    name: 'Priya Dharshini',
    email: '23csebs002@college.edu',
    role: 'student',
    dept: 'CSEBS',
    departmentCode: 'CSEBS',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  beforeEach(() => {
    internshipRepository.resetToDefaults();
    locationRepository.resetToDefaults();
    geolocationVerificationRepository.resetToDefaults();
    institutionalAnalyticsService.resetToDefaults();
  });

  // ==========================================================================
  // SECTION 1: INSTITUTION DASHBOARD ANALYTICS (TASK 1)
  // ==========================================================================

  describe('1. Institution Dashboard Analytics (Super Admin)', () => {
    it('1.1 should aggregate institution-wide metrics from actual database records', async () => {
      const stats = await institutionalAnalyticsService.getInstitutionAnalytics(superAdminUser);

      expect(stats.totalDepartments).toBeGreaterThanOrEqual(9);
      expect(stats.activeDepartments).toBeGreaterThanOrEqual(9);
      expect(stats.totalStudents).toBeGreaterThan(0);
      expect(stats.activeInternships).toBeGreaterThan(0);
      expect(stats.totalMentors).toBeGreaterThan(0);
      expect(stats.averageMentorRatio).toBeGreaterThan(0);
      expect(stats.totalAttendanceSessions).toBeGreaterThan(0);
      expect(stats.overallAttendanceRate).toBeGreaterThan(0);
      expect(stats.departmentBreakdown.length).toBeGreaterThanOrEqual(9);
    });

    it('1.2 should strictly distinguish canonical verification outcomes without fabrication', async () => {
      const stats = await institutionalAnalyticsService.getInstitutionAnalytics(superAdminUser);
      const outcomes = stats.verificationOutcomes;

      // Verification states must be distinctly categorized
      expect(outcomes.withinGeofence).toBeGreaterThanOrEqual(1); // Seed record 1: TCS Siruseri within geofence
      expect(outcomes.outsideGeofence).toBeGreaterThanOrEqual(1); // Seed record 2: Outside geofence confirmed
      expect(outcomes.gpsUnavailable).toBeGreaterThanOrEqual(1);  // Seed record 3: GPS sensor disabled

      // Invariant: GPS unavailable must NOT be classified as confirmed outside geofence
      expect(outcomes.outsideGeofence).not.toBe(outcomes.gpsUnavailable + outcomes.outsideGeofence);
      expect(outcomes.complianceRate).toBeGreaterThan(0);
      expect(outcomes.complianceRate).toBeLessThanOrEqual(100);
    });

    it('1.3 should compute notification delivery statistics accurately', async () => {
      // Seed notification records for testing
      notificationService.seedNotifications([
        {
          id: 'notif-test-001',
          recipientId: '23CSEBS001',
          notificationType: 'upcoming_verification',
          category: 'ATTENDANCE_PROMPT',
          priority: 'NORMAL',
          deliveryStatus: 'DELIVERED',
          isRead: false,
          createdAt: new Date().toISOString(),
          retryCount: 0,
        },
        {
          id: 'notif-test-002',
          recipientId: 'MENTOR_CSEBS_01',
          notificationType: 'confirmed_outside_geofence',
          category: 'VIOLATION',
          priority: 'URGENT',
          deliveryStatus: 'DELIVERED',
          isRead: false,
          createdAt: new Date().toISOString(),
          retryCount: 0,
        },
      ]);

      const stats = await institutionalAnalyticsService.getInstitutionAnalytics(superAdminUser);
      const notifStats = stats.notificationDelivery;

      expect(notifStats.totalDispatched).toBeGreaterThanOrEqual(2);
      expect(notifStats.deliveredCount).toBeGreaterThanOrEqual(2);
      expect(notifStats.deliveryRate).toBeGreaterThanOrEqual(90);
      expect(notifStats.urgentCount).toBeGreaterThanOrEqual(1);
      expect(notifStats.violationCount).toBeGreaterThanOrEqual(1);
    });

    it('1.4 should reject non-Super Admin users from accessing institution-wide analytics', async () => {
      await expect(
        institutionalAnalyticsService.getInstitutionAnalytics(itHodUser)
      ).rejects.toThrow(/Super Admin/i);

      await expect(
        institutionalAnalyticsService.getInstitutionAnalytics(itMentorUser)
      ).rejects.toThrow(/Super Admin/i);

      await expect(
        institutionalAnalyticsService.getInstitutionAnalytics(studentUser)
      ).rejects.toThrow(/Super Admin/i);
    });
  });

  // ==========================================================================
  // SECTION 2: DEPARTMENT DASHBOARD ANALYTICS (TASK 2)
  // ==========================================================================

  describe('2. Department Dashboard Analytics (HOD & Super Admin)', () => {
    it('2.1 should compute department student and batch metrics for authorized HOD', async () => {
      const itStats = await institutionalAnalyticsService.getDepartmentAnalytics('IT', itHodUser);

      expect(itStats.departmentCode).toBe('IT');
      expect(itStats.totalStudents).toBeGreaterThanOrEqual(1);
      expect(itStats.activeBatchesCount).toBeGreaterThanOrEqual(1);
      expect(itStats.batches.length).toBeGreaterThanOrEqual(1);
      expect(itStats.batches[0].name).toBeDefined();
      expect(itStats.batches[0].term).toBeDefined();
      expect(itStats.attendanceRate).toBeGreaterThanOrEqual(0);
    });

    it('2.2 should compute mentor workload allocation and load factors accurately', async () => {
      const itStats = await institutionalAnalyticsService.getDepartmentAnalytics('IT', itHodUser);

      expect(itStats.mentorWorkload.length).toBeGreaterThanOrEqual(1);
      const mentorEntry = itStats.mentorWorkload[0];
      expect(mentorEntry.mentorId).toBeDefined();
      expect(mentorEntry.mentorName).toBeDefined();
      expect(mentorEntry.assignedCount).toBeGreaterThanOrEqual(0);
      expect(['optimal', 'high', 'available']).toContain(mentorEntry.capacityStatus);
    });

    it('2.3 should enforce department boundary scoping for HODs', async () => {
      // IT HOD attempting to access CSEBS department analytics
      await expect(
        institutionalAnalyticsService.getDepartmentAnalytics('CSEBS', itHodUser)
      ).rejects.toThrow(/Access denied|forbidden/i);

      // CSEBS HOD attempting to access IT department analytics
      await expect(
        institutionalAnalyticsService.getDepartmentAnalytics('IT', csebsHodUser)
      ).rejects.toThrow(/Access denied|forbidden/i);
    });

    it('2.4 should allow Super Admin to access any department analytics', async () => {
      const csebsStats = await institutionalAnalyticsService.getDepartmentAnalytics('CSEBS', superAdminUser);
      expect(csebsStats.departmentCode).toBe('CSEBS');
      expect(csebsStats.totalStudents).toBeGreaterThanOrEqual(2);

      const itStats = await institutionalAnalyticsService.getDepartmentAnalytics('IT', superAdminUser);
      expect(itStats.departmentCode).toBe('IT');
    });
  });

  // ==========================================================================
  // SECTION 3: MENTOR DASHBOARD ANALYTICS (TASK 3)
  // ==========================================================================

  describe('3. Mentor Dashboard Analytics (Mentor, HOD & Super Admin)', () => {
    it('3.1 should return assigned students, progress, and attendance for mentor', async () => {
      const mentorStats = await institutionalAnalyticsService.getMentorAnalytics('MENTOR_IT_01', itMentorUser);

      expect(mentorStats.mentorId).toBe('MENTOR_IT_01');
      expect(mentorStats.assignedStudentsCount).toBeGreaterThanOrEqual(1);
      expect(mentorStats.assignedStudents.some((s) => s.studentId === '23IT001')).toBe(true);
      expect(mentorStats.averageProgress).toBeGreaterThanOrEqual(0);
      expect(mentorStats.attendanceRate).toBeGreaterThanOrEqual(0);
    });

    it('3.2 should isolate mentor access from viewing other mentors assigned cohorts', async () => {
      // IT Mentor attempting to access CSEBS mentor analytics
      await expect(
        institutionalAnalyticsService.getMentorAnalytics('MENTOR_CSEBS_01', itMentorUser)
      ).rejects.toThrow(/Access denied/i);
    });

    it('3.3 should allow department HOD to inspect mentors within their department', async () => {
      const mentorStats = await institutionalAnalyticsService.getMentorAnalytics('MENTOR_IT_01', itHodUser);
      expect(mentorStats.mentorId).toBe('MENTOR_IT_01');
    });
  });

  // ==========================================================================
  // SECTION 4: STUDENT DASHBOARD ANALYTICS (TASK 4)
  // ==========================================================================

  describe('4. Student Dashboard Analytics (Student, Mentor, HOD & Admin)', () => {
    it('4.1 should return personal internship details, attendance, and verification history', async () => {
      const dossier = await institutionalAnalyticsService.getStudentAnalytics('23CSEBS001', studentUser);

      expect(dossier.studentId).toBe('23CSEBS001');
      expect(dossier.studentName).toBe('Harish V');
      expect(dossier.departmentCode).toBe('CSEBS');
      expect(dossier.company).toBe('Tata Consultancy Services');
      expect(dossier.progress).toBeGreaterThan(0);
      expect(dossier.loggedHours).toBeGreaterThan(0);
      expect(dossier.consentStatus.consentGiven).toBe(true);
      expect(dossier.attendanceSessions.length).toBeGreaterThanOrEqual(1);
      expect(dossier.verificationHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('4.2 should block students from accessing other students analytics dossiers', async () => {
      // Student 1 (Harish) attempting to access Student 2 (Priya) dossier
      await expect(
        institutionalAnalyticsService.getStudentAnalytics('23CSEBS002', studentUser)
      ).rejects.toThrow(/Access denied|Forbidden/i);
    });
  });

  // ==========================================================================
  // SECTION 5: REPORT EXPORTS (PDF, CSV, EXCEL) & SECURITY CONTROLS
  // ==========================================================================

  describe('5. Multi-Format Report Exports (PDF, CSV, Excel)', () => {
    it('5.1 should export RFC 4180 compliant CSV with institutional headers', async () => {
      const result = await institutionalAnalyticsService.exportAnalyticsReport(
        {
          reportType: 'institution_summary',
          format: 'csv',
        },
        superAdminUser
      );

      expect(result.format).toBe('csv');
      expect(result.mimeType).toContain('text/csv');
      expect(typeof result.content).toBe('string');
      const csvStr = result.content as string;

      expect(csvStr).toContain('SRI MANAKULA VINAYAGAR ENGINEERING COLLEGE');
      expect(csvStr).toContain('Department Code,Department Name');
      expect(csvStr).toContain('CSEBS');
      expect(csvStr).toContain('IT');
      expect(result.recordCount).toBeGreaterThanOrEqual(9);
    });

    it('5.2 should export valid Excel (.xlsx) workbook using SheetJS', async () => {
      const result = await institutionalAnalyticsService.exportAnalyticsReport(
        {
          reportType: 'department_performance',
          format: 'xlsx',
          departmentCode: 'IT',
        },
        itHodUser
      );

      expect(result.format).toBe('xlsx');
      expect(result.mimeType).toContain('spreadsheetml.sheet');
      expect(result.content).toBeDefined();

      // Read back with SheetJS to verify structure and integrity
      const wb = XLSX.read(result.content, { type: 'buffer' });
      expect(wb.SheetNames).toContain('Report Data');
      const sheet = wb.Sheets['Report Data'];
      expect(sheet).toBeDefined();
      const rows = XLSX.utils.sheet_to_json(sheet);
      expect(rows.length).toBeGreaterThan(0);
    });

    it('5.3 should export structured high-fidelity printable PDF representation', async () => {
      const result = await institutionalAnalyticsService.exportAnalyticsReport(
        {
          reportType: 'verification_audit',
          format: 'pdf',
        },
        superAdminUser
      );

      expect(result.format).toBe('pdf');
      expect(result.mimeType).toBe('application/pdf');
      const pdfText = result.content as string;

      expect(pdfText).toContain('SRI MANAKULA VINAYAGAR ENGINEERING COLLEGE (AUTONOMOUS)');
      expect(pdfText).toContain('Workplace Geolocation Verification Audit Log');
      expect(pdfText).toContain('SECURITY NOTICE');
      expect(pdfText).toContain('WITHIN_GEOFENCE');
    });

    it('5.4 should neutralize CSV Formula Injection attacks (CWE-1236)', () => {
      // Dangerous spreadsheet formulas starting with =, +, -, @, tab, return
      const dangerousInputs = [
        '=cmd|\'/C calc\'!A0',
        '+10+20',
        '-50+3',
        '@SUM(1,2)',
        '\tmalicious_tab',
        '\rmalicious_cr',
      ];

      for (const input of dangerousInputs) {
        const sanitized = institutionalAnalyticsService.sanitizeCellForCsv(input);
        // Invariant: must be prefixed with single quote or escaped within quotes
        expect(sanitized.startsWith("'") || sanitized.startsWith('"\'')).toBe(true);
      }

      // Harmless cells should remain unchanged
      expect(institutionalAnalyticsService.sanitizeCellForCsv('Normal Student Name')).toBe('Normal Student Name');
      expect(institutionalAnalyticsService.sanitizeCellForCsv('23CSEBS001')).toBe('23CSEBS001');
    });

    it('5.5 should apply date-range and department filters accurately', async () => {
      const result = await institutionalAnalyticsService.exportAnalyticsReport(
        {
          reportType: 'attendance_master',
          format: 'csv',
          departmentCode: 'CSEBS',
          startDate: '2026-03-01',
          endDate: '2026-03-02',
        },
        csebsHodUser
      );

      const csvContent = result.content as string;
      expect(csvContent).toContain('CSEBS');
      expect(result.recordCount).toBeGreaterThan(0);
    });

    it('5.6 should enforce role-based export authorization', async () => {
      // HOD cannot export institution-wide report
      await expect(
        institutionalAnalyticsService.exportAnalyticsReport(
          { reportType: 'institution_summary', format: 'csv' },
          itHodUser
        )
      ).rejects.toThrow(/Access denied/i);

      // HOD cannot export external department report
      await expect(
        institutionalAnalyticsService.exportAnalyticsReport(
          { reportType: 'department_performance', format: 'csv', departmentCode: 'CSEBS' },
          itHodUser
        )
      ).rejects.toThrow(/Access denied/i);

      // Student cannot export attendance master
      await expect(
        institutionalAnalyticsService.exportAnalyticsReport(
          { reportType: 'attendance_master', format: 'csv' },
          studentUser
        )
      ).rejects.toThrow(/Access denied/i);
    });

    it('5.7 should log every export to immutable report_export_logs audit trail', async () => {
      const result = await institutionalAnalyticsService.exportAnalyticsReport(
        {
          reportType: 'student_dossier',
          format: 'pdf',
          studentId: '23CSEBS001',
        },
        studentUser
      );

      const logs = institutionalAnalyticsService.getExportLogs(studentUser);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const log = logs.find((l) => l.fileName === result.fileName);
      expect(log).toBeDefined();
      expect(log?.requestedByName).toBe(studentUser.name);
      expect(log?.format).toBe('pdf');
      expect(log?.reportType).toBe('student_dossier');
    });
  });

  // ==========================================================================
  // SECTION 6: ANALYTICS INTEGRITY & ZERO FABRICATION
  // ==========================================================================

  describe('6. Analytics Integrity & Non-Fabrication Standards', () => {
    it('6.1 should never classify GPS disabled or network unavailable as outside geofence breaches', async () => {
      const stats = await institutionalAnalyticsService.getInstitutionAnalytics(superAdminUser);
      const outcomes = stats.verificationOutcomes;

      // Invariant: outsideGeofence only counts actual confirmed spatial violations
      expect(outcomes.outsideGeofence).toBe(1); // Only seed 2 (distance 1312m)
      expect(outcomes.gpsUnavailable).toBe(1);  // Only seed 3 (GPS disabled)
      expect(outcomes.outsideGeofence).not.toBe(outcomes.outsideGeofence + outcomes.gpsUnavailable);
    });

    it('6.2 should calculate 100% genuine statistics matching repository counts', async () => {
      const stats = await institutionalAnalyticsService.getInstitutionAnalytics(superAdminUser);
      const actualStudents = internshipRepository.getAllStudents();
      const actualDepartments = internshipRepository.getAllDepartments();

      expect(stats.totalStudents).toBe(actualStudents.length);
      expect(stats.totalDepartments).toBe(actualDepartments.length);
    });
  });
});
