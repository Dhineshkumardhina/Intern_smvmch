import { describe, it, expect, beforeEach } from 'vitest';
import { internshipRepository } from '../../repository/internshipRepository';
import { AuthUser } from '../authUser';
import { StudentRecord, AttendanceSessionRecord } from '../../../data/initialData';
import { CsvImportValidator } from '../../utils/csvImportValidator';
import { ForbiddenException } from '../rbac/authorizationPolicy';

describe('Phase 4: Mentor Student Management & Authorization Tests', () => {
  // Test Personas
  const csebsMentor: AuthUser = {
    id: 'user-mentor-csebs',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@college.edu',
    role: 'mentor',
    mentorId: 'MENTOR_CSEBS_01',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const itMentor: AuthUser = {
    id: 'user-mentor-it',
    name: 'Dr. S. Kavitha',
    email: 'kavitha.mentor@college.edu',
    role: 'mentor',
    mentorId: 'MENTOR_IT_01',
    dept: 'IT Department',
    departmentCode: 'IT',
    college: 'SMVEC',
    isActive: true,
  };

  const studentUser: AuthUser = {
    id: 'user-student-csebs',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@college.edu',
    role: 'student',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const testInitialStudents: StudentRecord[] = [
    {
      id: 'st-csebs-001',
      studentId: '23CSEBS001',
      studentName: 'Harish V',
      email: '23csebs001@college.edu',
      phone: '+91 98401 23456',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'Tata Consultancy Services',
      mentorId: 'MENTOR_CSEBS_01',
      mentor: 'Prof. Anitha Kumar',
      role: 'Software Engineer Intern',
      status: 'onTrack',
      accountStatus: 'active',
      progress: 60,
      hours: 100,
      work: 'Authentication modules developed.',
    },
    {
      id: 'st-csebs-002',
      studentId: '23CSEBS002',
      studentName: 'Priya Dharshini',
      email: '23csebs002@college.edu',
      phone: '+91 98402 34567',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'Zoho Corporation',
      mentorId: 'MENTOR_CSEBS_01',
      mentor: 'Prof. Anitha Kumar',
      role: 'Product Development Intern',
      status: 'inProgress',
      accountStatus: 'active',
      progress: 45,
      hours: 80,
      work: 'Schema design completed.',
    },
    {
      id: 'st-it-001',
      studentId: '23IT001',
      studentName: 'Dinesh Karthik',
      email: '23it001@college.edu',
      phone: '+91 98403 45678',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'IT',
      dept: 'IT',
      company: 'Zoho Corporation',
      mentorId: 'MENTOR_IT_01',
      mentor: 'Dr. S. Kavitha',
      role: 'Frontend Intern',
      status: 'onTrack',
      accountStatus: 'active',
      progress: 70,
      hours: 120,
      work: 'UI component library completed.',
    },
    {
      id: 'st-ece-001',
      studentId: '23ECE001',
      studentName: 'Aravind S',
      email: '23ece001@college.edu',
      phone: '+91 98404 56789',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'ECE',
      dept: 'ECE',
      company: 'Lenovo India',
      mentorId: 'MENTOR_ECE_01',
      mentor: 'Dr. R. Senthamilselvan',
      role: 'Hardware Intern',
      status: 'onTrack',
      accountStatus: 'active',
      progress: 50,
      hours: 90,
      work: 'Firmware testing.',
    },
  ];

  beforeEach(() => {
    internshipRepository.replaceDataset([...testInitialStudents]);
  });

  // ============================================================================
  // SUITE 1: SCOPED STUDENT LISTING & AUTHORIZATION RESTRICTIONS
  // ============================================================================
  describe('1. Scoped Student Listing & Role Boundaries', () => {
    it('allows a mentor to list students within their authorized department', () => {
      const csebsStudents = internshipRepository.getStudentsForMentorScope(
        csebsMentor.mentorId!,
        'CSEBS',
        csebsMentor
      );
      expect(csebsStudents.length).toBe(2);
      expect(csebsStudents.every(s => s.departmentCode === 'CSEBS')).toBe(true);
    });

    it('prevents a mentor from accessing students of an unauthorized department', () => {
      expect(() => {
        internshipRepository.getStudentsForMentorScope(
          csebsMentor.mentorId!,
          'IT', // Unauthorized department
          csebsMentor
        );
      }).toThrow(ForbiddenException);
    });

    it('rejects student user attempts to query mentor student rosters', () => {
      expect(() => {
        internshipRepository.getStudentsForMentorScope(
          'MENTOR_CSEBS_01',
          'CSEBS',
          studentUser
        );
      }).toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // SUITE 2: STUDENT PROFILE VIEWING & SEARCH
  // ============================================================================
  describe('2. Student Profile Viewing & Search', () => {
    it('retrieves complete student profile by register number within scope', () => {
      const student = internshipRepository.getStudentById('23CSEBS001', csebsMentor);
      expect(student).not.toBeNull();
      expect(student?.studentName).toBe('Harish V');
      expect(student?.phone).toBe('+91 98401 23456');
      expect(student?.accountStatus).toBe('active');
      expect(student?.company).toBe('Tata Consultancy Services');
    });

    it('prevents student user from inspecting another student profile', () => {
      expect(() => {
        internshipRepository.getStudentById('23CSEBS002', studentUser);
      }).toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // SUITE 3: SINGLE STUDENT ONBOARDING & VALIDATION
  // ============================================================================
  describe('3. Single Student Onboarding & Duplicate Detection', () => {
    it('successfully onboards a new student into the authorized department', async () => {
      const newStudent = await internshipRepository.onboardStudent({
        studentId: '23CSEBS010',
        studentName: 'Subash Chandra',
        email: '23csebs010@college.edu',
        phone: '+91 98401 99887',
        departmentCode: 'CSEBS',
        dept: 'CSEBS',
        academicYear: '3rd Year',
        year: '3rd Year',
        company: 'Unassigned',
        role: 'Intern',
        mentorId: csebsMentor.mentorId!,
        mentor: csebsMentor.name,
        status: 'onTrack',
        accountStatus: 'active',
        progress: 0,
        hours: 0,
        work: 'Onboarded.',
      }, csebsMentor);

      expect(newStudent.studentId).toBe('23CSEBS010');
      expect(newStudent.departmentCode).toBe('CSEBS');
      expect(newStudent.accountStatus).toBe('active');

      const retrieved = internshipRepository.getStudentById('23CSEBS010', csebsMentor);
      expect(retrieved).not.toBeNull();
    });

    it('rejects onboarding when register number already exists (duplicate prevention)', async () => {
      await expect(internshipRepository.onboardStudent({
        studentId: '23CSEBS001', // Already exists
        studentName: 'Duplicate Student',
        email: 'newemail@college.edu',
        phone: '+91 98401 11223',
        departmentCode: 'CSEBS',
        dept: 'CSEBS',
        academicYear: '3rd Year',
        year: '3rd Year',
        company: 'Unassigned',
        role: 'Intern',
        mentorId: csebsMentor.mentorId!,
        mentor: csebsMentor.name,
        status: 'onTrack',
        progress: 0,
        hours: 0,
        work: 'Test',
      }, csebsMentor)).rejects.toThrow(/Duplicate Register Number/i);
    });

    it('rejects onboarding when email address already exists (duplicate prevention)', async () => {
      await expect(internshipRepository.onboardStudent({
        studentId: '23CSEBS099',
        studentName: 'Duplicate Email Student',
        email: '23csebs001@college.edu', // Already registered
        phone: '+91 98401 11223',
        departmentCode: 'CSEBS',
        dept: 'CSEBS',
        academicYear: '3rd Year',
        year: '3rd Year',
        company: 'Unassigned',
        role: 'Intern',
        mentorId: csebsMentor.mentorId!,
        mentor: csebsMentor.name,
        status: 'onTrack',
        progress: 0,
        hours: 0,
        work: 'Test',
      }, csebsMentor)).rejects.toThrow(/Duplicate Email/i);
    });

    it('prevents mentor from onboarding a student outside their authorized department', async () => {
      await expect(internshipRepository.onboardStudent({
        studentId: '23MECH001',
        studentName: 'Mechanical Student',
        email: 'mech001@college.edu',
        phone: '+91 98401 11223',
        departmentCode: 'MECH', // Unauthorized department for CSEBS mentor
        dept: 'MECH',
        academicYear: '3rd Year',
        year: '3rd Year',
        company: 'Unassigned',
        role: 'Intern',
        mentorId: csebsMentor.mentorId!,
        mentor: csebsMentor.name,
        status: 'onTrack',
        progress: 0,
        hours: 0,
        work: 'Test',
      }, csebsMentor)).rejects.toThrow(ForbiddenException);
    });

    it('rejects student user attempts to onboard a student', async () => {
      await expect(internshipRepository.onboardStudent({
        studentId: '23CSEBS088',
        studentName: 'Student Peer',
        email: 'peer@college.edu',
        phone: '+91 98401 11223',
        departmentCode: 'CSEBS',
        dept: 'CSEBS',
        academicYear: '3rd Year',
        year: '3rd Year',
        company: 'Unassigned',
        role: 'Intern',
        mentorId: 'MENTOR_001',
        mentor: 'Faculty',
        status: 'onTrack',
        progress: 0,
        hours: 0,
        work: 'Test',
      }, studentUser)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // SUITE 4: BULK CSV IMPORT VALIDATION ENGINE
  // ============================================================================
  describe('4. Bulk CSV Import Validation Engine', () => {
    it('validates headers and parses valid CSV data', () => {
      const csv = [
        'Register Number,Student Name,Email,Phone,Department,Academic Year,Host Company,Role',
        '23CSEBS005,Ravi Kumar,23csebs005@college.edu,+91 98401 55667,CSEBS,3rd Year,TCS,Software Intern',
        '23CSEBS006,Geetha M,23csebs006@college.edu,+91 98401 66778,CSEBS,3rd Year,Zoho,Cloud Intern',
      ].join('\n');

      const result = CsvImportValidator.validate(csv, 'CSEBS', testInitialStudents);
      expect(result.isValid).toBe(true);
      expect(result.validRows.length).toBe(2);
      expect(result.invalidRows.length).toBe(0);
      expect(result.validRows[0].studentId).toBe('23CSEBS005');
      expect(result.validRows[1].studentName).toBe('Geetha M');
    });

    it('rejects CSV when required columns are missing', () => {
      const badCsv = [
        'Student Name,Email,Department', // Missing Register Number, Phone, Academic Year
        'Ravi Kumar,ravi@college.edu,CSEBS',
      ].join('\n');

      const result = CsvImportValidator.validate(badCsv, 'CSEBS', testInitialStudents);
      expect(result.isValid).toBe(false);
      expect(result.headerErrors.length).toBeGreaterThan(0);
      expect(result.headerErrors[0]).toContain('Missing required CSV column(s)');
    });

    it('detects in-file duplicate register numbers and flags exact row numbers', () => {
      const csv = [
        'Register Number,Student Name,Email,Phone,Department,Academic Year',
        '23CSEBS015,First Student,first@college.edu,+91 98401 11111,CSEBS,3rd Year',
        '23CSEBS015,Duplicate Student,second@college.edu,+91 98401 22222,CSEBS,3rd Year', // Duplicate Reg No
      ].join('\n');

      const result = CsvImportValidator.validate(csv, 'CSEBS', testInitialStudents);
      expect(result.isValid).toBe(false);
      expect(result.duplicateRegNosCount).toBe(1);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].rowNumber).toBe(3);
      expect(result.invalidRows[0].errors[0]).toContain("Duplicate Register Number in CSV: '23CSEBS015' was already declared in Row 2");
    });

    it('detects in-file duplicate emails and flags exact row numbers', () => {
      const csv = [
        'Register Number,Student Name,Email,Phone,Department,Academic Year',
        '23CSEBS021,Alpha Student,shared@college.edu,+91 98401 11111,CSEBS,3rd Year',
        '23CSEBS022,Beta Student,shared@college.edu,+91 98401 22222,CSEBS,3rd Year', // Duplicate email
      ].join('\n');

      const result = CsvImportValidator.validate(csv, 'CSEBS', testInitialStudents);
      expect(result.isValid).toBe(false);
      expect(result.duplicateEmailsCount).toBe(1);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].rowNumber).toBe(3);
      expect(result.invalidRows[0].errors[0]).toContain("Duplicate Email in CSV: 'shared@college.edu' was already declared in Row 2");
    });

    it('detects database duplicate register numbers and database duplicate emails', () => {
      const csv = [
        'Register Number,Student Name,Email,Phone,Department,Academic Year',
        '23CSEBS001,Colliding RegNo,unique1@college.edu,+91 98401 11111,CSEBS,3rd Year', // Exists in DB
        '23CSEBS030,Colliding Email,23csebs002@college.edu,+91 98401 22222,CSEBS,3rd Year', // Exists in DB
      ].join('\n');

      const result = CsvImportValidator.validate(csv, 'CSEBS', testInitialStudents);
      expect(result.isValid).toBe(false);
      expect(result.invalidRows.length).toBe(2);
      expect(result.invalidRows[0].errors[0]).toContain("already exists in database");
      expect(result.invalidRows[1].errors[0]).toContain("already registered in database");
    });

    it('detects unauthorized department rows and prevents cross-department bulk import', () => {
      const csv = [
        'Register Number,Student Name,Email,Phone,Department,Academic Year',
        '23MECH005,Mechanical Intern,mech05@college.edu,+91 98401 11111,MECH,3rd Year', // Outside CSEBS scope
      ].join('\n');

      const result = CsvImportValidator.validate(csv, 'CSEBS', testInitialStudents);
      expect(result.isValid).toBe(false);
      expect(result.invalidRows.length).toBe(1);
      expect(result.invalidRows[0].errors[0]).toContain("Unauthorized Department: Student belongs to 'MECH', but your authorized scope is restricted to 'CSEBS'");
    });

    it('never silently discards import errors and reports detailed error summary', () => {
      const mixedCsv = [
        'Register Number,Student Name,Email,Phone,Department,Academic Year',
        '23CSEBS041,Valid Student,valid41@college.edu,+91 98401 11111,CSEBS,3rd Year',
        '23CSEBS042,,bademail,+91 123,CSEBS,3rd Year', // Missing name, invalid email, invalid phone
      ].join('\n');

      const result = CsvImportValidator.validate(mixedCsv, 'CSEBS', testInitialStudents);
      expect(result.totalRows).toBe(2);
      expect(result.validRows.length).toBe(1);
      expect(result.invalidRows.length).toBe(1);
      expect(result.errorsSummary.length).toBeGreaterThan(0);
      expect(result.invalidRows[0].errors).toContain('Student Name is required.');
      expect(result.invalidRows[0].errors).toContain("Invalid email format: 'bademail'.");
    });

    it('commits verified CSV rows to repository via bulkImportStudents', async () => {
      const validRows = [
        {
          studentId: '23CSEBS051',
          studentName: 'Kishore Kumar',
          email: '23csebs051@college.edu',
          phone: '+91 98401 55555',
          departmentCode: 'CSEBS',
          dept: 'CSEBS',
          academicYear: '3rd Year',
          year: '3rd Year',
          company: 'Cognizant',
          role: 'Intern',
          mentorId: csebsMentor.mentorId!,
          mentor: csebsMentor.name,
          status: 'onTrack' as const,
          accountStatus: 'active' as const,
          progress: 0,
          hours: 0,
          work: 'Imported',
        },
      ];

      const res = await internshipRepository.bulkImportStudents(validRows, csebsMentor);
      expect(res.count).toBe(1);
      expect(res.imported[0].studentId).toBe('23CSEBS051');

      const fetched = internshipRepository.getStudentById('23CSEBS051', csebsMentor);
      expect(fetched).not.toBeNull();
      expect(fetched?.studentName).toBe('Kishore Kumar');
    });
  });

  // ============================================================================
  // SUITE 5: STUDENT ACTIVATION AND DEACTIVATION WHERE AUTHORIZED
  // ============================================================================
  describe('5. Student Activation and Deactivation Governance', () => {
    it('allows authorized mentor to deactivate a student within department scope', async () => {
      const updated = await internshipRepository.setStudentAccountStatus(
        '23CSEBS001',
        'inactive',
        csebsMentor
      );
      expect(updated.accountStatus).toBe('inactive');
      expect(updated.status).toBe('inactive');

      const retrieved = internshipRepository.getStudentById('23CSEBS001', csebsMentor);
      expect(retrieved?.accountStatus).toBe('inactive');
    });

    it('allows authorized mentor to reactivate a deactivated student', async () => {
      await internshipRepository.setStudentAccountStatus('23CSEBS001', 'inactive', csebsMentor);
      const reactivated = await internshipRepository.setStudentAccountStatus('23CSEBS001', 'active', csebsMentor);
      expect(reactivated.accountStatus).toBe('active');
    });

    it('prevents a mentor from activating or deactivating a student in another department', async () => {
      await expect(
        internshipRepository.setStudentAccountStatus('23IT001', 'inactive', csebsMentor)
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents a student from activating or deactivating any student account', async () => {
      await expect(
        internshipRepository.setStudentAccountStatus('23CSEBS001', 'inactive', studentUser)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // SUITE 6: INTERNSHIP ASSIGNMENT
  // ============================================================================
  describe('6. Internship Assignment Governance', () => {
    it('successfully assigns an approved internship location and dates to a student', async () => {
      const assigned = await internshipRepository.assignInternship({
        studentId: '23CSEBS001',
        company: 'Zoho Corporation',
        role: 'Full Stack Intern',
        locationId: 'c0000000-0000-0000-0000-000000000002',
        startDate: '2026-01-10',
        endDate: '2026-06-30',
        mentorId: csebsMentor.mentorId,
        mentorName: csebsMentor.name,
        dailyHours: 8.0,
      }, csebsMentor);

      expect(assigned.company).toBe('Zoho Corporation');
      expect(assigned.role).toBe('Full Stack Intern');
      expect(assigned.internshipLocationId).toBe('c0000000-0000-0000-0000-000000000002');
      expect(assigned.internshipStartDate).toBe('2026-01-10');
      expect(assigned.internshipEndDate).toBe('2026-06-30');
    });

    it('rejects internship assignment when end date precedes start date', async () => {
      await expect(internshipRepository.assignInternship({
        studentId: '23CSEBS001',
        company: 'Zoho Corporation',
        role: 'Intern',
        startDate: '2026-06-30',
        endDate: '2026-01-01', // Invalid: end date is before start date
      }, csebsMentor)).rejects.toThrow(/Invalid assignment date range/i);
    });

    it('prevents mentor from assigning internship to a student outside authorized scope', async () => {
      await expect(internshipRepository.assignInternship({
        studentId: '23IT001', // IT student
        company: 'Zoho Corporation',
        role: 'Intern',
        startDate: '2026-01-05',
        endDate: '2026-06-30',
      }, csebsMentor)).rejects.toThrow(ForbiddenException);
    });

    it('prevents student from assigning internships', async () => {
      await expect(internshipRepository.assignInternship({
        studentId: '23CSEBS001',
        company: 'Zoho Corporation',
        role: 'Self-Assigned Intern',
        startDate: '2026-01-05',
        endDate: '2026-06-30',
      }, studentUser)).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // SUITE 7: ATTENDANCE OVERVIEW & VERIFICATION TAMPER-RESISTANCE
  // ============================================================================
  describe('7. Attendance Overview & Verification Governance', () => {
    it('retrieves attendance sessions scoped to the authorized department', () => {
      const sessions = internshipRepository.getAttendanceSessionsForScope(
        csebsMentor.mentorId!,
        'CSEBS',
        csebsMentor
      );
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.every(s => s.departmentCode === 'CSEBS')).toBe(true);
    });

    it('allows authorized mentor to verify a pending attendance session', async () => {
      const sessions = internshipRepository.getAttendanceSessionsForScope(
        csebsMentor.mentorId!,
        'CSEBS',
        csebsMentor
      );
      const targetSession = sessions[0];

      await internshipRepository.verifyAttendanceSession(
        targetSession.id,
        true,
        'Approved by Mentor',
        csebsMentor
      );

      const refreshed = internshipRepository.getAttendanceSessionsForScope(
        csebsMentor.mentorId!,
        'CSEBS',
        csebsMentor
      );
      const updatedSess = refreshed.find(s => s.id === targetSession.id);
      expect(updatedSess?.isVerified).toBe(true);
      expect(updatedSess?.notes).toContain('Approved by Mentor');
    });

    it('strictly prevents students from modifying verification outcomes (anti-tamper)', async () => {
      const sessions = internshipRepository.getAttendanceSessionsForScope(
        csebsMentor.mentorId!,
        'CSEBS',
        csebsMentor
      );
      const targetSession = sessions[0];

      await expect(
        internshipRepository.verifyAttendanceSession(
          targetSession.id,
          true,
          'Student self verification attempt',
          studentUser
        )
      ).rejects.toThrow(/Security Violation: Students cannot modify verification outcomes/i);
    });
  });
});

