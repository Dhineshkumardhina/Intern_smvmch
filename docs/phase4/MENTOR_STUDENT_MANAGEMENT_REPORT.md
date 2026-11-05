# InternPulse Phase 4: Mentor Student Management & Dashboard Governance Report

**Target Institution:** Sri Manakula Vinayagar Engineering College (Autonomous) - SMVEC  
**System Version:** InternPulse 4.0.0 (PostGIS / Supabase PostgreSQL / React 19 / Leaflet)  
**Date:** March 2026  
**Document Reference:** `docs/phase4/MENTOR_STUDENT_MANAGEMENT_REPORT.md`  
**Migration Reference:** [`20261105000005_phase4_mentor_student_management.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000005_phase4_mentor_student_management.sql)

---

## 1. Executive Summary

Phase 4 delivers an institutional faculty mentor governance portal for **Sri Manakula Vinayagar Engineering College (Autonomous)**. The implementation strictly enforces the **Mentor Scoped Authorization Boundary**: mentors cannot perform unrestricted institution-wide administrative mutations, but are empowered to manage students within their **authorized department** and their **assigned mentee cohort**.

The upgrade preserves 100% of the existing user interface and mentee review functionality while seamlessly integrating:
1. **Student Listing:** Tabular and card streams with live status indicators and metrics.
2. **Student Search:** Real-time multi-attribute search across Name, Register Number, Email, Phone, Company, and Role.
3. **Department Filtering:** Strictly scoped dropdown locked to authorized department boundaries.
4. **Student Profile Inspection:** Modal detailing personal, academic, internship placement, and daily logs.
5. **Single Student Onboarding:** Form with real-time uniqueness and format validations.
6. **Bulk CSV Import:** Industrial CSV parser with duplicate detection, column validation, and detailed error reporting.
7. **Account Activation/Deactivation:** Authorized state toggles with Supabase database synchronization.
8. **Internship Assignment:** Placement configuration linked to HOD-approved geofence locations.
9. **Internship Progress Monitoring:** Real-time completion %, logged hours, blockers, and faculty review remarks.
10. **Attendance & Verification Overview:** Daily shift logs with geofence compliance verification and anti-tamper guards.

---

## 2. Mentor Authorization & Scoping Model

> [!IMPORTANT]
> **Zero Unrestricted Institution-Wide Access for Mentors:**  
> Mentors are bounded to their assigned department (e.g. `CSEBS`, `IT`, `ECE`) or explicitly assigned mentees. Any attempt to inspect, onboard, activate, or assign internships to students belonging to another department is blocked by backend policies and frontend security guards.

```
       +--------------------------------------------------------------+
       |             Supabase Auth (Authenticated Token)             |
       +--------------------------------------------------------------+
                                      |
                      Role Check: public.get_auth_user_role()
                                      |
            +-------------------------+-------------------------+
            |                                                   |
        HOD / Admin                                      Faculty Mentor
(Institution-Wide Department Scope)                (Strictly Scoped by Department)
            |                                                   |
            |                             +---------------------+---------------------+
            |                             |                                           |
            |                     Assigned Mentees                        Authorized Department Cohort
            |               (Directly Supervised Students)              (e.g., CSEBS Students at SMVEC)
            |                             |                                           |
            +-----------------------------+-------------------------------------------+
                                          |
                              Row Level Security (RLS)
           - public.is_mentor_authorized_for_department(p_department_id)
           - public.is_mentor_authorized_for_student(p_student_id)
```

### Authorization Matrix

| Domain Operation | Student | Mentor (Assigned Mentee) | Mentor (Same Dept Student) | Mentor (Cross-Dept Student) | HOD / Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **List & Search Students** | ❌ Blocked | ✅ Authorized | ✅ Authorized | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **View Profile Details** | Own profile | ✅ Authorized | ✅ Authorized | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **Onboard New Student** | ❌ Blocked | ✅ Authorized | ✅ Authorized | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **Bulk CSV Import** | ❌ Blocked | ✅ Authorized | ✅ Authorized | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **Activate / Deactivate** | ❌ Blocked | ✅ Authorized | ✅ Authorized | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **Assign Internship Site** | ❌ Blocked | ✅ Authorized | ✅ Authorized | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **Verify Attendance** | ❌ Blocked | ✅ Authorized | ✅ Authorized | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **Change User Roles** | ❌ Blocked | ❌ **FORBIDDEN (403)** | ❌ **FORBIDDEN (403)** | ❌ **FORBIDDEN (403)** | ✅ Authorized |
| **Configure Geofences** | ❌ Blocked | ❌ **FORBIDDEN (403)** | ❌ **FORBIDDEN (403)** | ❌ **FORBIDDEN (403)** | ✅ Authorized |

---

## 3. Implementation of the 10 Required Capabilities

### 1. Student Listing
Implemented in [`MentorStudentManagementView.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/MentorStudentManagementView.tsx).
- Displays students in the mentor's authorized department or mentee cohort.
- Features high-level status indicators: *Total in Scope*, *Active Accounts*, *Internship Active*, *Deactivated*, and *At-Risk / Blocked*.
- Table shows Student Intern (Name + Reg No), Contact (Email + Phone), Year & Department, Host Placement, Assigned Guide, Account Status, Progress, and Action shortcuts.

### 2. Student Search
- Instant, client-side debounced search matching substrings across `studentName`, `studentId` (register number), `email`, `phone`, `company`, `role`, and `mentor`.
- Case-insensitive with zero network overhead.

### 3. Department Filtering
- Mentors are bound to their department (e.g. `CSEBS`). The department selector is locked to the mentor's authorized branch, preventing horizontal privilege escalation.
- Reset button clears query filters while preserving departmental boundaries.

### 4. Student Profile Viewing
Implemented in [`StudentProfileModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/StudentProfileModal.tsx).
- Modal presentation with initials avatar, register number, and account status chip.
- Sections:
  - **Quick Metrics:** Status, Progress % completed, Hours logged.
  - **Contact & Academic Information:** Email, Phone, Department, Guide.
  - **Internship Placement:** Host organization, Role/Title, Date ranges, Latest work submission, Blockers reported.
  - **Actions:** Quick Activate/Deactivate toggle and Direct Internship Assignment trigger.

### 5. Single Student Onboarding
Implemented in [`StudentOnboardingModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/StudentOnboardingModal.tsx).
- Required fields validated on submission:
  - `Register Number`: Alphanumeric format, uniqueness checked against database.
  - `Student Full Name`: Minimum 2 characters.
  - `Email Address`: Standard email regex pattern, uniqueness checked against database.
  - `Phone Number`: E.164 / local format (7 to 15 digits).
  - `Department`: Locked to mentor's authorized department.
  - `Academic Year`: 1st, 2nd, 3rd, or 4th Year.
  - `Host Company & Role`: Optional placement fields.
- Calls `internshipRepository.onboardStudent()` which synchronizes to Supabase `profiles` and `students` tables.

### 6. Bulk Student Import via CSV
Implemented in [`BulkStudentImportModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/BulkStudentImportModal.tsx) and [`csvImportValidator.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/utils/csvImportValidator.ts).
- Dual input mode: Drag-and-drop `.csv` file upload or raw text paste.
- "Download Template" utility generates an SMVEC-customized CSV template.
- Live validation engine:
  - Validates CSV columns and headers.
  - Detects duplicate register numbers (in-file and existing database records).
  - Detects duplicate email addresses (in-file and existing database records).
  - Flags rows with cross-department allocations.
  - Flags invalid email formats, missing names, or malformed phone numbers.
- **Never Silently Discards Import Errors:** Displays an error panel listing exact row numbers and specific reasons for every failed row.
- **Preview Table:** Verified rows are displayed with green checkmarks and summarized prior to committing.
- Calls `internshipRepository.bulkImportStudents()`.

### 7. Student Activation and Deactivation
- Mentors can toggle a student's account between `active` and `deactivated` (or `inactive`/`suspended`).
- Deactivating a student sets `accountStatus = 'inactive'` and updates status to `'inactive'`.
- Synchronized to Supabase `profiles.account_status` and `profiles.is_active`.
- Cross-department modification attempts are rejected with `ForbiddenException`.

### 8. Internship Assignment
Implemented in [`InternshipAssignmentModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/InternshipAssignmentModal.tsx).
- Populates host organization options from approved geofence sites managed by the HOD.
- Fields: Host Company, Role/Title, Facility Location, Start Date, End Date, Required Daily Hours, and Assigned Mentor.
- Enforces date validation (`endDate >= startDate`).
- Calls `internshipRepository.assignInternship()` which updates student state and creates records in `public.internship_assignments`.

### 9. Internship Progress Monitoring
- Progress bar and completion percentage displayed per student.
- Logged hours tracking against required daily duration.
- Visual alerts for reported blockers with warning badges.
- Integrated faculty remarks modal for submitting guidance and reviews directly to the student.

### 10. Attendance Overview & Verification
Implemented in [`MentorAttendanceOverview.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/MentorAttendanceOverview.tsx).
- Metric counters: *Overall Present Rate %*, *Average Daily Hours*, *Geofence Verified Check-ins*, *Flagged Check-ins*.
- Detailed attendance sessions table:
  - Session Date, Student Name & Reg No, Check-in / Check-out timestamps.
  - Calculated duration (hours).
  - Facility Location with Geofence Status badge (`✓ Within Geofence`, `⚠️ Out of Bounds`, `⏳ Pending`).
  - Mentor verification status badge (`✓ Verified` vs `○ Unverified`).
  - Quick action buttons to Verify or Flag attendance sessions.
- Anti-tampering protection: Students attempting to verify their own attendance sessions are rejected with a security violation.

---

## 4. CSV Import Validation Engine Specification

The CSV validation engine in [`csvImportValidator.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/utils/csvImportValidator.ts) enforces the following rules:

### Column Format and Aliases
| Target Entity Attribute | Accepted CSV Header Names (Case-Insensitive) | Validation Rule |
| :--- | :--- | :--- |
| `studentId` | `Register Number`, `Register No`, `Reg No`, `Student ID`, `Roll No` | Alphanumeric, trimmed, unique |
| `studentName` | `Student Name`, `Name`, `Full Name` | Min 2 characters, required |
| `email` | `Email`, `Student Email`, `Email Address` | Valid email regex pattern, unique |
| `phone` | `Phone`, `Phone Number`, `Mobile`, `Contact` | 7 to 15 digits, required |
| `departmentCode` | `Department`, `Dept`, `Department Code`, `Branch` | Must match mentor's authorized department |
| `academicYear` | `Academic Year`, `Year` | Normalized to 1st, 2nd, 3rd, 4th Year |
| `company` *(optional)* | `Host Company`, `Company`, `Organization` | Trimmed string (defaults to Unassigned) |
| `role` *(optional)* | `Role`, `Internship Role`, `Title`, `Job Title` | Trimmed string (defaults to Intern) |
| `accountStatus` *(optional)*| `Account Status`, `Status` | `active`, `inactive`, `suspended`, `pending_approval` |

### Error Reporting Guarantee
- If any required header is missing, the entire import preview is blocked with an explicit error naming the missing columns.
- If in-file duplicate register numbers or emails are detected, the validator reports the colliding rows:
  - *Example:* `"Duplicate Register Number in CSV: '23CSEBS015' was already declared in Row 2."*
- If an existing database collision is detected, the validator reports the conflicting student:
  - *Example:* `"Register Number '23CSEBS001' already exists in database (Student: Harish V). Duplicates are prevented."*
- If a row belongs to another department, the validator blocks that row:
  - *Example:* `"Unauthorized Department: Student belongs to 'MECH', but your authorized scope is restricted to 'CSEBS'."*

---

## 5. Supabase Database Migration & RLS Security Rules

### Migration Reference
File: [`supabase/migrations/20261105000005_phase4_mentor_student_management.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000005_phase4_mentor_student_management.sql)

### Helper Functions

```sql
-- 1. Check if mentor is authorized for a specific department
CREATE OR REPLACE FUNCTION public.is_mentor_authorized_for_department(p_department_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.mentors m
        WHERE m.profile_id = auth.uid() AND m.department_id = p_department_id AND m.status = 'active'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.departments d ON d.code = p.department_code
        WHERE p.id = auth.uid() AND p.role = 'mentor' AND p.is_active = true AND d.id = p_department_id
    );
$$;

-- 2. Check if mentor is authorized for a specific student (assigned or department cohort)
CREATE OR REPLACE FUNCTION public.is_mentor_authorized_for_student(p_student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT (
        public.is_mentor_assigned_to_student(p_student_id)
        OR EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.mentors m ON m.department_id = s.department_id
            WHERE s.profile_id = p_student_id AND m.profile_id = auth.uid() AND m.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles sp
            JOIN public.profiles mp ON mp.department_code = sp.department_code
            WHERE sp.id = p_student_id AND mp.id = auth.uid() AND mp.role = 'mentor' AND mp.is_active = true
        )
    );
$$;
```

### Anti-Tamper Trigger: Preventing Role Escalation
```sql
CREATE OR REPLACE FUNCTION public.prevent_mentor_unauthorized_student_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF public.get_auth_user_role() = 'mentor' THEN
        IF TG_OP = 'UPDATE' THEN
            IF NEW.role <> 'student' THEN
                RAISE EXCEPTION 'Security Violation: Mentors are not permitted to change student role.';
            END IF;
            IF NEW.institution_id <> OLD.institution_id THEN
                RAISE EXCEPTION 'Security Violation: Cross-institution modifications are strictly prohibited.';
            END IF;
            IF NEW.department_code IS DISTINCT FROM OLD.department_code THEN
                RAISE EXCEPTION 'Security Violation: Mentors cannot reassign students across departments.';
            END IF;
        ELSIF TG_OP = 'INSERT' THEN
            IF NEW.role <> 'student' THEN
                RAISE EXCEPTION 'Security Violation: Mentors can only onboard student accounts.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_mentor_student_tamper
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_mentor_unauthorized_student_mutation();
```

---

## 6. Automated Verification Test Suite

Test File: [`src/core/auth/__tests__/mentorStudentManagement.test.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/__tests__/mentorStudentManagement.test.ts)

### Test Results Summary

```
Test Files  6 passed (6)
     Tests  137 passed (137)
  Duration  618ms
```

| Test Suite | Scenario / Test Case | Result |
| :--- | :--- | :---: |
| **Scoped Listing** | Allows mentor to list students within authorized department | ✅ PASS |
| **Scoped Listing** | Prevents mentor from accessing students of unauthorized department | ✅ PASS |
| **Scoped Listing** | Rejects student user attempts to query mentor student rosters | ✅ PASS |
| **Profile Viewing**| Retrieves complete student profile by register number within scope | ✅ PASS |
| **Profile Viewing**| Prevents student from inspecting another student's profile | ✅ PASS |
| **Onboarding** | Successfully onboards a new student into authorized department | ✅ PASS |
| **Onboarding** | Rejects onboarding when register number already exists (duplicate check) | ✅ PASS |
| **Onboarding** | Rejects onboarding when email already exists (duplicate check) | ✅ PASS |
| **Onboarding** | Prevents mentor from onboarding a student outside authorized department | ✅ PASS |
| **Onboarding** | Rejects student attempts to onboard a peer | ✅ PASS |
| **CSV Import** | Validates headers and parses valid CSV data | ✅ PASS |
| **CSV Import** | Rejects CSV when required columns are missing | ✅ PASS |
| **CSV Import** | Detects in-file duplicate register numbers and flags exact row numbers | ✅ PASS |
| **CSV Import** | Detects in-file duplicate emails and flags exact row numbers | ✅ PASS |
| **CSV Import** | Detects database duplicate register numbers and database duplicate emails | ✅ PASS |
| **CSV Import** | Detects unauthorized department rows and prevents cross-dept import | ✅ PASS |
| **CSV Import** | Never silently discards import errors and reports detailed error summary | ✅ PASS |
| **CSV Import** | Commits verified CSV rows to repository via bulkImportStudents | ✅ PASS |
| **Activation** | Allows authorized mentor to deactivate student within scope | ✅ PASS |
| **Activation** | Allows authorized mentor to reactivate student | ✅ PASS |
| **Activation** | Prevents mentor from activating/deactivating student in another department | ✅ PASS |
| **Activation** | Prevents student from activating/deactivating any account | ✅ PASS |
| **Assignment** | Successfully assigns approved internship location and dates to student | ✅ PASS |
| **Assignment** | Rejects assignment when end date precedes start date | ✅ PASS |
| **Assignment** | Prevents mentor from assigning internship outside authorized scope | ✅ PASS |
| **Assignment** | Prevents student from self-assigning internships | ✅ PASS |
| **Attendance** | Retrieves attendance sessions scoped to authorized department | ✅ PASS |
| **Attendance** | Allows authorized mentor to verify a pending attendance session | ✅ PASS |
| **Attendance** | Strictly prevents students from modifying verification outcomes (anti-tamper) | ✅ PASS |

---

## 7. Migration Rollback Plan

If required, execute the following script in Supabase SQL Editor to roll back the Phase 4 mentor policies:

```sql
-- Phase 4 Rollback Script
DROP TRIGGER IF EXISTS trigger_prevent_mentor_student_tamper ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_mentor_unauthorized_student_mutation();

DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
DROP POLICY IF EXISTS "students_insert_mentor_hod" ON public.students;
DROP POLICY IF EXISTS "students_update_scoped" ON public.students;

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

DROP POLICY IF EXISTS "assignments_select_policy" ON public.internship_assignments;
DROP POLICY IF EXISTS "assignments_insert_scoped" ON public.internship_assignments;
DROP POLICY IF EXISTS "assignments_update_scoped" ON public.internship_assignments;

DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_mentor_hod_manage" ON public.attendance_sessions;

DROP FUNCTION IF EXISTS public.is_mentor_authorized_for_student(UUID);
DROP FUNCTION IF EXISTS public.is_mentor_authorized_for_department(UUID);

-- Re-establish Phase 3 Baseline Policies
CREATE POLICY "students_select_scoped" ON public.students
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR (public.get_auth_user_role() = 'mentor' AND public.is_mentor_assigned_to_student(students.profile_id))
        OR (institution_id = public.get_auth_user_institution_id() AND public.get_auth_user_role() = 'hod')
    );

CREATE POLICY "students_insert_hod" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (institution_id = public.get_auth_user_institution_id() AND public.get_auth_user_role() = 'hod');
```

---

## 8. Summary of Files Changed & Created

1. **Database Migrations:**
   - [`supabase/migrations/20261105000005_phase4_mentor_student_management.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000005_phase4_mentor_student_management.sql)
   - [`InternPulse-main/supabase/migrations/20261105000005_phase4_mentor_student_management.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/supabase/migrations/20261105000005_phase4_mentor_student_management.sql)
2. **Utilities & Validation Engine:**
   - [`InternPulse-main/src/core/utils/csvImportValidator.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/utils/csvImportValidator.ts)
3. **Core Repository & Domain Models:**
   - [`InternPulse-main/src/data/initialData.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/data/initialData.ts)
   - [`InternPulse-main/src/core/auth/rbac/authorizationPolicy.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/rbac/authorizationPolicy.ts)
   - [`InternPulse-main/src/core/repository/internshipRepository.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/repository/internshipRepository.ts)
4. **Mentor UI Components:**
   - [`InternPulse-main/src/components/mentor/StudentProfileModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/StudentProfileModal.tsx)
   - [`InternPulse-main/src/components/mentor/StudentOnboardingModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/StudentOnboardingModal.tsx)
   - [`InternPulse-main/src/components/mentor/BulkStudentImportModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/BulkStudentImportModal.tsx)
   - [`InternPulse-main/src/components/mentor/InternshipAssignmentModal.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/InternshipAssignmentModal.tsx)
   - [`InternPulse-main/src/components/mentor/MentorAttendanceOverview.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/MentorAttendanceOverview.tsx)
   - [`InternPulse-main/src/components/mentor/MentorStudentManagementView.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/MentorStudentManagementView.tsx)
   - [`InternPulse-main/src/components/MentorDashboard.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/MentorDashboard.tsx)
   - [`InternPulse-main/src/App.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/App.tsx)
5. **Automated Test Suite:**
   - [`InternPulse-main/src/core/auth/__tests__/mentorStudentManagement.test.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/__tests__/mentorStudentManagement.test.ts)
6. **Documentation Report:**
   - [`docs/phase4/MENTOR_STUDENT_MANAGEMENT_REPORT.md`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/docs/phase4/MENTOR_STUDENT_MANAGEMENT_REPORT.md)

