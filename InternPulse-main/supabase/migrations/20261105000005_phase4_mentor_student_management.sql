-- ==============================================================================
-- Migration: 20261105000005_phase4_mentor_student_management.sql
-- Description: Phase 4 Mentor Student Management, Scoped Onboarding & Attendance
-- Target Database: Supabase PostgreSQL (WGS 84 / PostGIS / RLS Hardened)
-- Institution: Sri Manakula Vinayagar Engineering College (Autonomous) - SMVEC
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS: MENTOR SCOPE AND DEPARTMENT AUTHORIZATION
-- ------------------------------------------------------------------------------

-- Check if authenticated mentor belongs to or is authorized for a specific department
CREATE OR REPLACE FUNCTION public.is_mentor_authorized_for_department(p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.mentors m
        WHERE m.profile_id = auth.uid()
          AND m.department_id = p_department_id
          AND m.status = 'active'
    ) OR EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.departments d ON d.code = p.department_code
        WHERE p.id = auth.uid()
          AND p.role = 'mentor'
          AND p.is_active = true
          AND d.id = p_department_id
    );
$$;

-- Check if authenticated mentor is authorized to manage a specific student
-- True if mentor is directly assigned to the student OR student is in mentor's department
CREATE OR REPLACE FUNCTION public.is_mentor_authorized_for_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        public.is_mentor_assigned_to_student(p_student_id)
        OR EXISTS (
            SELECT 1
            FROM public.students s
            JOIN public.mentors m ON m.department_id = s.department_id
            WHERE s.profile_id = p_student_id
              AND m.profile_id = auth.uid()
              AND m.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles sp
            JOIN public.profiles mp ON mp.department_code = sp.department_code
            WHERE sp.id = p_student_id
              AND mp.id = auth.uid()
              AND mp.role = 'mentor'
              AND mp.is_active = true
        )
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. ENHANCE STUDENTS ROW-LEVEL SECURITY FOR MENTORS
-- ------------------------------------------------------------------------------

-- Drop existing student policies to replace with department-scoped mentor policies
DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
DROP POLICY IF EXISTS "students_insert_mentor_hod" ON public.students;
DROP POLICY IF EXISTS "students_update_scoped" ON public.students;

-- Scoped SELECT: Students view self, HOD views institution, Mentors view assigned OR department students
CREATE POLICY "students_select_scoped" ON public.students
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(students.profile_id)
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

-- Scoped INSERT: HOD can insert anywhere in institution; Mentors can only insert in their department
CREATE POLICY "students_insert_mentor_hod" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_department(students.department_id)
        )
    );

-- Scoped UPDATE: HOD can update institution; Mentors can update students in their department / cohort
CREATE POLICY "students_update_scoped" ON public.students
    FOR UPDATE TO authenticated
    USING (
        (profile_id = auth.uid())
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(students.profile_id)
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    )
    WITH CHECK (
        (
            -- Student cannot modify register number, status, or institution
            profile_id = auth.uid()
            AND register_number = (SELECT s.register_number FROM public.students s WHERE s.profile_id = auth.uid())
            AND status = (SELECT s.status FROM public.students s WHERE s.profile_id = auth.uid())
            AND institution_id = (SELECT s.institution_id FROM public.students s WHERE s.profile_id = auth.uid())
            AND department_id = (SELECT s.department_id FROM public.students s WHERE s.profile_id = auth.uid())
        )
        OR (
            -- Mentor can update students only within their authorized department / cohort
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(students.profile_id)
            AND institution_id = public.get_auth_user_institution_id()
            AND public.is_mentor_authorized_for_department(students.department_id)
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

-- ------------------------------------------------------------------------------
-- 3. PROFILES RLS: MENTOR STUDENT ONBOARDING & ACTIVATION/DEACTIVATION
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        -- User creating own profile on first registration
        auth.uid() = id
        -- HOD onboarding any profile in institution
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        -- Mentor onboarding a STUDENT only within their authorized department
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'mentor'
            AND role = 'student'
            AND (
                department_code = (SELECT p.department_code FROM public.profiles p WHERE p.id = auth.uid())
                OR (department_id IS NOT NULL AND public.is_mentor_authorized_for_department(department_id))
            )
        )
    );

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        -- Self update
        (auth.uid() = id)
        -- HOD update within institution
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        -- Mentor updating a student within their authorized department or assigned scope
        OR (
            public.get_auth_user_role() = 'mentor'
            AND role = 'student'
            AND public.is_mentor_authorized_for_student(id)
        )
    )
    WITH CHECK (
        -- User updating own profile cannot escalate role, status, or institution
        (
            auth.uid() = id
            AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            AND account_status = (SELECT p.account_status FROM public.profiles p WHERE p.id = auth.uid())
            AND institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = auth.uid())
        )
        -- HOD has institutional authority
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        -- Mentor can activate/deactivate student or update student details, but CANNOT change role away from student
        OR (
            public.get_auth_user_role() = 'mentor'
            AND role = 'student'
            AND public.is_mentor_authorized_for_student(id)
            AND institution_id = public.get_auth_user_institution_id()
        )
    );

-- ------------------------------------------------------------------------------
-- 4. INTERNSHIP ASSIGNMENTS: MENTOR ALLOCATION POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "assignments_select_policy" ON public.internship_assignments;
DROP POLICY IF EXISTS "assignments_insert_scoped" ON public.internship_assignments;
DROP POLICY IF EXISTS "assignments_update_scoped" ON public.internship_assignments;

CREATE POLICY "assignments_select_policy" ON public.internship_assignments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR mentor_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "assignments_insert_scoped" ON public.internship_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
        )
    );

CREATE POLICY "assignments_update_scoped" ON public.internship_assignments
    FOR UPDATE TO authenticated
    USING (
        (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
        )
    )
    WITH CHECK (
        (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
        )
    );

-- ------------------------------------------------------------------------------
-- 5. ATTENDANCE SESSIONS: MENTOR OVERVIEW & VERIFICATION POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_mentor_hod_manage" ON public.attendance_sessions;

CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(attendance_sessions.student_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = attendance_sessions.student_id 
                  AND p.institution_id = public.get_auth_user_institution_id()
            )
        )
    );

CREATE POLICY "attendance_sessions_mentor_hod_manage" ON public.attendance_sessions
    FOR UPDATE TO authenticated
    USING (
        (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(attendance_sessions.student_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = attendance_sessions.student_id 
                  AND p.institution_id = public.get_auth_user_institution_id()
            )
        )
    )
    WITH CHECK (
        (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(attendance_sessions.student_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = attendance_sessions.student_id 
                  AND p.institution_id = public.get_auth_user_institution_id()
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 6. ANTI-TAMPER TRIGGER: PREVENT MENTOR ROLE ESCALATION OR CROSS-DEPT MIGRATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_mentor_unauthorized_student_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- If caller is a mentor, verify they are not elevating roles or switching departments
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

DROP TRIGGER IF EXISTS trigger_prevent_mentor_student_tamper ON public.profiles;
CREATE TRIGGER trigger_prevent_mentor_student_tamper
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_mentor_unauthorized_student_mutation();

