import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AuthorizationPolicy, 
  UnauthorizedException, 
  ForbiddenException 
} from '../rbac/authorizationPolicy';
import { internshipRepository } from '../../repository/internshipRepository';
import { AuthUser } from '../authUser';
import { StudentRecord } from '../../../data/initialData';

describe('Phase 1: Role-Based Access Control (RBAC) & Authorization Tests', () => {
  // Test Fixtures for HOD, Mentors, and Students
  const hodUser: AuthUser = {
    id: 'hod-uuid-001',
    name: 'Dr. K. Saravanan',
    email: 'saravanan.hod@smvec.ac.in',
    role: 'hod',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const mentorA: AuthUser = {
    id: 'mentor-uuid-001',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@smvec.ac.in',
    role: 'mentor',
    mentorId: 'MENTOR_CSEBS_01',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const mentorB: AuthUser = {
    id: 'mentor-uuid-002',
    name: 'Prof. Balaji S',
    email: 'balaji.mentor@smvec.ac.in',
    role: 'mentor',
    mentorId: 'MENTOR_CSEBS_02',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const studentA: AuthUser = {
    id: 'student-uuid-001',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@smvec.ac.in',
    role: 'student',
    mentorId: 'MENTOR_CSEBS_01',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const studentB: AuthUser = {
    id: 'student-uuid-002',
    studentId: '23CSEBS002',
    name: 'Priya R',
    email: '23csebs002@smvec.ac.in',
    role: 'student',
    mentorId: 'MENTOR_CSEBS_02',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const mockStudentsDataset: StudentRecord[] = [
    {
      id: 'student-uuid-001',
      studentId: '23CSEBS001',
      studentName: 'Harish V',
      email: '23csebs001@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'TCS Innovation Labs',
      mentorId: 'MENTOR_CSEBS_01',
      mentor: 'Prof. Anitha Kumar',
      role: 'Software Intern',
      status: 'onTrack',
      progress: 40,
      hours: 60,
      work: 'Developed OAuth authorization flows.',
      time: 'Today',
    },
    {
      id: 'student-uuid-002',
      studentId: '23CSEBS002',
      studentName: 'Priya R',
      email: '23csebs002@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'Zoho Corporation',
      mentorId: 'MENTOR_CSEBS_02',
      mentor: 'Prof. Balaji S',
      role: 'Full Stack Intern',
      status: 'onTrack',
      progress: 50,
      hours: 75,
      work: 'Implemented backend database endpoints.',
      time: 'Today',
    },
  ];

  beforeEach(() => {
    internshipRepository.replaceDataset([...mockStudentsDataset]);
  });

  // ============================================================================
  // TEST 1: HOD ACCESSING HOD RESOURCES
  // ============================================================================
  describe('1. HOD Accessing HOD Resources', () => {
    it('allows HOD to access institutional student directory', () => {
      expect(() => {
        AuthorizationPolicy.validateHodScope(hodUser);
      }).not.toThrow();

      const students = internshipRepository.getAllStudentsForAdmin(hodUser);
      expect(students.length).toBe(2);
    });

    it('allows HOD to access department students registry', () => {
      const deptStudents = internshipRepository.getStudentsForHod('CSEBS', hodUser);
      expect(deptStudents.length).toBe(2);
    });

    it('allows HOD to execute mentor reassignment', async () => {
      expect(() => {
        AuthorizationPolicy.validateHodScope(hodUser);
      }).not.toThrow();

      await expect(
        internshipRepository.updateStudentMentor('23CSEBS001', 'MENTOR_CSEBS_02', 'Prof. Balaji S', hodUser)
      ).resolves.not.toThrow();

      const updated = internshipRepository.getStudentById('23CSEBS001');
      expect(updated?.mentorId).toBe('MENTOR_CSEBS_02');
    });

    it('validates HOD route access for web routing', () => {
      expect(AuthorizationPolicy.canAccessRoute(hodUser, '/hod/dashboard').allowed).toBe(true);
      expect(AuthorizationPolicy.canAccessRoute(hodUser, '/admin/dashboard').allowed).toBe(true);
    });
  });

  // ============================================================================
  // TEST 2: MENTOR ACCESSING ASSIGNED STUDENTS
  // ============================================================================
  describe('2. Mentor Accessing Assigned Students', () => {
    it('allows Mentor A to access their assigned mentee (Student A)', () => {
      const student1 = mockStudentsDataset[0];
      expect(() => {
        AuthorizationPolicy.validateMentorRelationship(mentorA, student1);
      }).not.toThrow();

      const mentees = internshipRepository.getStudentsForMentor('MENTOR_CSEBS_01', mentorA);
      expect(mentees.length).toBe(1);
      expect(mentees[0].studentId).toBe('23CSEBS001');
    });

    it('allows Mentor A to inspect assigned student by ID', () => {
      expect(() => {
        internshipRepository.getStudentById('23CSEBS001', mentorA);
      }).not.toThrow();
    });

    it('validates Mentor route access for web routing', () => {
      expect(AuthorizationPolicy.canAccessRoute(mentorA, '/mentor/dashboard').allowed).toBe(true);
    });
  });

  // ============================================================================
  // TEST 3: MENTOR ATTEMPTING TO ACCESS UNRELATED STUDENTS
  // ============================================================================
  describe('3. Mentor Attempting to Access Unrelated Students', () => {
    it('blocks Mentor A when attempting to access Mentor B cohort via repository', () => {
      // Mentor A attempts to query Mentor B's students
      expect(() => {
        internshipRepository.getStudentsForMentor('MENTOR_CSEBS_02', mentorA);
      }).toThrow(ForbiddenException);
    });

    it('blocks Mentor A from reviewing an unrelated student (Student B)', () => {
      const student2 = mockStudentsDataset[1]; // Supervised by Mentor B
      expect(() => {
        AuthorizationPolicy.validateMentorRelationship(mentorA, student2);
      }).toThrow(ForbiddenException);
    });

    it('blocks Mentor from inspecting unassigned student record details', () => {
      expect(() => {
        internshipRepository.getStudentById('23CSEBS002', mentorA);
      }).toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // TEST 4: STUDENT ACCESSING PERSONAL RECORDS
  // ============================================================================
  describe('4. Student Accessing Personal Records', () => {
    it('allows Student A to query their own personal profile and logs', () => {
      expect(() => {
        AuthorizationPolicy.validateStudentResourceAccess(studentA, '23CSEBS001', mockStudentsDataset[0]);
      }).not.toThrow();

      const personal = internshipRepository.getStudentsForStudent('23CSEBS001', studentA);
      expect(personal.length).toBe(1);
      expect(personal[0].studentId).toBe('23CSEBS001');
    });

    it('allows Student A to submit daily work log for their own record', async () => {
      const updated = await internshipRepository.submitStudentDailyLog(
        '23CSEBS001',
        {
          work: 'Completed unit test suite for RBAC.',
          hours: 6,
          status: 'onTrack',
        },
        studentA
      );

      expect(updated.studentId).toBe('23CSEBS001');
      expect(updated.work).toBe('Completed unit test suite for RBAC.');
    });

    it('validates Student route access for web routing', () => {
      expect(AuthorizationPolicy.canAccessRoute(studentA, '/student/dashboard').allowed).toBe(true);
      expect(AuthorizationPolicy.canAccessRoute(studentA, '/setup-internship').allowed).toBe(true);
    });
  });

  // ============================================================================
  // TEST 5: STUDENT ATTEMPTING TO ACCESS ANOTHER STUDENT\'S RECORDS
  // ============================================================================
  describe('5. Student Attempting to Access Another Student\'s Records', () => {
    it('blocks Student A from querying Student B records (Horizontal Privilege Escalation)', () => {
      expect(() => {
        internshipRepository.getStudentById('23CSEBS002', studentA);
      }).toThrow(ForbiddenException);

      expect(() => {
        internshipRepository.getStudentsForStudent('23CSEBS002', studentA);
      }).toThrow(ForbiddenException);
    });

    it('blocks Student A from submitting daily log on behalf of Student B', async () => {
      await expect(
        internshipRepository.submitStudentDailyLog(
          '23CSEBS002', // Student B ID
          {
            work: 'Malicious falsified log.',
            hours: 8,
            status: 'completed',
          },
          studentA // Caller is Student A
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks Student from querying mentor student list', () => {
      expect(() => {
        internshipRepository.getStudentsForMentor('MENTOR_CSEBS_01', studentA);
      }).toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // TEST 6: UNAUTHORIZED ROLE ESCALATION
  // ============================================================================
  describe('6. Unauthorized Role Escalation', () => {
    it('blocks Student from accessing HOD department directory', () => {
      expect(() => {
        internshipRepository.getStudentsForHod('CSEBS', studentA);
      }).toThrow(ForbiddenException);
    });

    it('blocks Mentor from accessing HOD institutional admin directory', () => {
      expect(() => {
        internshipRepository.getAllStudentsForAdmin(mentorA);
      }).toThrow(ForbiddenException);
    });

    it('blocks Student from reassigning faculty mentors', async () => {
      await expect(
        internshipRepository.updateStudentMentor('23CSEBS001', 'MENTOR_CSEBS_02', 'Prof. Balaji S', studentA)
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks Student from navigating to HOD or Admin routes in web routing guard', () => {
      const hodCheck = AuthorizationPolicy.canAccessRoute(studentA, '/hod/dashboard');
      expect(hodCheck.allowed).toBe(false);
      expect(hodCheck.reason).toBe('RoleMismatch');

      const adminCheck = AuthorizationPolicy.canAccessRoute(studentA, '/admin/dashboard');
      expect(adminCheck.allowed).toBe(false);
      expect(adminCheck.reason).toBe('RoleMismatch');
    });

    it('blocks Mentor from navigating to HOD or Admin routes in web routing guard', () => {
      const hodCheck = AuthorizationPolicy.canAccessRoute(mentorA, '/hod/dashboard');
      expect(hodCheck.allowed).toBe(false);

      const adminCheck = AuthorizationPolicy.canAccessRoute(mentorA, '/admin/dashboard');
      expect(adminCheck.allowed).toBe(false);
    });
  });

  // ============================================================================
  // TEST 7: EXPIRED AUTHENTICATION SESSIONS
  // ============================================================================
  describe('7. Expired Authentication Sessions', () => {
    it('throws UnauthorizedException when caller is null (session expired/missing)', () => {
      expect(() => {
        AuthorizationPolicy.validateIdentity(null);
      }).toThrow(UnauthorizedException);
    });

    it('rejects repository access when session has expired', () => {
      expect(() => {
        internshipRepository.getStudentsForMentor('MENTOR_CSEBS_01', null as any);
      }).toThrow(UnauthorizedException);

      expect(() => {
        internshipRepository.getStudentsForHod('CSEBS', null as any);
      }).toThrow(UnauthorizedException);
    });

    it('rejects web route access when session has expired', () => {
      const check = AuthorizationPolicy.canAccessRoute(null, '/student/dashboard');
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('Unauthenticated');
    });

    it('rejects access when user account is marked deactivated (isActive = false)', () => {
      const deactivatedStudent: AuthUser = {
        ...studentA,
        isActive: false,
      };

      expect(() => {
        AuthorizationPolicy.validateIdentity(deactivatedStudent);
      }).toThrow(ForbiddenException);

      const routeCheck = AuthorizationPolicy.canAccessRoute(deactivatedStudent, '/student/dashboard');
      expect(routeCheck.allowed).toBe(false);
      expect(routeCheck.reason).toBe('AccountDeactivated');
    });
  });
});

