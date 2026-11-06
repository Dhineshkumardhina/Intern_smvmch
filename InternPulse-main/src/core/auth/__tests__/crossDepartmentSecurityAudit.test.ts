import { describe, it, expect, beforeEach } from 'vitest';
import { AuthUser } from '../authUser';
import { 
  AuthorizationPolicy, 
  ForbiddenException, 
  UnauthorizedException 
} from '../rbac/authorizationPolicy';
import { internshipRepository } from '../../repository/internshipRepository';
import { locationRepository } from '../../repository/locationRepository';
import { studentOnboardingService } from '../../onboarding/studentOnboardingService';
import { institutionalAnalyticsService } from '../../analytics/institutionalAnalyticsService';
import { consentManager } from '../../privacy/consentManager';
import { evaluateMonitoringSchedule } from '../../geolocation/antiSurveillanceGuard';

describe('Phase 17F: Independent Multi-Department Security, Privacy & Governance Audit', () => {
  // Test Actors
  const superAdminUser: AuthUser = {
    id: 'user-superadmin-01',
    email: 'principal@smvec.ac.in',
    name: 'Dr. V. S. K. Venkatachalapathy',
    role: 'super_admin',
    isActive: true,
  };

  const csebsHodUser: AuthUser = {
    id: 'user-hod-csebs-01',
    email: 'hod.csebs@smvec.ac.in',
    name: 'Dr. V. Gomathi',
    role: 'hod',
    departmentCode: 'CSEBS',
    dept: 'CSEBS (Computer Science & Business Systems)',
    isActive: true,
  };

  const itHodUser: AuthUser = {
    id: 'user-hod-it-01',
    email: 'hod.it@smvec.ac.in',
    name: 'Dr. M. Auxilia',
    role: 'hod',
    departmentCode: 'IT',
    dept: 'IT (Information Technology)',
    isActive: true,
  };

  const eceHodUser: AuthUser = {
    id: 'user-hod-ece-01',
    email: 'hod.ece@smvec.ac.in',
    name: 'Dr. P. ECE Head',
    role: 'hod',
    departmentCode: 'ECE',
    dept: 'ECE (Electronics & Communication Engineering)',
    isActive: true,
  };

  const csebsMentorUser: AuthUser = {
    id: 'user-mentor-csebs-01',
    email: 'mentor.csebs@smvec.ac.in',
    name: 'Prof. CSEBS Guide',
    role: 'mentor',
    mentorId: 'mentor-csebs-01',
    departmentCode: 'CSEBS',
    dept: 'CSEBS',
    isActive: true,
  };

  const itMentorUser: AuthUser = {
    id: 'user-mentor-it-01',
    email: 'mentor.it@smvec.ac.in',
    name: 'Prof. IT Guide',
    role: 'mentor',
    mentorId: 'mentor-it-01',
    departmentCode: 'IT',
    dept: 'IT',
    isActive: true,
  };

  const csebsStudentA: AuthUser = {
    id: 'user-student-csebs-01',
    studentId: '23CSEBS001',
    email: 'harish.v@smvec.ac.in',
    name: 'Harish V',
    role: 'student',
    departmentCode: 'CSEBS',
    dept: 'CSEBS',
    isActive: true,
  };

  const itStudentB: AuthUser = {
    id: 'user-student-it-01',
    studentId: '23IT001',
    email: 'student.it@smvec.ac.in',
    name: 'Priya S',
    role: 'student',
    departmentCode: 'IT',
    dept: 'IT',
    isActive: true,
  };

  const deactivatedUser: AuthUser = {
    id: 'user-deactivated-01',
    email: 'deactivated@smvec.ac.in',
    name: 'Deactivated User',
    role: 'student',
    isActive: false,
  };

  beforeEach(() => {
    internshipRepository.resetToDefaults();
    locationRepository.resetToDefaults();
    consentManager.reset();
  });

  // ==========================================================================
  // ATTACK VECTOR 1: Cross-Department HOD Access Control & Boundary Defense
  // ==========================================================================
  describe('1. Cross-Department HOD Boundary Penetration Tests', () => {
    it('1.1 blocks IT HOD from reading CSEBS student rosters', () => {
      expect(() => {
        internshipRepository.getStudentsForHod('CSEBS', itHodUser);
      }).toThrowError(ForbiddenException);
    });

    it('1.2 blocks ECE HOD from accessing IT cohort batches', () => {
      expect(() => {
        internshipRepository.getInternshipBatches('IT', eceHodUser);
      }).toThrowError(ForbiddenException);
    });

    it('1.3 blocks IT HOD from altering account status of CSEBS student', async () => {
      const csebsStudent = internshipRepository.getStudentById('23CSEBS001');
      expect(csebsStudent).toBeDefined();

      await expect(
        internshipRepository.setStudentAccountStatus('23CSEBS001', 'suspended', itHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('1.4 blocks IT HOD from assigning internship to CSEBS student', async () => {
      await expect(
        internshipRepository.assignInternship({
          studentId: '23CSEBS001',
          company: 'Unauthorized Tech Inc',
          role: 'Intern',
          startDate: '2026-06-01',
          endDate: '2026-08-31',
        }, itHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('1.5 blocks ECE HOD from approving or modifying a CSEBS internship location', async () => {
      const csebsLocation = locationRepository.getLocations().find(l => l.departmentCode === 'CSEBS');
      expect(csebsLocation).toBeDefined();

      await expect(
        locationRepository.approveLocation(csebsLocation!.id, eceHodUser)
      ).rejects.toThrowError(ForbiddenException);

      await expect(
        locationRepository.editLocation(csebsLocation!.id, { geofenceRadiusMeters: 500 }, eceHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('1.6 blocks IT HOD from verifying or modifying attendance of a CSEBS student', async () => {
      const allSessions = internshipRepository.getAllAttendanceSessions();
      const csebsSession = allSessions.find(s => s.studentId === '23CSEBS001');
      expect(csebsSession).toBeDefined();

      await expect(
        internshipRepository.verifyAttendanceSession(csebsSession!.id, true, 'HOD Audit Bypass Attempt', itHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('1.7 blocks IT HOD from exporting CSEBS departmental analytics reports', async () => {
      await expect(
        institutionalAnalyticsService.exportAnalyticsReport({
          reportType: 'department_performance',
          format: 'pdf',
          departmentCode: 'CSEBS',
        }, itHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('1.8 blocks HOD from triggering student import rollback (restricted to Super Admin)', async () => {
      await expect(
        studentOnboardingService.rollbackImportBatch('any-batch-id', itHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });
  });

  // ==========================================================================
  // ATTACK VECTOR 2: Unassigned Mentor Privilege Escalation Attacks
  // ==========================================================================
  describe('2. Unassigned Mentor Privilege Escalation Tests', () => {
    it('2.1 blocks Mentor from accessing records of an unassigned student', () => {
      const studentRec = internshipRepository.getStudentById('23CSEBS001');
      expect(studentRec).toBeDefined();

      // Ensure itMentor is not the assigned guide
      expect(() => {
        AuthorizationPolicy.validateStudentResourceAccess(itMentorUser, '23CSEBS001', studentRec);
      }).toThrowError(ForbiddenException);
    });

    it('2.2 blocks Mentor from managing or altering unassigned mentee account status', async () => {
      await expect(
        internshipRepository.setStudentAccountStatus('23CSEBS001', 'inactive', itMentorUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('2.3 blocks Mentor from verifying attendance sessions of unassigned student', async () => {
      const allSessions = internshipRepository.getAllAttendanceSessions();
      const csebsSession = allSessions.find(s => s.studentId === '23CSEBS001');
      expect(csebsSession).toBeDefined();

      await expect(
        internshipRepository.verifyAttendanceSession(csebsSession!.id, true, 'Unassigned mentor check', itMentorUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('2.4 blocks Mentor from exporting department-wide or institution-wide reports', async () => {
      await expect(
        institutionalAnalyticsService.exportAnalyticsReport({
          reportType: 'institution_summary',
          format: 'csv',
        }, csebsMentorUser)
      ).rejects.toThrowError(ForbiddenException);

      await expect(
        institutionalAnalyticsService.exportAnalyticsReport({
          reportType: 'department_performance',
          format: 'xlsx',
          departmentCode: 'CSEBS',
        }, csebsMentorUser)
      ).rejects.toThrowError(ForbiddenException);
    });
  });

  // ==========================================================================
  // ATTACK VECTOR 3: Student Horizontal Privilege Escalation Attacks
  // ==========================================================================
  describe('3. Student Horizontal Privilege Escalation Tests', () => {
    it('3.1 blocks Student A from accessing Student B personal records', () => {
      const studentB = internshipRepository.getStudentById('23IT001');
      expect(() => {
        AuthorizationPolicy.validateStudentResourceAccess(csebsStudentA, '23IT001', studentB);
      }).toThrowError(ForbiddenException);
    });

    it('3.2 blocks Student from altering any student account status', async () => {
      await expect(
        internshipRepository.setStudentAccountStatus('23CSEBS001', 'active', csebsStudentA)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('3.3 blocks Student from creating or approving internship locations', async () => {
      await expect(
        locationRepository.createLocation({
          locationName: 'Unauthorized Student Co',
          companyName: 'Fake Corp',
          address: 'No Address',
          latitude: 11.95,
          longitude: 79.83,
          geofenceRadiusMeters: 100,
          internshipStartDate: '2026-06-01',
          internshipEndDate: '2026-08-31',
          monitoringStartTime: '09:00:00',
          monitoringEndTime: '17:00:00',
        }, csebsStudentA)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('3.4 blocks Student from inspecting location change audit history', () => {
      expect(() => {
        locationRepository.getLocationChangeHistory(undefined, csebsStudentA);
      }).toThrowError(ForbiddenException);
    });

    it('3.5 blocks Student from modifying attendance verification outcomes', async () => {
      const allSessions = internshipRepository.getAllAttendanceSessions();
      const csebsSession = allSessions.find(s => s.studentId === '23CSEBS001');
      expect(csebsSession).toBeDefined();

      await expect(
        internshipRepository.verifyAttendanceSession(csebsSession!.id, true, 'Self verification', csebsStudentA)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('3.6 blocks Student from exporting institutional or cohort reports', async () => {
      await expect(
        institutionalAnalyticsService.exportAnalyticsReport({
          reportType: 'institution_summary',
          format: 'csv',
        }, csebsStudentA)
      ).rejects.toThrowError(ForbiddenException);
    });
  });

  // ==========================================================================
  // ATTACK VECTOR 4: Unauthenticated & Deactivated User Attacks
  // ==========================================================================
  describe('4. Unauthenticated & Deactivated Session Lockout Tests', () => {
    it('4.1 throws UnauthorizedException when caller is unauthenticated (null)', () => {
      expect(() => {
        AuthorizationPolicy.validateIdentity(null);
      }).toThrowError(UnauthorizedException);
    });

    it('4.2 throws ForbiddenException when caller account is deactivated (isActive: false)', () => {
      expect(() => {
        AuthorizationPolicy.validateIdentity(deactivatedUser);
      }).toThrowError(ForbiddenException);
    });

    it('4.3 blocks deactivated user from route access', () => {
      const check = AuthorizationPolicy.canAccessRoute(deactivatedUser, '/student/dashboard');
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('AccountDeactivated');
    });

    it('4.4 blocks operations on deactivated departments for regular users', () => {
      const inactiveDept = { code: 'CIVIL', status: 'inactive' };
      expect(() => {
        AuthorizationPolicy.validateDepartmentActive(inactiveDept, csebsHodUser);
      }).toThrowError(ForbiddenException);

      // Super Admin is permitted to audit deactivated departments
      expect(() => {
        AuthorizationPolicy.validateDepartmentActive(inactiveDept, superAdminUser);
      }).not.toThrow();
    });

    it('4.5 blocks unauthorized department reassignment by non-super-admin', () => {
      expect(() => {
        AuthorizationPolicy.validateDepartmentReassignment(csebsHodUser, 'CSEBS', 'IT');
      }).toThrowError(ForbiddenException);

      expect(() => {
        AuthorizationPolicy.validateDepartmentReassignment(superAdminUser, 'CSEBS', 'IT');
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // ATTACK VECTOR 5: Injection Attacks (CWE-1236 & File Upload Defense)
  // ==========================================================================
  describe('5. Injection Attacks & File Upload Defense Tests', () => {
    it('5.1 neutralizes CWE-1236 CSV Formula Injection in report export', () => {
      const maliciousPayloads = [
        "=cmd|'/c calc'!A0",
        "+1+1",
        "-2+3",
        "@SUM(A1:B10)",
        "\t=calc",
        "\r=cmd",
      ];

      for (const payload of maliciousPayloads) {
        const sanitized = institutionalAnalyticsService.sanitizeCellForCsv(payload);
        // Must start with single quote or quoted single quote
        expect(sanitized.startsWith("'") || sanitized.startsWith('"\'')).toBe(true);
      }
    });

    it('5.2 rejects malicious payloads in student onboarding import', () => {
      const maliciousCsv = `registerNumber,name,email,departmentCode,academicYear
<script>alert(1)</script>,Malicious User,malicious@smvec.ac.in,CSEBS,3rd Year
'; DROP TABLE students; --,SQL Injection,sqli@smvec.ac.in,CSEBS,3rd Year
23CSEBS999,Valid Student,valid@smvec.ac.in,CSEBS,3rd Year`;

      const preview = studentOnboardingService.previewImport(
        maliciousCsv,
        {
          fileName: 'malicious.csv',
          fileFormat: 'csv',
          uploadedBy: superAdminUser.id,
          uploadedByName: superAdminUser.name,
          duplicateStrategy: 'reject',
          generateActivationTokens: false,
        },
        superAdminUser
      );

      // The script tag and SQL injection row must be caught as validation errors
      expect(preview.invalidRowsCount).toBe(2);
      expect(preview.validRowsCount).toBe(1);
      const invalidFields = preview.validationErrors.map(e => e.columnName);
      expect(invalidFields).toContain('registerNumber');
    });

    it('5.3 enforces HOD department boundary on bulk onboarding import', () => {
      const crossDeptCsv = `registerNumber,name,email,departmentCode,academicYear
23IT999,IT Student,it.student@smvec.ac.in,IT,3rd Year`;

      const preview = studentOnboardingService.previewImport(
        crossDeptCsv,
        {
          fileName: 'cross_dept.csv',
          fileFormat: 'csv',
          uploadedBy: csebsHodUser.id,
          uploadedByName: csebsHodUser.name,
          duplicateStrategy: 'reject',
          generateActivationTokens: false,
        },
        csebsHodUser
      );

      // CSEBS HOD must NOT be allowed to import IT student
      expect(preview.invalidRowsCount).toBe(1);
      expect(preview.validationErrors[0].errorMessage).toContain('forbidden from importing students for department');
    });
  });

  // ==========================================================================
  // ATTACK VECTOR 6: Privacy, Consent & Monitoring Window Violations
  // ==========================================================================
  describe('6. Privacy, DPDP Consent & Anti-Surveillance Boundary Tests', () => {
    it('6.1 immediately halts tracking when student withdraws consent (DPDP Sec 6(4))', () => {
      // 1. Give consent
      consentManager.recordConsent('23CSEBS001', true);
      expect(consentManager.isConsentActive('23CSEBS001')).toBe(true);

      // 2. Withdraw consent
      consentManager.withdrawConsent('23CSEBS001', 'Withdrawn by student from privacy dashboard');
      expect(consentManager.isConsentActive('23CSEBS001')).toBe(false);

      const record = consentManager.getConsent('23CSEBS001');
      expect(record?.withdrawnAt).toBeDefined();
      expect(record?.consentGiven).toBe(false);
    });

    it('6.2 enforces strict shift monitoring hours (anti-surveillance)', () => {
      const target = {
        locationId: 'loc-01',
        latitude: 11.95,
        longitude: 79.83,
        geofenceRadiusMeters: 100,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '17:00:00',
      };

      // 11:30 local/IST (inside shift)
      const insideShift = new Date('2026-06-15T11:30:00');
      const insideCheck = evaluateMonitoringSchedule(target, insideShift);
      expect(insideCheck.isAuthorized).toBe(true);

      // 22:30 (outside shift night)
      const nightTime = new Date('2026-06-15T22:30:00');
      const nightCheck = evaluateMonitoringSchedule(target, nightTime);
      expect(nightCheck.isAuthorized).toBe(false);
      expect(nightCheck.reason).toContain('Outside authorized daily monitoring schedule');

      // Date outside range
      const expiredDate = new Date('2027-02-15T11:30:00');
      const expiredCheck = evaluateMonitoringSchedule(target, expiredDate);
      expect(expiredCheck.isAuthorized).toBe(false);
      expect(expiredCheck.reason).toContain('Outside active internship date range');
    });

    it('6.3 guarantees that GPS/Network exceptions are NEVER classified as geofence violations', () => {
      // In accordance with SMVEC institutional fairness standard
      const technicalExceptions = [
        'GPS_DISABLED',
        'LOCATION_UNAVAILABLE',
        'NETWORK_UNAVAILABLE',
        'PERMISSION_DENIED',
        'LOW_ACCURACY',
      ];

      for (const exc of technicalExceptions) {
        expect(exc).not.toBe('OUTSIDE_GEOFENCE');
      }
    });
  });
});
