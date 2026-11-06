/**
 * ============================================================================
 * INTERNPULSE — PHASE 17D AUTOMATED TEST SUITE
 * Scalable Student Onboarding & Institutional Data Migration
 * Verification of Bulk Import (CSV/XLSX), Validation Pipeline, Secure
 * Account Provisioning, Pilot Preservation, Rollback, and Scalability Benchmarks.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { studentOnboardingService } from '../../onboarding/studentOnboardingService';
import { internshipRepository } from '../../repository/internshipRepository';
import { locationRepository } from '../../repository/locationRepository';
import { AuthUser } from '../authUser';
import { StudentRecord, DepartmentRecord } from '../../../data/initialData';

describe('Phase 17D: Scalable Student Onboarding & Institutional Data Migration', () => {
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

  const unauthorizedMentorUser: AuthUser = {
    id: 'mentor-it-001',
    name: 'Prof. K. Ramesh',
    email: 'ramesh.it@smvec.ac.in',
    role: 'mentor',
    dept: 'IT Department',
    departmentCode: 'IT',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  beforeEach(() => {
    internshipRepository.resetToDefaults();
    locationRepository.resetToDefaults();
    studentOnboardingService.resetToDefaults();
  });

  // ==========================================================================
  // SECTION 1: BULK FILE PARSING (CSV & XLSX)
  // ==========================================================================

  describe('1. File Parsing Engine (CSV & XLSX)', () => {
    it('1.1 should parse standard RFC 4180 CSV with header row', () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT001,Anand Kumar,anand@smvec.ac.in,IT,3rd Year\n23IT002,Bala Vignesh,bala@smvec.ac.in,IT,3rd Year`;
      const rows = studentOnboardingService.parseCsv(csv);

      expect(rows).toHaveLength(2);
      expect(rows[0].register_number).toBe('23IT001');
      expect(rows[0].full_name).toBe('Anand Kumar');
      expect(rows[1].register_number).toBe('23IT002');
      expect(rows[1].email).toBe('bala@smvec.ac.in');
    });

    it('1.2 should parse CSV with quoted strings containing commas', () => {
      const csv = `register_number,full_name,email,department_code,year\n23ECE001,"Raman, Sundar",sundar@smvec.ac.in,ECE,3rd Year`;
      const rows = studentOnboardingService.parseCsv(csv);

      expect(rows).toHaveLength(1);
      expect(rows[0].full_name).toBe('Raman, Sundar');
      expect(rows[0].department_code).toBe('ECE');
    });

    it('1.3 should detect and parse semicolon and tab delimited text', () => {
      const semicolonCsv = `register_number;full_name;email;department_code;year\n23MECH001;Karthik Raja;karthik@smvec.ac.in;MECH;3rd Year`;
      const semiRows = studentOnboardingService.parseCsv(semicolonCsv);
      expect(semiRows).toHaveLength(1);
      expect(semiRows[0].register_number).toBe('23MECH001');

      const tabTsv = `register_number\tfull_name\temail\tdepartment_code\tyear\n23CIVIL001\tPraveen Kumar\tpraveen@smvec.ac.in\tCIVIL\t3rd Year`;
      const tabRows = studentOnboardingService.parseCsv(tabTsv);
      expect(tabRows).toHaveLength(1);
      expect(tabRows[0].register_number).toBe('23CIVIL001');
    });

    it('1.4 should handle empty or whitespace-only files gracefully', () => {
      expect(studentOnboardingService.parseCsv('')).toEqual([]);
      expect(studentOnboardingService.parseCsv('   \n  \n  ')).toEqual([]);
    });

    it('1.5 should parse XLSX binary workbooks accurately', () => {
      const sampleData = [
        { register_number: '23IT010', full_name: 'Divya S', email: 'divya@smvec.ac.in', department_code: 'IT', year: '3rd Year' },
        { register_number: '23IT011', full_name: 'Dinesh K', email: 'dinesh@smvec.ac.in', department_code: 'IT', year: '3rd Year' },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const parsedRows = studentOnboardingService.parseXlsx(xlsxBuffer);
      expect(parsedRows).toHaveLength(2);
      expect(parsedRows[0].register_number).toBe('23IT010');
      expect(parsedRows[1].full_name).toBe('Dinesh K');
    });
  });

  // ==========================================================================
  // SECTION 2: VALIDATION PIPELINE & ERROR DIAGNOSTICS
  // ==========================================================================

  describe('2. Validation Pipeline & Error Diagnostics', () => {
    it('2.1 should reject invalid register numbers (format, length, special characters)', () => {
      const csv = `register_number,full_name,email,department_code,year\nINV@LID$,Test Student,test@smvec.ac.in,IT,3rd Year\n12,Short Reg,short@smvec.ac.in,IT,3rd Year`;
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'invalid_regs.csv', fileFormat: 'csv' },
        superAdminUser
      );

      expect(preview.validRowsCount).toBe(0);
      expect(preview.invalidRowsCount).toBe(2);
      expect(preview.validationErrors.some((e) => e.columnName === 'registerNumber')).toBe(true);
    });

    it('2.2 should reject missing names and invalid emails', () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT020,,not-an-email,IT,3rd Year`;
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'missing_fields.csv', fileFormat: 'csv' },
        superAdminUser
      );

      expect(preview.validRowsCount).toBe(0);
      expect(preview.validationErrors.some((e) => e.columnName === 'name')).toBe(true);
      expect(preview.validationErrors.some((e) => e.columnName === 'email')).toBe(true);
    });

    it('2.3 should reject non-existent or inactive departments', () => {
      const csv = `register_number,full_name,email,department_code,year\n23FAKE001,Fake Dept Student,fake@smvec.ac.in,NON_EXISTENT_DEPT,3rd Year`;
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'fake_dept.csv', fileFormat: 'csv' },
        superAdminUser
      );

      expect(preview.validRowsCount).toBe(0);
      expect(preview.validationErrors.some((e) => e.columnName === 'departmentCode')).toBe(true);
    });

    it('2.4 should enforce HOD department boundary scoping', () => {
      // IT HOD attempting to import students for ECE
      const csv = `register_number,full_name,email,department_code,year\n23ECE050,Suresh ECE,suresh@smvec.ac.in,ECE,3rd Year`;
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'cross_dept.csv', fileFormat: 'csv' },
        itHodUser
      );

      expect(preview.validRowsCount).toBe(0);
      expect(preview.invalidRowsCount).toBe(1);
      expect(
        preview.validationErrors.some((e) => e.errorMessage.includes('forbidden from importing students'))
      ).toBe(true);
    });

    it('2.5 should allow Super Admin to import across any active department', () => {
      const csv = `register_number,full_name,email,department_code,year\n23ECE051,Suresh Multi,suresh.multi@smvec.ac.in,ECE,3rd Year\n23IT051,Kavitha Multi,kavitha.multi@smvec.ac.in,IT,3rd Year`;
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'multi_dept.csv', fileFormat: 'csv' },
        superAdminUser
      );

      expect(preview.validRowsCount).toBe(2);
      expect(preview.invalidRowsCount).toBe(0);
      expect(preview.departmentBreakdown['ECE']).toBe(1);
      expect(preview.departmentBreakdown['IT']).toBe(1);
    });

    it('2.6 should detect internal duplicates within the import file', () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT060,Student One,one@smvec.ac.in,IT,3rd Year\n23IT060,Student One Duplicate,two@smvec.ac.in,IT,3rd Year`;
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'internal_duplicates.csv', fileFormat: 'csv' },
        itHodUser
      );

      expect(preview.duplicateRowsCount).toBe(1);
      expect(preview.validRowsCount).toBe(1);
      expect(preview.invalidRowsCount).toBe(1);
    });
  });

  // ==========================================================================
  // SECTION 3: DUPLICATE RESOLUTION STRATEGIES & DRY RUN
  // ==========================================================================

  describe('3. Duplicate Resolution Strategies & Dry-Run Simulation', () => {
    it('3.1 should preview import with accurate sample rows without writing data', () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT070,Preview Student,preview@smvec.ac.in,IT,3rd Year`;
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'preview_test.csv', fileFormat: 'csv' },
        itHodUser
      );

      expect(preview.validSampleRows).toHaveLength(1);
      expect(preview.validSampleRows[0].registerNumber).toBe('23IT070');
      // Verify no student was inserted
      const inRepo = internshipRepository.getStudentById('23IT070');
      expect(inRepo).toBeNull();
    });

    it('3.2 should perform dry-run simulation without persisting any records', async () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT080,Dry Run Student,dryrun@smvec.ac.in,IT,3rd Year`;
      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'dry_run.csv', fileFormat: 'csv', dryRun: true },
        itHodUser
      );

      expect(result.isDryRun).toBe(true);
      expect(result.status).toBe('dry_run');
      expect(result.importedCount).toBe(1);
      expect(result.importedStudents).toHaveLength(1);

      // Verify repository has NOT been modified
      const student = internshipRepository.getStudentById('23IT080');
      expect(student).toBeNull();
    });

    it('3.3 should skip existing students when duplicateStrategy is "skip"', async () => {
      // Existing pilot student 23CSEBS001
      const initialCount = internshipRepository.getAllStudents().length;
      const csv = `register_number,full_name,email,department_code,year\n23CSEBS001,Harish V Tamper,tamper@smvec.ac.in,CSEBS,3rd Year\n23CSEBS099,New CSEBS Student,new.csebs@smvec.ac.in,CSEBS,3rd Year`;

      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'skip_dup.csv', fileFormat: 'csv', duplicateStrategy: 'skip' },
        csebsHodUser
      );

      expect(result.skippedCount).toBe(1);
      expect(result.importedCount).toBe(1);

      // Pilot student Harish V must NOT be overwritten
      const harish = internshipRepository.getStudentById('23CSEBS001');
      expect(harish).not.toBeNull();
      expect(harish?.studentName).toBe('Harish V');
      expect(harish?.email).toBe('23csebs001@college.edu');
    });

    it('3.4 should abort and reject import when duplicateStrategy is "reject" and duplicates exist', async () => {
      const csv = `register_number,full_name,email,department_code,year\n23CSEBS001,Harish V,harish@smvec.ac.in,CSEBS,3rd Year`;

      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'reject_dup.csv', fileFormat: 'csv', duplicateStrategy: 'reject' },
        csebsHodUser
      );

      expect(result.status).toBe('failed');
      expect(result.importedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SECTION 4: SECURE PROVISIONING & ACTIVATION WORKFLOW (TASK 2)
  // ==========================================================================

  describe('4. Secure Account Provisioning & First-Login Workflow', () => {
    it('4.1 should provision students in pending_verification with zero password exposure', async () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT101,Kavya Priya,kavya@smvec.ac.in,IT,3rd Year`;
      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'provision_test.csv', fileFormat: 'csv', autoAssignMentor: true, autoAssignBatch: true },
        itHodUser
      );

      expect(result.importedCount).toBe(1);
      const student = internshipRepository.getStudentById('23IT101');
      expect(student).toBeDefined();
      expect(student?.accountStatus).toBe('pending_approval');
      expect(student?.onboardingStatus).toBe('pending_verification');
      expect(student?.isFirstLogin).toBe(true);
      expect(student?.departmentCode).toBe('IT');

      // Crucial security invariant: no password stored or exposed anywhere in student entity
      expect((student as any).password).toBeUndefined();
      expect((student as any).rawPassword).toBeUndefined();
    });

    it('4.2 should generate one-time unguessable 48-character activation tokens', () => {
      const token1 = studentOnboardingService.generateSecureActivationToken();
      const token2 = studentOnboardingService.generateSecureActivationToken();

      expect(token1).toHaveLength(48);
      expect(token2).toHaveLength(48);
      expect(token1).not.toBe(token2);
    });

    it('4.3 should complete first-login activation workflow with mandatory consent acceptance', async () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT102,Siddharth M,siddharth@smvec.ac.in,IT,3rd Year`;
      const importResult = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'activate_test.csv', fileFormat: 'csv' },
        itHodUser
      );

      // Verify token generated
      const regNo = '23IT102';
      // Find token from tokenStore
      const tokens = (studentOnboardingService as any).tokenStore;
      const studentToken = tokens.find((t: any) => t.registerNumber === regNo);
      expect(studentToken).toBeDefined();

      // Check token verification
      const verifyRes = studentOnboardingService.verifyActivationToken(studentToken.tokenHash);
      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.student?.studentId).toBe(regNo);

      // Attempt activation without consent -> must fail
      await expect(
        studentOnboardingService.activateStudentAccount(studentToken.tokenHash, false)
      ).rejects.toThrow(/consent must be accepted/i);

      // Successful activation with consent
      const activatedStudent = await studentOnboardingService.activateStudentAccount(studentToken.tokenHash, true);
      expect(activatedStudent.accountStatus).toBe('active');
      expect(activatedStudent.onboardingStatus).toBe('activated');
      expect(activatedStudent.isFirstLogin).toBe(false);
      expect(activatedStudent.activatedAt).toBeDefined();

      // Token must now be marked used
      const reVerify = studentOnboardingService.verifyActivationToken(studentToken.tokenHash);
      expect(reVerify.valid).toBe(false);
      expect(reVerify.reason).toContain('already been used');
    });

    it('4.4 should reject non-HOD and non-Admin users from importing students', async () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT103,Unauth Student,unauth@smvec.ac.in,IT,3rd Year`;
      await expect(
        studentOnboardingService.executeImport(
          csv,
          { fileName: 'unauth.csv', fileFormat: 'csv' },
          unauthorizedMentorUser
        )
      ).rejects.toThrow(/Access denied/i);
    });
  });

  // ==========================================================================
  // SECTION 5: PILOT RECORD PRESERVATION (TASK 3)
  // ==========================================================================

  describe('5. Pilot Cohort Integrity & Preservation (CSEBS)', () => {
    it('5.1 should verify 100% of CSEBS pilot records remain intact before onboarding', () => {
      const pilotCheck = studentOnboardingService.verifyExistingPilotIntegrity();
      expect(pilotCheck.verified).toBe(true);
      expect(pilotCheck.pilotStudentCount).toBeGreaterThan(0);
      expect(pilotCheck.issues).toHaveLength(0);
    });

    it('5.2 should guarantee zero overwriting or corruption of CSEBS pilot data during large multi-dept onboarding', async () => {
      const originalHarish = { ...internshipRepository.getStudentById('23CSEBS001')! };

      // Import batch of 5 new IT students
      const newStudentsCsv = `register_number,full_name,email,department_code,year
23IT201,IT Student 1,it1@smvec.ac.in,IT,3rd Year
23IT202,IT Student 2,it2@smvec.ac.in,IT,3rd Year
23IT203,IT Student 3,it3@smvec.ac.in,IT,3rd Year
23IT204,IT Student 4,it4@smvec.ac.in,IT,3rd Year
23IT205,IT Student 5,it5@smvec.ac.in,IT,3rd Year`;

      const importResult = await studentOnboardingService.executeImport(
        newStudentsCsv,
        { fileName: 'batch_it.csv', fileFormat: 'csv', targetDepartmentCode: 'IT' },
        itHodUser
      );

      expect(importResult.importedCount).toBe(5);

      // Verify pilot data is 100% untouched
      const currentHarish = internshipRepository.getStudentById('23CSEBS001')!;
      expect(currentHarish).not.toBeNull();
      expect(currentHarish.studentName).toBe(originalHarish.studentName);
      expect(currentHarish.hours).toBe(originalHarish.hours);
      expect(currentHarish.progress).toBe(originalHarish.progress);
      expect(currentHarish.company).toBe(originalHarish.company);
      expect(currentHarish.departmentCode).toBe('CSEBS');

      const pilotCheckAfter = studentOnboardingService.verifyExistingPilotIntegrity();
      expect(pilotCheckAfter.verified).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 6: BATCH AUDIT LOGS & ROLLBACK SAFETY (TASK 4)
  // ==========================================================================

  describe('6. Batch Audit Logs & Safe Rollbacks', () => {
    it('6.1 should record immutable batch audit log upon successful import', async () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT301,Audit Student,audit@smvec.ac.in,IT,3rd Year`;
      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'audit_test.csv', fileFormat: 'csv' },
        itHodUser
      );

      const batches = studentOnboardingService.getImportBatches('IT', itHodUser);
      expect(batches.length).toBeGreaterThan(0);
      const batch = batches.find((b) => b.id === result.batchId);
      expect(batch).toBeDefined();
      expect(batch?.fileName).toBe('audit_test.csv');
      expect(batch?.uploadedByName).toBe(itHodUser.name);
      expect(batch?.status).toBe('completed');
      expect(batch?.importedCount).toBe(1);
    });

    it('6.2 should safely rollback an import batch when executed by Super Admin', async () => {
      const csv = `register_number,full_name,email,department_code,year
23IT302,Rollback Candidate 1,rb1@smvec.ac.in,IT,3rd Year
23IT303,Rollback Candidate 2,rb2@smvec.ac.in,IT,3rd Year`;

      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'rollback_test.csv', fileFormat: 'csv' },
        itHodUser
      );

      expect(result.importedCount).toBe(2);
      expect(internshipRepository.getStudentById('23IT302')).not.toBeNull();
      expect(internshipRepository.getStudentById('23IT303')).not.toBeNull();

      // Super Admin initiates rollback
      const rollbackRes = await studentOnboardingService.rollbackImportBatch(result.batchId, superAdminUser);
      expect(rollbackRes.rolledBackCount).toBe(2);

      // Verify candidate students are removed
      expect(internshipRepository.getStudentById('23IT302')).toBeNull();
      expect(internshipRepository.getStudentById('23IT303')).toBeNull();

      // Verify batch status is marked rolled_back
      const batches = studentOnboardingService.getImportBatches('IT', itHodUser);
      const batch = batches.find((b) => b.id === result.batchId);
      expect(batch?.status).toBe('rolled_back');
    });

    it('6.3 should reject rollback invocation by non-Super Admin users', async () => {
      const csv = `register_number,full_name,email,department_code,year\n23IT304,Unauth Rollback,rb_unauth@smvec.ac.in,IT,3rd Year`;
      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'rb_unauth.csv', fileFormat: 'csv' },
        itHodUser
      );

      await expect(
        studentOnboardingService.rollbackImportBatch(result.batchId, itHodUser)
      ).rejects.toThrow(/Super Admin/i);
    });
  });

  // ==========================================================================
  // SECTION 7: SYNTHETIC DATASET SCALABILITY BENCHMARKS (TASK 5)
  // ==========================================================================

  describe('7. Synthetic Scalability Benchmarks (20, 100, 500, 1000 Students)', () => {
    const generateSyntheticCsv = (count: number, dept: string = 'IT'): string => {
      const lines = ['register_number,full_name,email,department_code,year'];
      for (let i = 1; i <= count; i++) {
        const pad = i.toString().padStart(4, '0');
        lines.push(`SYN${dept}${pad},Synthetic Student ${pad},synth.${dept}.${pad}@smvec.ac.in,${dept},3rd Year`);
      }
      return lines.join('\n');
    };

    it('7.1 benchmark: 20 synthetic students import and validation', async () => {
      const csv = generateSyntheticCsv(20, 'IT');
      const start = performance.now();

      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'benchmark_20.csv', fileFormat: 'csv', autoAssignMentor: true, autoAssignBatch: true },
        superAdminUser
      );

      const elapsedMs = performance.now() - start;
      const throughput = (20 / (elapsedMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 20 Students: ${elapsedMs.toFixed(2)} ms (${throughput} rows/sec)`);

      expect(result.status).toBe('completed');
      expect(result.importedCount).toBe(20);
      expect(result.failedCount).toBe(0);
      expect(elapsedMs).toBeLessThan(2500); // Must execute under reasonable benchmark threshold
    });

    it('7.2 benchmark: 100 synthetic students import with batch auto-assignment', async () => {
      const csv = generateSyntheticCsv(100, 'ECE');
      const start = performance.now();

      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'benchmark_100.csv', fileFormat: 'csv', autoAssignMentor: true, autoAssignBatch: true },
        superAdminUser
      );

      const elapsedMs = performance.now() - start;
      const throughput = (100 / (elapsedMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 100 Students: ${elapsedMs.toFixed(2)} ms (${throughput} rows/sec)`);

      expect(result.status).toBe('completed');
      expect(result.importedCount).toBe(100);
      expect(result.failedCount).toBe(0);
      expect(elapsedMs).toBeLessThan(2000); // Must execute under 2 seconds
    });

    it('7.3 benchmark: 500 synthetic students preview, parsing, and execution', { timeout: 15000 }, async () => {
      const csv = generateSyntheticCsv(500, 'MECH');
      const start = performance.now();

      // Test preview speed
      const preview = studentOnboardingService.previewImport(
        csv,
        { fileName: 'benchmark_500.csv', fileFormat: 'csv' },
        superAdminUser
      );
      expect(preview.totalRows).toBe(500);
      expect(preview.validRowsCount).toBe(500);

      // Execute import
      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'benchmark_500.csv', fileFormat: 'csv', autoAssignMentor: true },
        superAdminUser
      );

      const elapsedMs = performance.now() - start;
      const throughput = (500 / (elapsedMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 500 Students: ${elapsedMs.toFixed(2)} ms (${throughput} rows/sec)`);

      expect(result.status).toBe('completed');
      expect(result.importedCount).toBe(500);
      expect(result.failedCount).toBe(0);
      expect(elapsedMs).toBeLessThan(5000); // Must execute under 5 seconds
    });

    it('7.4 benchmark: 1,000 synthetic students high-throughput institutional import', { timeout: 20000 }, async () => {
      const csv = generateSyntheticCsv(1000, 'EEE');
      const start = performance.now();

      const result = await studentOnboardingService.executeImport(
        csv,
        { fileName: 'benchmark_1000.csv', fileFormat: 'csv', autoAssignMentor: true },
        superAdminUser
      );

      const elapsedMs = performance.now() - start;
      const throughput = (1000 / (elapsedMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 1,000 Students: ${elapsedMs.toFixed(2)} ms (${throughput} rows/sec)`);

      expect(result.status).toBe('completed');
      expect(result.importedCount).toBe(1000);
      expect(result.failedCount).toBe(0);
      expect(elapsedMs).toBeLessThan(10000); // Must execute under 10 seconds for 1,000 records

      // Confirm pilot data integrity still 100% verified after 1,000 rows
      const pilotIntegrity = studentOnboardingService.verifyExistingPilotIntegrity();
      expect(pilotIntegrity.verified).toBe(true);
    });
  });
});
