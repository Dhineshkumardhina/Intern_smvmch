import { AuthUser, UserRole } from '../authUser';
import { StudentRecord, canonicalizeInstitutionId } from '../../../data/initialData';

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
   * Identifies whether the given user is a Platform Super Admin (System Ops)
   */
  public static isPlatformAdmin(caller?: AuthUser | null): boolean {
    if (!caller) return false;
    return (
      caller.role === 'platform_super_admin' ||
      (caller.role === 'super_admin' && (caller.departmentCode === 'SYSTEM_OPS' || caller.dept === 'SYSTEM_OPS'))
    );
  }
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
   * 2b. Validate Institution Scope:
   * Prevents cross-tenant access. Ensures caller can only access resources within their verified institution.
   */
  public static validateInstitutionScope(
    caller: AuthUser,
    targetInstitutionId?: string | null
  ): void {
    this.validateIdentity(caller);
    if (!targetInstitutionId) return;

    // Platform Super Admin (System Ops) has multi-tenant platform oversight
    if (this.isPlatformAdmin(caller)) {
      return;
    }

    const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
    const targetInst = canonicalizeInstitutionId(targetInstitutionId);

    if (callerInst !== targetInst) {
      throw new ForbiddenException(
        `Cross-Tenant Access Denied: Caller belonging to institution '${caller.institutionId || caller.college}' cannot access resource belonging to institution '${targetInstitutionId}'.`
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

    // Validate institution boundary first
    if (studentRecord && studentRecord.institutionId) {
      this.validateInstitutionScope(caller, studentRecord.institutionId);
    }

    // Super Admin has institutional oversight across all departments within their institution
    if (caller.role === 'admin' || caller.role === 'super_admin') {
      return;
    }

    // HOD has departmental oversight strictly within their authorized department
    if (caller.role === 'hod') {
      if (studentRecord) {
        const hodDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        const studentDept = (studentRecord.departmentCode || studentRecord.dept || '').trim().toUpperCase();
        if (hodDept && studentDept && hodDept !== studentDept) {
          throw new ForbiddenException(
            `Access denied. HOD of '${hodDept}' cannot access records belonging to student '${targetStudentId}' in department '${studentDept}'.`
          );
        }
      }
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

    // Validate institution boundary
    if (student && student.institutionId) {
      this.validateInstitutionScope(caller, student.institutionId);
    }

    // Super Admin has college-wide authority
    if (caller.role === 'admin' || caller.role === 'super_admin') {
      return;
    }

    // HOD has departmental authority within their department only
    if (caller.role === 'hod') {
      const hodDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
      const studentDept = (student.departmentCode || student.dept || '').trim().toUpperCase();
      if (hodDept && studentDept && hodDept !== studentDept) {
        throw new ForbiddenException(
          `Access denied. HOD of '${hodDept}' cannot manage mentorship for student '${student.studentName}' from department '${studentDept}'.`
        );
      }
      return;
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
  public static validateHodScope(caller: AuthUser, departmentCode?: string, targetInstitutionId?: string): void {
    this.validateIdentity(caller);

    if (targetInstitutionId) {
      this.validateInstitutionScope(caller, targetInstitutionId);
    }

    if (caller.role !== 'hod' && caller.role !== 'admin' && caller.role !== 'super_admin') {
      throw new ForbiddenException(
        `Access denied. Institutional governance requires 'hod' or 'super_admin' role. Current role: '${caller.role}'.`
      );
    }

    // If department-scoped check is requested
    if (departmentCode) {
      const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
      const targetDept = departmentCode.trim().toUpperCase();
      // Allow if caller dept matches or caller is super-admin / admin
      if (callerDept && callerDept !== targetDept && caller.role !== 'admin' && caller.role !== 'super_admin') {
        throw new ForbiddenException(
          `Access denied. HOD of '${callerDept}' cannot manage department '${targetDept}'.`
        );
      }
    }
  }

  /**
   * 6. Validate Super Admin Scope:
   * Ensures only Super Admins can perform institutional configuration, create/deactivate departments.
   */
  public static validateSuperAdminScope(caller: AuthUser, targetInstitutionId?: string): void {
    this.validateIdentity(caller);
    if (this.isPlatformAdmin(caller)) {
      return;
    }
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      throw new ForbiddenException(
        `Access denied. Institution Super Admin authority required. Current role: '${caller.role}'.`
      );
    }

    if (targetInstitutionId) {
      this.validateInstitutionScope(caller, targetInstitutionId);
    }
  }

  /**
   * 6b. Validate Platform Super Admin Scope:
   * Ensures only Platform-level Administrators can manage registration, provisioning,
   * tenant suspension/reactivation, and platform metrics.
   */
  public static validatePlatformSuperAdminScope(caller: AuthUser): void {
    this.validateIdentity(caller);
    if (!this.isPlatformAdmin(caller)) {
      throw new ForbiddenException(
        `Access denied. Platform Super Admin authority required. Current role: '${caller.role}'.`
      );
    }
  }

  /**
   * 6c. DPDP Anti-Surveillance Location Privacy Guard:
   * Strictly prohibits Platform Super Admins from accessing raw student geolocation coordinates
   * or real-time verification coordinates.
   */
  public static validateLocationPrivacy(caller: AuthUser): void {
    this.validateIdentity(caller);
    if (this.isPlatformAdmin(caller)) {
      throw new ForbiddenException(
        'Access denied. Platform administrators are strictly prohibited from accessing raw student geolocation data under DPDP anti-surveillance policies.'
      );
    }
  }

  /**
   * 6d. Validate Institution Admin Scope:
   * Ensures caller can only configure, manage, and view administrative details for their authorized institution.
   */
  public static validateInstitutionAdminScope(caller: AuthUser, targetInstitutionId?: string | null): void {
    this.validateIdentity(caller);
    if (this.isPlatformAdmin(caller)) {
      return;
    }
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      throw new ForbiddenException(
        `Access denied. Institution Administrator authority required. Current role: '${caller.role}'.`
      );
    }
    if (targetInstitutionId) {
      this.validateInstitutionScope(caller, targetInstitutionId);
    }
  }

  /**
   * 6e. Validate Institution Active Status:
   * Ensures suspended institutions cannot perform standard operations.
   */
  public static validateInstitutionActive(
    institution: { status?: string; name?: string; id?: string },
    caller?: AuthUser
  ): void {
    if (institution && institution.status === 'suspended') {
      if (caller && this.isPlatformAdmin(caller)) {
        return; // Platform super admin can triage suspended tenant
      }
      throw new ForbiddenException(
        `Access denied. Institution '${institution.name || institution.id}' is currently suspended. Operational access is locked.`
      );
    }
  }

  /**
   * 7. Validate Department Active Status:
   * Blocks operations on deactivated departments for regular users; Super Admin can audit.
   */
  public static validateDepartmentActive(department: { status?: string; code?: string }, caller?: AuthUser): void {
    if (department && department.status === 'inactive') {
      if (caller && (caller.role === 'admin' || caller.role === 'super_admin')) {
        return; // Super Admin can audit inactive departments
      }
      throw new ForbiddenException(
        `Access denied. Department '${department.code || 'UNKNOWN'}' is deactivated. Operational access is blocked.`
      );
    }
  }

  /**
   * 8. Validate Department Reassignment:
   * Prevents horizontal department switching by students, mentors, or HODs.
   */
  public static validateDepartmentReassignment(caller: AuthUser, currentDept: string, newDept: string): void {
    this.validateIdentity(caller);
    if (currentDept.trim().toUpperCase() !== newDept.trim().toUpperCase()) {
      if (caller.role !== 'admin' && caller.role !== 'super_admin') {
        throw new ForbiddenException(
          `Security Violation: Department reassignment from '${currentDept}' to '${newDept}' is restricted to Institution Super Admin.`
        );
      }
    }
  }

  /**
   * 9. Check Route Access for Web Navigation Guard:
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
        allowed: caller.role === 'student' || caller.role === 'hod' || caller.role === 'admin' || caller.role === 'super_admin',
        reason: caller.role !== 'student' && caller.role !== 'hod' && caller.role !== 'admin' && caller.role !== 'super_admin' ? 'RoleMismatch' : undefined
      };
    }

    if (route.startsWith('/mentor/')) {
      return { 
        allowed: caller.role === 'mentor' || caller.role === 'hod' || caller.role === 'admin' || caller.role === 'super_admin',
        reason: caller.role !== 'mentor' && caller.role !== 'hod' && caller.role !== 'admin' && caller.role !== 'super_admin' ? 'RoleMismatch' : undefined
      };
    }

    if (route.startsWith('/hod/') || route.startsWith('/admin/')) {
      return { 
        allowed: caller.role === 'hod' || caller.role === 'admin' || caller.role === 'super_admin',
        reason: caller.role !== 'hod' && caller.role !== 'admin' && caller.role !== 'super_admin' ? 'RoleMismatch' : undefined
      };
    }

    if (route.startsWith('/super-admin/')) {
      return { 
        allowed: caller.role === 'admin' || caller.role === 'super_admin',
        reason: caller.role !== 'admin' && caller.role !== 'super_admin' ? 'RoleMismatch' : undefined
      };
    }

    return { allowed: true };
  }

  /**
   * 10. Validate Mentor Scoped Access:
   * Ensures mentors can ONLY view, onboard, activate/deactivate, or manage students
   * within their authorized department or assigned cohort.
   * Prevents cross-department access and unrestricted institution-wide access.
   */
  public static validateMentorScope(
    caller: AuthUser,
    target: StudentRecord | string
  ): void {
    this.validateIdentity(caller);

    // Multi-tenant boundary check: Non-platform callers cannot access student records belonging to another institution
    if (typeof target !== 'string' && target.institutionId && caller.role !== 'platform_super_admin') {
      const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
      const studentInst = canonicalizeInstitutionId(target.institutionId);
      if (callerInst && studentInst && callerInst !== studentInst) {
        throw new ForbiddenException(
          `Tenant Isolation Violation: ${caller.role.toUpperCase()} '${caller.name}' (${caller.institutionId}) cannot access student '${target.studentName}' belonging to another institution (${target.institutionId}).`
        );
      }
    }

    // Super Admin and Admin have college-wide institutional authority
    if (caller.role === 'super_admin' || caller.role === 'admin') {
      return;
    }

    // HOD has departmental authority strictly within their authorized department
    if (caller.role === 'hod') {
      const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
      if (typeof target === 'string') {
        const targetDept = target.trim().toUpperCase();
        if (targetDept === 'ALL' || targetDept === 'ALL DEPARTMENTS') {
          throw new ForbiddenException(
            `Access denied. HOD of '${callerDept}' cannot access institution-wide scope across all departments.`
          );
        }
        if (callerDept && targetDept !== callerDept) {
          throw new ForbiddenException(
            `Access denied. HOD of '${callerDept}' cannot manage department '${targetDept}'.`
          );
        }
      } else {
        const studentDept = (target.departmentCode || target.dept || '').trim().toUpperCase();
        if (callerDept && studentDept && callerDept !== studentDept) {
          throw new ForbiddenException(
            `Access denied. HOD of '${callerDept}' cannot manage student '${target.studentName}' (${target.studentId}) from department '${studentDept}'.`
          );
        }
      }
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

