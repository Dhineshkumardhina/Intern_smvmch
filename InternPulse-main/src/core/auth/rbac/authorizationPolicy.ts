import { AuthUser, UserRole } from '../authUser';
import { StudentRecord } from '../../../data/initialData';

// ==============================================================================
// Domain Exceptions for Access Control
// ==============================================================================

export class UnauthorizedException extends Error {
  public readonly statusCode = 401;
  constructor(message = 'Authentication required. Your session is invalid or expired.') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends Error {
  public readonly statusCode = 403;
  constructor(message = 'Access denied. You do not have permission to access this resource.') {
    super(message);
    this.name = 'ForbiddenException';
  }
}

// ==============================================================================
// Server-Side / Backend RBAC Authorization Engine
// ==============================================================================

export class AuthorizationPolicy {
  /**
   * 1. Validate User Identity:
   * Verifies that the caller is authenticated and active.
   */
  public static validateIdentity(caller: AuthUser | null): AuthUser {
    if (!caller) {
      throw new UnauthorizedException('Authentication required. Session is invalid or has expired.');
    }
    if (caller.isActive === false) {
      throw new ForbiddenException('Account is deactivated. Access is denied.');
    }
    return caller;
  }

  /**
   * 2. Validate Assigned Role:
   * Verifies that the caller's authoritative role is in the allowed set.
   */
  public static validateRole(caller: AuthUser, allowedRoles: UserRole[]): void {
    this.validateIdentity(caller);
    if (!allowedRoles.includes(caller.role)) {
      throw new ForbiddenException(
        `Access denied. Role '${caller.role}' is not authorized. Required: [${allowedRoles.join(', ')}]`
      );
    }
  }

  /**
   * 3. Validate Resource Ownership (Student Scope):
   * Ensures a student can ONLY access their own records.
   * HOD can inspect any student. Mentor can inspect if assigned.
   */
  public static validateStudentResourceAccess(
    caller: AuthUser, 
    targetStudentId: string, 
    studentRecord?: StudentRecord | null
  ): void {
    this.validateIdentity(caller);

    // HOD has institutional oversight
    if (caller.role === 'hod' || caller.role === 'admin') {
      return;
    }

    // Mentor can access if assigned
    if (caller.role === 'mentor') {
      const assignedMentorId = caller.mentorId || caller.id;
      if (studentRecord && studentRecord.mentorId) {
        if (studentRecord.mentorId.toLowerCase() === assignedMentorId.toLowerCase() ||
            studentRecord.mentor.toLowerCase() === caller.name.toLowerCase()) {
          return;
        }
      }
      throw new ForbiddenException(
        `Access denied. Faculty Mentor '${caller.name}' is not assigned to student '${targetStudentId}'.`
      );
    }

    // Student can ONLY access their own records
    if (caller.role === 'student') {
      const ownId = (caller.studentId || caller.id).trim().toLowerCase();
      const queryId = targetStudentId.trim().toLowerCase();
      if (ownId === queryId || (caller.email && studentRecord?.email && caller.email.toLowerCase() === studentRecord.email.toLowerCase())) {
        return;
      }
      throw new ForbiddenException(
        `Access denied. Student '${caller.name}' cannot access records belonging to student '${targetStudentId}'.`
      );
    }

    throw new ForbiddenException('Unauthorized access attempt.');
  }

  /**
   * 4. Validate Mentor-to-Student Relationship:
   * Ensures a mentor can ONLY manage or review students assigned to their cohort.
   */
  public static validateMentorRelationship(
    caller: AuthUser, 
    student: StudentRecord
  ): void {
    this.validateIdentity(caller);

    if (caller.role === 'hod' || caller.role === 'admin') {
      return; // Institutional scope
    }

    if (caller.role !== 'mentor') {
      throw new ForbiddenException(`Only mentors can perform this action. Current role: '${caller.role}'.`);
    }

    const mentorIdentifier = (caller.mentorId || caller.id).trim().toLowerCase();
    const studentMentorId = (student.mentorId || '').trim().toLowerCase();
    const studentMentorName = (student.mentor || '').trim().toLowerCase();

    if (studentMentorId === mentorIdentifier || studentMentorName === caller.name.trim().toLowerCase()) {
      return;
    }

    throw new ForbiddenException(
      `Access denied. Mentor '${caller.name}' does not supervise student '${student.studentName}' (${student.studentId}).`
    );
  }

  /**
   * 5. Validate HOD Institutional Scope:
   * Ensures only HODs can approve geofence locations, reassign mentors, or view institutional audit configs.
   */
  public static validateHodScope(caller: AuthUser, departmentCode?: string): void {
    this.validateIdentity(caller);

    if (caller.role !== 'hod' && caller.role !== 'admin') {
      throw new ForbiddenException(
        `Access denied. Institutional governance requires 'hod' role. Current role: '${caller.role}'.`
      );
    }

    // If department-scoped check is requested
    if (departmentCode) {
      const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
      const targetDept = departmentCode.trim().toUpperCase();
      // Allow if caller dept matches or HOD is super-admin
      if (callerDept && callerDept !== targetDept && caller.role !== 'admin') {
        throw new ForbiddenException(
          `Access denied. HOD of '${callerDept}' cannot manage department '${targetDept}'.`
        );
      }
    }
  }

  /**
   * 6. Check Route Access for Web Navigation Guard:
   */
  public static canAccessRoute(caller: AuthUser | null, route: string): { allowed: boolean; reason?: string } {
    if (!caller) {
      return { allowed: false, reason: 'Unauthenticated' };
    }

    if (!caller.isActive) {
      return { allowed: false, reason: 'AccountDeactivated' };
    }

    if (route === '/login' || route === '/register') {
      return { allowed: true };
    }

    if (route === '/setup-internship') {
      return { 
        allowed: caller.role === 'student', 
        reason: caller.role !== 'student' ? 'RoleMismatch' : undefined 
      };
    }

    if (route.startsWith('/student/')) {
      return { 
        allowed: caller.role === 'student' || caller.role === 'hod' || caller.role === 'admin',
        reason: caller.role !== 'student' && caller.role !== 'hod' && caller.role !== 'admin' ? 'RoleMismatch' : undefined
      };
    }

    if (route.startsWith('/mentor/')) {
      return { 
        allowed: caller.role === 'mentor' || caller.role === 'hod' || caller.role === 'admin',
        reason: caller.role !== 'mentor' && caller.role !== 'hod' && caller.role !== 'admin' ? 'RoleMismatch' : undefined
      };
    }

    if (route.startsWith('/hod/') || route.startsWith('/admin/')) {
      return { 
        allowed: caller.role === 'hod' || caller.role === 'admin',
        reason: caller.role !== 'hod' && caller.role !== 'admin' ? 'RoleMismatch' : undefined
      };
    }

    return { allowed: true };
  }

  /**
   * 7. Validate Mentor Scoped Access:
   * Ensures mentors can ONLY view, onboard, activate/deactivate, or manage students
   * within their authorized department or assigned cohort.
   * Prevents cross-department access and unrestricted institution-wide access.
   */
  public static validateMentorScope(
    caller: AuthUser,
    target: StudentRecord | string
  ): void {
    this.validateIdentity(caller);

    // HOD and Admin have institutional / deanery oversight
    if (caller.role === 'hod' || caller.role === 'admin') {
      return;
    }

    if (caller.role !== 'mentor') {
      throw new ForbiddenException(
        `Access denied. Only mentors or authorized personnel can perform this action. Current role: '${caller.role}'.`
      );
    }

    const mentorDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();

    // Case A: Target is a department code string
    if (typeof target === 'string') {
      const targetDept = target.trim().toUpperCase();
      if (targetDept === 'ALL' || targetDept === 'ALL DEPARTMENTS') {
        throw new ForbiddenException(
          `Access denied. Mentors do not have institution-wide unrestricted access across all departments.`
        );
      }
      if (mentorDept && targetDept !== mentorDept) {
        throw new ForbiddenException(
          `Access denied. Faculty Mentor (${mentorDept}) cannot access or manage department '${targetDept}'.`
        );
      }
      return;
    }

    // Case B: Target is a StudentRecord
    const student = target;
    const studentDept = (student.departmentCode || student.dept || '').trim().toUpperCase();
    const callerMentorId = (caller.mentorId || caller.id).trim().toLowerCase();
    const studentMentorId = (student.mentorId || '').trim().toLowerCase();
    const studentMentorName = (student.mentor || '').trim().toLowerCase();

    // Check 1: Directly assigned mentee
    const isAssigned = (studentMentorId && studentMentorId === callerMentorId) || 
                       (studentMentorName && studentMentorName === caller.name.trim().toLowerCase());
    if (isAssigned) {
      return;
    }

    // Check 2: Belongs to mentor's authorized department
    if (mentorDept && studentDept === mentorDept) {
      return;
    }

    throw new ForbiddenException(
      `Access denied. Mentor '${caller.name}' is not authorized to manage student '${student.studentName}' (${student.studentId}) from department '${studentDept}'.`
    );
  }
}

