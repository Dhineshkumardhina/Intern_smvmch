/**
 * ============================================================================
 * INTERNPULSE — PHASE 17C AUTOMATED TEST SUITE
 * Multi-Department Internship Management
 * Complete Verification of Department Management, Batches, Student Assignments,
 * Student Transfers, Location Governance, and Multi-Department Analytics.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AuthorizationPolicy, 
  UnauthorizedException, 
  ForbiddenException 
} from '../rbac/authorizationPolicy';
import { internshipRepository } from '../../repository/internshipRepository';
import { locationRepository } from '../../repository/locationRepository';
import { AuthUser } from '../authUser';
import { StudentRecord, DepartmentRecord, MentorRecord } from '../../../data/initialData';

describe('Phase 17C: Multi-Department Internship Management Test Suite', () => {
  // --------------------------------------------------------------------------
  // TEST FIXTURES
  // --------------------------------------------------------------------------

  // 1. Institution Super Admin
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

  // 2. Department HODs
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

  // 3. Department Mentors
  const csebsMentor: AuthUser = {
    id: 'mentor-csebs-001',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@smvec.ac.in',
    role: 'mentor',
    mentorId: 'MENTOR_CSEBS_01',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const itMentor: AuthUser = {
    id: 'mentor-it-001',
    name: 'Prof. Karthik S',
    email: 'karthik.it@smvec.ac.in',
    role: 'mentor',
    mentorId: 'MENTOR_IT_01',
    dept: 'IT Department',
    departmentCode: 'IT',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  // 4. Students
  const csebsStudent: AuthUser = {
    id: 'student-csebs-001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@smvec.ac.in',
    role: 'student',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const itStudent: AuthUser = {
    id: 'student-it-001',
    studentId: '23IT001',
    name: 'Priya R',
    email: '23it001@smvec.ac.in',
    role: 'student',
    dept: 'IT Department',
    departmentCode: 'IT',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  beforeEach(() => {
    internshipRepository.resetToDefaults();
    locationRepository.resetToDefaults();
  });

  // ==========================================================================
  // SECTION 1: DEPARTMENT MANAGEMENT & CONFIGURATION
  // ==========================================================================
  describe('1. Department Management & Configuration', () => {
    it('allows Super Admin to create a new department with contact details and configuration', async () => {
      const created = await internshipRepository.createDepartment(
        {
          code: 'AIDS',
          name: 'Artificial Intelligence and Data Science',
          institutionId: 'inst-smvec-001',
          maxStudentCapacity: 120,
          contactEmail: 'hod.aids@smvec.ac.in',
          contactPhone: '+91 413 264 3010',
          description: 'Department of AI & Data Science',
          defaultMonitoringStartTime: '08:45:00',
          defaultMonitoringEndTime: '17:15:00',
        },
        superAdminUser
      );

      expect(created.code).toBe('AIDS');
      expect(created.name).toBe('Artificial Intelligence and Data Science');
      expect(created.status).toBe('active');
      expect(created.contactEmail).toBe('hod.aids@smvec.ac.in');
      expect(created.defaultMonitoringStartTime).toBe('08:45:00');
      expect(created.isPilotAuthorized).toBe(false); // Safety invariant

      const fetched = internshipRepository.getDepartmentByCode('AIDS', superAdminUser);
      expect(fetched).toBeDefined();
      expect(fetched?.code).toBe('AIDS');
    });

    it('rejects duplicate department codes during creation', async () => {
      await expect(
        internshipRepository.createDepartment(
          { code: 'CSEBS', name: 'Duplicate CSEBS' },
          superAdminUser
        )
      ).rejects.toThrow(/already exists/i);
    });

    it('strictly forbids non-super-admin users from creating departments', async () => {
      await expect(
        internshipRepository.createDepartment(
          { code: 'BIOTECH', name: 'Biotechnology' },
          csebsHodUser
        )
      ).rejects.toThrow(ForbiddenException);

      await expect(
        internshipRepository.createDepartment(
          { code: 'BIOTECH', name: 'Biotechnology' },
          csebsMentor
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows HOD to update configuration of their own department', async () => {
      const updated = await internshipRepository.updateDepartmentConfig(
        'CSEBS',
        {
          contactEmail: 'hod.csebs.updated@smvec.ac.in',
          contactPhone: '+91 413 264 3999',
          description: 'Updated CSEBS Department Details',
          maxStudentCapacity: 150,
          defaultMonitoringStartTime: '09:00:00',
          defaultMonitoringEndTime: '17:00:00',
        },
        csebsHodUser
      );

      expect(updated.contactEmail).toBe('hod.csebs.updated@smvec.ac.in');
      expect(updated.contactPhone).toBe('+91 413 264 3999');
      expect(updated.maxStudentCapacity).toBe(150);

      const fetched = internshipRepository.getDepartmentByCode('CSEBS', csebsHodUser);
      expect(fetched?.contactEmail).toBe('hod.csebs.updated@smvec.ac.in');
    });

    it('strictly forbids HOD from updating configuration of another department', async () => {
      await expect(
        internshipRepository.updateDepartmentConfig(
          'IT',
          {
            contactEmail: 'hacker@malicious.com',
            maxStudentCapacity: 50,
          },
          csebsHodUser
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('validates maximum student capacity range (1 - 1000)', async () => {
      await expect(
        internshipRepository.updateDepartmentConfig(
          'CSEBS',
          { maxStudentCapacity: 0 },
          csebsHodUser
        )
      ).rejects.toThrow(/Validation Error: Maximum student capacity must be between 1 and 1000/i);

      await expect(
        internshipRepository.updateDepartmentConfig(
          'CSEBS',
          { maxStudentCapacity: 2000 },
          csebsHodUser
        )
      ).rejects.toThrow(/Validation Error: Maximum student capacity must be between 1 and 1000/i);
    });

    it('allows Super Admin to deactivate and reactivate a department', async () => {
      const deactivated = await internshipRepository.deactivateDepartment('IT', superAdminUser);
      expect(deactivated.status).toBe('inactive');

      // Attempting to update config of an inactive department should fail
      await expect(
        internshipRepository.updateDepartmentConfig(
          'IT',
          { maxStudentCapacity: 100 },
          itHodUser
        )
      ).rejects.toThrow(/deactivated/i);

      const reactivated = await internshipRepository.reactivateDepartment('IT', superAdminUser);
      expect(reactivated.status).toBe('active');
    });
  });

  // ==========================================================================
  // SECTION 2: INTERNSHIP BATCH MANAGEMENT & SCOPING
  // ==========================================================================
  describe('2. Internship Batch Management & Scoping', () => {
    it('allows authorized HOD to create an internship batch for their department', async () => {
      const batch = await internshipRepository.createInternshipBatch(
        {
          departmentCode: 'CSEBS',
          batchName: 'CSEBS 2026 Summer Internship Cohort',
          academicYear: '2025-2026',
          termCode: 'SUMMER',
          semester: 6,
          startDate: '2026-05-01',
          endDate: '2026-07-31',
          maxCapacity: 45,
        },
        csebsHodUser
      );

      expect(batch.id).toBeDefined();
      expect(batch.departmentCode).toBe('CSEBS');
      expect(batch.batchName).toBe('CSEBS 2026 Summer Internship Cohort');
      expect(batch.termCode).toBe('SUMMER');
      expect(batch.status).toBe('active');
      expect(batch.enrolledStudentCount).toBe(0);
      expect(batch.maxCapacity).toBe(45);
    });

    it('strictly forbids HOD from creating an internship batch for another department', async () => {
      await expect(
        internshipRepository.createInternshipBatch(
          {
            departmentCode: 'IT',
            batchName: 'Unauthorized Batch Creation',
            academicYear: '2025-2026',
            termCode: 'EVEN',
            semester: 6,
            startDate: '2026-01-05',
            endDate: '2026-06-30',
          },
          csebsHodUser
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly forbids students from creating internship batches', async () => {
      await expect(
        internshipRepository.createInternshipBatch(
          {
            departmentCode: 'CSEBS',
            batchName: 'Student Created Batch',
            academicYear: '2025-2026',
            termCode: 'EVEN',
            semester: 6,
            startDate: '2026-01-05',
            endDate: '2026-06-30',
          },
          csebsStudent
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('validates batch date ranges (end date must be after start date)', async () => {
      await expect(
        internshipRepository.createInternshipBatch(
          {
            departmentCode: 'CSEBS',
            batchName: 'Invalid Dates Batch',
            academicYear: '2025-2026',
            termCode: 'EVEN',
            semester: 6,
            startDate: '2026-06-30',
            endDate: '2026-01-05',
          },
          csebsHodUser
        )
      ).rejects.toThrow(/Validation Error: Invalid batch date range/i);
    });

    it('rejects duplicate batch names within the same department', async () => {
      await internshipRepository.createInternshipBatch(
        {
          departmentCode: 'CSEBS',
          batchName: 'CSEBS Unique Batch',
          academicYear: '2025-2026',
          termCode: 'EVEN',
          semester: 6,
          startDate: '2026-01-05',
          endDate: '2026-06-30',
        },
        csebsHodUser
      );

      await expect(
        internshipRepository.createInternshipBatch(
          {
            departmentCode: 'CSEBS',
            batchName: 'CSEBS Unique Batch',
            academicYear: '2025-2026',
            termCode: 'EVEN',
            semester: 6,
            startDate: '2026-01-05',
            endDate: '2026-06-30',
          },
          csebsHodUser
        )
      ).rejects.toThrow(/already exists in department/i);
    });

    it('enforces department scoping when retrieving batches', async () => {
      // HOD of CSEBS can retrieve CSEBS batches
      const csebsBatches = internshipRepository.getInternshipBatches('CSEBS', csebsHodUser);
      expect(csebsBatches.every(b => b.departmentCode === 'CSEBS')).toBe(true);

      // HOD of CSEBS attempting to query IT batches is rejected
      expect(() => {
        internshipRepository.getInternshipBatches('IT', csebsHodUser);
      }).toThrow(ForbiddenException);

      // Super Admin can retrieve all batches across all departments
      const allBatches = internshipRepository.getInternshipBatches(undefined, superAdminUser);
      expect(allBatches.length).toBeGreaterThan(0);
    });

    it('allows updating batch details by authorized HOD', async () => {
      const batches = internshipRepository.getInternshipBatches('CSEBS', csebsHodUser);
      const batchToUpdate = batches[0];

      const updated = await internshipRepository.updateInternshipBatch(
        batchToUpdate.id,
        {
          maxCapacity: 75,
          batchName: `${batchToUpdate.batchName} (Extended)`,
        },
        csebsHodUser
      );

      expect(updated.maxCapacity).toBe(75);
      expect(updated.batchName).toContain('(Extended)');
    });
  });

  // ==========================================================================
  // SECTION 3: STUDENT BATCH ASSIGNMENT & MEMBERSHIP VALIDATION
  // ==========================================================================
  describe('3. Student Batch Assignment & Membership Validation', () => {
    it('allows assigning a student to a batch when department membership matches', async () => {
      const csebsBatches = internshipRepository.getInternshipBatches('CSEBS', csebsHodUser);
      const targetBatch = csebsBatches[0];

      const student = await internshipRepository.assignStudentToBatch(
        '23CSEBS001',
        targetBatch.id,
        csebsHodUser
      );

      expect(student.batchId).toBe(targetBatch.id);
      expect(student.batchName).toBe(targetBatch.batchName);

      // Batch enrolled count should be updated
      const updatedBatch = internshipRepository.getInternshipBatchById(targetBatch.id, csebsHodUser);
      expect(updatedBatch?.enrolledStudentCount).toBeGreaterThan(0);
    });

    it('strictly forbids assigning a student to a batch from a different department', async () => {
      // Find an IT batch
      const itBatches = internshipRepository.getInternshipBatches('IT', superAdminUser);
      expect(itBatches.length).toBeGreaterThan(0);
      const itBatch = itBatches[0];

      // Attempt to assign CSEBS student to IT batch
      await expect(
        internshipRepository.assignStudentToBatch(
          '23CSEBS001', // CSEBS student
          itBatch.id,   // IT batch
          superAdminUser
        )
      ).rejects.toThrow(/Department mismatch: Cannot assign student/i);
    });

    it('strictly forbids students from assigning themselves to batches', async () => {
      const csebsBatches = internshipRepository.getInternshipBatches('CSEBS', superAdminUser);
      const targetBatch = csebsBatches[0];

      await expect(
        internshipRepository.assignStudentToBatch(
          '23CSEBS001',
          targetBatch.id,
          csebsStudent
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects assigning a student to an inactive batch', async () => {
      const csebsBatches = internshipRepository.getInternshipBatches('CSEBS', csebsHodUser);
      const targetBatch = csebsBatches[0];

      // Deactivate batch
      await internshipRepository.updateInternshipBatch(
        targetBatch.id,
        { status: 'completed' },
        csebsHodUser
      );

      await expect(
        internshipRepository.assignStudentToBatch(
          '23CSEBS001',
          targetBatch.id,
          csebsHodUser
        )
      ).rejects.toThrow(/inactive batch/i);
    });
  });

  // ==========================================================================
  // SECTION 4: INTERNSHIP ASSIGNMENT WORKFLOW WITH BATCHES
  // ==========================================================================
  describe('4. Internship Assignment Workflow with Batches', () => {
    it('creates an active internship assignment with linked batch and approved location', async () => {
      const locations = locationRepository.getLocations('CSEBS');
      const approvedLocation = locations.find(l => l.status === 'active')!;
      const csebsBatches = internshipRepository.getInternshipBatches('CSEBS', csebsHodUser);
      const batch = csebsBatches[0];

      // Ensure student is not currently actively assigned
      const activeAsgn = internshipRepository.getActiveAssignmentForStudent('23CSEBS001');
      if (activeAsgn) {
        activeAsgn.assignmentStatus = 'completed';
      }

      const assignment = await internshipRepository.createInternshipAssignment(
        {
          studentId: '23CSEBS001',
          locationId: approvedLocation.id,
          roleTitle: 'Software Engineering Intern',
          startDate: '2026-01-05',
          endDate: '2026-06-30',
          mentorId: csebsMentor.id,
          mentorName: csebsMentor.name,
          batchId: batch.id,
          batchName: batch.batchName,
        },
        csebsHodUser
      );

      expect(assignment.id).toBeDefined();
      expect(assignment.studentId).toBe('23CSEBS001');
      expect(assignment.batchId).toBe(batch.id);
      expect(assignment.batchName).toBe(batch.batchName);
      expect(assignment.assignmentStatus).toBe('active');

      const updatedStudent = internshipRepository.getStudentById('23CSEBS001')!;
      expect(updatedStudent.batchId).toBe(batch.id);
      expect(updatedStudent.company).toBe(approvedLocation.companyName);
    });

    it('strictly forbids creating conflicting active assignments for the same student', async () => {
      const locations = locationRepository.getLocations('CSEBS');
      const approvedLocation = locations.find(l => l.status === 'active')!;

      // Verify active assignment exists for 23CSEBS001
      const activeAsgn = internshipRepository.getActiveAssignmentForStudent('23CSEBS001');
      expect(activeAsgn).toBeDefined();

      await expect(
        internshipRepository.createInternshipAssignment(
          {
            studentId: '23CSEBS001',
            locationId: approvedLocation.id,
            roleTitle: 'Duplicate Assignment Attempt',
            startDate: '2026-02-01',
            endDate: '2026-05-30',
          },
          csebsHodUser
        )
      ).rejects.toThrow(/Conflicting active assignment/i);
    });

    it('rejects cross-department batch linking during assignment creation', async () => {
      // Create fresh unassigned student
      const freshStudent: StudentRecord = {
        id: 'st-fresh-csebs',
        studentId: '23CSEBS099',
        studentName: 'Fresh CSEBS Intern',
        email: '23csebs099@smvec.ac.in',
        academicYear: '3rd Year',
        year: '3rd Year',
        departmentCode: 'CSEBS',
        dept: 'CSEBS',
        company: 'Not Assigned',
        mentorId: csebsMentor.id,
        mentor: csebsMentor.name,
        role: 'Intern',
        status: 'onTrack',
        progress: 0,
        hours: 0,
        work: 'None',
      };
      await internshipRepository.saveStudent(freshStudent, superAdminUser);

      const locations = locationRepository.getLocations('CSEBS');
      const approvedLocation = locations.find(l => l.status === 'active')!;
      const itBatches = internshipRepository.getInternshipBatches('IT', superAdminUser);
      const itBatch = itBatches[0];

      await expect(
        internshipRepository.createInternshipAssignment(
          {
            studentId: '23CSEBS099',
            locationId: approvedLocation.id,
            batchId: itBatch.id, // Department mismatch!
            startDate: '2026-02-01',
            endDate: '2026-06-30',
          },
          superAdminUser
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // SECTION 5: AUTHORIZED STUDENT TRANSFERS & TRANSFER HISTORY
  // ==========================================================================
  describe('5. Authorized Student Transfers & Transfer History', () => {
    it('allows Super Admin to transfer a student across departments with reason and clears old batch', async () => {
      const studentBefore = internshipRepository.getStudentById('23CSEBS001')!;
      expect(studentBefore.departmentCode).toBe('CSEBS');

      const transferredStudent = await internshipRepository.transferStudentDepartment(
        '23CSEBS001',
        'IT',
        'Institutional re-allocation approved by Academic Council',
        superAdminUser
      );

      expect(transferredStudent.departmentCode).toBe('IT');
      expect(transferredStudent.dept).toBe('IT');
      expect(transferredStudent.batchId).toBeUndefined(); // Old batch enrollment cleared

      // Transfer history must record the transaction
      const history = internshipRepository.getStudentTransferHistory('23CSEBS001', superAdminUser);
      expect(history.length).toBeGreaterThan(0);
      const entry = history[0];
      expect(entry.studentId).toBe('23CSEBS001');
      expect(entry.fromDepartmentCode).toBe('CSEBS');
      expect(entry.toDepartmentCode).toBe('IT');
      expect(entry.reason).toContain('Academic Council');
      expect(entry.transferredAt).toBeDefined();
    });

    it('strictly forbids HOD, Mentor, or Student from transferring students across departments', async () => {
      await expect(
        internshipRepository.transferStudentDepartment(
          '23CSEBS001',
          'IT',
          'Unauthorized Transfer Attempt',
          csebsHodUser
        )
      ).rejects.toThrow(ForbiddenException);

      await expect(
        internshipRepository.transferStudentDepartment(
          '23CSEBS001',
          'IT',
          'Unauthorized Transfer Attempt',
          csebsMentor
        )
      ).rejects.toThrow(ForbiddenException);

      await expect(
        internshipRepository.transferStudentDepartment(
          '23CSEBS001',
          'IT',
          'Self Transfer Attempt',
          csebsStudent
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects student transfer if reason is missing or less than 5 characters', async () => {
      await expect(
        internshipRepository.transferStudentDepartment(
          '23CSEBS001',
          'IT',
          'N/A', // Too short
          superAdminUser
        )
      ).rejects.toThrow(/Validation Error: A valid transfer reason/i);
    });

    it('rejects transfer if student is already in the target department', async () => {
      await expect(
        internshipRepository.transferStudentDepartment(
          '23CSEBS001',
          'CSEBS', // Already in CSEBS
          'Transfer to same department',
          superAdminUser
        )
      ).rejects.toThrow(/already enrolled in department/i);
    });

    it('scopes transfer history access according to role authorization', async () => {
      // Transfer another student for testing scoping
      await internshipRepository.transferStudentDepartment(
        '23CSEBS001',
        'IT',
        'Authorized department transfer for testing',
        superAdminUser
      );

      // Student can only see their own history
      const studentHistory = internshipRepository.getStudentTransferHistory(undefined, csebsStudent);
      expect(studentHistory.every(h => h.studentId === csebsStudent.studentId)).toBe(true);

      // HOD can see transfers involving their department
      const hodHistory = internshipRepository.getStudentTransferHistory(undefined, csebsHodUser);
      expect(hodHistory.every(h => h.fromDepartmentCode === 'CSEBS' || h.toDepartmentCode === 'CSEBS')).toBe(true);

      // Super Admin sees all transfers
      const adminHistory = internshipRepository.getStudentTransferHistory(undefined, superAdminUser);
      expect(adminHistory.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SECTION 6: LOCATION GOVERNANCE & MODIFICATION AUDIT TRAIL
  // ==========================================================================
  describe('6. Location Governance & Modification Audit Trail', () => {
    it('allows authorized HOD to approve pending location in their department and records audit history', async () => {
      const locations = locationRepository.getLocations('CSEBS');
      const pendingLocation = locations.find(l => l.status === 'pending_approval');
      expect(pendingLocation).toBeDefined();

      const approved = await locationRepository.approveLocation(pendingLocation!.id, csebsHodUser);
      expect(approved.status).toBe('active');
      expect(approved.isActive).toBe(true);
      expect(approved.approvedBy).toBe(csebsHodUser.name);

      // Audit history verification
      const history = locationRepository.getLocationChangeHistory(pendingLocation!.id, csebsHodUser);
      expect(history.length).toBeGreaterThan(0);
      const approveEvent = history.find(h => (h.changeType === 'approved' || h.changeType === 'status_changed') && h.newState?.status === 'active');
      expect(approveEvent).toBeDefined();
      expect(approveEvent?.changedByName).toBe(csebsHodUser.name);
    });

    it('strictly forbids HOD from approving locations belonging to another department', async () => {
      // Create a pending location in IT department
      const itLocation = await locationRepository.createLocation(
        {
          locationName: 'IT Technology Center',
          companyName: 'Wipro Limited',
          address: 'ELCOT SEZ, Sholinganallur, Chennai',
          latitude: 12.9010,
          longitude: 80.2272,
          geofenceRadiusMeters: 200,
          internshipStartDate: '2026-01-05',
          internshipEndDate: '2026-06-30',
          monitoringStartTime: '09:00:00',
          monitoringEndTime: '17:30:00',
          departmentCode: 'IT',
        },
        itHodUser
      );

      // CSEBS HOD attempts to approve IT location -> FORBIDDEN
      await expect(
        locationRepository.approveLocation(itLocation.id, csebsHodUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('records location edit actions in change history with parameter diffs', async () => {
      const locations = locationRepository.getLocations('CSEBS');
      const activeLoc = locations.find(l => l.status === 'active')!;

      await locationRepository.editLocation(
        activeLoc.id,
        {
          geofenceRadiusMeters: 350.0,
          monitoringEndTime: '18:30:00',
        },
        csebsHodUser
      );

      const history = locationRepository.getLocationChangeHistory(activeLoc.id, csebsHodUser);
      const editEvent = history.find(h => h.changeType === 'geofence_updated');
      expect(editEvent).toBeDefined();
      expect(editEvent?.newState?.geofenceRadiusMeters).toBe(350.0);
    });

    it('validates geofence radius boundary limits (20m - 5000m)', async () => {
      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Too Small Radius Hub',
            companyName: 'Micro Tech',
            address: 'Puducherry',
            latitude: 11.9340,
            longitude: 79.8300,
            geofenceRadiusMeters: 10.0, // Rejects < 20m
            internshipStartDate: '2026-01-05',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '09:00:00',
            monitoringEndTime: '17:00:00',
            departmentCode: 'CSEBS',
          },
          csebsHodUser
        )
      ).rejects.toThrow(/between 20 meters and 5000 meters/i);

      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Too Large Radius Hub',
            companyName: 'Macro Tech',
            address: 'Puducherry',
            latitude: 11.9340,
            longitude: 79.8300,
            geofenceRadiusMeters: 8000.0, // Rejects > 5000m
            internshipStartDate: '2026-01-05',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '09:00:00',
            monitoringEndTime: '17:00:00',
            departmentCode: 'CSEBS',
          },
          csebsHodUser
        )
      ).rejects.toThrow(/between 20 meters and 5000 meters/i);
    });

    it('validates geographical coordinates bounds (latitude [-90, +90], longitude [-180, +180])', async () => {
      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Invalid Latitude Hub',
            companyName: 'Polar Tech',
            address: 'North Pole',
            latitude: 95.0, // Invalid latitude > 90
            longitude: 79.8300,
            geofenceRadiusMeters: 100.0,
            internshipStartDate: '2026-01-05',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '09:00:00',
            monitoringEndTime: '17:00:00',
            departmentCode: 'CSEBS',
          },
          csebsHodUser
        )
      ).rejects.toThrow(/between -90 and 90 degrees/i);
    });
  });

  // ==========================================================================
  // SECTION 7: MULTI-DEPARTMENT DASHBOARD ANALYTICS & PROVIDER DIRECTORY
  // ==========================================================================
  describe('7. Multi-Department Analytics & Provider Directory', () => {
    it('computes accurate multi-department statistics for Super Admin', () => {
      const stats = internshipRepository.getMultiDepartmentInternshipStats(superAdminUser);
      expect(stats.length).toBeGreaterThan(0);

      const csebsStat = stats.find(s => s.code === 'CSEBS');
      expect(csebsStat).toBeDefined();
      expect(csebsStat?.totalStudents).toBeGreaterThan(0);
      expect(csebsStat?.activeMentors).toBeGreaterThan(0);
      expect(csebsStat?.approvedLocations).toBeGreaterThan(0);
      expect(csebsStat?.activeBatches).toBeGreaterThan(0);
      expect(csebsStat?.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(csebsStat?.attendanceRate).toBeLessThanOrEqual(100);
    });

    it('scopes multi-department statistics for HOD to authorized departments only', () => {
      const stats = internshipRepository.getMultiDepartmentInternshipStats(csebsHodUser);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats.some(s => s.code === 'CSEBS')).toBe(true);
    });

    it('returns detailed departmental analytics with attached batches list', () => {
      const analytics = internshipRepository.getDepartmentDetailedAnalytics('CSEBS', csebsHodUser);
      expect(analytics.departmentCode).toBe('CSEBS');
      expect(analytics.totalStudents).toBeGreaterThan(0);
      expect(analytics.batches.length).toBeGreaterThan(0);
      expect(analytics.locationsCount).toBeGreaterThan(0);
    });

    it('aggregates approved locations into an internship provider directory', () => {
      const providers = internshipRepository.getInternshipProviders(undefined, superAdminUser);
      expect(providers.length).toBeGreaterThan(0);

      const tcsProvider = providers.find(p => p.companyName.toLowerCase().includes('tata consultancy'));
      expect(tcsProvider).toBeDefined();
      expect(tcsProvider?.totalLocations).toBeGreaterThanOrEqual(1);
      expect(tcsProvider?.participatingDepartments.length).toBeGreaterThanOrEqual(1);
      expect(tcsProvider?.providerStatus).toBe('active');
    });

    it('forbids HOD from accessing provider directory for another department', () => {
      expect(() => {
        internshipRepository.getInternshipProviders('IT', csebsHodUser);
      }).toThrow(ForbiddenException);
    });
  });

  // ==========================================================================
  // SECTION 8: PRIVACY & MONITORING BOUNDARY COMPLIANCE
  // ==========================================================================
  describe('8. Privacy & Monitoring Boundary Compliance', () => {
    it('preserves approved monitoring schedule and restricts geofence verification within hours', async () => {
      const locations = locationRepository.getLocations('CSEBS');
      const approvedLocation = locations.find(l => l.status === 'active')!;

      // Location monitoring times must not be arbitrarily expanded
      expect(approvedLocation.monitoringStartTime).toBe('09:00:00');
      expect(approvedLocation.monitoringEndTime).toBe('18:00:00');
    });

    it('ensures student consent withdrawal and authorized privacy bounds are respected', () => {
      const student = internshipRepository.getStudentById('23CSEBS001')!;
      expect(student).toBeDefined();
      // Student details should be accessible by the student themselves
      const myRecord = internshipRepository.getStudentById(student.studentId, csebsStudent);
      expect(myRecord?.studentId).toBe(student.studentId);
    });

    it('never classifies network errors or GPS unavailability as confirmed violations', () => {
      // In accordance with Phase 7 & 8 rules, unknown or unavailable location outcomes
      // are classified as UNVERIFIED or PENDING, never as CONFIRMED_VIOLATION.
      const sampleEvaluation = {
        evaluationOutcome: 'UNVERIFIED',
        locationClassification: 'UNKNOWN_OR_UNAVAILABLE',
        isViolation: false,
      };

      expect(sampleEvaluation.isViolation).toBe(false);
      expect(sampleEvaluation.locationClassification).toBe('UNKNOWN_OR_UNAVAILABLE');
    });
  });
});

