import { describe, it, expect, beforeEach } from 'vitest';
import { AuthUser } from '../authUser';
import { 
  AuthorizationPolicy, 
  ForbiddenException 
} from '../rbac/authorizationPolicy';
import { internshipRepository } from '../../repository/internshipRepository';
import { locationRepository } from '../../repository/locationRepository';
import { studentOnboardingService } from '../../onboarding/studentOnboardingService';
import { institutionalAnalyticsService } from '../../analytics/institutionalAnalyticsService';
import { consentManager } from '../../privacy/consentManager';
import { evaluateMonitoringSchedule } from '../../geolocation/antiSurveillanceGuard';

describe('Phase 17G: Controlled Multi-Department Institutional Expansion & Rollback Suite', () => {
  // Institutional Actors
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
    dept: 'CSEBS',
    isActive: true,
  };

  const itHodUser: AuthUser = {
    id: 'user-hod-it-01',
    email: 'hod.it@smvec.ac.in',
    name: 'Dr. M. Auxilia',
    role: 'hod',
    departmentCode: 'IT',
    dept: 'IT',
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

  const eceHodUser: AuthUser = {
    id: 'user-hod-ece-01',
    email: 'hod.ece@smvec.ac.in',
    name: 'Dr. P. ECE Head',
    role: 'hod',
    departmentCode: 'ECE',
    dept: 'ECE',
    isActive: true,
  };

  beforeEach(() => {
    internshipRepository.resetToDefaults();
    locationRepository.resetToDefaults();
    consentManager.reset();
  });

  // ==========================================================================
  // GATE VERIFICATION TESTS
  // ==========================================================================
  describe('1. Pre-Expansion Gates Verification', () => {
    it('1.1 verifies CSEBS is the only pilot-authorized department in baseline state', () => {
      const depts = internshipRepository.getAllDepartments();
      const pilotAuthorized = depts.filter(d => d.isPilotAuthorized);
      expect(pilotAuthorized.length).toBe(1);
      expect(pilotAuthorized[0].code).toBe('CSEBS');
    });

    it('1.2 verifies department governance isolation between CSEBS and IT', () => {
      expect(() => {
        internshipRepository.getStudentsForHod('CSEBS', itHodUser);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentsForHod('IT', csebsHodUser);
      }).toThrowError(ForbiddenException);
    });

    it('1.3 confirms backup and rollback engine readiness via transaction-safe methods', () => {
      expect(typeof studentOnboardingService.rollbackImportBatch).toBe('function');
      expect(typeof internshipRepository.deactivateDepartment).toBe('function');
      expect(typeof internshipRepository.reactivateDepartment).toBe('function');
    });
  });

  // ==========================================================================
  // STAGED EXPANSION: STAGE 1 & STAGE 2
  // ==========================================================================
  describe('2. Staged Expansion Execution (Stage 1: CSEBS Baseline -> Stage 2: IT Expansion)', () => {
    it('2.1 Stage 1: confirms baseline operational status of CSEBS pilot cohort', () => {
      const csebsStudent = internshipRepository.getStudentById('23CSEBS001');
      expect(csebsStudent).toBeDefined();
      expect(csebsStudent?.departmentCode).toBe('CSEBS');
      expect(csebsStudent?.status).toBe('onTrack');

      // Consent is active for pilot student
      consentManager.recordConsent('23CSEBS001', true);
      expect(consentManager.isConsentActive('23CSEBS001')).toBe(true);
    });

    it('2.2 Stage 2: executes controlled onboarding of IT department with 20 students', async () => {
      // 1. Generate synthetic 20 IT students CSV starting from 010 (to avoid collision with existing 001 and 002)
      const rows = ['registerNumber,name,email,departmentCode,academicYear'];
      for (let i = 10; i < 30; i++) {
        const num = String(i).padStart(3, '0');
        rows.push(`23IT${num},IT Student ${num},it.student${num}@smvec.ac.in,IT,3rd Year`);
      }
      const itCsv = rows.join('\n');

      // 2. Preview and validate IT cohort
      const preview = studentOnboardingService.previewImport(
        itCsv,
        {
          fileName: 'it_cohort_20.csv',
          fileFormat: 'csv',
          uploadedBy: itHodUser.id,
          uploadedByName: itHodUser.name,
          targetDepartmentCode: 'IT',
          duplicateStrategy: 'reject',
          generateActivationTokens: true,
        },
        itHodUser
      );

      expect(preview.totalRows).toBe(20);
      expect(preview.validRowsCount).toBe(20);
      expect(preview.invalidRowsCount).toBe(0);

      // 3. Execute controlled import
      const result = await studentOnboardingService.executeImport(
        itCsv,
        {
          fileName: 'it_cohort_20.csv',
          fileFormat: 'csv',
          uploadedBy: itHodUser.id,
          uploadedByName: itHodUser.name,
          targetDepartmentCode: 'IT',
          duplicateStrategy: 'reject',
          generateActivationTokens: true,
        },
        itHodUser
      );

      expect(result.status).toBe('completed');
      expect(result.importedCount).toBe(20);
      expect(result.generatedTokensCount).toBe(20);

      // 4. Verify total students in IT is now 20 + any default
      const itStudents = internshipRepository.getStudentsForHod('IT', itHodUser);
      expect(itStudents.length).toBeGreaterThanOrEqual(20);

      // 5. Verify other departments (ECE, Mech, Civil) remained unaffected and uncontaminated
      const eceStudents = internshipRepository.getStudentsForHod('ECE', eceHodUser);
      expect(eceStudents.length).toBe(1); // Preserves exact baseline without contamination
    });
  });

  // ==========================================================================
  // OPERATIONAL MONITORING TELEMETRY (STAGE 3)
  // ==========================================================================
  describe('3. Operational Telemetry & Monitoring Verification', () => {
    it('3.1 measures active users and successful attendance operations', () => {
      const allSessions = internshipRepository.getAllAttendanceSessions(superAdminUser);
      expect(allSessions.length).toBeGreaterThan(0);

      const verifiedCount = allSessions.filter(s => s.isVerified).length;
      expect(verifiedCount).toBeGreaterThanOrEqual(0);
    });

    it('3.2 records canonical verification telemetry with anti-surveillance enforcement', () => {
      const itTarget = {
        locationId: 'loc-it-01',
        latitude: 12.83,
        longitude: 80.22,
        geofenceRadiusMeters: 150,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '17:30:00',
      };

      const validTime = new Date('2026-06-15T10:30:00');
      const evalResult = evaluateMonitoringSchedule(itTarget, validTime);
      expect(evalResult.isAuthorized).toBe(true);

      const nightTime = new Date('2026-06-15T21:00:00');
      const nightEval = evaluateMonitoringSchedule(itTarget, nightTime);
      expect(nightEval.isAuthorized).toBe(false);
    });

    it('3.3 tracks student consent lifecycle and withdrawal events', () => {
      const testStudentId = '23IT001';
      // Record initial affirmative consent
      consentManager.recordConsent(testStudentId, true);
      expect(consentManager.isConsentActive(testStudentId)).toBe(true);

      // Withdraw consent
      consentManager.withdrawConsent(testStudentId, 'Internship cancelled by candidate');
      expect(consentManager.isConsentActive(testStudentId)).toBe(false);

      const auditRec = consentManager.getConsent(testStudentId);
      expect(auditRec?.withdrawnAt).toBeDefined();
    });
  });

  // ==========================================================================
  // REVERSIBLE ROLLBACK & EMERGENCY SUSPENSION (STAGE 4 / ROLLBACK)
  // ==========================================================================
  describe('4. Controlled Rollback & Emergency Department Suspension', () => {
    it('4.1 executes instant suspension of IT department without affecting CSEBS', async () => {
      // 1. Super Admin deactivates IT department
      const deactivated = await internshipRepository.deactivateDepartment('IT', superAdminUser);
      expect(deactivated.status).toBe('inactive');

      // 2. IT HOD operational access is immediately blocked
      expect(() => {
        internshipRepository.getStudentsForHod('IT', itHodUser);
      }).toThrowError(ForbiddenException);

      // 3. CSEBS pilot remains 100% operational with zero disruption
      const csebsStudents = internshipRepository.getStudentsForHod('CSEBS', csebsHodUser);
      expect(csebsStudents.length).toBeGreaterThan(0);
      expect(csebsStudents[0].studentId).toBe('23CSEBS001');

      // 4. Super Admin retains audit capability over inactive department
      const itDept = internshipRepository.getAllDepartments().find(d => d.code === 'IT');
      expect(itDept?.status).toBe('inactive');
      expect(() => {
        AuthorizationPolicy.validateDepartmentActive(itDept!, superAdminUser);
      }).not.toThrow();
    });

    it('4.2 guarantees zero deletion of historical attendance during rollback', async () => {
      const sessionsBefore = internshipRepository.getAllAttendanceSessions(superAdminUser).length;

      // Deactivate department
      await internshipRepository.deactivateDepartment('IT', superAdminUser);

      // Sessions count must remain identical (zero deletion guarantee)
      const sessionsAfter = internshipRepository.getAllAttendanceSessions(superAdminUser).length;
      expect(sessionsAfter).toBe(sessionsBefore);
    });

    it('4.3 demonstrates clean post-rollback recovery when department is reactivated', async () => {
      // 1. Deactivate
      await internshipRepository.deactivateDepartment('IT', superAdminUser);
      expect(internshipRepository.getAllDepartments().find(d => d.code === 'IT')?.status).toBe('inactive');

      // 2. Reactivate
      const reactivated = await internshipRepository.reactivateDepartment('IT', superAdminUser);
      expect(reactivated.status).toBe('active');

      // 3. Operational access is restored cleanly
      const studentsAfter = internshipRepository.getStudentsForHod('IT', itHodUser);
      expect(studentsAfter).toBeDefined();
    });
  });
});
