/**
 * ============================================================================
 * INTERNPULSE — PHASE 18C: INSTITUTION ADMINISTRATION & PROVISIONING TEST SUITE
 * Validates Platform Super Admin Role, Registration Workflows, Idempotent
 * Provisioning, Scoped Institution Administration, Lifecycle Control, DPDP
 * Anti-Surveillance Location Privacy, and Platform Audit Trails.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthUser } from '../authUser';
import { 
  AuthorizationPolicy, 
  ForbiddenException, 
  UnauthorizedException 
} from '../rbac/authorizationPolicy';
import { 
  institutionAdministrationService,
  SubmitRegistrationRequestParams 
} from '../../admin/institutionAdministrationService';
import { internshipRepository } from '../../repository/internshipRepository';
import { geolocationVerificationRepository } from '../../geolocation/geolocationVerificationRepository';
import { 
  DEFAULT_INSTITUTIONS, 
  DEFAULT_DEPARTMENTS, 
  DEFAULT_STUDENTS,
  canonicalizeInstitutionId 
} from '../../../data/initialData';

describe('Phase 18C: Institution Registration, Provisioning & Administration', () => {
  const SMVEC_ID = 'a0000000-0000-0000-0000-000000000001';
  const SMVMCH_ID = 'a0000000-0000-0000-0000-000000000002';

  // --------------------------------------------------------------------------
  // Actors
  // --------------------------------------------------------------------------

  // 1. Platform Super Admin (System Ops)
  const platformAdmin: AuthUser = {
    id: 'platform-root-01',
    name: 'Platform Root Operator',
    email: 'root@internpulse.io',
    role: 'platform_super_admin',
    dept: 'SYSTEM_OPS',
    departmentCode: 'SYSTEM_OPS',
    college: 'PLATFORM',
    isActive: true,
  };

  const sysOpsSuperAdmin: AuthUser = {
    id: 'sysops-super-01',
    name: 'System Operations Super Admin',
    email: 'ops@internpulse.io',
    role: 'super_admin',
    dept: 'SYSTEM_OPS',
    departmentCode: 'SYSTEM_OPS',
    college: 'PLATFORM',
    isActive: true,
  };

  // 2. SMVEC Institution Administrator (College Principal)
  const smvecAdmin: AuthUser = {
    id: 'admin-smvec-01',
    name: 'Dr. SMVEC Principal',
    email: 'principal@smvec.ac.in',
    role: 'admin',
    dept: 'ADMIN',
    departmentCode: 'ADMIN',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    institutionDomain: 'smvec.ac.in',
    college: 'Sri Manakula Vinayagar Engineering College (Autonomous)',
    isActive: true,
  };

  // 3. SMVMCH Institution Administrator (Hospital Dean)
  const smvmchAdmin: AuthUser = {
    id: 'admin-smvmch-01',
    name: 'Dr. SMVMCH Dean',
    email: 'dean@smvmch.ac.in',
    role: 'admin',
    dept: 'ADMIN',
    departmentCode: 'ADMIN',
    institutionId: SMVMCH_ID,
    institutionCode: 'SMVMCH',
    institutionDomain: 'smvmch.ac.in',
    college: 'Sri Manakula Vinayagar Medical College and Hospital',
    isActive: true,
  };

  // 4. Institutional Faculty & Students
  const smvecHod: AuthUser = {
    id: 'hod-csebs-01',
    name: 'Dr. V. Gomathi',
    email: 'hod.csebs@smvec.ac.in',
    role: 'hod',
    dept: 'CSEBS',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const smvecMentor: AuthUser = {
    id: 'MENTOR_CSEBS_01',
    mentorId: 'MENTOR_CSEBS_01',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@college.edu',
    role: 'mentor',
    dept: 'CSEBS',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const smvecStudent: AuthUser = {
    id: 'st-csebs-001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@college.edu',
    role: 'student',
    dept: 'CSEBS',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  beforeEach(() => {
    institutionAdministrationService.resetState();
    (internshipRepository as any).departments = [...DEFAULT_DEPARTMENTS];
    internshipRepository.replaceDataset([...DEFAULT_STUDENTS]);
  });

  // ==========================================================================
  // TASK 1: PLATFORM SUPER ADMIN & ANTI-SURVEILLANCE PRIVACY BOUNDARY
  // ==========================================================================
  describe('1. Platform Super Admin & Anti-Surveillance Privacy Boundary', () => {
    it('1.1 should recognize both platform_super_admin role and SYSTEM_OPS super_admin as Platform Admins', () => {
      expect(AuthorizationPolicy.isPlatformAdmin(platformAdmin)).toBe(true);
      expect(AuthorizationPolicy.isPlatformAdmin(sysOpsSuperAdmin)).toBe(true);
      expect(AuthorizationPolicy.isPlatformAdmin(smvecAdmin)).toBe(false);
      expect(AuthorizationPolicy.isPlatformAdmin(smvecHod)).toBe(false);
      expect(AuthorizationPolicy.isPlatformAdmin(smvecStudent)).toBe(false);
    });

    it('1.2 should allow Platform Super Admin to inspect cross-tenant registration requests', () => {
      const requests = institutionAdministrationService.getRegistrationRequests(undefined, platformAdmin);
      expect(requests).toBeDefined();
      expect(requests.length).toBeGreaterThan(0);
    });

    it('1.3 should reject non-platform administrators from reviewing registration requests', () => {
      expect(() => {
        institutionAdministrationService.getRegistrationRequests(undefined, smvecAdmin);
      }).toThrow(ForbiddenException);

      expect(() => {
        institutionAdministrationService.getRegistrationRequests(undefined, smvecHod);
      }).toThrow(ForbiddenException);

      expect(() => {
        institutionAdministrationService.getRegistrationRequests(undefined, smvecStudent);
      }).toThrow(ForbiddenException);
    });

    it('1.4 Anti-Surveillance DPDP Guard: strictly blocks Platform Super Admin from raw GPS location coordinates', async () => {
      // Direct policy evaluation must throw ForbiddenException
      expect(() => {
        AuthorizationPolicy.validateLocationPrivacy(platformAdmin);
      }).toThrow(ForbiddenException);

      expect(() => {
        AuthorizationPolicy.validateLocationPrivacy(sysOpsSuperAdmin);
      }).toThrow(/anti-surveillance policies/i);

      // Attempting to query raw geolocation records through repository must reject platform admin
      await expect(
        geolocationVerificationRepository.getVerificationHistory({}, platformAdmin)
      ).rejects.toThrow(ForbiddenException);
    });

    it('1.5 allows educational mentors and students to access legitimate location verification history', async () => {
      // Mentors and students have legitimate pedagogical and attendance oversight
      expect(() => {
        AuthorizationPolicy.validateLocationPrivacy(smvecMentor);
      }).not.toThrow();

      expect(() => {
        AuthorizationPolicy.validateLocationPrivacy(smvecStudent);
      }).not.toThrow();

      const history = await geolocationVerificationRepository.getVerificationHistory({}, smvecMentor);
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  // ==========================================================================
  // TASK 2: INSTITUTION REGISTRATION WORKFLOW
  // ==========================================================================
  describe('2. Institution Registration Workflow', () => {
    it('2.1 should validate and submit a new institution registration request in pending status', async () => {
      const params: SubmitRegistrationRequestParams = {
        institutionName: 'Puducherry Technological University',
        institutionCode: 'PTU',
        institutionType: 'engineering',
        domain: 'ptu.edu.in',
        address: 'Pillaichavady, ECR',
        city: 'Puducherry',
        state: 'Puducherry',
        country: 'India',
        postalCode: '605014',
        contactEmail: 'contact@ptu.edu.in',
        contactPhone: '+91 413 265 5281',
        website: 'https://ptu.edu.in',
        adminName: 'Dr. S. Mohan',
        adminEmail: 'vice-chancellor@ptu.edu.in',
        adminPhone: '+91 413 265 5282',
        adminDesignation: 'Vice-Chancellor',
      };

      const request = await institutionAdministrationService.submitRegistrationRequest(params);

      expect(request).toBeDefined();
      expect(request.id).toMatch(/^req-/);
      expect(request.institutionCode).toBe('PTU');
      expect(request.status).toBe('pending');
      expect(request.provisioningStatus).toBe('unprovisioned');
      expect(request.domain).toBe('ptu.edu.in');
    });

    it('2.2 should reject registration requests with invalid or missing required fields', async () => {
      // Invalid code
      await expect(
        institutionAdministrationService.submitRegistrationRequest({
          institutionName: 'Test College',
          institutionCode: 'X', // Too short (min 2)
          institutionType: 'engineering',
          domain: 'testcollege.edu',
          address: 'Main Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          contactEmail: 'info@testcollege.edu',
          contactPhone: '9840123456',
          adminName: 'Admin Person',
          adminEmail: 'admin@testcollege.edu',
        })
      ).rejects.toThrow(/Institution code must be 2 to 10 alphanumeric/i);

      // Invalid domain
      await expect(
        institutionAdministrationService.submitRegistrationRequest({
          institutionName: 'Test College',
          institutionCode: 'TEST',
          institutionType: 'engineering',
          domain: 'invalid_domain_format',
          address: 'Main Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          contactEmail: 'info@testcollege.edu',
          contactPhone: '9840123456',
          adminName: 'Admin Person',
          adminEmail: 'admin@testcollege.edu',
        })
      ).rejects.toThrow(/domain is invalid/i);

      // Invalid email
      await expect(
        institutionAdministrationService.submitRegistrationRequest({
          institutionName: 'Test College',
          institutionCode: 'TEST',
          institutionType: 'engineering',
          domain: 'testcollege.edu',
          address: 'Main Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          contactEmail: 'not-an-email',
          contactPhone: '9840123456',
          adminName: 'Admin Person',
          adminEmail: 'admin@testcollege.edu',
        })
      ).rejects.toThrow(/email format is invalid/i);
    });

    it('2.3 should prevent duplicate registration for already existing institution code or domain', async () => {
      // Duplicate of SMVEC
      await expect(
        institutionAdministrationService.submitRegistrationRequest({
          institutionName: 'Duplicate SMVEC Attempt',
          institutionCode: 'SMVEC',
          institutionType: 'engineering',
          domain: 'smvec-new.ac.in',
          address: 'Madagadipet',
          city: 'Puducherry',
          state: 'Puducherry',
          contactEmail: 'new@smvec.ac.in',
          contactPhone: '9840123456',
          adminName: 'Admin',
          adminEmail: 'admin@smvec-new.ac.in',
        })
      ).rejects.toThrow(/already registered/i);

      // Duplicate of SMVMCH domain
      await expect(
        institutionAdministrationService.submitRegistrationRequest({
          institutionName: 'Duplicate Domain Attempt',
          institutionCode: 'DIFFCODE',
          institutionType: 'medical',
          domain: 'smvmch.ac.in',
          address: 'Kalitheerthalkuppam',
          city: 'Puducherry',
          state: 'Puducherry',
          contactEmail: 'contact@smvmch.ac.in',
          contactPhone: '9840123456',
          adminName: 'Admin',
          adminEmail: 'admin@smvmch.ac.in',
        })
      ).rejects.toThrow(/already bound to institution/i);
    });

    it('2.4 allows Platform Super Admin to reject a registration request with documented reason', async () => {
      // Submit a dummy request to reject
      const req = await institutionAdministrationService.submitRegistrationRequest({
        institutionName: 'Unaccredited College of Tech',
        institutionCode: 'UCT',
        institutionType: 'engineering',
        domain: 'uct.edu',
        address: 'Outskirts',
        city: 'Madurai',
        state: 'Tamil Nadu',
        contactEmail: 'info@uct.edu',
        contactPhone: '+91 99999 88888',
        adminName: 'Fake Admin',
        adminEmail: 'fake.admin@uct.edu',
      });

      const rejected = await institutionAdministrationService.rejectRegistrationRequest(
        req.id,
        'Institutional accreditation documents failed statutory AICTE verification.',
        platformAdmin
      );

      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toContain('AICTE verification');
      expect(rejected.reviewedById).toBe(platformAdmin.id);
    });
  });

  // ==========================================================================
  // TASK 4: SAFE, IDEMPOTENT & RECOVERABLE INSTITUTION PROVISIONING
  // ==========================================================================
  describe('4. Safe, Idempotent & Recoverable Institution Provisioning', () => {
    it('4.1 should automatically provision an institution upon approval with default settings and departments', async () => {
      // Submit new Arts & Science college
      const req = await institutionAdministrationService.submitRegistrationRequest({
        institutionName: 'Pondicherry Arts and Science College',
        institutionCode: 'PASC',
        institutionType: 'arts_science',
        domain: 'pasc.edu.in',
        address: 'Lawspet Campus',
        city: 'Puducherry',
        state: 'Puducherry',
        contactEmail: 'principal@pasc.edu.in',
        contactPhone: '+91 413 225 1111',
        adminName: 'Dr. M. Sangeetha',
        adminEmail: 'sangeetha.admin@pasc.edu.in',
      });

      // Approve request
      const { request, provisioningResult } = await institutionAdministrationService.approveRegistrationRequest(
        req.id,
        platformAdmin
      );

      expect(request.status).toBe('approved');
      expect(request.provisioningStatus).toBe('provisioned');
      expect(request.provisionedInstitutionId).toBeDefined();

      // Verify Institution Profile Created
      const inst = provisioningResult.institution;
      expect(inst.code).toBe('PASC');
      expect(inst.status).toBe('active');
      expect(inst.brandingConfig?.primaryColor).toBe('#7C3AED'); // Arts & Science purple palette
      expect(inst.dpdpComplianceConfig?.dpoName).toBe('Dr. M. Sangeetha');

      // Verify Initial Admin Created
      const admin = provisioningResult.adminUser;
      expect(admin.email).toBe('sangeetha.admin@pasc.edu.in');
      expect(admin.role).toBe('admin');
      expect(canonicalizeInstitutionId(admin.institutionId)).toBe(canonicalizeInstitutionId(inst.id));

      // Verify Initial Departments Initialized by Type (CS, BBA, BCOM, ENG)
      const deptCodes = provisioningResult.departments.map(d => d.code);
      expect(deptCodes).toContain('CS');
      expect(deptCodes).toContain('BBA');
      expect(deptCodes).toContain('BCOM');
      expect(deptCodes).toContain('ENG');
    });

    it('4.2 Idempotency: re-running provisioning must not crash or create duplicate departments', async () => {
      // Find previously provisioned SMVMCH request
      const smvmchReq = institutionAdministrationService
        .getRegistrationRequests(undefined, platformAdmin)
        .find(r => r.institutionCode === 'SMVMCH');

      expect(smvmchReq).toBeDefined();

      // Re-provisioning the existing institution
      const reProvision = await institutionAdministrationService.provisionInstitution(
        smvmchReq!.id,
        platformAdmin
      );

      expect(reProvision.institution.code).toBe('SMVMCH');
      expect(reProvision.institution.status).toBe('active');

      // Check no duplicated departments for SMVMCH
      const smvmchDepts = internshipRepository.getAllDepartments().filter(
        d => canonicalizeInstitutionId(d.institutionId) === canonicalizeInstitutionId(SMVMCH_ID)
      );

      const uniqueCodes = new Set(smvmchDepts.map(d => d.code));
      expect(uniqueCodes.size).toBe(smvmchDepts.length);
    });
  });

  // ==========================================================================
  // TASK 3: INSTITUTION ADMINISTRATOR & SCOPED GOVERNANCE
  // ==========================================================================
  describe('3. Institution Administrator & Scoped Governance', () => {
    it('3.1 allows authorized Institution Administrator to update their institution profile and settings', async () => {
      const updated = await institutionAdministrationService.updateInstitutionProfile(
        SMVEC_ID,
        {
          shortName: 'SMVEC Autonomous',
          contactPhone: '+91 413 264 3009',
          institutionalSettings: {
            windowDurationMinutes: 20,
            complianceThresholdPercentage: 80.0,
          },
        },
        smvecAdmin
      );

      expect(updated.shortName).toBe('SMVEC Autonomous');
      expect(updated.contactPhone).toBe('+91 413 264 3009');
      expect(updated.institutionalSettings?.windowDurationMinutes).toBe(20);
      expect(updated.institutionalSettings?.complianceThresholdPercentage).toBe(80.0);
    });

    it('3.2 Cross-Tenant Protection: prevents Institution Administrator of College A from modifying College B', async () => {
      // SMVEC Admin trying to modify SMVMCH
      await expect(
        institutionAdministrationService.updateInstitutionProfile(
          SMVMCH_ID,
          {
            shortName: 'Tampered Name',
          },
          smvecAdmin
        )
      ).rejects.toThrow(ForbiddenException);

      // SMVMCH Admin trying to modify SMVEC
      await expect(
        institutionAdministrationService.updateInstitutionProfile(
          SMVEC_ID,
          {
            shortName: 'Tampered SMVEC',
          },
          smvmchAdmin
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('3.3 allows assigning additional Institution Administrators within the authorized tenant', async () => {
      const newAdmin = await institutionAdministrationService.assignInstitutionAdmin(
        SMVEC_ID,
        {
          name: 'Dr. K. Ambujam',
          email: 'dean.academics@smvec.ac.in',
          phone: '+91 94432 99887',
          designation: 'Dean Academics',
        },
        smvecAdmin
      );

      expect(newAdmin).toBeDefined();
      expect(newAdmin.name).toBe('Dr. K. Ambujam');
      expect(newAdmin.role).toBe('admin');
      expect(canonicalizeInstitutionId(newAdmin.institutionId)).toBe(canonicalizeInstitutionId(SMVEC_ID));
    });

    it('3.4 Cross-Tenant Protection: prevents assigning admin to another institution', async () => {
      await expect(
        institutionAdministrationService.assignInstitutionAdmin(
          SMVMCH_ID,
          {
            name: 'Unauthorized Admin',
            email: 'intruder@smvec.ac.in',
          },
          smvecAdmin
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // TASK 1 & 5: INSTITUTION LIFECYCLE (SUSPEND & REACTIVATE)
  // ==========================================================================
  describe('5. Institution Lifecycle: Suspension & Reactivation', () => {
    it('5.1 allows Platform Super Admin to suspend an institution and locks operational access', async () => {
      const suspendedInst = await institutionAdministrationService.suspendInstitution(
        SMVMCH_ID,
        'Annual institutional compliance audit pending completion.',
        platformAdmin
      );

      expect(suspendedInst.status).toBe('suspended');

      // Verify that validateInstitutionActive locks regular operational access
      expect(() => {
        AuthorizationPolicy.validateInstitutionActive(suspendedInst, smvmchAdmin);
      }).toThrow(/currently suspended/i);

      // Platform Super Admin can still inspect suspended tenant
      expect(() => {
        AuthorizationPolicy.validateInstitutionActive(suspendedInst, platformAdmin);
      }).not.toThrow();
    });

    it('5.2 Root Anchor Protection Guard: SMVEC cannot be suspended', async () => {
      await expect(
        institutionAdministrationService.suspendInstitution(
          SMVEC_ID,
          'Accidental root suspension attempt',
          platformAdmin
        )
      ).rejects.toThrow(/Root anchor institution SMVEC is protected and cannot be suspended/i);
    });

    it('5.3 allows Platform Super Admin to reactivate a suspended institution and restore access', async () => {
      const reactivated = await institutionAdministrationService.reactivateInstitution(
        SMVMCH_ID,
        platformAdmin
      );

      expect(reactivated.status).toBe('active');

      // Verify regular users can now access operations normally
      expect(() => {
        AuthorizationPolicy.validateInstitutionActive(reactivated, smvmchAdmin);
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // TASK 1 & 5: PLATFORM OPERATIONAL METRICS & IMMUTABLE AUDIT LOGS
  // ==========================================================================
  describe('6. Platform Operational Metrics & Immutable Audit Trail', () => {
    it('6.1 should compute platform-wide operational metrics accurately across all institutions', () => {
      const metrics = institutionAdministrationService.getPlatformOperationalMetrics(platformAdmin);

      expect(metrics).toBeDefined();
      expect(metrics.totalInstitutions).toBeGreaterThanOrEqual(2);
      expect(metrics.activeInstitutions).toBeGreaterThanOrEqual(1);
      expect(metrics.totalDepartments).toBeGreaterThanOrEqual(4);
      expect(metrics.totalStudents).toBeGreaterThan(0);
      expect(metrics.systemHealth).toBe('HEALTHY');
      expect(metrics.calculatedAt).toBeDefined();
    });

    it('6.2 should reject non-platform administrators from querying platform operational metrics', () => {
      expect(() => {
        institutionAdministrationService.getPlatformOperationalMetrics(smvecAdmin);
      }).toThrow(ForbiddenException);

      expect(() => {
        institutionAdministrationService.getPlatformOperationalMetrics(smvecHod);
      }).toThrow(ForbiddenException);
    });

    it('6.3 should record every administrative action in the immutable platform audit log', () => {
      const auditLogs = institutionAdministrationService.getPlatformAuditLogs(undefined, platformAdmin);

      expect(auditLogs).toBeDefined();
      expect(auditLogs.length).toBeGreaterThan(0);

      const actions = auditLogs.map(l => l.action);
      expect(actions).toContain('REGISTRATION_REQUEST_APPROVED');
      expect(actions).toContain('INSTITUTION_PROVISIONED');

      // Verify log details have actor and timestamp
      const latestLog = auditLogs[0];
      expect(latestLog.id).toBeDefined();
      expect(latestLog.performedByName).toBeDefined();
      expect(latestLog.createdAt).toBeDefined();
    });

    it('6.4 should allow filtering platform audit logs by target institution', () => {
      const smvmchLogs = institutionAdministrationService.getPlatformAuditLogs(
        { targetInstitutionId: SMVMCH_ID },
        platformAdmin
      );

      expect(smvmchLogs.length).toBeGreaterThan(0);
      smvmchLogs.forEach(log => {
        if (log.targetInstitutionId) {
          expect(canonicalizeInstitutionId(log.targetInstitutionId)).toBe(canonicalizeInstitutionId(SMVMCH_ID));
        }
      });
    });
  });
});
