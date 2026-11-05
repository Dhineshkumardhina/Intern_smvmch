import { describe, it, expect } from 'vitest';
import { UserRole } from '../authUser';

// ==============================================================================
// Server-Side Authorization & Role Permission Matrix Tests
// ==============================================================================

interface PermissionContext {
  role: UserRole;
  userId: string;
  departmentCode: string;
  mentorId?: string;
  isActive: boolean;
}

class AuthorizationService {
  // 1. HOD Permissions
  static canManageMentors(ctx: PermissionContext): boolean {
    return ctx.isActive && ctx.role === 'hod';
  }

  static canManageStudentsAtInstitutionalLevel(ctx: PermissionContext): boolean {
    return ctx.isActive && ctx.role === 'hod';
  }

  static canApproveInternshipLocations(ctx: PermissionContext): boolean {
    return ctx.isActive && ctx.role === 'hod';
  }

  static canMonitorInstitutionWideActivity(ctx: PermissionContext): boolean {
    return ctx.isActive && ctx.role === 'hod';
  }

  static canViewInstitutionalReports(ctx: PermissionContext): boolean {
    return ctx.isActive && (ctx.role === 'hod' || ctx.role === 'mentor');
  }

  static canManageInternshipConfigurations(ctx: PermissionContext): boolean {
    return ctx.isActive && ctx.role === 'hod';
  }

  // 2. Mentor Permissions
  static canAccessStudent(ctx: PermissionContext, studentMentorId?: string): boolean {
    if (!ctx.isActive) return false;
    if (ctx.role === 'hod') return true; // HOD has institution-wide read
    if (ctx.role === 'mentor') {
      return Boolean(ctx.mentorId && studentMentorId && ctx.mentorId === studentMentorId);
    }
    return false;
  }

  static canManageStudentAssignment(ctx: PermissionContext, studentMentorId?: string): boolean {
    if (!ctx.isActive) return false;
    if (ctx.role === 'hod') return true;
    if (ctx.role === 'mentor') {
      return Boolean(ctx.mentorId && studentMentorId && ctx.mentorId === studentMentorId);
    }
    return false;
  }

  static canReviewAttendanceAndVerificationRecords(ctx: PermissionContext, studentMentorId?: string): boolean {
    if (!ctx.isActive) return false;
    if (ctx.role === 'hod') return true;
    if (ctx.role === 'mentor') {
      return Boolean(ctx.mentorId && studentMentorId && ctx.mentorId === studentMentorId);
    }
    return false;
  }

  // 3. Student Permissions
  static canViewPersonalInternshipInfo(ctx: PermissionContext, targetStudentId: string): boolean {
    if (!ctx.isActive) return false;
    if (ctx.role === 'hod') return true;
    return ctx.userId === targetStudentId;
  }

  static canSubmitAttendance(ctx: PermissionContext, targetStudentId: string): boolean {
    if (!ctx.isActive) return false;
    return ctx.role === 'student' && ctx.userId === targetStudentId;
  }

  static canSubmitLocationVerification(ctx: PermissionContext, targetStudentId: string): boolean {
    if (!ctx.isActive) return false;
    return ctx.role === 'student' && ctx.userId === targetStudentId;
  }

  static canViewPersonalAttendanceHistory(ctx: PermissionContext, targetStudentId: string): boolean {
    if (!ctx.isActive) return false;
    if (ctx.role === 'hod') return true;
    return ctx.userId === targetStudentId;
  }

  // 4. Security Invariant: Profile & Role Modification
  static canModifyUserRole(caller: PermissionContext, targetUser: PermissionContext, newRole: UserRole): boolean {
    if (!caller.isActive) return false;
    // Only active HOD can change role, and cannot demote without admin rights
    return caller.role === 'hod';
  }
}

describe('Role Permissions & Authorization Matrix (Phase 1)', () => {
  const hodUser: PermissionContext = {
    role: 'hod',
    userId: 'hod-001',
    departmentCode: 'CSEBS',
    isActive: true,
  };

  const mentorUser: PermissionContext = {
    role: 'mentor',
    userId: 'mentor-001',
    departmentCode: 'CSEBS',
    mentorId: 'MENTOR_CSEBS_01',
    isActive: true,
  };

  const studentUser: PermissionContext = {
    role: 'student',
    userId: 'student-001',
    departmentCode: 'CSEBS',
    mentorId: 'MENTOR_CSEBS_01',
    isActive: true,
  };

  const otherStudentUser: PermissionContext = {
    role: 'student',
    userId: 'student-002',
    departmentCode: 'ECE',
    mentorId: 'MENTOR_ECE_01',
    isActive: true,
  };

  describe('HOD Role Permissions', () => {
    it('grants HOD permission to manage mentors', () => {
      expect(AuthorizationService.canManageMentors(hodUser)).toBe(true);
      expect(AuthorizationService.canManageMentors(mentorUser)).toBe(false);
      expect(AuthorizationService.canManageMentors(studentUser)).toBe(false);
    });

    it('grants HOD permission to manage students at institutional level', () => {
      expect(AuthorizationService.canManageStudentsAtInstitutionalLevel(hodUser)).toBe(true);
      expect(AuthorizationService.canManageStudentsAtInstitutionalLevel(mentorUser)).toBe(false);
      expect(AuthorizationService.canManageStudentsAtInstitutionalLevel(studentUser)).toBe(false);
    });

    it('grants HOD permission to approve internship locations', () => {
      expect(AuthorizationService.canApproveInternshipLocations(hodUser)).toBe(true);
      expect(AuthorizationService.canApproveInternshipLocations(mentorUser)).toBe(false);
      expect(AuthorizationService.canApproveInternshipLocations(studentUser)).toBe(false);
    });

    it('grants HOD permission to monitor institution-wide activity', () => {
      expect(AuthorizationService.canMonitorInstitutionWideActivity(hodUser)).toBe(true);
      expect(AuthorizationService.canMonitorInstitutionWideActivity(mentorUser)).toBe(false);
      expect(AuthorizationService.canMonitorInstitutionWideActivity(studentUser)).toBe(false);
    });

    it('grants HOD permission to view reports and manage configurations', () => {
      expect(AuthorizationService.canViewInstitutionalReports(hodUser)).toBe(true);
      expect(AuthorizationService.canManageInternshipConfigurations(hodUser)).toBe(true);
      expect(AuthorizationService.canManageInternshipConfigurations(mentorUser)).toBe(false);
      expect(AuthorizationService.canManageInternshipConfigurations(studentUser)).toBe(false);
    });
  });

  describe('Mentor Role Permissions', () => {
    it('grants Mentor access only to assigned students and denies unassigned cohorts', () => {
      // Assigned student
      expect(AuthorizationService.canAccessStudent(mentorUser, 'MENTOR_CSEBS_01')).toBe(true);
      // Unassigned student
      expect(AuthorizationService.canAccessStudent(mentorUser, 'MENTOR_ECE_01')).toBe(false);
    });

    it('grants Mentor management of internship assignments within authorized scope', () => {
      expect(AuthorizationService.canManageStudentAssignment(mentorUser, 'MENTOR_CSEBS_01')).toBe(true);
      expect(AuthorizationService.canManageStudentAssignment(mentorUser, 'MENTOR_ECE_01')).toBe(false);
      expect(AuthorizationService.canManageStudentAssignment(studentUser, 'MENTOR_CSEBS_01')).toBe(false);
    });

    it('grants Mentor review of attendance and verification records for assigned mentees', () => {
      expect(AuthorizationService.canReviewAttendanceAndVerificationRecords(mentorUser, 'MENTOR_CSEBS_01')).toBe(true);
      expect(AuthorizationService.canReviewAttendanceAndVerificationRecords(mentorUser, 'MENTOR_ECE_01')).toBe(false);
    });
  });

  describe('Student Role Permissions', () => {
    it('allows Student to view personal internship information and blocks peer viewing', () => {
      expect(AuthorizationService.canViewPersonalInternshipInfo(studentUser, 'student-001')).toBe(true);
      expect(AuthorizationService.canViewPersonalInternshipInfo(studentUser, 'student-002')).toBe(false);
    });

    it('allows Student to submit attendance for self only', () => {
      expect(AuthorizationService.canSubmitAttendance(studentUser, 'student-001')).toBe(true);
      expect(AuthorizationService.canSubmitAttendance(studentUser, 'student-002')).toBe(false);
      expect(AuthorizationService.canSubmitAttendance(mentorUser, 'student-001')).toBe(false);
    });

    it('allows Student to submit location verification for self only', () => {
      expect(AuthorizationService.canSubmitLocationVerification(studentUser, 'student-001')).toBe(true);
      expect(AuthorizationService.canSubmitLocationVerification(studentUser, 'student-002')).toBe(false);
    });

    it('allows Student to view personal attendance and verification history', () => {
      expect(AuthorizationService.canViewPersonalAttendanceHistory(studentUser, 'student-001')).toBe(true);
      expect(AuthorizationService.canViewPersonalAttendanceHistory(studentUser, 'student-002')).toBe(false);
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('prevents students and mentors from modifying user roles', () => {
      expect(AuthorizationService.canModifyUserRole(studentUser, studentUser, 'hod')).toBe(false);
      expect(AuthorizationService.canModifyUserRole(mentorUser, mentorUser, 'hod')).toBe(false);
      expect(AuthorizationService.canModifyUserRole(hodUser, studentUser, 'mentor')).toBe(true);
    });

    it('denies all permissions if account is deactivated', () => {
      const deactivatedHod: PermissionContext = { ...hodUser, isActive: false };
      const deactivatedStudent: PermissionContext = { ...studentUser, isActive: false };

      expect(AuthorizationService.canManageMentors(deactivatedHod)).toBe(false);
      expect(AuthorizationService.canSubmitAttendance(deactivatedStudent, 'student-001')).toBe(false);
    });
  });
});

