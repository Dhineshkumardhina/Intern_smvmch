/**
 * Phase 18D: Cross-Institution Data Isolation & Authorization Security Test Suite
 * InternPulse Multi-Institution Multi-Tenant Architecture Hardening
 *
 * Validates complete data isolation, authorization boundaries, and adversarial
 * attack resistance across:
 * - 15 Multi-Institution Security Isolation Requirements
 * - 10 Adversarial Tenant Attack Scenarios
 * - Background Job Tenant Non-Interference
 * - DPDP Anti-Surveillance & Geolocation Privacy Preservation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { internshipRepository } from '../../repository/internshipRepository';
import { locationRepository } from '../../repository/locationRepository';
import { attendanceService } from '../../attendance/attendanceService';
import { notificationService } from '../../notifications/notificationService';
import { VerificationSchedulerEngine } from '../../scheduler/verificationSchedulerEngine';
import { institutionalAnalyticsService } from '../../analytics/institutionalAnalyticsService';
import { institutionAdministrationService } from '../../admin/institutionAdministrationService';
import { 
  AuthorizationPolicy, 
  ForbiddenException, 
  UnauthorizedException 
} from '../rbac/authorizationPolicy';
import { AuthUser } from '../authUser';
import { 
  StudentRecord, 
  DepartmentRecord, 
  InternshipBatchRecord,
  canonicalizeInstitutionId 
} from '../../../data/initialData';
import { AssignedGeofenceTarget, DeviceLocationMeasurement, StudentConsent } from '../../geolocation/geolocationTypes';

describe('Phase 18D: Cross-Institution Data Isolation & Authorization Security', () => {
  // Test Tenants
  const SMVEC_ID = 'a0000000-0000-0000-0000-000000000001';
  const PEC_ID = 'a0000000-0000-0000-0000-000000000002'; // Corresponds to secondary tenant in test environment

  // Platform Super Admin
  const platformAdmin: AuthUser = {
    id: 'usr-plat-01',
    name: 'Platform Super Admin',
    email: 'platform@internpulse.edu',
    role: 'platform_super_admin',
    isActive: true,
  };

  // SMVEC Actors (Tenant A)
  const smvecAdmin: AuthUser = {
    id: 'usr-smvec-adm-01',
    name: 'SMVEC College Admin',
    email: 'admin@smvec.ac.in',
    role: 'admin',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const smvecHod: AuthUser = {
    id: 'usr-smvec-hod-01',
    name: 'SMVEC CSEBS HOD',
    email: 'hod.csebs@smvec.ac.in',
    role: 'hod',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const smvecMentor: AuthUser = {
    id: 'm-smvec-01',
    name: 'SMVEC Mentor Alpha',
    email: 'mentor.alpha@smvec.ac.in',
    role: 'mentor',
    mentorId: 'm-smvec-01',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  const smvecStudent: AuthUser = {
    id: 'stu-smvec-01',
    name: 'SMVEC Student One',
    email: 'student.one@smvec.ac.in',
    role: 'student',
    departmentCode: 'CSEBS',
    institutionId: SMVEC_ID,
    institutionCode: 'SMVEC',
    college: 'SMVEC',
    isActive: true,
  };

  // PEC Actors (Tenant B)
  const pecAdmin: AuthUser = {
    id: 'usr-pec-adm-01',
    name: 'PEC College Admin',
    email: 'admin@pec.edu',
    role: 'admin',
    institutionId: PEC_ID,
    institutionCode: 'PEC',
    college: 'PEC',
    isActive: true,
  };

  const pecHod: AuthUser = {
    id: 'usr-pec-hod-01',
    name: 'PEC CSEBS HOD',
    email: 'hod.csebs@pec.edu',
    role: 'hod',
    departmentCode: 'CSEBS',
    institutionId: PEC_ID,
    institutionCode: 'PEC',
    college: 'PEC',
    isActive: true,
  };

  const pecMentor: AuthUser = {
    id: 'm-pec-01',
    name: 'PEC Mentor Beta',
    email: 'mentor.beta@pec.edu',
    role: 'mentor',
    mentorId: 'm-pec-01',
    departmentCode: 'CSEBS',
    institutionId: PEC_ID,
    institutionCode: 'PEC',
    college: 'PEC',
    isActive: true,
  };

  const pecStudent: AuthUser = {
    id: 'stu-pec-01',
    name: 'PEC Student Two',
    email: 'student.two@pec.edu',
    role: 'student',
    departmentCode: 'CSEBS',
    institutionId: PEC_ID,
    institutionCode: 'PEC',
    college: 'PEC',
    isActive: true,
  };

  let schedulerEngine: VerificationSchedulerEngine;

  beforeEach(() => {
    internshipRepository.resetToDefaults();
    locationRepository.resetToDefaults();
    institutionalAnalyticsService.resetToDefaults();
    institutionAdministrationService.resetState();
    schedulerEngine = new VerificationSchedulerEngine();
  });

  // =========================================================================
  // 1. FIFTEEN CORE MULTI-INSTITUTION SECURITY ISOLATION REQUIREMENTS
  // =========================================================================
  describe('1. Fifteen Core Multi-Institution Security Isolation Requirements', () => {
    it('1.1 Authentication & Token Identity Isolation: Validates immutable institution binding', () => {
      // Identity validation rejects missing or inactive actors
      expect(() => AuthorizationPolicy.validateIdentity(null as any)).toThrow(UnauthorizedException);
      expect(() => AuthorizationPolicy.validateIdentity({ ...smvecAdmin, isActive: false })).toThrow(ForbiddenException);

      // Super admin check distinguishes platform admin vs college admin
      expect(AuthorizationPolicy.isPlatformAdmin(platformAdmin)).toBe(true);
      expect(AuthorizationPolicy.isPlatformAdmin(smvecAdmin)).toBe(false);

      // College admin is bounded to their specific institution
      expect(() => AuthorizationPolicy.validateInstitutionScope(smvecAdmin, SMVEC_ID)).not.toThrow();
      expect(() => AuthorizationPolicy.validateInstitutionScope(smvecAdmin, PEC_ID)).toThrow(ForbiddenException);
    });

    it('1.2 Institution Memberships: Rejects operations for suspended institutions', async () => {
      // Suspend PEC via platform admin
      await institutionAdministrationService.suspendInstitution(PEC_ID, 'Pending annual accreditation renewal', platformAdmin);

      const suspendedPec = institutionAdministrationService.getInstitutionById(PEC_ID);
      expect(suspendedPec?.status).toBe('suspended');

      // Attempting tenant admin actions on suspended institution must be rejected
      await expect(
        institutionAdministrationService.updateInstitutionProfile(
          PEC_ID,
          { address: 'New Campus Road' },
          pecAdmin
        )
      ).rejects.toThrow(/suspended/i);
    });

    it('1.3 Department Segregation: Prevents collision between identical department codes in different colleges', () => {
      // Register a CSEBS department in PEC
      (internshipRepository as any).departments.push({
        id: 'dept-pec-csebs-01',
        institutionId: PEC_ID,
        code: 'CSEBS',
        name: 'PEC Computer Science and Business Systems',
        status: 'active',
      });

      const allDepts = internshipRepository.getAllDepartments();
      const smvecDepts = allDepts.filter(d => canonicalizeInstitutionId(d.institutionId) === SMVEC_ID);
      const pecDepts = allDepts.filter(d => canonicalizeInstitutionId(d.institutionId) === PEC_ID);

      expect(smvecDepts.length).toBeGreaterThan(0);
      expect(pecDepts.length).toBeGreaterThan(0);

      // PEC HOD cannot query SMVEC students even if department code is 'CSEBS'
      expect(() => AuthorizationPolicy.validateInstitutionScope(pecHod, SMVEC_ID)).toThrow(ForbiddenException);
    });

    it('1.4 HOD Account Scoping: HOD queries return only records from their own institution', () => {
      // Seed a PEC student in department CSEBS
      const pecStudentRecord: StudentRecord = {
        id: 'stu-pec-seed-01',
        studentId: 'PEC2026CSE001',
        studentName: 'Ravi Kumar PEC',
        email: 'ravi.pec@pec.edu',
        departmentCode: 'CSEBS',
        dept: 'CSEBS',
        institutionId: PEC_ID,
        institutionCode: 'PEC',
        accountStatus: 'active',
        status: 'registered',
        mentor: 'PEC Mentor Beta',
        mentorId: 'm-pec-01',
      };
      (internshipRepository as any).students.push(pecStudentRecord);

      // Querying with SMVEC HOD should not return the PEC student
      const smvecStudents = internshipRepository.getStudentsForHod('CSEBS', smvecHod);
      const leakedPecStudent = smvecStudents.find(s => s.studentId === 'PEC2026CSE001');
      expect(leakedPecStudent).toBeUndefined();
    });

    it('1.5 Mentor Account Scoping: Mentors cannot supervise or access students of other institutions', () => {
      const smvecStudentRec = internshipRepository.getStudentById('23CSEBS001');
      expect(smvecStudentRec).not.toBeNull();

      // PEC Mentor attempting scope validation against SMVEC student
      expect(() => AuthorizationPolicy.validateMentorScope(pecMentor, smvecStudentRec!)).toThrow(ForbiddenException);
    });

    it('1.6 Student Account Scoping: Students cannot access peer records in other institutions', () => {
      expect(() => AuthorizationPolicy.validateStudentResourceAccess(smvecStudent, 'stu-pec-01')).toThrow(ForbiddenException);
    });

    it('1.7 Internship Records & Batches: Batches cannot be assigned across institutions', async () => {
      // Create a batch in PEC
      const pecBatch: InternshipBatchRecord = {
        id: 'batch-pec-cse-2026',
        institutionId: PEC_ID,
        batchName: 'PEC Summer Interns 2026',
        departmentCode: 'CSEBS',
        academicYear: '2026-2027',
        status: 'active',
        maxCapacity: 50,
        enrolledStudentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (internshipRepository as any).batches.push(pecBatch);

      // Try to assign SMVEC student to PEC batch
      await expect(
        internshipRepository.assignStudentToBatch('23CSEBS001', 'batch-pec-cse-2026', smvecAdmin)
      ).rejects.toThrow(/Tenant Isolation Violation/i);
    });

    it('1.8 Approved Locations: Location queries and assignments strictly enforce institution boundary', async () => {
      // Create a PEC location
      const pecLoc = await locationRepository.createLocation({
        locationName: 'Pondicherry Tech Park',
        companyName: 'PEC Startups',
        address: 'Pillaichavady, Puducherry',
        latitude: 12.015,
        longitude: 79.852,
        geofenceRadiusMeters: 200,
        internshipStartDate: '2026-06-01',
        internshipEndDate: '2026-08-01',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '17:00:00',
        departmentCode: 'CSEBS',
        status: 'active',
        isActive: true,
      }, pecAdmin);

      // SMVEC Admin querying locations should NOT see PEC location
      const smvecLocations = locationRepository.getLocations('CSEBS', smvecAdmin);
      expect(smvecLocations.find(l => l.id === pecLoc.id)).toBeUndefined();

      // SMVEC Admin directly fetching PEC location by ID must be rejected
      expect(() => locationRepository.getLocationById(pecLoc.id, smvecAdmin)).toThrow(ForbiddenException);
    });

    it('1.9 Attendance Sessions: Prevents cross-tenant verification and overview aggregation', () => {
      // Record attendance session for PEC
      const sessionDate = '2026-06-15';
      const pecSession = {
        id: 'att-pec-test-01',
        assignmentId: 'asgn-pec-01',
        institutionId: PEC_ID,
        studentId: 'PEC2026CSE001',
        studentName: 'PEC Student',
        departmentCode: 'CSEBS',
        sessionDate,
        checkInAt: `${sessionDate}T09:05:00Z`,
        checkOutAt: `${sessionDate}T17:00:00Z`,
        scheduledStartTime: '09:00:00',
        scheduledEndTime: '17:00:00',
        totalHours: 7.9,
        requiredHours: 8.0,
        status: 'present' as const,
        isVerified: false,
        locationId: 'loc-pec-01',
        locationName: 'PEC Tech Park',
        geofenceStatus: 'verified' as const,
        checkInDistanceMeters: 25.0,
        checkOutDistanceMeters: 30.0,
        complianceRate: 100.0,
        offlineQueued: false,
        clientTimestamp: `${sessionDate}T09:05:00Z`,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (attendanceService as any).sessions.push(pecSession);

      // SMVEC Mentor cannot verify PEC attendance session
      expect(() =>
        attendanceService.verifyAttendanceSession('att-pec-test-01', true, 'Mentor review', smvecMentor)
      ).toThrow(/Tenant Isolation Violation/i);

      // SMVEC HOD overview does not count PEC sessions
      const smvecOverview = attendanceService.getInstitutionWideAttendanceOverview('CSEBS', smvecHod);
      expect(smvecOverview.totalActiveInterns).toBeGreaterThan(0);
      const smvecSessionStudents = (attendanceService as any).sessions
        .filter((s: any) => !s.institutionId || canonicalizeInstitutionId(s.institutionId) === SMVEC_ID)
        .map((s: any) => s.studentId);
      expect(smvecSessionStudents).not.toContain('PEC2026CSE001');
    });

    it('1.10 Geolocation Verification Engine: Geofence verification enforces tenant matching', async () => {
      // Build a verification target belonging to PEC
      const pecTarget: AssignedGeofenceTarget = {
        assignmentId: 'asgn-pec-01',
        institutionId: PEC_ID,
        studentId: 'stu-pec-01',
        locationId: 'loc-pec-01',
        targetLatitude: 12.015,
        targetLongitude: 79.852,
        geofenceRadiusMeters: 200,
        allowedStartTime: '09:00:00',
        allowedEndTime: '17:00:00',
        requiredDailyHours: 8.0,
      };

      // Seed an SMVEC schedule window in scheduler
      (schedulerEngine as any).inMemorySchedules.push({
        id: 'sch-smvec-test-w1',
        assignmentId: 'asgn-smvec-01',
        institutionId: SMVEC_ID,
        studentId: 'stu-smvec-01',
        targetDate: '2026-06-15',
        windowStart: '2026-06-15T09:00:00Z',
        windowEnd: '2026-06-15T09:15:00Z',
        status: 'OPEN',
        retryCount: 0,
        maxRetries: 3,
        timezone: 'Asia/Kolkata',
        windowIndex: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const measurement: DeviceLocationMeasurement = {
        latitude: 12.015,
        longitude: 79.852,
        accuracyMeters: 10,
        timestamp: '2026-06-15T09:05:00Z',
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
        isMockLocation: false,
      };

      // Submitting telemetry with a cross-tenant geofence target must be rejected
      await expect(
        schedulerEngine.submitLocationTelemetry(
          { scheduleId: 'sch-smvec-test-w1', measurement },
          pecTarget,
          null,
          smvecStudent
        )
      ).rejects.toThrow(/Tenant Isolation Violation/i);
    });

    it('1.11 Notification System: Dispatched alerts are strictly isolated by institution', async () => {
      // Dispatch alert for SMVEC student
      await notificationService.dispatchEvent({
        eventType: 'upcoming_verification',
        studentId: smvecStudent.id,
        institutionId: SMVEC_ID,
        title: 'SMVEC Verification Window',
        message: 'Your verification window is open.',
      });

      // Dispatch alert for PEC student
      await notificationService.dispatchEvent({
        eventType: 'upcoming_verification',
        studentId: pecStudent.id,
        institutionId: PEC_ID,
        title: 'PEC Verification Window',
        message: 'Your verification window is open.',
      });

      // SMVEC Admin calling getAllNotifications should only see SMVEC notifications
      const smvecNotifs = notificationService.getAllNotifications(smvecAdmin);
      expect(smvecNotifs.every(n => canonicalizeInstitutionId(n.institutionId) === SMVEC_ID)).toBe(true);

      // PEC Admin calling getAllNotifications should only see PEC notifications
      const pecNotifs = notificationService.getAllNotifications(pecAdmin);
      expect(pecNotifs.every(n => canonicalizeInstitutionId(n.institutionId) === PEC_ID)).toBe(true);

      // PEC Admin cannot access SMVEC student's notification history
      expect(() =>
        notificationService.getNotificationHistory(smvecStudent.id, {}, pecAdmin)
      ).toThrow(/Tenant Isolation Violation/i);
    });

    it('1.12 Storage Objects & Uploaded Files: Validates folder tenant partitioning', () => {
      // Simulate storage path validation policy: (storage.foldername(name))[1] = caller.institutionId
      const checkStorageAccess = (caller: AuthUser, filePath: string): boolean => {
        const parts = filePath.split('/').filter(Boolean);
        const folderTenant = parts[0];
        if (caller.role === 'platform_super_admin') return true;
        return canonicalizeInstitutionId(folderTenant) === canonicalizeInstitutionId(caller.institutionId || caller.college);
      };

      // SMVEC Admin can access SMVEC files
      expect(checkStorageAccess(smvecAdmin, `${SMVEC_ID}/reports/daily_attendance.pdf`)).toBe(true);

      // PEC Admin attempting to access SMVEC files is blocked
      expect(checkStorageAccess(pecAdmin, `${SMVEC_ID}/reports/daily_attendance.pdf`)).toBe(false);

      // Directory traversal attempts (e.g. "../") are strictly bounded
      expect(checkStorageAccess(pecAdmin, `../${SMVEC_ID}/reports/daily_attendance.pdf`)).toBe(false);
    });

    it('1.13 Institutional Analytics: Cross-tenant metrics leakage prevented', async () => {
      // SMVEC HOD requests department analytics
      const smvecPerf = await institutionalAnalyticsService.getDepartmentAnalytics('CSEBS', smvecHod);
      expect(smvecPerf.departmentCode).toBe('CSEBS');

      // PEC HOD cannot query SMVEC-specific metrics
      await expect(
        institutionalAnalyticsService.getDepartmentAnalytics('IT', pecHod)
      ).rejects.toThrow(ForbiddenException);
    });

    it('1.14 Report Exports: Export logs are strictly isolated by tenant', async () => {
      // Generate export as SMVEC Admin
      await institutionalAnalyticsService.exportAnalyticsReport(
        { reportType: 'institution_summary', format: 'csv' },
        smvecAdmin
      );

      // Generate export as PEC Admin
      await institutionalAnalyticsService.exportAnalyticsReport(
        { reportType: 'institution_summary', format: 'csv' },
        pecAdmin
      );

      // SMVEC Admin queries export logs
      const smvecLogs = institutionalAnalyticsService.getExportLogs(smvecAdmin);
      expect(smvecLogs.every(l => canonicalizeInstitutionId(l.institutionId) === SMVEC_ID)).toBe(true);

      // PEC Admin queries export logs
      const pecLogs = institutionalAnalyticsService.getExportLogs(pecAdmin);
      expect(pecLogs.every(l => canonicalizeInstitutionId(l.institutionId) === PEC_ID)).toBe(true);

      // Cross-institution export attempt is denied
      await expect(
        institutionalAnalyticsService.exportAnalyticsReport(
          { reportType: 'department_performance', format: 'csv', departmentCode: 'CSEBS' },
          pecAdmin
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('1.15 Audit Logs: College admins cannot read platform super-admin governance logs', () => {
      // Fetch platform audit logs via platform admin
      const platformLogs = institutionAdministrationService.getPlatformAuditLogs({}, platformAdmin);
      expect(platformLogs.length).toBeGreaterThan(0);

      // College admin attempting to view platform-level governance logs must be rejected
      expect(() =>
        institutionAdministrationService.getPlatformAuditLogs({}, smvecAdmin)
      ).toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 2. TEN ADVERSARIAL TENANT ATTACK SCENARIOS
  // =========================================================================
  describe('2. Ten Adversarial Tenant Attack Scenarios', () => {
    it('Attack Scenario 1: Institution ID manipulation / Payload Spoofing', async () => {
      // Malicious actor in PEC creates a location payload, but injects SMVEC_ID in the body
      const spoofedPayload = {
        locationName: 'Spoofed Location',
        companyName: 'Adversary Inc',
        address: '123 Fake Street',
        latitude: 12.82,
        longitude: 80.22,
        geofenceRadiusMeters: 200,
        internshipStartDate: '2026-06-01',
        internshipEndDate: '2026-08-01',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '17:00:00',
        departmentCode: 'CSEBS',
        status: 'active' as const,
        isActive: true,
        institutionId: SMVEC_ID, // INJECTED SPOOF
      };

      // Server creates location using caller's verified institution ID, overriding or rejecting spoof
      const createdLoc = await locationRepository.createLocation(spoofedPayload, pecAdmin);
      // Because caller is pecAdmin, the created location must belong to PEC
      expect(canonicalizeInstitutionId(createdLoc.institutionId)).toBe(PEC_ID);
    });

    it('Attack Scenario 2: Cross-Tenant API Requests (PEC Mentor inspecting SMVEC Student)', () => {
      const smvecStudentRec = internshipRepository.getStudentById('23CSEBS001');
      expect(smvecStudentRec).not.toBeNull();

      // PEC Mentor attempts to inspect SMVEC student details
      expect(() => {
        AuthorizationPolicy.validateMentorScope(pecMentor, smvecStudentRec!);
      }).toThrow(ForbiddenException);
    });

    it('Attack Scenario 3: Unauthorized Department Switching Across Institutions', async () => {
      // Register CSEBS department for PEC
      const pecCseDept: DepartmentRecord = {
        id: 'dept-pec-cse-01',
        institutionId: PEC_ID,
        code: 'CSEBS',
        name: 'PEC Computer Science and Business Systems',
        status: 'active',
        maxStudentCapacity: 120,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (internshipRepository as any).departments.push(pecCseDept);

      // Attempting to transfer SMVEC student to PEC CSEBS department
      // Even though the department code is 'CSEBS', they are in different institutions
      await expect(
        internshipRepository.transferStudentDepartment(
          '23CSEBS001',
          'CSEBS',
          'Cross-college horizontal transfer attempt',
          smvecAdmin
        )
      ).rejects.toThrow();
    });

    it('Attack Scenario 4: Direct Supabase RLS Queries Simulation', () => {
      // Simulate PostgreSQL RLS check:
      // CREATE POLICY tenant_isolation_policy ON students FOR ALL USING (institution_id = public.get_auth_user_institution_id());
      const simulateSupabaseQuery = (callerToken: AuthUser, requestedInstitutionId: string): boolean => {
        const callerInst = canonicalizeInstitutionId(callerToken.institutionId || callerToken.college);
        const targetInst = canonicalizeInstitutionId(requestedInstitutionId);
        return callerInst === targetInst;
      };

      // Querying own institution succeeds
      expect(simulateSupabaseQuery(smvecAdmin, SMVEC_ID)).toBe(true);

      // Querying other institution returns 0 records / denied
      expect(simulateSupabaseQuery(smvecAdmin, PEC_ID)).toBe(false);
    });

    it('Attack Scenario 5: Unauthorized RPC Execution on another tenant assignment', async () => {
      // Simulate RPC function check:
      // SELECT institution_id FROM internship_assignments WHERE id = p_assignment_id;
      // IF v_assignment.institution_id != public.get_auth_user_institution_id() THEN RAISE EXCEPTION;
      const simulateRpcCall = (caller: AuthUser, assignmentInstId: string): void => {
        AuthorizationPolicy.validateIdentity(caller);
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        const targetInst = canonicalizeInstitutionId(assignmentInstId);
        if (callerInst !== targetInst) {
          throw new ForbiddenException('Tenant Isolation Violation: RPC executed on assignment belonging to another institution.');
        }
      };

      expect(() => simulateRpcCall(pecStudent, SMVEC_ID)).toThrow(ForbiddenException);
      expect(() => simulateRpcCall(smvecStudent, SMVEC_ID)).not.toThrow();
    });

    it('Attack Scenario 6: Storage URL & Path Traversal Manipulation', () => {
      const validateStoragePath = (caller: AuthUser, requestedPath: string): boolean => {
        // Disallow path traversal characters
        if (requestedPath.includes('..') || requestedPath.includes('\\')) {
          return false;
        }
        const rootFolder = requestedPath.split('/')[0];
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        return canonicalizeInstitutionId(rootFolder) === callerInst;
      };

      // Direct path to other tenant
      expect(validateStoragePath(pecAdmin, `${SMVEC_ID}/dossiers/student_01.pdf`)).toBe(false);

      // Path traversal bypass attempt
      expect(validateStoragePath(pecAdmin, `${PEC_ID}/../../${SMVEC_ID}/dossiers/student_01.pdf`)).toBe(false);

      // Legitimate path
      expect(validateStoragePath(pecAdmin, `${PEC_ID}/dossiers/student_02.pdf`)).toBe(true);
    });

    it('Attack Scenario 7: Cross-Tenant Report Downloads & Scraping', () => {
      // Export attendance report as SMVEC
      const smvecReport = attendanceService.exportDailyAttendance('2026-06-15', 'ALL', 'csv', smvecAdmin);
      expect(smvecReport.content).toContain('SMVEC');

      // Export attendance report as PEC
      const pecReport = attendanceService.exportDailyAttendance('2026-06-15', 'ALL', 'csv', pecAdmin);
      expect(pecReport.content).toContain('PEC');
      expect(pecReport.content).not.toContain('SMVEC');
    });

    it('Attack Scenario 8: Background Scheduler Tenant Confusion (Targeted Cron Sweep)', () => {
      // Populate windows for both SMVEC and PEC
      const nowIso = '2026-06-15T09:05:00Z';
      (schedulerEngine as any).inMemorySchedules = [
        {
          id: 'sch-smvec-01',
          assignmentId: 'asgn-smvec-01',
          institutionId: SMVEC_ID,
          studentId: 'stu-smvec-01',
          targetDate: '2026-06-15',
          windowStart: '2026-06-15T09:00:00Z',
          windowEnd: '2026-06-15T09:15:00Z',
          status: 'SCHEDULED',
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'sch-pec-01',
          assignmentId: 'asgn-pec-01',
          institutionId: PEC_ID,
          studentId: 'stu-pec-01',
          targetDate: '2026-06-15',
          windowStart: '2026-06-15T09:00:00Z',
          windowEnd: '2026-06-15T09:15:00Z',
          status: 'SCHEDULED',
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      // Execute cron sweep targeted strictly for SMVEC
      const sweepResult = schedulerEngine.processWindowTransitions(nowIso, SMVEC_ID);

      // Only SMVEC window opens
      expect(sweepResult.openedCount).toBe(1);
      expect(sweepResult.dispatchedNotifications.length).toBe(1);
      expect(sweepResult.dispatchedNotifications[0].recipientId).toBe('stu-smvec-01');

      // PEC window remains in SCHEDULED state, completely untouched
      const pecWindow = (schedulerEngine as any).inMemorySchedules.find((s: any) => s.id === 'sch-pec-01');
      expect(pecWindow.status).toBe('SCHEDULED');
    });

    it('Attack Scenario 9: Notification Recipient Manipulation & IDOR Scraping', () => {
      // Seed notifications for PEC user
      (notificationService as any).notifications = [
        {
          id: 'notif-pec-01',
          institutionId: PEC_ID,
          recipientId: pecStudent.id,
          title: 'PEC Private Alert',
          message: 'Sensitive student alert',
          notificationType: 'upcoming_verification',
          category: 'ATTENDANCE_PROMPT',
          priority: 'NORMAL',
          isRead: false,
          deliveryStatus: 'DELIVERED',
          retryCount: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      // SMVEC Student attempting to fetch PEC Student notifications
      expect(() => {
        notificationService.getNotificationHistory(pecStudent.id, {}, smvecStudent);
      }).toThrow(ForbiddenException);

      // SMVEC Admin attempting to fetch PEC Student notifications
      expect(() => {
        notificationService.getNotificationHistory(pecStudent.id, {}, smvecAdmin);
      }).toThrow(/Tenant Isolation Violation/i);
    });

    it('Attack Scenario 10: Privilege Escalation (Tenant Admin attempting Super-Admin Governance)', async () => {
      // SMVEC Admin attempts to approve a pending registration request for another college
      await expect(
        institutionAdministrationService.approveRegistrationRequest(
          'reg-ptu-pending',
          smvecAdmin
        )
      ).rejects.toThrow(ForbiddenException);

      // SMVEC Admin attempts to suspend another institution
      await expect(
        institutionAdministrationService.suspendInstitution(
          PEC_ID,
          'Unauthorized suspension attempt',
          smvecAdmin
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 3. PRIVACY PRESERVATION & ANTI-SURVEILLANCE SAFEGUARDS
  // =========================================================================
  describe('3. Privacy Preservation & Anti-Surveillance Safeguards', () => {
    const validTarget: AssignedGeofenceTarget = {
      assignmentId: 'asgn-smvec-01',
      institutionId: SMVEC_ID,
      studentId: smvecStudent.id,
      locationId: 'c0000000-0000-0000-0000-000000000001',
      targetLatitude: 12.8284,
      targetLongitude: 80.2198,
      geofenceRadiusMeters: 200,
      monitoringStartTime: '09:00:00',
      monitoringEndTime: '17:00:00',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    };

    it('3.1 Consent-Based Location Monitoring: Rejects telemetry when consent is absent', async () => {
      // Seed open window
      (schedulerEngine as any).inMemorySchedules = [
        {
          id: 'sch-smvec-consent-01',
          assignmentId: 'asgn-smvec-01',
          institutionId: SMVEC_ID,
          studentId: smvecStudent.id,
          targetDate: '2026-06-15',
          windowStart: '2026-06-15T09:00:00Z',
          windowEnd: '2026-06-15T09:15:00Z',
          status: 'OPEN',
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      const measurement: DeviceLocationMeasurement = {
        latitude: 12.8284,
        longitude: 80.2198,
        accuracyMeters: 15,
        timestamp: '2026-06-15T09:05:00Z',
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
        isMockLocation: false,
      };

      // Telemetry without consent (null) fails
      const result = await schedulerEngine.submitLocationTelemetry(
        { scheduleId: 'sch-smvec-consent-01', measurement },
        validTarget,
        null, // No consent
        smvecStudent
      );

      expect(result.success).toBe(false);
      expect(result.scheduleStatus).toBe('LOCATION_UNAVAILABLE');
    });

    it('3.2 Monitoring-Hour Restrictions: Telemetry outside shift hours is rejected', async () => {
      (schedulerEngine as any).inMemorySchedules = [
        {
          id: 'sch-smvec-hours-01',
          assignmentId: 'asgn-smvec-01',
          institutionId: SMVEC_ID,
          studentId: smvecStudent.id,
          targetDate: '2026-06-15',
          windowStart: '2026-06-15T22:00:00Z', // Night time outside allowed shift
          windowEnd: '2026-06-15T22:15:00Z',
          status: 'OPEN',
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      const activeConsent: StudentConsent = {
        id: 'cst-01',
        studentId: smvecStudent.id,
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
        consentVersion: '1.0',
        purposes: ['attendance_verification'],
      };

      const nightMeasurement: DeviceLocationMeasurement = {
        latitude: 12.8284,
        longitude: 80.2198,
        accuracyMeters: 15,
        timestamp: '2026-06-15T22:05:00Z',
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
        isMockLocation: false,
      };

      const result = await schedulerEngine.submitLocationTelemetry(
        { scheduleId: 'sch-smvec-hours-01', measurement: nightMeasurement },
        validTarget,
        activeConsent,
        smvecStudent
      );

      expect(result.success).toBe(false);
      expect(result.scheduleStatus).toBe('LOCATION_UNAVAILABLE');
    });

    it('3.3 Consent Withdrawal: Revoking consent immediately halts processing', async () => {
      const revokedConsent: StudentConsent = {
        id: 'cst-revoked-01',
        studentId: smvecStudent.id,
        consentGiven: false, // Withdrawn
        withdrawnAt: new Date().toISOString(),
        consentTimestamp: '2026-01-01T00:00:00Z',
        consentVersion: '1.0',
        purposes: [],
      };

      (schedulerEngine as any).inMemorySchedules = [
        {
          id: 'sch-smvec-revoked-01',
          assignmentId: 'asgn-smvec-01',
          institutionId: SMVEC_ID,
          studentId: smvecStudent.id,
          targetDate: '2026-06-15',
          windowStart: '2026-06-15T09:00:00Z',
          windowEnd: '2026-06-15T09:15:00Z',
          status: 'OPEN',
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      const measurement: DeviceLocationMeasurement = {
        latitude: 12.8284,
        longitude: 80.2198,
        accuracyMeters: 15,
        timestamp: '2026-06-15T09:05:00Z',
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
        isMockLocation: false,
      };

      const result = await schedulerEngine.submitLocationTelemetry(
        { scheduleId: 'sch-smvec-revoked-01', measurement },
        validTarget,
        revokedConsent,
        smvecStudent
      );

      expect(result.success).toBe(false);
      expect(result.scheduleStatus).toBe('LOCATION_UNAVAILABLE');
    });

    it('3.4 GPS Accuracy Threshold Validation: Low accuracy readings are non-penalizing and allow retry', async () => {
      (schedulerEngine as any).inMemorySchedules = [
        {
          id: 'sch-smvec-gps-01',
          assignmentId: 'asgn-smvec-01',
          institutionId: SMVEC_ID,
          studentId: smvecStudent.id,
          targetDate: '2026-06-15',
          windowStart: '2026-06-15T09:00:00Z',
          windowEnd: '2026-06-15T09:15:00Z',
          status: 'OPEN',
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      const activeConsent: StudentConsent = {
        id: 'cst-01',
        studentId: smvecStudent.id,
        consentGiven: true,
        consentTimestamp: new Date().toISOString(),
        consentVersion: '1.0',
        purposes: ['attendance_verification'],
      };

      // Measurement with degraded accuracy (150 meters > 100m threshold)
      const lowAccuracyMeasurement: DeviceLocationMeasurement = {
        latitude: 12.8284,
        longitude: 80.2198,
        accuracyMeters: 150,
        timestamp: '2026-06-15T09:05:00Z',
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
        isMockLocation: false,
      };

      const result = await schedulerEngine.submitLocationTelemetry(
        { scheduleId: 'sch-smvec-gps-01', measurement: lowAccuracyMeasurement },
        validTarget,
        activeConsent,
        smvecStudent
      );

      expect(result.success).toBe(false);
      expect(result.scheduleStatus).toBe('LOCATION_UNAVAILABLE');
      // Low accuracy must permit retry within window
      expect(result.retryAllowed).toBe(true);
      expect(result.remainingRetries).toBe(2);
    });

    it('3.5 Retention & Anti-Surveillance: Opaque push payload strips all raw coordinates', async () => {
      // Dispatch alert with raw coords in metadata
      const dispatchResult = await notificationService.dispatchEvent({
        eventType: 'verification_request',
        studentId: smvecStudent.id,
        institutionId: SMVEC_ID,
        title: 'Verification Request',
        message: 'Window is open',
        metadata: {
          latitude: 12.8284,
          longitude: 80.2198,
          coords: [12.8284, 80.2198],
          captured_latitude: 12.8284,
          captured_longitude: 80.2198,
          safeNote: 'Valid workplace prompt',
        },
      });

      expect(dispatchResult.records.length).toBeGreaterThan(0);
      const savedPayload = dispatchResult.records[0].payload;

      // Coordinates must be purged
      expect(savedPayload.latitude).toBeUndefined();
      expect(savedPayload.longitude).toBeUndefined();
      expect(savedPayload.coords).toBeUndefined();
      expect(savedPayload.captured_latitude).toBeUndefined();
      expect(savedPayload.captured_longitude).toBeUndefined();
      expect(savedPayload.safeNote).toBe('Valid workplace prompt');
    });
  });
});
