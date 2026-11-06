/**
 * ============================================================================
 * INTERNPULSE — PHASE 18G: MULTI-INSTITUTION PILOT READINESS TESTS
 * Validates Pre-Deployment Gates, Controlled Pilot Isolation, Suspension Workflows,
 * Notification/Scheduler Suppression, and Data Preservation Rules.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InstitutionAdministrationService } from '../../admin/institutionAdministrationService';
import { verificationSchedulerEngine } from '../../scheduler/verificationSchedulerEngine';
import { AuthorizationPolicy, ForbiddenException } from '../rbac/authorizationPolicy';
import { AuthUser } from '../authUser';
import { 
  DEFAULT_INSTITUTIONS, 
  DEFAULT_STUDENTS,
  DEFAULT_DEPARTMENTS,
  DEFAULT_ASSIGNMENTS, 
  canonicalizeInstitutionId 
} from '../../../data/initialData';
import { EligibleAssignment } from '../../scheduler/schedulerTypes';

describe('Phase 18G: Multi-Institution Pilot Readiness & Failure Governance', () => {

  let adminService: InstitutionAdministrationService;

  const SMVEC_ID = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');
  const SMVMCH_ID = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000002');
  const PEC_ID = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000003');

  const platformSuperAdmin: AuthUser = {
    id: 'admin-platform-001',
    email: 'sysadmin@internpulse.io',
    name: 'Platform Ops Super Admin',
    role: 'platform_super_admin',
    institutionId: '00000000-0000-0000-0000-000000000000',
    departmentCode: 'SYSTEM_OPS',
    isActive: true
  };

  const smvecAdmin: AuthUser = {
    id: 'admin-smvec-001',
    email: 'admin@smvec.ac.in',
    name: 'SMVEC Admin',
    role: 'admin',
    institutionId: SMVEC_ID,
    departmentCode: 'ADMIN',
    college: 'SMVEC',
    isActive: true
  };

  const smvmchAdmin: AuthUser = {
    id: 'admin-smvmch-001',
    email: 'admin@smvmch.ac.in',
    name: 'SMVMCH Medical Admin',
    role: 'admin',
    institutionId: SMVMCH_ID,
    departmentCode: 'ADMIN',
    college: 'SMVMCH',
    isActive: true
  };

  beforeEach(() => {
    adminService = new InstitutionAdministrationService();
    verificationSchedulerEngine.reset();
    // Ensure institutions are in default active state
    DEFAULT_INSTITUTIONS.forEach(i => {
      if (i.code === 'SMVEC' || i.code === 'SMVMCH') {
        i.status = 'active';
      }
    });
  });

  // ============================================================================
  // 1. PRE-DEPLOYMENT GATES & ANCHOR INSTITUTION PROTECTION
  // ============================================================================
  describe('1. Pre-Deployment Gates & Anchor Protection', () => {
    it('1.1 should verify that anchor institution SMVEC is active and cannot be suspended', async () => {
      const smvec = adminService.getInstitutionById(SMVEC_ID);
      expect(smvec.status).toBe('active');
      expect(smvec.code).toBe('SMVEC');

      // Attempting to suspend SMVEC must throw an explicit protection error
      await expect(
        adminService.suspendInstitution(SMVEC_ID, 'Attempted test suspension', platformSuperAdmin)
      ).rejects.toThrow('Root anchor institution SMVEC is protected and cannot be suspended.');
    });

    it('1.2 should verify that pilot institution SMVMCH has authorized administrative configuration', () => {
      const smvmch = adminService.getInstitutionById(SMVMCH_ID);
      expect(smvmch.code).toBe('SMVMCH');
      expect(smvmch.status).toBe('active');
      expect(smvmch.dpdpComplianceConfig).toBeDefined();
      expect(smvmch.dpdpComplianceConfig?.dpoName).toBe('Dr. K. Rajagopal');
      expect(smvmch.dpdpComplianceConfig?.dpoEmail).toBe('dpo.medical@smvmch.ac.in');
    });
  });

  // ============================================================================
  // 2. CONTROLLED INSTITUTION SUSPENSION & TENANT-LEVEL RESTRICTION
  // ============================================================================
  describe('2. Institution Suspension & Tenant Access Restriction', () => {
    it('2.1 should suspend an institution with immutable platform audit trail and block API access', async () => {
      // Suspend SMVMCH due to compliance review
      const suspended = await adminService.suspendInstitution(
        SMVMCH_ID, 
        'Regulatory audit pending by State Medical Council', 
        platformSuperAdmin
      );

      expect(suspended.status).toBe('suspended');

      // Verify AuthorizationPolicy blocks suspended tenant callers immediately
      expect(() => {
        const smvmchInst = adminService.getInstitutionById(SMVMCH_ID);
        AuthorizationPolicy.validateInstitutionActive(smvmchInst, smvmchAdmin);
      }).toThrow(ForbiddenException);

      // Verify platform audit log was recorded
      const logs = adminService.getPlatformAuditLogs(undefined, platformSuperAdmin);
      const suspendLog = logs.find(l => l.action === 'INSTITUTION_SUSPENDED' && l.targetInstitutionId === suspended.id);
      expect(suspendLog).toBeDefined();
      expect(suspendLog?.details?.reason).toContain('Regulatory audit pending');
    });

    it('2.2 should strictly preserve student records and historical data upon suspension (NO DATA LOSS)', async () => {
      // Record dataset counts before suspension
      const totalStudentsBefore = DEFAULT_STUDENTS.length;
      const totalAssignmentsBefore = DEFAULT_ASSIGNMENTS.length;
      const totalDepartmentsBefore = DEFAULT_DEPARTMENTS.length;

      // Suspend institution
      await adminService.suspendInstitution(SMVMCH_ID, 'Temporary administrative pause', platformSuperAdmin);

      // Verify records are 100% preserved (not deleted or truncated)
      expect(DEFAULT_STUDENTS.length).toBe(totalStudentsBefore);
      expect(DEFAULT_ASSIGNMENTS.length).toBe(totalAssignmentsBefore);
      expect(DEFAULT_DEPARTMENTS.length).toBe(totalDepartmentsBefore);

      // Institution record itself remains in database with suspended flag
      const smvmch = adminService.getInstitutionById(SMVMCH_ID);
      expect(smvmch).toBeDefined();
      expect(smvmch.status).toBe('suspended');
    });
  });

  // ============================================================================
  // 3. SCHEDULER & NOTIFICATION ISOLATION DURING SUSPENSION
  // ============================================================================
  describe('3. Scheduler & Notification Isolation During Suspension', () => {
    it('3.1 should suppress window generation and push alerts for suspended institutions while serving active ones', () => {
      const activeSmvecAssignment: EligibleAssignment = {
        assignmentId: 'assign-smvec-01',
        studentId: '23CSEBS001',
        institutionId: SMVEC_ID,
        departmentCode: 'CSEBS',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monitoringStartTime: '09:00',
        monitoringEndTime: '17:00',
        assignmentStatus: 'active',
        timezone: 'Asia/Kolkata'
      };

      const suspendedSmvmchAssignment: EligibleAssignment = {
        assignmentId: 'assign-smvmch-01',
        studentId: 'SMVMCH2026AHS001',
        institutionId: SMVMCH_ID,
        departmentCode: 'AHS',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monitoringStartTime: '09:00',
        monitoringEndTime: '17:00',
        assignmentStatus: 'active',
        timezone: 'Asia/Kolkata'
      };

      // Mark SMVMCH as suspended in test state
      const smvmchInst = DEFAULT_INSTITUTIONS.find(i => canonicalizeInstitutionId(i.id) === SMVMCH_ID);
      if (smvmchInst) smvmchInst.status = 'suspended';

      // Generate schedules for both
      const result = verificationSchedulerEngine.generateDailySchedules(
        [activeSmvecAssignment, suspendedSmvmchAssignment],
        '2026-11-06'
      );

      // Only SMVEC assignment (5 windows) should be generated; SMVMCH is suppressed!
      expect(result.generatedCount).toBe(5);
      expect(result.schedules.every(s => canonicalizeInstitutionId(s.institutionId) === SMVEC_ID)).toBe(true);

      // Window transitions must also produce 0 open windows or pushes for suspended SMVMCH
      const transitions = verificationSchedulerEngine.processWindowTransitions(
        '2026-11-06T09:30:00+05:30', 
        SMVMCH_ID
      );
      expect(transitions.openedCount).toBe(0);
      expect(transitions.dispatchedNotifications.length).toBe(0);
    });
  });

  // ============================================================================
  // 4. RECOVERY & REACTIVATION WORKFLOW
  // ============================================================================
  describe('4. Recovery & Reactivation Workflow', () => {
    it('4.1 should reactivate a suspended institution and restore full operational state', async () => {
      // 1. Suspend SMVMCH
      await adminService.suspendInstitution(SMVMCH_ID, 'Initial suspension', platformSuperAdmin);
      expect(adminService.getInstitutionById(SMVMCH_ID).status).toBe('suspended');

      // 2. Reactivate SMVMCH
      const reactivated = await adminService.reactivateInstitution(SMVMCH_ID, platformSuperAdmin);
      expect(reactivated.status).toBe('active');

      // 3. Verify access is restored
      expect(() => {
        const smvmchInst = adminService.getInstitutionById(SMVMCH_ID);
        AuthorizationPolicy.validateInstitutionActive(smvmchInst, smvmchAdmin);
      }).not.toThrow();

      // 4. Verify audit log entry
      const logs = adminService.getPlatformAuditLogs(undefined, platformSuperAdmin);
      const reactivateLog = logs.find(l => l.action === 'INSTITUTION_REACTIVATED' && l.targetInstitutionId === SMVMCH_ID);
      expect(reactivateLog).toBeDefined();
    });
  });
});
