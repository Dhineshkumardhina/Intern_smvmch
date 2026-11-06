import { describe, it, expect, beforeEach } from 'vitest';
import {
  attendanceService,
  AttendanceService,
} from '../../attendance/attendanceService';
import {
  AttendanceValidationEngine,
  DuplicateCheckInException,
  InvalidCheckOutException,
  AttendanceValidationException,
} from '../../attendance/attendanceValidationEngine';
import { AttendanceReportingEngine } from '../../attendance/attendanceReportingEngine';
import { EligibleAssignment } from '../../scheduler/schedulerTypes';
import { AuthUser } from '../authUser';

/**
 * Phase 10: InternPulse Attendance Management & Advanced Reporting Test Suite
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Verifies:
 * 1. Student Attendance Features (Check-in, check-out, duplicate prevention, daily summary)
 * 2. Mentor Attendance Features (Scoped mentee review, exception handling, verification)
 * 3. HOD Attendance Features (Institution overview, department analytics, location analytics)
 * 4. Validation Safeguards (Active placement, schedule bounds, never silently overwrite)
 * 5. Offline Queue Handling for network interruptions
 * 6. Audit Trail Immutability
 * 7. Export Engine (RFC 4180 CSV & Structured Institutional PDF)
 */
describe('Phase 10: Attendance Management & Advanced Reporting Test Suite', () => {
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

  const studentUser2: AuthUser = {
    id: 'usr-student-002',
    studentId: '23CSEBS002',
    name: 'Karthik R',
    email: '23csebs002@smvec.ac.in',
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

  const hodUser: AuthUser = {
    id: 'usr-hod-001',
    name: 'Dr. V. Gomathi',
    email: 'hod.csebs@smvec.ac.in',
    role: 'hod',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'Computer Science and Business Systems',
    isActive: true,
  };

  // Valid Active Placement
  const activeAssignment: EligibleAssignment = {
    assignmentId: 'asg-tcs-001',
    studentId: studentUser.studentId!,
    locationId: 'loc-tcs-001',
    monitoringStartTime: '09:00:00',
    monitoringEndTime: '18:00:00',
    startDate: '2026-01-05',
    endDate: '2026-06-30',
    assignmentStatus: 'active',
    timezone: 'Asia/Kolkata',
    requiredDailyHours: 8.0,
  };

  const testDate = '2026-03-05';

  beforeEach(() => {
    attendanceService.reset();
  });

  // =========================================================================
  // 1. Student Features: Check-In, Check-Out, History, Status & Summary
  // =========================================================================
  describe('1. Student Features: Check-In, Check-Out & Lifecycle', () => {
    it('records valid student check-in and transitions status to present', async () => {
      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T03:30:00.000Z`, // 09:00 IST (On-time)
        distanceMeters: 15.0,
        notes: 'Check-in at TCS Innovation Hub main reception.',
      });

      expect(session.id).toBeDefined();
      expect(session.studentId).toBe(studentUser.studentId);
      expect(session.sessionDate).toBe(testDate);
      expect(session.checkInAt).toBe(`${testDate}T03:30:00.000Z`);
      expect(session.checkOutAt).toBeNull();
      expect(session.status).toBe('present');
      expect(session.geofenceStatus).toBe('verified');
      expect(session.totalHours).toBe(0.0);
    });

    it('prevents duplicate check-in on the same calendar session date', async () => {
      // First check-in
      await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T03:30:00.000Z`,
      });

      // Second check-in on identical date must be rejected
      await expect(
        attendanceService.checkIn({
          studentId: studentUser.studentId!,
          studentName: studentUser.name,
          departmentCode: studentUser.departmentCode!,
          assignment: activeAssignment,
          sessionDate: testDate,
          checkInTimestamp: `${testDate}T04:00:00.000Z`,
        })
      ).rejects.toThrow(DuplicateCheckInException);
    });

    it('records student check-out and computes exact elapsed hours', async () => {
      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T03:30:00.000Z`, // 09:00 IST
      });

      // Check-out after 8.5 hours (17:30 IST = 12:00 UTC)
      const checkedOut = await attendanceService.checkOut({
        sessionId: session.id,
        checkOutTimestamp: `${testDate}T12:00:00.000Z`,
        distanceMeters: 20.0,
        notes: 'Completed full work day.',
      });

      expect(checkedOut.checkOutAt).toBe(`${testDate}T12:00:00.000Z`);
      expect(checkedOut.totalHours).toBe(8.5);
      expect(checkedOut.status).toBe('present'); // >= 8 hours
    });

    it('flags session as half_day if total hours worked is less than half required hours', async () => {
      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T03:30:00.000Z`, // 09:00 IST
      });

      // Check-out after only 3 hours (less than 8 / 2 = 4 hours)
      const checkedOut = await attendanceService.checkOut({
        sessionId: session.id,
        checkOutTimestamp: `${testDate}T06:30:00.000Z`,
      });

      expect(checkedOut.totalHours).toBe(3.0);
      expect(checkedOut.status).toBe('half_day');
    });

    it('flags check-in as late if checked in > 30 minutes after scheduled shift start', async () => {
      // Shift starts at 09:00 IST (03:30 UTC); check-in at 09:45 IST (04:15 UTC)
      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T04:15:00.000Z`,
      });

      expect(session.status).toBe('late');
    });

    it('rejects invalid check-out when check-out timestamp precedes check-in', async () => {
      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T03:30:00.000Z`,
      });

      await expect(
        attendanceService.checkOut({
          sessionId: session.id,
          checkOutTimestamp: `${testDate}T02:00:00.000Z`, // Earlier than check-in!
        })
      ).rejects.toThrow(InvalidCheckOutException);
    });

    it('provides complete daily internship summary with hours worked and compliance rate', async () => {
      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T03:30:00.000Z`,
      });

      await attendanceService.checkOut({
        sessionId: session.id,
        checkOutTimestamp: `${testDate}T11:30:00.000Z`, // 8 hours
      });

      const summary = attendanceService.getDailyInternshipSummary(
        studentUser.studentId!,
        testDate,
        studentUser.name,
        'TCS Siruseri'
      );

      expect(summary.hasActiveSession).toBe(true);
      expect(summary.hoursWorked).toBe(8.0);
      expect(summary.requiredHours).toBe(8.0);
      expect(summary.punctuality).toBe('on_time');
      expect(summary.compliancePercentage).toBe(100.0);
    });
  });

  // =========================================================================
  // 2. Attendance Validation & Integrity Safeguards
  // =========================================================================
  describe('2. Validation & Integrity Safeguards', () => {
    it('prevents check-in when internship placement is not active', async () => {
      const completedAssignment: EligibleAssignment = {
        ...activeAssignment,
        assignmentStatus: 'completed',
      };

      await expect(
        attendanceService.checkIn({
          studentId: studentUser.studentId!,
          studentName: studentUser.name,
          departmentCode: studentUser.departmentCode!,
          assignment: completedAssignment,
          sessionDate: testDate,
        })
      ).rejects.toThrow(AttendanceValidationException);
    });

    it('prevents check-in when session date is outside assignment date bounds', async () => {
      // Placement ends 2026-06-30; attempting check-in in August
      await expect(
        attendanceService.checkIn({
          studentId: studentUser.studentId!,
          studentName: studentUser.name,
          departmentCode: studentUser.departmentCode!,
          assignment: activeAssignment,
          sessionDate: '2026-08-15',
        })
      ).rejects.toThrow(AttendanceValidationException);
    });

    it('maintains tamper-evident audit trail for check-in and check-out actions (never silently overwrite)', async () => {
      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: `${testDate}T03:30:00.000Z`,
      });

      await attendanceService.checkOut({
        sessionId: session.id,
        checkOutTimestamp: `${testDate}T11:30:00.000Z`,
      });

      const auditLogs = attendanceService.getAuditLogs(session.id);
      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].action).toBe('CHECK_IN');
      expect(auditLogs[1].action).toBe('CHECK_OUT');
      expect(auditLogs[0].actor).toBe(studentUser.studentId);
    });

    it('supports network-interrupted offline check-in queuing with client timestamp', async () => {
      const clientIso = `${testDate}T03:35:00.000Z`;

      const session = await attendanceService.checkIn({
        studentId: studentUser.studentId!,
        studentName: studentUser.name,
        departmentCode: studentUser.departmentCode!,
        assignment: activeAssignment,
        sessionDate: testDate,
        checkInTimestamp: clientIso,
        isOffline: true, // Queued during network interruption
        notes: 'Submitted via offline queue buffer upon reconnection.',
      });

      expect(session.offlineQueued).toBe(true);
      expect(session.clientTimestamp).toBe(clientIso);
    });
  });

  // =========================================================================
  // 3. Mentor Features: Scoped Review, Exceptions & Mentor Verification
  // =========================================================================
  describe('3. Mentor Features: Scoped Review & Exception Handling', () => {
    it('scopes attendance queries strictly to mentor assigned student roster', () => {
      const assignedRoster = [studentUser.studentId!]; // Only Harish V

      const mentorView = attendanceService.getAssignedStudentAttendance(assignedRoster);
      expect(mentorView.every((s) => assignedRoster.includes(s.studentId))).toBe(true);

      // Does not expose other students
      const unassignedStudents = mentorView.filter((s) => s.studentId === studentUser2.studentId);
      expect(unassignedStudents).toHaveLength(0);
    });

    it('surfaces attendance exceptions (late check-ins, incomplete hours, out-of-bounds)', () => {
      const assignedRoster = [studentUser.studentId!, studentUser2.studentId!];

      const exceptions = attendanceService.reviewAttendanceExceptions(assignedRoster);
      expect(exceptions.length).toBeGreaterThan(0);

      const lateExc = exceptions.find((e) => e.exceptionType === 'LATE_CHECKIN');
      expect(lateExc).toBeDefined();
      expect(lateExc?.studentId).toBe('23CSEBS002');
    });

    it('allows mentor to review and verify attendance session with remarks', () => {
      const session = attendanceService.verifyAttendanceSession(
        'att-session-002',
        true,
        'Late arrival approved due to campus transport delay.',
        mentorUser
      );

      expect(session.isVerified).toBe(true);
      expect(session.mentorReviewedBy).toBe(mentorUser.id);
      expect(session.notes).toContain('campus transport delay');
    });
  });

  // =========================================================================
  // 4. HOD Features: Institution Overview, Dept Analytics & Location Analytics
  // =========================================================================
  describe('4. HOD Features: Institutional Overview & Advanced Analytics', () => {
    it('provides institution-wide and department-level attendance overview', () => {
      const overview = attendanceService.getInstitutionWideAttendanceOverview('CSEBS');

      expect(overview.totalActiveInterns).toBeGreaterThan(0);
      expect(overview.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(overview.attendanceRate).toBeLessThanOrEqual(100);
      expect(overview.totalLocationsMonitored).toBeGreaterThan(0);
    });

    it('computes department monthly attendance analytics with average daily hours', () => {
      const analytics = attendanceService.getDepartmentLevelAttendanceAnalytics('CSEBS', '2026-03');

      expect(analytics.departmentCode).toBe('CSEBS');
      expect(analytics.period).toBe('2026-03');
      expect(analytics.averageDailyHours).toBeGreaterThan(0);
      expect(analytics.averageAttendanceRate).toBeGreaterThan(0);
      expect(analytics.complianceRate).toBeGreaterThan(0);
    });

    it('computes location-level attendance and geofence compliance analytics', () => {
      const locationAnalytics = attendanceService.getInternshipLocationAnalytics(
        'loc-tcs-001',
        'Tata Consultancy Services',
        'TCS Siruseri Innovation Hub'
      );

      expect(locationAnalytics.locationId).toBe('loc-tcs-001');
      expect(locationAnalytics.companyName).toBe('Tata Consultancy Services');
      expect(locationAnalytics.totalHoursLogged).toBeGreaterThan(0);
      expect(locationAnalytics.geofenceComplianceRate).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // 5. Reporting & Export Engine: CSV and PDF
  // =========================================================================
  describe('5. Reporting & Export Engine (CSV and PDF)', () => {
    it('exports daily attendance to RFC 4180 compliant CSV format', () => {
      const csvExport = attendanceService.exportDailyAttendance('2026-03-02', 'CSEBS', 'csv');

      expect(csvExport.format).toBe('csv');
      expect(csvExport.mimeType).toContain('text/csv');
      expect(csvExport.filename).toContain('.csv');
      expect(csvExport.recordCount).toBeGreaterThan(0);

      // Verify CSV contents
      expect(csvExport.content).toContain('Student ID,Student Name,Department,Session Date');
      expect(csvExport.content).toContain('23CSEBS001,Harish V,CSEBS');
      expect(csvExport.content).toContain('Sri Manakula Vinayagar Engineering College');
    });

    it('exports monthly attendance summary to structured institutional PDF representation', () => {
      const pdfExport = attendanceService.exportMonthlyAttendance('2026-03', 'CSEBS', 'pdf');

      expect(pdfExport.format).toBe('pdf');
      expect(pdfExport.mimeType).toBe('application/pdf');
      expect(pdfExport.filename).toContain('.pdf');

      // Verify institutional header and signature blocks in document structure
      expect(pdfExport.content).toContain('SRI MANAKULA VINAYAGAR ENGINEERING COLLEGE (AUTONOMOUS)');
      expect(pdfExport.content).toContain('DEPARTMENT OF TRAINING, PLACEMENT & INTERNSHIPS');
      expect(pdfExport.content).toContain('Faculty Mentor');
      expect(pdfExport.content).toContain('Head of Dept (HOD)');
      expect(pdfExport.content).toContain('Principal');
    });

    it('generates location analytics report with geofence compliance rate calculation', () => {
      const report = AttendanceReportingEngine.generateLocationAnalytics(
        [
          {
            id: 's1',
            assignmentId: 'a1',
            studentId: 'st1',
            studentName: 'Student 1',
            departmentCode: 'CSEBS',
            sessionDate: '2026-03-05',
            totalHours: 8.0,
            requiredHours: 8.0,
            status: 'present',
            isVerified: true,
            locationId: 'loc-1',
            geofenceStatus: 'verified',
            complianceRate: 100.0,
            offlineQueued: false,
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 's2',
            assignmentId: 'a2',
            studentId: 'st2',
            studentName: 'Student 2',
            departmentCode: 'CSEBS',
            sessionDate: '2026-03-05',
            totalHours: 8.0,
            requiredHours: 8.0,
            status: 'present',
            isVerified: false,
            locationId: 'loc-1',
            geofenceStatus: 'out_of_bounds',
            complianceRate: 50.0,
            offlineQueued: false,
            createdAt: '',
            updatedAt: '',
          },
        ],
        'loc-1',
        'Zoho Corp',
        'Zoho Estancia',
        250.0
      );

      expect(report.activeInternsCount).toBe(2);
      expect(report.totalHoursLogged).toBe(16.0);
      expect(report.violationCount).toBe(1);
      // 1 verified out of 2 = 50.0% geofence compliance
      expect(report.geofenceComplianceRate).toBe(50.0);
    });
  });
});

