import { describe, it, expect, beforeEach } from 'vitest';
import { internshipRepository } from '../../repository/internshipRepository';
import { locationRepository } from '../../repository/locationRepository';
import { AuthUser } from '../authUser';
import { ForbiddenException } from '../rbac/authorizationPolicy';

describe('Phase 5: Internship Assignment Workflow & Governance Test Suite', () => {
  // Test Actors Across 3 Roles
  const hodCSEBS: AuthUser = {
    id: 'HOD_CSEBS',
    name: 'Dr. R. Senthamilselvan',
    email: 'hod.csebs@college.edu',
    role: 'hod',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'CSEBS (HOD)',
    isActive: true,
  };

  const hodIT: AuthUser = {
    id: 'HOD_IT',
    name: 'Dr. M. Sangeetha',
    email: 'hod.it@college.edu',
    role: 'hod',
    college: 'SMVEC',
    departmentCode: 'IT',
    dept: 'IT (HOD)',
    isActive: true,
  };

  const mentorCSEBS: AuthUser = {
    id: 'MENTOR_CSEBS_01',
    mentorId: 'MENTOR_CSEBS_01',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@college.edu',
    role: 'mentor',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'CSEBS Dept',
    isActive: true,
  };

  const mentorIT: AuthUser = {
    id: 'MENTOR_IT_01',
    mentorId: 'MENTOR_IT_01',
    name: 'Dr. S. Kavitha',
    email: 'kavitha.mentor@college.edu',
    role: 'mentor',
    college: 'SMVEC',
    departmentCode: 'IT',
    dept: 'IT Dept',
    isActive: true,
  };

  const studentHarish: AuthUser = {
    id: 'st-23csebs001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@college.edu',
    role: 'student',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'CSEBS (3rd Year)',
    isActive: true,
  };

  const studentKavitha: AuthUser = {
    id: 'st-23csebs002',
    studentId: '23CSEBS002',
    name: 'Kavitha R',
    email: '23csebs002@college.edu',
    role: 'student',
    college: 'SMVEC',
    departmentCode: 'CSEBS',
    dept: 'CSEBS (3rd Year)',
    isActive: true,
  };

  const studentIT: AuthUser = {
    id: 'st-23it001',
    studentId: '23IT001',
    name: 'Venkatesh Prasad',
    email: '23it001@college.edu',
    role: 'student',
    college: 'SMVEC',
    departmentCode: 'IT',
    dept: 'IT (3rd Year)',
    isActive: true,
  };

  beforeEach(() => {
    // Reset test repositories to clean initial baselines
    locationRepository.resetToDefaults();
    internshipRepository.resetToDefaults();
  });

  // ============================================================================
  // WORKFLOW STEP 1 & 2: HOD LOCATION CREATION & APPROVAL
  // ============================================================================
  describe('Workflow Steps 1 & 2: HOD Location Creation & Approval', () => {
    it('allows HOD to create an internship location with geofence and monitoring hours', async () => {
      const createdLocation = await locationRepository.createLocation({
        locationName: 'Google Tech Campus Sholinganallur',
        companyName: 'Google India Pvt Ltd',
        address: 'Gateway Office Parks, Sholinganallur, Chennai, Tamil Nadu 600119',
        latitude: 12.9010,
        longitude: 80.2279,
        geofenceRadiusMeters: 300,
        internshipStartDate: '2026-02-01',
        internshipEndDate: '2026-07-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '18:00:00',
        departmentCode: 'CSEBS',
      }, hodCSEBS);

      expect(createdLocation.id).toBeDefined();
      expect(createdLocation.locationName).toBe('Google Tech Campus Sholinganallur');
      expect(createdLocation.geofenceRadiusMeters).toBe(300);
      expect(createdLocation.monitoringStartTime).toBe('09:00:00');
      expect(createdLocation.monitoringEndTime).toBe('18:00:00');
      expect(createdLocation.status).toBe('pending_approval');
      expect(createdLocation.isActive).toBe(false);
    });

    it('rejects location creation if attempted by a student or mentor', async () => {
      await expect(locationRepository.createLocation({
        locationName: 'Unauthorized Hub',
        companyName: 'Unauthorized Corp',
        address: '123 Fake Street',
        latitude: 12.0,
        longitude: 80.0,
        geofenceRadiusMeters: 100,
        internshipStartDate: '2026-02-01',
        internshipEndDate: '2026-07-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '18:00:00',
      }, studentHarish)).rejects.toThrow(ForbiddenException);

      await expect(locationRepository.createLocation({
        locationName: 'Mentor Created Hub',
        companyName: 'Mentor Tech',
        address: '123 Fake Street',
        latitude: 12.0,
        longitude: 80.0,
        geofenceRadiusMeters: 100,
        internshipStartDate: '2026-02-01',
        internshipEndDate: '2026-07-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '18:00:00',
      }, mentorCSEBS)).rejects.toThrow(ForbiddenException);
    });

    it('allows HOD to formally approve the location into active status', async () => {
      const loc = await locationRepository.createLocation({
        locationName: 'Amazon Development Center',
        companyName: 'Amazon India',
        address: 'World Trade Center, Perungudi, Chennai',
        latitude: 12.9654,
        longitude: 80.2462,
        geofenceRadiusMeters: 250,
        internshipStartDate: '2026-02-01',
        internshipEndDate: '2026-07-31',
        monitoringStartTime: '08:30:00',
        monitoringEndTime: '17:30:00',
        departmentCode: 'CSEBS',
      }, hodCSEBS);

      expect(loc.status).toBe('pending_approval');

      const approvedLoc = await locationRepository.approveLocation(loc.id, hodCSEBS);
      expect(approvedLoc.status).toBe('active');
      expect(approvedLoc.isActive).toBe(true);
      expect(approvedLoc.approvedBy).toBe(hodCSEBS.name);
      expect(approvedLoc.approvedAt).toBeDefined();
    });

    it('prevents students and mentors from approving locations', async () => {
      const loc = await locationRepository.createLocation({
        locationName: 'PayPal India HQ',
        companyName: 'PayPal',
        address: 'Futura Tech Park, Sholinganallur',
        latitude: 12.8984,
        longitude: 80.2289,
        geofenceRadiusMeters: 200,
        internshipStartDate: '2026-02-01',
        internshipEndDate: '2026-07-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '18:00:00',
      }, hodCSEBS);

      await expect(locationRepository.approveLocation(loc.id, studentHarish))
        .rejects.toThrow(ForbiddenException);

      await expect(locationRepository.approveLocation(loc.id, mentorCSEBS))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // WORKFLOW STEPS 3 & 4: MENTOR VIEWS APPROVED LOCATIONS & SELECTS STUDENTS
  // ============================================================================
  describe('Workflow Steps 3 & 4: Mentor Views Approved Locations & Selects Authorized Students', () => {
    it('ensures mentors view only approved and active locations', async () => {
      // Create one pending and one approved location
      const pendingLoc = await locationRepository.createLocation({
        locationName: 'Unapproved Startup Incubator',
        companyName: 'Early Stage Labs',
        address: 'Guindy, Chennai',
        latitude: 13.0067,
        longitude: 80.2030,
        geofenceRadiusMeters: 100,
        internshipStartDate: '2026-03-01',
        internshipEndDate: '2026-08-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '18:00:00',
      }, hodCSEBS);

      const approvedList = locationRepository.getApprovedLocations();
      expect(approvedList.some(l => l.id === pendingLoc.id)).toBe(false);

      // Verify approved list contains established approved facilities
      expect(approvedList.some(l => l.id === 'c0000000-0000-0000-0000-000000000001')).toBe(true);
      expect(approvedList.every(l => l.status === 'active' && l.isActive === true)).toBe(true);
    });

    it('enables mentor to select authorized students within department scope', () => {
      const csebsStudents = internshipRepository.getStudentsForMentorScope(
        mentorCSEBS.mentorId!,
        mentorCSEBS.departmentCode!,
        mentorCSEBS
      );

      expect(csebsStudents.length).toBeGreaterThan(0);
      expect(csebsStudents.every(s => s.departmentCode === 'CSEBS')).toBe(true);
      expect(csebsStudents.some(s => s.studentId === '23CSEBS002')).toBe(true);
    });
  });

  // ============================================================================
  // WORKFLOW STEP 5: ASSIGNMENT VALIDATION & EXECUTION
  // ============================================================================
  describe('Workflow Step 5: Assignment Validations & Complete Execution', () => {
    it('VALIDATION 1: rejects assignment if location is not approved by HOD', async () => {
      // Create pending unapproved location
      const pendingLoc = await locationRepository.createLocation({
        locationName: 'Pending Testing Lab',
        companyName: 'Draft Co',
        address: 'OMR, Chennai',
        latitude: 12.8500,
        longitude: 80.2200,
        geofenceRadiusMeters: 150,
        internshipStartDate: '2026-02-01',
        internshipEndDate: '2026-07-31',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '18:00:00',
      }, hodCSEBS);

      await expect(internshipRepository.createInternshipAssignment({
        studentId: '23CSEBS002',
        locationId: pendingLoc.id,
        startDate: '2026-02-01',
        endDate: '2026-07-31',
      }, mentorCSEBS)).rejects.toThrow(/Only approved locations can be assigned/i);
    });

    it('VALIDATION 2: rejects assignment when end date precedes start date', async () => {
      await expect(internshipRepository.createInternshipAssignment({
        studentId: '23CSEBS002',
        locationId: 'c0000000-0000-0000-0000-000000000001', // TCS Siruseri (Approved)
        startDate: '2026-07-31',
        endDate: '2026-02-01', // Invalid inverted date range
      }, mentorCSEBS)).rejects.toThrow(/End date .* cannot precede start date/i);
    });

    it('VALIDATION 3: prevents mentor from assigning unauthorized students outside scope', async () => {
      await expect(internshipRepository.createInternshipAssignment({
        studentId: '23IT001', // IT student
        locationId: 'c0000000-0000-0000-0000-000000000001',
        startDate: '2026-02-01',
        endDate: '2026-07-31',
      }, mentorCSEBS)).rejects.toThrow(ForbiddenException);
    });

    it('VALIDATION 4: prevents students from having conflicting active assignments', async () => {
      // Harish already has an active assignment in initial data (asgn-001 at TCS)
      await expect(internshipRepository.createInternshipAssignment({
        studentId: '23CSEBS001',
        locationId: 'c0000000-0000-0000-0000-000000000002', // Zoho Estancia
        startDate: '2026-02-01',
        endDate: '2026-07-31',
      }, mentorCSEBS)).rejects.toThrow(/Conflicting active assignment/i);
    });

    it('SUCCESS: creates assignment with all required fields when validations pass', async () => {
      // Rahul Sundaram (23CSEBS003) has no active assignment yet
      const assignment = await internshipRepository.createInternshipAssignment({
        studentId: '23CSEBS003',
        locationId: 'c0000000-0000-0000-0000-000000000001', // TCS Siruseri (Approved)
        roleTitle: 'Cloud Infrastructure Intern',
        startDate: '2026-02-01',
        endDate: '2026-07-31',
        monitoringSchedule: {
          startTime: '09:00:00',
          endTime: '18:00:00',
          requiredDailyHours: 8.0,
        },
      }, mentorCSEBS);

      // Verify all required assignment fields
      expect(assignment.id).toBeDefined();
      expect(assignment.studentId).toBe('23CSEBS003');
      expect(assignment.mentorId).toBe(mentorCSEBS.mentorId);
      expect(assignment.mentorName).toBe(mentorCSEBS.name);
      expect(assignment.locationId).toBe('c0000000-0000-0000-0000-000000000001');
      expect(assignment.locationName).toBe('TCS Siruseri Innovation Hub');
      expect(assignment.companyName).toBe('Tata Consultancy Services');
      expect(assignment.roleTitle).toBe('Cloud Infrastructure Intern');
      expect(assignment.startDate).toBe('2026-02-01');
      expect(assignment.endDate).toBe('2026-07-31');
      expect(assignment.monitoringSchedule.startTime).toBe('09:00:00');
      expect(assignment.monitoringSchedule.endTime).toBe('18:00:00');
      expect(assignment.monitoringSchedule.requiredDailyHours).toBe(8.0);
      expect(assignment.assignmentStatus).toBe('active');
      expect(assignment.assignedTimestamp).toBeDefined();
      expect(assignment.geofenceRadiusMeters).toBe(200.0);
    });
  });

  // ============================================================================
  // WORKFLOW STEP 6: STUDENT RECEIVES ASSIGNMENT & ANTI-TAMPER SECURITY
  // ============================================================================
  describe('Workflow Step 6: Student Receives Assignment & Security Isolation', () => {
    it('allows student to receive and inspect their personal active assignment', () => {
      const activeAssignment = internshipRepository.getActiveAssignmentForStudent('23CSEBS001', studentHarish);

      expect(activeAssignment).not.toBeNull();
      expect(activeAssignment?.studentId).toBe('23CSEBS001');
      expect(activeAssignment?.companyName).toBe('Tata Consultancy Services');
      expect(activeAssignment?.geofenceRadiusMeters).toBe(200.0);
      expect(activeAssignment?.monitoringSchedule.requiredDailyHours).toBe(8.0);
      expect(activeAssignment?.assignmentStatus).toBe('active');
    });

    it('prevents student from inspecting another student active assignment', () => {
      expect(() => {
        internshipRepository.getActiveAssignmentForStudent('23CSEBS002', studentHarish);
      }).toThrow(ForbiddenException);
    });

    it('prevents student from modifying assignment details (Anti-Tamper Rule)', async () => {
      await expect(internshipRepository.createInternshipAssignment({
        studentId: '23CSEBS001',
        locationId: 'c0000000-0000-0000-0000-000000000001',
        startDate: '2026-02-01',
        endDate: '2026-07-31',
      }, studentHarish)).rejects.toThrow(ForbiddenException);

      await expect(internshipRepository.completeOrTerminateAssignment(
        'asgn-001',
        'completed',
        studentHarish
      )).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // WORKFLOW STEP 7 & LIFECYCLE: HISTORY PRESERVATION & RE-ASSIGNMENT
  // ============================================================================
  describe('Assignment Lifecycle & History Preservation', () => {
    it('preserves historical assignment records upon completion and allows new assignment', async () => {
      // 1. Check current history for Harish (1 assignment: asgn-001)
      const initialHistory = internshipRepository.getAssignmentHistoryForStudent('23CSEBS001', studentHarish);
      expect(initialHistory.length).toBe(1);
      expect(initialHistory[0].assignmentStatus).toBe('active');

      // 2. Mentor formally completes current assignment
      const completed = await internshipRepository.completeOrTerminateAssignment(
        'asgn-001',
        'completed',
        mentorCSEBS
      );
      expect(completed.assignmentStatus).toBe('completed');

      // 3. Student has no active assignment now
      const activeAfterCompletion = internshipRepository.getActiveAssignmentForStudent('23CSEBS001', studentHarish);
      expect(activeAfterCompletion).toBeNull();

      // 4. Mentor can now assign Harish to a new approved location (e.g. Zoho)
      const secondAssignment = await internshipRepository.createInternshipAssignment({
        studentId: '23CSEBS001',
        locationId: 'c0000000-0000-0000-0000-000000000002', // Zoho Estancia (Approved)
        roleTitle: 'Senior Full Stack Intern',
        startDate: '2026-08-01',
        endDate: '2026-12-31',
      }, mentorCSEBS);

      expect(secondAssignment.companyName).toBe('Zoho Corporation');
      expect(secondAssignment.assignmentStatus).toBe('active');

      // 5. Verify history is fully preserved (2 records: completed TCS + active Zoho)
      const updatedHistory = internshipRepository.getAssignmentHistoryForStudent('23CSEBS001', studentHarish);
      expect(updatedHistory.length).toBe(2);
      expect(updatedHistory.some(a => a.companyName === 'Tata Consultancy Services' && a.assignmentStatus === 'completed')).toBe(true);
      expect(updatedHistory.some(a => a.companyName === 'Zoho Corporation' && a.assignmentStatus === 'active')).toBe(true);
    });
  });
});
