# INTERNPULSE — PHASE 17B IMPLEMENTATION REPORT
## Department-Level Governance & Role-Based Access Control

**Institution:** Sri Manakula Vinayagar Engineering College (SMVEC), Puducherry  
**Project:** InternPulse — Real-Time Internship Verification & Monitoring System  
**Implementation Phase:** Phase 17B (Staging Hardening & RBAC Enforcement)  
**Status:** IMPLEMENTED, TESTED & VALIDATED (100% Passing — 319 / 319 Tests)  
**Production Onboarding Status:** STRICTLY ON HOLD (Pilot CSEBS Isolation Active)  
**Evaluation Date:** November 6, 2026  

---

## 1. EXECUTIVE SUMMARY

Following the comprehensive multi-department architecture audit completed in **Phase 17A** (`docs/phase17/PHASE17A_MULTI_DEPARTMENT_ARCHITECTURE_AUDIT.md`), **Phase 17B** successfully implements institutional department-level governance and role-based access control (RBAC) across the InternPulse platform.

### Key Milestones Achieved:
1. **Preserved Existing Roles & Operational Stability:** The existing institutional roles (`student`, `mentor`, `hod`) remain 100% functional. Two higher-tier administrative roles (`admin`, `super_admin`) have been formalized to handle college-wide governance.
2. **Department Boundary Isolation:** Implemented server-side and database-level boundaries preventing cross-department data leakage across CSEBS, CSE, IT, ECE, EEE, Mechanical, Civil, and other departments.
3. **Audit Gap Remediation:**
   - **GAP-01 Remediation:** All HOD access policies now enforce strict `department_code` match rather than global institutional scope.
   - **GAP-02 Remediation:** Repaired fatal runtime SQL syntax error in `verification_schedules` policy (`schedules_select_scoped` previously attempted invalid `JOIN public.hods`).
   - **GAP-03 Remediation:** Updated `profiles.role` check constraint to support `'admin'` and `'super_admin'` alongside `'hod'`, `'mentor'`, `'student'`.
   - **GAP-04 Remediation:** Added department boundary validation on `internship_assignments` creation and mentor reassignment.
4. **Anti-Tamper Reassignment Controls:** Direct modification of a student's or mentor's department code is blocked by database triggers and backend policies unless executed by an Institution Super Admin.
5. **Deactivated Department Protection:** Operational reads and writes are blocked for deactivated departments while allowing Super Admin security auditing.
6. **Automated Verification:** Engineered a 42-test automated test suite (`departmentGovernanceRbac.test.ts`) covering all 8 required test domains. The full application test suite passed with **319 out of 319 tests passing (100%)**.
7. **Production Guardrail:** All non-CSEBS departments have been initialized with `is_pilot_authorized = false` to guarantee that multi-department onboarding is not prematurely enabled in production.

---

## 2. ROLE & PERMISSION MATRIX

The table below details the five-tier role hierarchy implemented in Phase 17B:

| Capability / Resource | Student | Mentor | Department HOD | Institution Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Personal Daily Work Logs** | Read/Write (Self) | Read (Mentees) | Read (Dept) | Read (College) | Read (College) |
| **Attendance Verification** | Check-in / GPS | Verify (Mentees) | Audit (Dept) | Audit (College) | Audit (College) |
| **Internship Locations** | Read (Assigned) | Read (Dept) | Create/Approve (Dept) | Audit (College) | Manage (All) |
| **Mentor Assignment** | None | None | Assign (Dept Only) | Assign (All) | Assign (All) |
| **Department Roster** | None | Read (Mentees/Dept) | Read (Dept Only) | Read (College) | Read (College) |
| **Department Attendance Summary** | None | None | Generate (Dept Only) | Generate (College) | Generate (College) |
| **Department Lifecycle (Create/Deactivate)** | None | None | None | None | Full Authority |
| **Department Reassignment (Students/Mentors)** | None | None | None | None | Full Authority |
| **Institutional Analytics & Audit Logs** | None | None | None | Read (College) | Full Authority |

---

## 3. DATABASE MIGRATION DETAILS

The SQL migration script has been applied non-destructively to the Supabase database:
- **Migration File:** `supabase/migrations/20261106000012_phase17_multi_department_architecture.sql`
- **Mirror Location:** `InternPulse-main/supabase/migrations/20261106000012_phase17_multi_department_architecture.sql`

### 3.1 Schema Changes
1. **Extended `departments` Table:**
   ```sql
   ALTER TABLE public.departments
     ADD COLUMN IF NOT EXISTS max_student_capacity INTEGER DEFAULT 120,
     ADD COLUMN IF NOT EXISTS is_pilot_authorized BOOLEAN DEFAULT false,
     ADD COLUMN IF NOT EXISTS academic_head_name TEXT,
     ADD COLUMN IF NOT EXISTS contact_email TEXT;
   ```
   *Note: CSEBS is explicitly flagged with `is_pilot_authorized = true`, while IT, CSE, ECE, EEE, MECH, and CIVIL default to `false`.*

2. **Relaxed `profiles.role` Check Constraint:**
   ```sql
   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
   ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
     CHECK (role IN ('student', 'mentor', 'hod', 'admin', 'super_admin'));
   ```

3. **Created `department_admins` Table:**
   Tracks HODs and departmental administrators with department scoping and historical assignment audit:
   ```sql
   CREATE TABLE IF NOT EXISTS public.department_admins (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
     profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('hod', 'deputy_hod', 'department_coordinator')),
     is_primary BOOLEAN DEFAULT true,
     assigned_at TIMESTAMPTZ DEFAULT NOW(),
     assigned_by UUID REFERENCES public.profiles(id),
     is_active BOOLEAN DEFAULT true
   );
   ```

4. **Created `department_memberships` Table:**
   Maps users (faculty mentors, staff) to authorized departments:
   ```sql
   CREATE TABLE IF NOT EXISTS public.department_memberships (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
     department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
     academic_role TEXT NOT NULL DEFAULT 'mentor' CHECK (academic_role IN ('mentor', 'faculty', 'coordinator', 'hod')),
     is_primary BOOLEAN DEFAULT true,
     joined_at TIMESTAMPTZ DEFAULT NOW(),
     is_active BOOLEAN DEFAULT true
   );
   ```

5. **Created `internship_batches` Table:**
   Enables department-specific cohort scheduling (e.g., 2023–2027 CSEBS Batch A):
   ```sql
   CREATE TABLE IF NOT EXISTS public.internship_batches (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
     batch_name TEXT NOT NULL,
     academic_year TEXT NOT NULL,
     semester INTEGER NOT NULL,
     start_date DATE NOT NULL,
     end_date DATE NOT NULL,
     is_active BOOLEAN DEFAULT true
   );
   ```

6. **Created `student_department_enrollments` Table:**
   Maintains historical record of student departmental admissions and prevents unverified transfers:
   ```sql
   CREATE TABLE IF NOT EXISTS public.student_department_enrollments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
     department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
     batch_id UUID REFERENCES public.internship_batches(id) ON DELETE SET NULL,
     register_number TEXT NOT NULL,
     enrolled_at TIMESTAMPTZ DEFAULT NOW(),
     status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated', 'suspended')),
     reassigned_by UUID REFERENCES public.profiles(id)
   );
   ```

### 3.2 Security Helper Functions
All helper functions are marked `STABLE` and execute with `SECURITY DEFINER` with fixed `search_path`:
- `public.get_auth_user_department_id()`: Resolves caller's current department UUID.
- `public.is_super_admin()`: Returns `true` if `auth.uid()` has role `'admin'` or `'super_admin'`.
- `public.is_hod_for_department(dept_code)`: Returns `true` if caller is authorized HOD of that department.
- `public.can_access_department(dept_code)`: Returns `true` for Super Admin or assigned HOD/Mentor.
- `public.is_mentor_authorized_for_student(student_uuid)`: Validates mentor-mentee relationship.

### 3.3 Anti-Tamper Department Reassignment Trigger
```sql
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_department_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.department_code IS DISTINCT FROM NEW.department_code THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Security Violation: Department reassignment from % to % is restricted to Institution Super Admin.',
        OLD.department_code, NEW.department_code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.4 Assignment Boundary Validation Trigger
```sql
CREATE OR REPLACE FUNCTION public.validate_assignment_department_boundary()
RETURNS TRIGGER AS $$
DECLARE
  v_student_dept TEXT;
  v_mentor_dept TEXT;
BEGIN
  SELECT department_code INTO v_student_dept FROM public.profiles WHERE id = NEW.student_id;
  SELECT department_code INTO v_mentor_dept FROM public.profiles WHERE id = NEW.mentor_id;
  
  IF v_student_dept IS DISTINCT FROM v_mentor_dept AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Security Violation: Cross-department mentor assignment forbidden. Student (%s) and Mentor (%s) must belong to the same department.',
      v_student_dept, v_mentor_dept;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.5 RLS Policy Hardening Summary
- **`profiles`:** Students read self; Mentors read mentees; HODs read department only; Super Admins read all.
- **`departments`:** All authenticated users can view active departments; only Super Admins can insert/update/deactivate departments.
- **`students`:** Scoped strictly by `department_code = get_auth_user_department_code()`.
- **`internship_locations`:** HODs can only approve locations assigned to their department.
- **`internship_assignments`:** Boundary trigger blocks cross-department assignments without Super Admin role.
- **`attendance_sessions`:** HODs can view attendance sessions belonging only to their department students.
- **`verification_schedules`:** Fixed previous join bug. Policies now cleanly query `public.profiles` for HOD verification.

---

## 4. CHANGED FILES IN REPOSITORY

| File Path | Nature of Change | Purpose |
| :--- | :--- | :--- |
| `supabase/migrations/20261106000012_phase17_multi_department_architecture.sql` | **NEW** | Primary database migration containing tables, triggers, helper functions, and RLS policies. |
| `InternPulse-main/supabase/migrations/20261106000012_phase17_multi_department_architecture.sql` | **NEW** | Synchronized client-side migration definition. |
| `InternPulse-main/src/core/auth/authUser.ts` | **MODIFIED** | Added `'admin' \| 'super_admin'` to `UserRole`; added `departmentId` and `institutionId` attributes to `AuthUser`. |
| `InternPulse-main/src/lib/supabase.ts` | **MODIFIED** | Updated `ApplicationRole`; added `DbDepartmentAdmin`, `DbDepartmentMembership`, `DbInternshipBatch`, `DbStudentDepartmentEnrollment` interfaces; enhanced `DbDepartment`. |
| `InternPulse-main/src/data/initialData.ts` | **MODIFIED** | Added `DepartmentRecord` interface; added `DEFAULT_DEPARTMENTS` array seeding 10 SMVEC departments (CSEBS, IT, CSE, ECE, EEE, MECH, CIVIL, BME, MECT, ICE). |
| `InternPulse-main/src/core/auth/rbac/authorizationPolicy.ts` | **MODIFIED** | Added `validateSuperAdminScope`, `validateDepartmentActive`, `validateDepartmentReassignment`; hardened `validateStudentResourceAccess`, `validateMentorRelationship`, `validateHodScope`, `canAccessRoute`. |
| `InternPulse-main/src/core/repository/internshipRepository.ts` | **MODIFIED** | Implemented Department Governance methods (`getAllDepartments`, `getDepartmentByCode`, `createDepartment`, `deactivateDepartment`, `reactivateDepartment`, `assignDepartmentHod`, `getInstitutionStatistics`, `getDepartmentAttendanceSummary`); added boundary checks to `saveStudent`, `onboardStudent`, `createInternshipAssignment`, `updateStudentMentor`. |
| `InternPulse-main/src/core/auth/__tests__/departmentGovernanceRbac.test.ts` | **NEW** | 42 comprehensive automated tests verifying all Phase 17B requirements. |

---

## 5. SECURITY CONTROLS & PRIVILEGE ESCALATION SAFEGUARDS

### 5.1 Horizontal Privilege Escalation Prevention
- **HOD Cross-Department Isolation:** If an HOD belonging to `CSEBS` attempts to invoke `getStudentsForHod('IT')`, `getMentorsForHod('IT')`, `getDepartmentAttendanceSummary('IT')`, or `getStudentById('23IT001')`, the policy immediately halts execution and throws `ForbiddenException: Access denied. HOD of 'CSEBS' cannot manage department 'IT'`.
- **Mentor Cross-Department Isolation:** If a mentor of `CSEBS` attempts to query the student roster of `IT` (`getStudentsForMentorScope(..., 'IT')`), the request is rejected with `ForbiddenException`.
- **Student Peer & Cross-Department Isolation:** If Student A (`23CSEBS001`) queries Student B (`23CSEBS002`) or IT Student (`23IT001`), the operation throws `ForbiddenException`.

### 5.2 Vertical Privilege Escalation Prevention
- **Department Creation / Deactivation:** Operations `createDepartment`, `deactivateDepartment`, `reactivateDepartment`, and `assignDepartmentHod` invoke `AuthorizationPolicy.validateSuperAdminScope(caller)`. If invoked by an HOD, Mentor, or Student, a `ForbiddenException: Institution Super Admin authority required` is raised.
- **Route Guard:** `/super-admin/*` routes strictly reject `hod`, `mentor`, and `student` roles in `AuthorizationPolicy.canAccessRoute`.
- **Administrative Statistics:** Only Super Admins can query `getInstitutionStatistics()`.

### 5.3 Anti-Tamper Department Reassignment
- Students, Mentors, and HODs cannot alter a registered student's `departmentCode`.
- When `saveStudent()` is called with a modified `departmentCode`, `validateDepartmentReassignment(caller, currentDept, newDept)` enforces that only `super_admin` or `admin` can proceed.
- Cross-department mentor assignment (assigning an IT mentor to a CSEBS student) is blocked with `ForbiddenException: Cross-department mentor assignment forbidden`.

### 5.4 Deactivated Department Protection
- Deactivated departments (`status = 'inactive'`) automatically trigger `AuthorizationPolicy.validateDepartmentActive()`.
- Operational access (retrieving student lists, onboarding new students, assigning internships) is immediately blocked for all regular departmental users.
- Super Admins retain read-only auditing access over deactivated departments.

---

## 6. AUTOMATED TEST EVIDENCE

The automated test suite was executed using **Vitest v5.1.0**.

### 6.1 Phase 17B Test Suite Breakdown (`departmentGovernanceRbac.test.ts`)
Total Tests: **42** | Passing: **42** | Failing: **0** | Duration: **651ms**

```
✓ Phase 17B: Department-Level Governance & RBAC Test Suite (42)
  ✓ 1. Cross-Department Data Access Isolation (6)
    ✓ allows CSEBS HOD to access CSEBS department student records
    ✓ blocks CSEBS HOD from accessing IT department student records
    ✓ blocks CSEBS HOD from querying IT department mentors
    ✓ blocks CSEBS HOD from querying IT student directly by ID
    ✓ allows IT HOD to access IT department students and blocks CSEBS access
    ✓ blocks cross-department attendance summary generation
  ✓ 2. Unauthorized HOD Administrative Actions (6)
    ✓ blocks HOD from creating a new department (Super Admin privilege)
    ✓ blocks HOD from deactivating a department
    ✓ blocks HOD from reactivating a department
    ✓ blocks HOD from reassigning department HODs
    ✓ blocks HOD from inspecting institution-wide statistics
    ✓ blocks HOD from accessing Super Admin web routes
  ✓ 3. Unauthorized Mentor Access (5)
    ✓ allows Mentor to query assigned students within authorized department
    ✓ blocks Mentor from querying unassigned students of another mentor in same department
    ✓ blocks Mentor from querying student roster of another department
    ✓ blocks Mentor from onboarding student into another department
    ✓ blocks Mentor from navigating to administrative routes
  ✓ 4. Student Record Isolation & Privacy Boundaries (6)
    ✓ allows student to query their own record and daily logs
    ✓ blocks student from accessing a peer student record in the same department
    ✓ blocks student from accessing a student record in another department
    ✓ blocks student from submitting daily logs on behalf of another student
    ✓ blocks student from querying department mentor or student directories
    ✓ blocks student from navigating to non-student web portals
  ✓ 5. Department Reassignment Anti-Tamper Safeguards (5)
    ✓ blocks HOD from reassigning a student to a different department
    ✓ blocks Mentor from reassigning student department
    ✓ blocks Student from changing their own registered department
    ✓ blocks HOD from assigning a mentor from a different department to a student
    ✓ allows Institution Super Admin to perform authorized department reassignment
  ✓ 6. Deactivated Department Access & Lifecycle Control (4)
    ✓ blocks operational queries when a department is marked inactive
    ✓ blocks student onboarding into a deactivated department
    ✓ allows Super Admin to audit inactive departments without exception
    ✓ restores operational access when Super Admin reactivates the department
  ✓ 7. Institution Super Admin Authority & Multi-Department Governance (5)
    ✓ allows Super Admin to view institution-wide metrics across all departments
    ✓ allows Super Admin to create a new institution department with pilot-safety flag
    ✓ prevents creation of duplicate department codes
    ✓ allows Super Admin to assign and update department HOD
    ✓ allows Super Admin to navigate across all route hierarchies
  ✓ 8. Direct Access Attempts & Session Tampering (5)
    ✓ throws UnauthorizedException when caller is unauthenticated (null caller)
    ✓ throws ForbiddenException when caller account is deactivated (isActive = false)
    ✓ rejects web routing navigation when caller is deactivated
    ✓ blocks cross-department internship location assignment attempts
    ✓ rejects assignment when start date succeeds end date
```

### 6.2 Entire Application Test Suite Execution
Total Test Files: **14** | Total Tests: **319** | Passing: **319 (100%)** | Failing: **0** | Duration: **4.60s**

```
Test Files  14 passed (14)
     Tests  319 passed (319)
  Duration  4.60s

✓ src/core/auth/__tests__/productionNotificationSystem.test.ts (18 tests)
✓ src/core/auth/__tests__/hodLocationManagement.test.ts (17 tests)
✓ src/core/auth/__tests__/internshipAssignmentWorkflow.test.ts (15 tests)
✓ src/core/auth/__tests__/geolocationVerificationEngine.test.ts (27 tests)
✓ src/core/auth/__tests__/rlsSecurityPolicies.test.ts (34 tests)
✓ src/core/auth/__tests__/randomVerificationScheduler.test.ts (21 tests)
✓ src/core/auth/__tests__/rbacAuthorization.test.ts (25 tests)
✓ src/core/auth/__tests__/attendanceManagementReporting.test.ts (20 tests)
✓ src/core/auth/__tests__/departmentGovernanceRbac.test.ts (42 tests)
✓ src/core/auth/__tests__/mentorStudentManagement.test.ts (29 tests)
✓ src/core/auth/__tests__/rolePermissions.test.ts (14 tests)
✓ src/core/auth/__tests__/securityPrivacyRemediation.test.ts (24 tests)
✓ src/core/auth/__tests__/productionAuth.test.ts (18 tests)
✓ src/core/auth/__tests__/flutterBackendIntegration.test.ts (15 tests)
```

### 6.3 TypeScript Strict Typecheck
- **Command:** `npx tsc --noEmit`
- **Result:** Exited with code `0`. **0 errors, 0 warnings**.

---

## 7. ROLLBACK PROCEDURES & DISASTER RECOVERY

If any operational regression occurs in staging, the following procedure restores the previous state without data loss:

### 7.1 Database Rollback Script
Run the following SQL in Supabase SQL Editor:
```sql
-- 1. Drop Anti-Tamper & Boundary Triggers
DROP TRIGGER IF EXISTS trg_prevent_unauthorized_dept_reassignment ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_unauthorized_department_reassignment();
DROP TRIGGER IF EXISTS trg_validate_assignment_dept_boundary ON public.internship_assignments;
DROP FUNCTION IF EXISTS public.validate_assignment_department_boundary();

-- 2. Drop Helper Views
DROP VIEW IF EXISTS public.mentor_assignments;
DROP VIEW IF EXISTS public.department_directory;

-- 3. Drop Relational Governance Tables (Phase 17B additions only)
DROP TABLE IF EXISTS public.student_department_enrollments CASCADE;
DROP TABLE IF EXISTS public.internship_batches CASCADE;
DROP TABLE IF EXISTS public.department_memberships CASCADE;
DROP TABLE IF EXISTS public.department_admins CASCADE;

-- 4. Revert profiles.role Check Constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('student', 'mentor', 'hod'));

-- 5. Drop Helper Functions
DROP FUNCTION IF EXISTS public.is_mentor_authorized_for_student(UUID);
DROP FUNCTION IF EXISTS public.can_access_department(TEXT);
DROP FUNCTION IF EXISTS public.is_hod_for_department(TEXT);
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.get_auth_user_department_id();
```

### 7.2 Application Code Rollback
```bash
git checkout HEAD~1 -- InternPulse-main/src/core/auth/authUser.ts
git checkout HEAD~1 -- InternPulse-main/src/lib/supabase.ts
git checkout HEAD~1 -- InternPulse-main/src/data/initialData.ts
git checkout HEAD~1 -- InternPulse-main/src/core/auth/rbac/authorizationPolicy.ts
git checkout HEAD~1 -- InternPulse-main/src/core/repository/internshipRepository.ts
rm InternPulse-main/src/core/auth/__tests__/departmentGovernanceRbac.test.ts
npm test -- --run
```

### 7.3 Data Preservation Guarantee
The migration did not drop or modify any columns or rows in existing production tables (`profiles`, `students`, `mentors`, `hods`, `locations`, `internship_assignments`, `attendance_sessions`). All CSEBS pilot records remain completely intact.

---

## 8. PRODUCTION ONBOARDING STATUS & GATE DECISION

### Gate Evaluation

| Gate Criteria | Requirement | Status | Verification Evidence |
| :--- | :--- | :---: | :--- |
| **G-1: Existing Pilot Preservation** | CSEBS accounts and tests must continue to pass without modification | **MET** | All 277 Phase 1–16 tests pass 100% |
| **G-2: Multi-Department Authorization** | Department-level scoping on all tables and operations | **MET** | Verified via RLS and 42 RBAC tests |
| **G-3: Anti-Tamper Protection** | Department reassignment locked to Super Admin | **MET** | Triggers and repository checks pass |
| **G-4: Deactivated Dept Protection** | Inactive departments blocked from operational writes/reads | **MET** | Verified via lifecycle tests |
| **G-5: Production Pilot Guard** | Additional departments must NOT be enabled in production | **MET** | `is_pilot_authorized = false` enforced |
| **G-6: Zero Compilation Errors** | TypeScript compile clean with 0 errors | **MET** | `npx tsc --noEmit` exited code 0 |

### Final Phase 17B Decision: **GO (STAGING VALIDATED & HARDENED)**

> [!IMPORTANT]
> **Production Onboarding Decision:**
> Multi-department governance is successfully implemented and validated in the application architecture and staging database. **Production onboarding of additional departments (CSE, IT, ECE, EEE, MECH, CIVIL) remains STRICTLY ON HOLD** until institutional authorities grant operational authorization in subsequent rollout phases.

