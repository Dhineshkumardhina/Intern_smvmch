/**
 * ============================================================================
 * INTERNPULSE — PHASE 18B: MULTI-TENANT INSTITUTION ISOLATION TEST SUITE
 * Validates Complete Institutional Separation, Cross-Tenant Security Boundaries,
 * Composite Tenant Uniqueness, Institutional Settings, and SMVEC Compatibility.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthUser } from '../authUser';
import { 
  AuthorizationPolicy, 
  ForbiddenException, 
  UnauthorizedException 
} from '../rbac/authorizationPolicy';
import { internshipRepository } from '../../repository/internshipRepository';
import { institutionalAnalyticsService } from '../../analytics/institutionalAnalyticsService';
import { studentOnboardingService } from '../../onboarding/studentOnboardingService';
import { consentManager, CURRENT_DPDP_NOTICE } from '../../privacy/consentManager';
import { 
  DEFAULT_INSTITUTIONS, 
  DEFAULT_STUDENTS,
  DEFAULT_DEPARTMENTS,
  canonicalizeInstitutionId,
  InstitutionRecord 
} from '../../../data/initialData';

describe('Phase 18B: Multi-Tenant Architecture & Institution Isolation', () => {
  const SMVEC_ID = 'a0000000-0000-0000-0000-000000000001';
  const SMVMCH_ID = 'a0000000-0000-0000-0000-000000000002';

  // Test Actors
  const smvecAdmin: AuthUser = {
    id: 'smvec-admin-01',
    name: 'Dr. SMVEC Principal',
    email: 'principal@smvec.ac.in',
    role: 'admin',
    departmentCode: 'ADMIN',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    institutionDomain: 'smvec.ac.in',
    college: 'SMVEC',
    isActive: true,
  };

  const smvmchAdmin: AuthUser = {
    id: 'smvmch-admin-01',
    name: 'Dr. SMVMCH Dean',
    email: 'dean@smvmch.ac.in',
    role: 'admin',
    departmentCode: 'ADMIN',
    institutionId: SMVMCH_ID,
    institutionCode: 'SMVMCH',
    institutionDomain: 'smvmch.ac.in',
    college: 'SMVMCH',
    isActive: true,
  };

  const smvecHod: AuthUser = {
    id: 'smvec-hod-csebs',
    name: 'Dr. Senthamilselvan',
    email: 'hod.csebs@smvec.ac.in',
    role: 'hod',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const smvmchHod: AuthUser = {
    id: 'smvmch-hod-cm',
    name: 'Dr. Suguna',
    email: 'hod.cm@smvmch.ac.in',
    role: 'hod',
    departmentCode: 'COMM_MED',
    institutionId: SMVMCH_ID,
    institutionCode: 'SMVMCH',
    college: 'SMVMCH',
    isActive: true,
  };

  const smvecMentor: AuthUser = {
    id: 'MENTOR_CSEBS_01',
    mentorId: 'MENTOR_CSEBS_01',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@college.edu',
    role: 'mentor',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const smvmchMentor: AuthUser = {
    id: 'MENTOR_MED_01',
    mentorId: 'MENTOR_MED_01',
    name: 'Dr. Karthikeyan MD',
    email: 'karthikeyan@smvmch.ac.in',
    role: 'mentor',
    departmentCode: 'COMM_MED',
    institutionId: SMVMCH_ID,
    institutionCode: 'SMVMCH',
    college: 'SMVMCH',
    isActive: true,
  };

  const smvecStudent: AuthUser = {
    id: 'st-csebs-001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@college.edu',
    role: 'student',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const platformOperator: AuthUser = {
    id: 'sysops-root-01',
    name: 'Platform Operator Root',
    email: 'ops@internpulse.io',
    role: 'super_admin',
    departmentCode: 'SYSTEM_OPS',
    dept: 'SYSTEM_OPS',
    college: 'PLATFORM',
    isActive: true,
  };

  beforeEach(() => {
    (internshipRepository as any).departments = [...DEFAULT_DEPARTMENTS];
    internshipRepository.replaceDataset([...DEFAULT_STUDENTS]);
    consentManager.reset();
  });

  // ==========================================================================
  // SECTION 1: INSTITUTION IDENTITY & CONFIGURATION
  // ==========================================================================

  describe('1. Institution Identity & Configuration', () => {
    it('1.1 should register and retrieve SMVEC and SMVMCH as independent institutions', () => {
      const institutions = internshipRepository.getAllInstitutions(platformOperator);
      expect(institutions.length).toBeGreaterThanOrEqual(2);

      const smvec = internshipRepository.getInstitutionById(SMVEC_ID);
      expect(smvec).not.toBeNull();
      expect(smvec?.code).toBe('SMVEC');
      expect(smvec?.domain).toBe('smvec.ac.in');
      expect(smvec?.brandingConfig?.primaryColor).toBe('#1E3A8A');

      const smvmch = internshipRepository.getInstitutionById(SMVMCH_ID);
      expect(smvmch).not.toBeNull();
      expect(smvmch?.code).toBe('SMVMCH');
      expect(smvmch?.domain).toBe('smvmch.ac.in');
      expect(smvmch?.brandingConfig?.primaryColor).toBe('#065F46');
    });

    it('1.2 should resolve institution lookup by domain and by code', () => {
      const byDomain = internshipRepository.getInstitutionByDomain('smvmch.ac.in');
      expect(byDomain).not.toBeNull();
      expect(byDomain?.id).toBe(SMVMCH_ID);

      const byCode = internshipRepository.getInstitutionByCode('SMVEC');
      expect(byCode).not.toBeNull();
      expect(byCode?.domain).toBe('smvec.ac.in');
    });

    it('1.3 should scope institution catalog visibility to own institution for college admins', () => {
      const smvecVisible = internshipRepository.getAllInstitutions(smvecAdmin);
      expect(smvecVisible.length).toBe(1);
      expect(smvecVisible[0].id).toBe(SMVEC_ID);

      const smvmchVisible = internshipRepository.getAllInstitutions(smvmchAdmin);
      expect(smvmchVisible.length).toBe(1);
      expect(smvmchVisible[0].id).toBe(SMVMCH_ID);

      const platformVisible = internshipRepository.getAllInstitutions(platformOperator);
      expect(platformVisible.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // SECTION 2: CROSS-TENANT ACCESS PREVENTION & ISOLATION
  // ==========================================================================

  describe('2. Cross-Tenant Access Prevention & Authorization Scoping', () => {
    it('2.1 should prevent SMVEC Admin from accessing SMVMCH students directly', () => {
      expect(() => {
        AuthorizationPolicy.validateInstitutionScope(smvecAdmin, SMVMCH_ID);
      }).toThrow(ForbiddenException);

      expect(() => {
        AuthorizationPolicy.validateInstitutionScope(smvmchAdmin, SMVEC_ID);
      }).toThrow(ForbiddenException);
    });

    it('2.2 should allow Platform Operator full cross-institution jurisdiction', () => {
      expect(() => {
        AuthorizationPolicy.validateInstitutionScope(platformOperator, SMVEC_ID);
      }).not.toThrow();

      expect(() => {
        AuthorizationPolicy.validateInstitutionScope(platformOperator, SMVMCH_ID);
      }).not.toThrow();
    });

    it('2.3 should block SMVEC Admin from modifying or saving SMVMCH institution settings', async () => {
      const smvmchRecord = internshipRepository.getInstitutionById(SMVMCH_ID)!;
      const tamperedRecord: InstitutionRecord = {
        ...smvmchRecord,
        name: 'Tampered College Name',
      };

      await expect(
        internshipRepository.saveInstitution(tamperedRecord, smvecAdmin)
      ).rejects.toThrow(ForbiddenException);
    });

    it('2.4 should allow institution admin to update only their own institution configuration', async () => {
      const smvecRecord = internshipRepository.getInstitutionById(SMVEC_ID)!;
      const updatedRecord: InstitutionRecord = {
        ...smvecRecord,
        shortName: 'SMVEC-AUTO',
      };

      await expect(
        internshipRepository.saveInstitution(updatedRecord, smvecAdmin)
      ).resolves.not.toThrow();

      const refreshed = internshipRepository.getInstitutionById(SMVEC_ID);
      expect(refreshed?.shortName).toBe('SMVEC-AUTO');
    });
  });

  // ==========================================================================
  // SECTION 3: COMPOSITE TENANT UNIQUENESS (REGISTER NUMBER & DEPARTMENTS)
  // ==========================================================================

  describe('3. Composite Tenant Uniqueness (Register Number & Department Codes)', () => {
    it('3.1 should allow identical student register numbers in different institutions without collision', async () => {
      // 1. Onboard student with ID '2026-MED-001' into SMVEC
      const studentSmvec = await internshipRepository.onboardStudent({
        studentId: '2026-INT-001',
        studentName: 'Anand Kumar SMVEC',
        email: 'anand.smvec@college.edu',
        departmentCode: 'CSEBS',
        academicYear: '3rd Year',
        institutionId: SMVEC_ID,
        institutionCode: 'SMVEC',
      }, smvecAdmin);

      expect(studentSmvec.studentId).toBe('2026-INT-001');
      expect(studentSmvec.institutionId).toBe(SMVEC_ID);

      // 2. Onboard student with IDENTICAL ID '2026-INT-001' into SMVMCH
      const studentSmvmch = await internshipRepository.onboardStudent({
        studentId: '2026-INT-001',
        studentName: 'Anand Kumar SMVMCH',
        email: 'anand.smvmch@smvmch.ac.in',
        departmentCode: 'CSEBS',
        academicYear: '3rd Year',
        institutionId: SMVMCH_ID,
        institutionCode: 'SMVMCH',
      }, smvmchAdmin);

      expect(studentSmvmch.studentId).toBe('2026-INT-001');
      expect(studentSmvmch.institutionId).toBe(SMVMCH_ID);
    });

    it('3.2 should reject duplicate register numbers within the SAME institution', async () => {
      await internshipRepository.onboardStudent({
        studentId: '2026-DUP-001',
        studentName: 'First Student',
        email: 'first@smvec.ac.in',
        departmentCode: 'CSEBS',
        academicYear: '3rd Year',
        institutionId: SMVEC_ID,
      }, smvecAdmin);

      await expect(
        internshipRepository.onboardStudent({
          studentId: '2026-DUP-001',
          studentName: 'Second Student Duplicate',
          email: 'second@smvec.ac.in',
          departmentCode: 'CSEBS',
          academicYear: '3rd Year',
          institutionId: SMVEC_ID,
        }, smvecAdmin)
      ).rejects.toThrow(/Duplicate Register Number/i);
    });

    it('3.3 should allow identical department codes across different institutions', async () => {
      // Create 'GEN_SCI' in SMVEC
      const deptSmvec = await internshipRepository.createDepartment({
        code: 'GEN_SCI',
        name: 'General Science & Humanities',
        institutionId: SMVEC_ID,
      }, smvecAdmin);
      expect(deptSmvec.code).toBe('GEN_SCI');

      // Create identical code 'GEN_SCI' in SMVMCH
      const deptSmvmch = await internshipRepository.createDepartment({
        code: 'GEN_SCI',
        name: 'General Medical Sciences',
        institutionId: SMVMCH_ID,
      }, smvmchAdmin);
      expect(deptSmvmch.code).toBe('GEN_SCI');
      expect(deptSmvmch.institutionId).toBe(SMVMCH_ID);
    });
  });

  // ==========================================================================
  // SECTION 4: DEPARTMENT & BATCH SCOPING ACROSS COLLEGES
  // ==========================================================================

  describe('4. Department & Batch Scoping Across Colleges', () => {
    it('4.1 should isolate department queries to caller institution', () => {
      const smvecDepts = internshipRepository.getAllDepartments(smvecAdmin);
      const allBelongToSmvec = smvecDepts.every(d => canonicalizeInstitutionId(d.institutionId) === SMVEC_ID);
      expect(allBelongToSmvec).toBe(true);

      const smvmchDepts = internshipRepository.getAllDepartments(smvmchAdmin);
      const allBelongToSmvmch = smvmchDepts.every(d => canonicalizeInstitutionId(d.institutionId) === SMVMCH_ID);
      expect(allBelongToSmvmch).toBe(true);
    });

    it('4.2 should isolate internship batches to the institution', async () => {
      const batchSmvec = await internshipRepository.createInternshipBatch({
        departmentCode: 'CSEBS',
        batchName: 'SMVEC-CSEBS-2026-SUMMER',
        academicYear: '2025-2026',
        termCode: 'SUMMER',
        semester: 6,
        startDate: '2026-05-01',
        endDate: '2026-07-31',
      }, smvecAdmin);

      expect(batchSmvec.institutionId).toBe(SMVEC_ID);

      const smvecBatches = internshipRepository.getInternshipBatches(undefined, smvecAdmin);
      expect(smvecBatches.some(b => b.id === batchSmvec.id)).toBe(true);

      const smvmchBatches = internshipRepository.getInternshipBatches(undefined, smvmchAdmin);
      expect(smvmchBatches.some(b => b.id === batchSmvec.id)).toBe(false);
    });
  });

  // ==========================================================================
  // SECTION 5: ANALYTICS & REPORTING ISOLATION
  // ==========================================================================

  describe('5. Institutional Analytics & Reporting Tenant Scoping', () => {
    it('5.1 should aggregate metrics strictly for caller institution without metrics pollution', async () => {
      // Add student to SMVMCH
      await internshipRepository.onboardStudent({
        studentId: '2026-MED-999',
        studentName: 'Medical Student Isolated',
        email: 'med999@smvmch.ac.in',
        departmentCode: 'CSEBS',
        academicYear: '3rd Year',
        institutionId: SMVMCH_ID,
      }, smvmchAdmin);

      const smvecStats = internshipRepository.getInstitutionStatistics(smvecAdmin);
      const smvmchStats = internshipRepository.getInstitutionStatistics(smvmchAdmin);

      // SMVMCH student count should reflect only SMVMCH students
      expect(smvmchStats.totalStudents).toBe(1);

      // SMVEC stats must not count the SMVMCH student
      expect(smvecStats.totalStudents).toBe(DEFAULT_STUDENTS.length);
    });

    it('5.2 should produce institution-branded reports with isolated audit logs', async () => {
      const exportResult = await institutionalAnalyticsService.exportAnalyticsReport({
        reportType: 'institution_summary',
        format: 'pdf',
      }, smvecAdmin);

      expect(exportResult.fileName).toContain('institutional_internship_performan');
      expect(exportResult.content).toContain('SRI MANAKULA VINAYAGAR ENGINEERING COLLEGE');
    });
  });

  // ==========================================================================
  // SECTION 6: STATUTORY DPDP NOTICE SCOPING (INSTITUTION DPO DETAILS)
  // ==========================================================================

  describe('6. DPDP Statutory Notice Scoping (Custom Institution DPO)', () => {
    it('6.1 should return SMVEC DPO details for SMVEC institution', () => {
      const smvecNotice = consentManager.getNoticeMetadata(SMVEC_ID);
      expect(smvecNotice.grievanceOfficer.name).toBe('Dr. S. Radhakrishnan');
      expect(smvecNotice.grievanceOfficer.email).toBe('grievance.dpo@smvec.ac.in');
    });

    it('6.2 should return SMVMCH DPO details for SMVMCH institution', () => {
      const smvmchNotice = consentManager.getNoticeMetadata(SMVMCH_ID);
      expect(smvmchNotice.grievanceOfficer.name).toBe('Dr. K. Rajagopal');
      expect(smvmchNotice.grievanceOfficer.email).toBe('dpo.medical@smvmch.ac.in');
      expect(smvmchNotice.grievanceOfficer.address).toContain('SMVMCH Campus');
    });

    it('6.3 should record affirmative student consent with institution ID', () => {
      const record = consentManager.recordConsent(
        '23CSEBS001',
        true,
        '2026.1-DPDP',
        SMVEC_ID
      );
      expect(record.consentGiven).toBe(true);
      expect(record.institutionId).toBe(SMVEC_ID);
      expect(consentManager.isConsentActive('23CSEBS001')).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 7: SMVEC BACKWARD COMPATIBILITY
  // ==========================================================================

  describe('7. SMVEC Backward Compatibility & Anchor Integrity', () => {
    it('7.1 should preserve all existing SMVEC student records under anchor UUID', () => {
      const smvecStudents = internshipRepository.getAllStudentsForAdmin(smvecAdmin);
      expect(smvecStudents.length).toBeGreaterThanOrEqual(7);

      const harish = smvecStudents.find(s => s.studentId === '23CSEBS001');
      expect(harish).toBeDefined();
      expect(harish?.company).toBe('Tata Consultancy Services');
      expect(canonicalizeInstitutionId(harish?.institutionId)).toBe(SMVEC_ID);
    });

    it('7.2 should allow SMVEC mentor to access mentee without cross-tenant rejection', () => {
      const student = internshipRepository.getStudentById('23CSEBS001', smvecMentor);
      expect(student).not.toBeNull();
      expect(student?.studentName).toBe('Harish V');
    });
  });
});
