/**
 * ============================================================================
 * INTERNPULSE — PHASE 17B AUTOMATED TEST SUITE
 * Department-Level Governance & Role-Based Access Control
 * Institutional Multi-Department RBAC & Boundary Isolation
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

describe('Phase 17B: Department-Level Governance & RBAC Test Suite', () => {
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
  const csebsStudentA: AuthUser = {
    id: 'student-csebs-001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@smvec.ac.in',
    role: 'student',
    mentorId: 'MENTOR_CSEBS_01',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const csebsStudentB: AuthUser = {
    id: 'student-csebs-002',
    studentId: '23CSEBS002',
    name: 'Priya R',
    email: '23csebs002@smvec.ac.in',
    role: 'student',
    mentorId: 'MENTOR_CSEBS_02',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  const itStudentA: AuthUser = {
    id: 'student-it-001',
    studentId: '23IT001',
    name: 'Dinesh Kumar',
    email: '23it001@smvec.ac.in',
    role: 'student',
    mentorId: 'MENTOR_IT_01',
    dept: 'IT Department',
    departmentCode: 'IT',
    institutionId: 'inst-smvec-001',
    college: 'SMVEC',
    isActive: true,
  };

  // Pre-seed mock multi-department dataset
  const testStudents: StudentRecord[] = [
    {
      id: 'student-csebs-001',
      studentId: '23CSEBS001',
      studentName: 'Harish V',
      email: '23csebs001@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'Zoho Corporation',
      mentorId: 'MENTOR_CSEBS_01',
      mentor: 'Prof. Anitha Kumar',
      mentorEmail: 'anitha.mentor@smvec.ac.in',
      role: 'Backend Intern',
      status: 'inProgress',
      progress: 60,
      hours: 120,
      work: 'Developed API routes',
      time: '10:00 AM',
    },
    {
      id: 'student-csebs-002',
      studentId: '23CSEBS002',
      studentName: 'Priya R',
      email: '23csebs002@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'TCS Innovation Labs',
      mentorId: 'MENTOR_CSEBS_02',
      mentor: 'Prof. Balaji S',
      mentorEmail: 'balaji.mentor@smvec.ac.in',
      role: 'Cloud Intern',
      status: 'inProgress',
      progress: 40,
      hours: 80,
      work: 'Configured AWS buckets',
      time: '11:00 AM',
    },
    {
      id: 'student-it-001',
      studentId: '23IT001',
      studentName: 'Dinesh Kumar',
      email: '23it001@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'IT',
      dept: 'IT',
      company: 'Infosys Limited',
      mentorId: 'MENTOR_IT_01',
      mentor: 'Prof. Karthik S',
      mentorEmail: 'karthik.it@smvec.ac.in',
      role: 'Fullstack Intern',
      status: 'inProgress',
      progress: 50,
      hours: 100,
      work: 'Built React components',
      time: '09:30 AM',
    },
  ];

  beforeEach(() => {
    internshipRepository.resetToDefaults();
    internshipRepository.replaceDataset(testStudents);
  });

  // ==========================================================================
  // SCENARIO 1: CROSS-DEPARTMENT DATA ACCESS
  // ==========================================================================
  describe('1. Cross-Department Data Access Isolation', () => {
    it('allows CSEBS HOD to access CSEBS department student records', () => {
      const csebsStudents = internshipRepository.getStudentsForHod('CSEBS', csebsHodUser);
      expect(csebsStudents.length).toBe(2);
      expect(csebsStudents.every(s => s.departmentCode === 'CSEBS')).toBe(true);
    });

    it('blocks CSEBS HOD from accessing IT department student records', () => {
      expect(() => {
        internshipRepository.getStudentsForHod('IT', csebsHodUser);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentsForHod('IT', csebsHodUser);
      }).toThrowError(/HOD of 'CSEBS' cannot manage department 'IT'/);
    });

    it('blocks CSEBS HOD from querying IT department mentors', () => {
      expect(() => {
        internshipRepository.getMentorsForHod('IT', csebsHodUser);
      }).toThrowError(ForbiddenException);
    });

    it('blocks CSEBS HOD from querying IT student directly by ID', () => {
      expect(() => {
        internshipRepository.getStudentById('23IT001', csebsHodUser);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentById('23IT001', csebsHodUser);
      }).toThrowError(/cannot access records belonging to student '23IT001' in department 'IT'/);
    });

    it('allows IT HOD to access IT department students and blocks CSEBS access', () => {
      const itStudents = internshipRepository.getStudentsForHod('IT', itHodUser);
      expect(itStudents.length).toBe(1);
      expect(itStudents[0].studentId).toBe('23IT001');

      expect(() => {
        internshipRepository.getStudentsForHod('CSEBS', itHodUser);
      }).toThrowError(ForbiddenException);
    });

    it('blocks cross-department attendance summary generation', () => {
      expect(() => {
        internshipRepository.getDepartmentAttendanceSummary('IT', csebsHodUser);
      }).toThrowError(ForbiddenException);

      const summary = internshipRepository.getDepartmentAttendanceSummary('CSEBS', csebsHodUser);
      expect(summary.departmentCode).toBe('CSEBS');
    });
  });

  // ==========================================================================
  // SCENARIO 2: UNAUTHORIZED HOD ACCESS
  // ==========================================================================
  describe('2. Unauthorized HOD Administrative Actions', () => {
    it('blocks HOD from creating a new department (Super Admin privilege)', async () => {
      await expect(
        internshipRepository.createDepartment(
          { code: 'AIML', name: 'Artificial Intelligence & Machine Learning' },
          csebsHodUser
        )
      ).rejects.toThrowError(ForbiddenException);

      await expect(
        internshipRepository.createDepartment(
          { code: 'AIML', name: 'Artificial Intelligence & Machine Learning' },
          csebsHodUser
        )
      ).rejects.toThrowError(/Institution Super Admin authority required/);
    });

    it('blocks HOD from deactivating a department', async () => {
      await expect(
        internshipRepository.deactivateDepartment('IT', csebsHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('blocks HOD from reactivating a department', async () => {
      await expect(
        internshipRepository.reactivateDepartment('IT', csebsHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('blocks HOD from reassigning department HODs', async () => {
      await expect(
        internshipRepository.assignDepartmentHod('IT', 'new-hod-id', 'Dr. External', csebsHodUser)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('blocks HOD from inspecting institution-wide statistics', () => {
      expect(() => {
        internshipRepository.getInstitutionStatistics(csebsHodUser);
      }).toThrowError(ForbiddenException);
    });

    it('blocks HOD from accessing Super Admin web routes', () => {
      const guard = AuthorizationPolicy.canAccessRoute(csebsHodUser, '/super-admin/governance');
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toBe('RoleMismatch');
    });
  });

  // ==========================================================================
  // SCENARIO 3: UNAUTHORIZED MENTOR ACCESS
  // ==========================================================================
  describe('3. Unauthorized Mentor Access', () => {
    it('allows Mentor to query assigned students within authorized department', () => {
      const students = internshipRepository.getStudentsForMentor('MENTOR_CSEBS_01', csebsMentor);
      expect(students.length).toBe(1);
      expect(students[0].studentId).toBe('23CSEBS001');
    });

    it('blocks Mentor from querying unassigned students of another mentor in same department', () => {
      expect(() => {
        internshipRepository.getStudentsForMentor('MENTOR_CSEBS_02', csebsMentor);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentsForMentor('MENTOR_CSEBS_02', csebsMentor);
      }).toThrowError(/Mentor cannot access an unrelated mentor's assigned students/);
    });

    it('blocks Mentor from querying student roster of another department', () => {
      expect(() => {
        internshipRepository.getStudentsForMentorScope('MENTOR_IT_01', 'IT', csebsMentor);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentsForMentorScope('MENTOR_IT_01', 'IT', csebsMentor);
      }).toThrowError(/Mentor of department 'CSEBS' cannot access department 'IT'/);
    });

    it('blocks Mentor from onboarding student into another department', async () => {
      await expect(
        internshipRepository.onboardStudent(
          {
            studentId: '23IT999',
            studentName: 'Malicious Onboard',
            email: 'malicious@smvec.ac.in',
            academicYear: '3rd Year',
            year: '3rd Year',
            departmentCode: 'IT',
            dept: 'IT',
            company: 'Unassigned',
            mentorId: 'MENTOR_CSEBS_01',
            mentor: 'Prof. Anitha Kumar',
            mentorEmail: 'anitha.mentor@smvec.ac.in',
            role: 'Intern',
            status: 'onTrack',
            progress: 0,
            hours: 0,
            work: 'Initial',
            time: 'Now',
          },
          csebsMentor
        )
      ).rejects.toThrowError(ForbiddenException);
    });

    it('blocks Mentor from navigating to administrative routes', () => {
      expect(AuthorizationPolicy.canAccessRoute(csebsMentor, '/hod/dashboard').allowed).toBe(false);
      expect(AuthorizationPolicy.canAccessRoute(csebsMentor, '/admin/settings').allowed).toBe(false);
      expect(AuthorizationPolicy.canAccessRoute(csebsMentor, '/super-admin/audit').allowed).toBe(false);
    });
  });

  // ==========================================================================
  // SCENARIO 4: STUDENT RECORD ISOLATION
  // ==========================================================================
  describe('4. Student Record Isolation & Privacy Boundaries', () => {
    it('allows student to query their own record and daily logs', () => {
      const student = internshipRepository.getStudentById('23CSEBS001', csebsStudentA);
      expect(student).not.toBeNull();
      expect(student?.studentId).toBe('23CSEBS001');
    });

    it('blocks student from accessing a peer student record in the same department', () => {
      expect(() => {
        internshipRepository.getStudentById('23CSEBS002', csebsStudentA);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentById('23CSEBS002', csebsStudentA);
      }).toThrowError(/cannot access records belonging to student '23CSEBS002'/);
    });

    it('blocks student from accessing a student record in another department', () => {
      expect(() => {
        internshipRepository.getStudentById('23IT001', csebsStudentA);
      }).toThrowError(ForbiddenException);
    });

    it('blocks student from submitting daily logs on behalf of another student', async () => {
      await expect(
        internshipRepository.submitStudentDailyLog(
          '23CSEBS002',
          { work: 'Falsified log entry', hours: 8, status: 'onTrack' },
          csebsStudentA
        )
      ).rejects.toThrowError(ForbiddenException);
    });

    it('blocks student from querying department mentor or student directories', () => {
      expect(() => {
        internshipRepository.getStudentsForHod('CSEBS', csebsStudentA);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getMentorsForHod('CSEBS', csebsStudentA);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentsForMentor('MENTOR_CSEBS_01', csebsStudentA);
      }).toThrowError(ForbiddenException);
    });

    it('blocks student from navigating to non-student web portals', () => {
      expect(AuthorizationPolicy.canAccessRoute(csebsStudentA, '/mentor/dashboard').allowed).toBe(false);
      expect(AuthorizationPolicy.canAccessRoute(csebsStudentA, '/hod/dashboard').allowed).toBe(false);
      expect(AuthorizationPolicy.canAccessRoute(csebsStudentA, '/super-admin/dashboard').allowed).toBe(false);
    });
  });

  // ==========================================================================
  // SCENARIO 5: DEPARTMENT REASSIGNMENT SAFEGUARDS
  // ==========================================================================
  describe('5. Department Reassignment Anti-Tamper Safeguards', () => {
    it('blocks HOD from reassigning a student to a different department', async () => {
      const student = internshipRepository.getStudentById('23CSEBS001')!;
      const modifiedStudent: StudentRecord = {
        ...student,
        departmentCode: 'IT',
        dept: 'IT',
      };

      await expect(
        internshipRepository.saveStudent(modifiedStudent, csebsHodUser)
      ).rejects.toThrowError(ForbiddenException);

      await expect(
        internshipRepository.saveStudent(modifiedStudent, csebsHodUser)
      ).rejects.toThrowError(/Department reassignment from 'CSEBS' to 'IT' is restricted to Institution Super Admin/);
    });

    it('blocks Mentor from reassigning student department', async () => {
      const student = internshipRepository.getStudentById('23CSEBS001')!;
      const modifiedStudent: StudentRecord = {
        ...student,
        departmentCode: 'ECE',
        dept: 'ECE',
      };

      await expect(
        internshipRepository.saveStudent(modifiedStudent, csebsMentor)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('blocks Student from changing their own registered department', async () => {
      const student = internshipRepository.getStudentById('23CSEBS001')!;
      const modifiedStudent: StudentRecord = {
        ...student,
        departmentCode: 'MECH',
        dept: 'MECH',
      };

      await expect(
        internshipRepository.saveStudent(modifiedStudent, csebsStudentA)
      ).rejects.toThrowError(ForbiddenException);
    });

    it('blocks HOD from assigning a mentor from a different department to a student', async () => {
      await expect(
        internshipRepository.updateStudentMentor(
          '23CSEBS001',
          'MENTOR_IT_01',
          'Prof. Karthik S',
          csebsHodUser
        )
      ).rejects.toThrowError(ForbiddenException);

      await expect(
        internshipRepository.updateStudentMentor(
          '23CSEBS001',
          'MENTOR_IT_01',
          'Prof. Karthik S',
          csebsHodUser
        )
      ).rejects.toThrowError(/Cross-department mentor assignment forbidden/);
    });

    it('allows Institution Super Admin to perform authorized department reassignment', async () => {
      const student = internshipRepository.getStudentById('23CSEBS001')!;
      const reassignedStudent: StudentRecord = {
        ...student,
        departmentCode: 'IT',
        dept: 'IT',
      };

      await internshipRepository.saveStudent(reassignedStudent, superAdminUser);
      const updated = internshipRepository.getStudentById('23CSEBS001');
      expect(updated?.departmentCode).toBe('IT');
    });
  });

  // ==========================================================================
  // SCENARIO 6: DEACTIVATED DEPARTMENT ACCESS
  // ==========================================================================
  describe('6. Deactivated Department Access & Lifecycle Control', () => {
    it('blocks operational queries when a department is marked inactive', async () => {
      // Super Admin deactivates IT department
      const deactivated = await internshipRepository.deactivateDepartment('IT', superAdminUser);
      expect(deactivated.status).toBe('inactive');

      // IT HOD attempts to access department student roster
      expect(() => {
        internshipRepository.getStudentsForHod('IT', itHodUser);
      }).toThrowError(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentsForHod('IT', itHodUser);
      }).toThrowError(/Department 'IT' is deactivated. Operational access is blocked/);

      // IT Mentor attempts to query mentors
      expect(() => {
        internshipRepository.getMentorsForHod('IT', itHodUser);
      }).toThrowError(ForbiddenException);
    });

    it('blocks student onboarding into a deactivated department', async () => {
      await internshipRepository.deactivateDepartment('IT', superAdminUser);

      await expect(
        internshipRepository.onboardStudent(
          {
            studentId: '23IT888',
            studentName: 'Blocked Student',
            email: 'blocked@smvec.ac.in',
            academicYear: '3rd Year',
            year: '3rd Year',
            departmentCode: 'IT',
            dept: 'IT',
            company: 'Unassigned',
            mentorId: 'MENTOR_IT_01',
            mentor: 'Prof. Karthik S',
            mentorEmail: 'karthik.it@smvec.ac.in',
            role: 'Intern',
            status: 'onTrack',
            progress: 0,
            hours: 0,
            work: 'Blocked',
            time: 'Now',
          },
          itHodUser
        )
      ).rejects.toThrowError(ForbiddenException);
    });

    it('allows Super Admin to audit inactive departments without exception', async () => {
      await internshipRepository.deactivateDepartment('IT', superAdminUser);

      // Super Admin can audit students of inactive department
      const itStudents = internshipRepository.getStudentsForHod('IT', superAdminUser);
      expect(itStudents.length).toBe(1);
    });

    it('restores operational access when Super Admin reactivates the department', async () => {
      await internshipRepository.deactivateDepartment('IT', superAdminUser);
      const reactivated = await internshipRepository.reactivateDepartment('IT', superAdminUser);
      expect(reactivated.status).toBe('active');

      const itStudents = internshipRepository.getStudentsForHod('IT', itHodUser);
      expect(itStudents.length).toBe(1);
    });
  });

  // ==========================================================================
  // SCENARIO 7: SUPER ADMIN AUTHORIZATION
  // ==========================================================================
  describe('7. Institution Super Admin Authority & Multi-Department Governance', () => {
    it('allows Super Admin to view institution-wide metrics across all departments', () => {
      const stats = internshipRepository.getInstitutionStatistics(superAdminUser);
      expect(stats.totalDepartments).toBeGreaterThanOrEqual(10);
      expect(stats.activeDepartments).toBeGreaterThanOrEqual(10);
      expect(stats.totalStudents).toBe(3);
      expect(Array.isArray(stats.departmentBreakdown)).toBe(true);

      const csebsEntry = stats.departmentBreakdown.find(d => d.code === 'CSEBS');
      expect(csebsEntry).toBeDefined();
      expect(csebsEntry?.studentCount).toBe(2);
    });

    it('allows Super Admin to create a new institution department with pilot-safety flag', async () => {
      const newDept = await internshipRepository.createDepartment(
        {
          code: 'AIDS',
          name: 'Artificial Intelligence and Data Science',
          maxStudentCapacity: 120,
        },
        superAdminUser
      );

      expect(newDept.code).toBe('AIDS');
      expect(newDept.status).toBe('active');
      expect(newDept.isPilotAuthorized).toBe(false); // CRITICAL: New departments are not pilot-authorized

      const retrieved = internshipRepository.getDepartmentByCode('AIDS', superAdminUser);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Artificial Intelligence and Data Science');
    });

    it('prevents creation of duplicate department codes', async () => {
      await expect(
        internshipRepository.createDepartment(
          { code: 'CSEBS', name: 'Duplicate CSEBS' },
          superAdminUser
        )
      ).rejects.toThrowError(/Department with code 'CSEBS' already exists/);
    });

    it('allows Super Admin to assign and update department HOD', async () => {
      const updatedDept = await internshipRepository.assignDepartmentHod(
        'ECE',
        'HOD_ECE_01',
        'Dr. New ECE Head',
        superAdminUser
      );

      expect(updatedDept.hodId).toBe('HOD_ECE_01');
      expect(updatedDept.hodName).toBe('Dr. New ECE Head');

      const eceHod = internshipRepository.getHodByDepartment('ECE');
      expect(eceHod?.name).toBe('Dr. New ECE Head');
    });

    it('allows Super Admin to navigate across all route hierarchies', () => {
      expect(AuthorizationPolicy.canAccessRoute(superAdminUser, '/student/portal').allowed).toBe(true);
      expect(AuthorizationPolicy.canAccessRoute(superAdminUser, '/mentor/dashboard').allowed).toBe(true);
      expect(AuthorizationPolicy.canAccessRoute(superAdminUser, '/hod/dashboard').allowed).toBe(true);
      expect(AuthorizationPolicy.canAccessRoute(superAdminUser, '/super-admin/governance').allowed).toBe(true);
    });
  });

  // ==========================================================================
  // SCENARIO 8: DIRECT API / DATABASE ACCESS ATTEMPTS & TAMPERING
  // ==========================================================================
  describe('8. Direct Access Attempts & Session Tampering', () => {
    it('throws UnauthorizedException when caller is unauthenticated (null caller)', () => {
      expect(() => {
        AuthorizationPolicy.validateIdentity(null as any);
      }).toThrowError(UnauthorizedException);

      expect(() => {
        AuthorizationPolicy.validateIdentity(null as any);
      }).toThrowError(/Authentication required/);
    });

    it('throws ForbiddenException when caller account is deactivated (isActive = false)', () => {
      const deactivatedUser: AuthUser = {
        ...csebsHodUser,
        isActive: false,
      };

      expect(() => {
        AuthorizationPolicy.validateIdentity(deactivatedUser);
      }).toThrowError(ForbiddenException);

      expect(() => {
        AuthorizationPolicy.validateIdentity(deactivatedUser);
      }).toThrowError(/Account is deactivated/);
    });

    it('rejects web routing navigation when caller is deactivated', () => {
      const deactivatedUser: AuthUser = {
        ...csebsHodUser,
        isActive: false,
      };

      const result = AuthorizationPolicy.canAccessRoute(deactivatedUser, '/hod/dashboard');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('AccountDeactivated');
    });

    it('blocks cross-department internship location assignment attempts', async () => {
      // Create approved location
      const loc = await locationRepository.createLocation(
        {
          locationName: 'Secure Tech Park',
          companyName: 'Zoho Corporation',
          address: 'Estancia IT Park, Guduvanchery',
          latitude: 12.8284,
          longitude: 80.2198,
          geofenceRadiusMeters: 200,
          monitoringStartTime: '09:00:00',
          monitoringEndTime: '17:00:00',
          internshipStartDate: '2026-11-01',
          internshipEndDate: '2026-12-31',
        },
        csebsHodUser
      );
      await locationRepository.approveLocation(loc.id, csebsHodUser);

      // Attempt to assign CSEBS student with IT mentor
      await expect(
        internshipRepository.createInternshipAssignment(
          {
            studentId: '23CSEBS001',
            locationId: loc.id,
            roleTitle: 'Software Intern',
            startDate: '2026-11-10',
            endDate: '2026-12-10',
            mentorId: 'MENTOR_IT_01',
            mentorName: 'Prof. Karthik S',
          },
          csebsHodUser
        )
      ).rejects.toThrowError(ForbiddenException);

      await expect(
        internshipRepository.createInternshipAssignment(
          {
            studentId: '23CSEBS001',
            locationId: loc.id,
            roleTitle: 'Software Intern',
            startDate: '2026-11-10',
            endDate: '2026-12-10',
            mentorId: 'MENTOR_IT_01',
            mentorName: 'Prof. Karthik S',
          },
          csebsHodUser
        )
      ).rejects.toThrowError(/Cross-department assignment forbidden/);
    });

    it('rejects assignment when start date succeeds end date', async () => {
      const loc = await locationRepository.createLocation(
        {
          locationName: 'Secure Hub',
          companyName: 'TCS',
          address: 'SIPCOT IT Park, Siruseri',
          latitude: 12.8284,
          longitude: 80.2198,
          geofenceRadiusMeters: 200,
          monitoringStartTime: '09:00:00',
          monitoringEndTime: '17:00:00',
          internshipStartDate: '2026-11-01',
          internshipEndDate: '2026-12-31',
        },
        csebsHodUser
      );
      await locationRepository.approveLocation(loc.id, csebsHodUser);

      await expect(
        internshipRepository.createInternshipAssignment(
          {
            studentId: '23CSEBS001',
            locationId: loc.id,
            startDate: '2026-12-10',
            endDate: '2026-11-10', // Invalid: end before start
          },
          csebsHodUser
        )
      ).rejects.toThrowError(/Invalid assignment date range/);
    });
  });
});
