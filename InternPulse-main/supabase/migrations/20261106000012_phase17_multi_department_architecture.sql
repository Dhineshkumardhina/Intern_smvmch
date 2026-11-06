-- ==============================================================================
-- Migration: 20261106000012_phase17_multi_department_architecture.sql
-- Description: Phase 17B Department-Level Governance & Role-Based Access Control
-- Target Database: Supabase PostgreSQL (PostGIS / WGS 84 / RLS Zero-Trust)
-- Institution: Sri Manakula Vinayagar Engineering College (Autonomous) - SMVEC
-- Capabilities:
--   1. Role Constraint Upgrade (super_admin, admin, hod, mentor, student)
--   2. Non-Destructive Department Enhancements (pilot authorization, capacity, head)
--   3. New Relational Governance Tables:
--      - department_admins
--      - department_memberships
--      - internship_batches
--      - student_department_enrollments
--   4. Department-Scoped Security Definer Helper Functions:
--      - get_auth_user_department_id()
--      - is_super_admin()
--      - is_hod_for_department(department_id)
--      - can_access_department(department_id)
--      - is_mentor_authorized_for_student(student_id)
--   5. Fix Critical Audit Gaps:
--      - GAP-01: Re-scope HOD RLS from institutional to sovereign departmental
--      - GAP-02: Fix schedules_select_scoped (eliminate invalid JOIN public.hods)
--      - GAP-03: Add admin and super_admin to profiles role check
--      - GAP-04: Enforce department boundaries on internship assignments
--   6. Anti-Tamper Department Switching & Deactivated Department Guards
--   7. Automated Audit Trail Integration
--   8. Backward-Compatible Views (mentor_assignments, department_directory)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. UPGRADE PROFILES ROLE CHECK CONSTRAINT (FIX GAP-03)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Drop old check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;

    -- Add extended check constraint supporting Super Admin and Admin
    ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_role_check
        CHECK (role IN ('super_admin', 'admin', 'hod', 'mentor', 'student'));
END $$;

-- Update privilege escalation trigger to recognize Super Admin & Admin
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(20);
BEGIN
    -- Only evaluate if role or activation status is being modified
    IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        -- Allow service role and database admin
        IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
            RETURN NEW;
        END IF;

        -- Check the caller's authoritative role in profiles
        SELECT role INTO caller_role 
        FROM public.profiles 
        WHERE id = auth.uid() AND is_active = true;

        IF caller_role IS NULL OR caller_role NOT IN ('super_admin', 'admin', 'hod') THEN
            RAISE EXCEPTION 'Security Violation: Only active administrators or HODs can modify user roles or activation status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. ENHANCE DEPARTMENTS TABLE NON-DESTRUCTIVELY
-- ------------------------------------------------------------------------------
ALTER TABLE public.departments
    ADD COLUMN IF NOT EXISTS is_pilot_authorized BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS max_student_capacity INT NOT NULL DEFAULT 120,
    ADD COLUMN IF NOT EXISTS academic_head_name VARCHAR(150);

-- Backfill CSEBS pilot authorization
UPDATE public.departments
SET is_pilot_authorized = true,
    academic_head_name = 'Dr. V. Gomathi'
WHERE code = 'CSEBS';

-- Backfill IT department metadata
UPDATE public.departments
SET academic_head_name = 'Dr. M. Auxilia'
WHERE code = 'IT';

-- ------------------------------------------------------------------------------
-- 3. CREATE MULTI-DEPARTMENT GOVERNANCE TABLES
-- ------------------------------------------------------------------------------

-- Table: department_admins (Supports Primary HOD, Deputy HODs, and Pilot Coordinators)
CREATE TABLE IF NOT EXISTS public.department_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_type VARCHAR(30) NOT NULL DEFAULT 'hod' CHECK (role_type IN ('hod', 'deputy_hod', 'coordinator', 'technical_auditor')),
    is_primary BOOLEAN NOT NULL DEFAULT true,
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_dept_admin_profile UNIQUE (department_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_admins_dept ON public.department_admins(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_admins_profile ON public.department_admins(profile_id);
CREATE INDEX IF NOT EXISTS idx_dept_admins_status ON public.department_admins(status);

-- Table: department_memberships (Faculty joint appointments & staff affiliations)
CREATE TABLE IF NOT EXISTS public.department_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    membership_role VARCHAR(30) NOT NULL DEFAULT 'mentor' CHECK (membership_role IN ('hod', 'mentor', 'staff', 'student')),
    is_primary BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_member_profile_dept UNIQUE (profile_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_members_profile ON public.department_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_dept ON public.department_memberships(department_id);

-- Table: internship_batches (Structured cohort lifecycles per department)
CREATE TABLE IF NOT EXISTS public.internship_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    batch_name VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    term_code VARCHAR(20) NOT NULL DEFAULT 'EVEN' CHECK (term_code IN ('ODD', 'EVEN', 'SUMMER')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_batch_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_batches_dept ON public.internship_batches(department_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.internship_batches(status);

-- Table: student_department_enrollments (Formal academic department enrollment & transfers)
CREATE TABLE IF NOT EXISTS public.student_department_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES public.internship_batches(id) ON DELETE SET NULL,
    register_number VARCHAR(50) NOT NULL,
    current_semester INT NOT NULL DEFAULT 6 CHECK (current_semester BETWEEN 1 AND 8),
    enrollment_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (enrollment_status IN ('active', 'transferred', 'graduated', 'suspended', 'withdrawn')),
    enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_active_enrollment UNIQUE (student_id, department_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.student_department_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_dept ON public.student_department_enrollments(department_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch ON public.student_department_enrollments(batch_id);

-- ------------------------------------------------------------------------------
-- 4. DEPARTMENT-SCOPED SECURITY DEFINER HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Get caller's assigned department_id
CREATE OR REPLACE FUNCTION public.get_auth_user_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT department_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_active = true 
    LIMIT 1;
$$;

-- Check if caller is Super Admin / Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
          AND is_active = true 
          AND role IN ('super_admin', 'admin')
    );
$$;

-- Check if caller is authorized HOD for a specific department
CREATE OR REPLACE FUNCTION public.is_hod_for_department(p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- 1. Super Admin has universal institutional oversight
        public.is_super_admin()
        -- 2. Direct department appointment on profiles
        OR EXISTS (
            SELECT 1 
            FROM public.profiles p
            JOIN public.departments d ON d.id = p.department_id
            WHERE p.id = auth.uid() 
              AND p.role = 'hod' 
              AND p.department_id = p_department_id
              AND p.is_active = true
              AND d.status = 'active'
        )
        -- 3. Delegated governance in department_admins
        OR EXISTS (
            SELECT 1 
            FROM public.department_admins da
            JOIN public.departments d ON d.id = da.department_id
            WHERE da.profile_id = auth.uid()
              AND da.department_id = p_department_id
              AND da.status = 'active'
              AND d.status = 'active'
        )
    );
$$;

-- Check if caller can access department (Active status check)
CREATE OR REPLACE FUNCTION public.can_access_department(p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Super Admin can audit inactive departments
        public.is_super_admin()
        -- Regular users require active department status
        OR EXISTS (
            SELECT 1 
            FROM public.departments d
            WHERE d.id = p_department_id
              AND d.status = 'active'
              AND (
                  -- HOD
                  public.is_hod_for_department(p_department_id)
                  -- Mentor in department
                  OR public.is_mentor_authorized_for_department(p_department_id)
                  -- Student in department
                  OR public.get_auth_user_department_id() = p_department_id
              )
        )
    );
$$;

-- Hardened Mentor Authorization for Student: Direct assignment OR department match
CREATE OR REPLACE FUNCTION public.is_mentor_authorized_for_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        -- Super Admin
        public.is_super_admin()
        -- Direct active internship assignment supervision
        OR public.is_mentor_assigned_to_student(p_student_id)
        -- Departmental mentor cohort match with active department status
        OR EXISTS (
            SELECT 1
            FROM public.students s
            JOIN public.departments d ON d.id = s.department_id
            JOIN public.mentors m ON m.department_id = s.department_id
            WHERE s.profile_id = p_student_id
              AND m.profile_id = auth.uid()
              AND m.status = 'active'
              AND d.status = 'active'
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles sp
            JOIN public.departments d ON d.code = sp.department_code
            JOIN public.profiles mp ON mp.department_code = sp.department_code
            WHERE sp.id = p_student_id
              AND mp.id = auth.uid()
              AND mp.role = 'mentor'
              AND mp.is_active = true
              AND d.status = 'active'
        )
    );
$$;

-- ------------------------------------------------------------------------------
-- 5. ANTI-TAMPER TRIGGERS: PREVENT UNAUTHORIZED DEPARTMENT SWITCHING
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_department_reassignment()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(20);
BEGIN
    -- If caller is modifying department_id or department_code
    IF (OLD.department_id IS DISTINCT FROM NEW.department_id) OR 
       (OLD.department_code IS DISTINCT FROM NEW.department_code) THEN
        
        -- Bypass for database maintenance routines
        IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
            RETURN NEW;
        END IF;

        caller_role := public.get_auth_user_role();
        IF caller_role NOT IN ('super_admin', 'admin') THEN
            RAISE EXCEPTION 'Security Violation: Department reassignment is restricted to Institution Super Admin.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_prevent_profile_dept_tamper ON public.profiles;
CREATE TRIGGER trigger_prevent_profile_dept_tamper
    BEFORE UPDATE OF department_id, department_code ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_department_reassignment();

DROP TRIGGER IF EXISTS trigger_prevent_student_dept_tamper ON public.students;
CREATE TRIGGER trigger_prevent_student_dept_tamper
    BEFORE UPDATE OF department_id ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_department_reassignment();

-- ------------------------------------------------------------------------------
-- 6. ENFORCE DEPARTMENT BOUNDARY ON INTERNSHIP ASSIGNMENTS (FIX GAP-04)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_assignment_department_boundary()
RETURNS TRIGGER AS $$
DECLARE
    student_dept_id UUID;
    mentor_dept_id UUID;
    caller_role VARCHAR(20);
BEGIN
    -- Extract student's authoritative department
    SELECT department_id INTO student_dept_id
    FROM public.profiles
    WHERE id = NEW.student_id;

    -- Extract mentor's authoritative department
    SELECT department_id INTO mentor_dept_id
    FROM public.profiles
    WHERE id = NEW.mentor_id;

    -- Set assignment department_id
    NEW.department_id := student_dept_id;

    -- Skip check for system maintenance
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    caller_role := public.get_auth_user_role();

    -- Super Admin can authorize cross-department mentorship
    IF caller_role IN ('super_admin', 'admin') THEN
        RETURN NEW;
    END IF;

    -- HOD can ONLY assign within their authorized department
    IF caller_role = 'hod' THEN
        IF NOT public.is_hod_for_department(student_dept_id) THEN
            RAISE EXCEPTION 'Security Violation: HOD is not authorized to create assignments for student in department %', student_dept_id;
        END IF;
    END IF;

    -- Mentor can ONLY assign within their department scope
    IF caller_role = 'mentor' THEN
        IF NOT public.is_mentor_authorized_for_student(NEW.student_id) THEN
            RAISE EXCEPTION 'Security Violation: Mentor cannot assign student outside their authorized cohort.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_validate_assignment_dept_boundary ON public.internship_assignments;
CREATE TRIGGER trigger_validate_assignment_dept_boundary
    BEFORE INSERT OR UPDATE OF student_id, mentor_id, department_id ON public.internship_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_assignment_department_boundary();

-- ------------------------------------------------------------------------------
-- 7. RE-HARDEN ROW-LEVEL SECURITY POLICIES (FIX GAP-01 & GAP-02)
-- ------------------------------------------------------------------------------

-- Enable RLS on new tables
ALTER TABLE public.department_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_department_enrollments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- A. DEPARTMENTS POLICIES
-- ==============================================================================
DROP POLICY IF EXISTS "departments_select_scoped" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_hod" ON public.departments;
DROP POLICY IF EXISTS "departments_update_hod" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_hod" ON public.departments;

-- SELECT: Institutional members view departments in their institution
CREATE POLICY "departments_select_scoped" ON public.departments
    FOR SELECT TO authenticated
    USING (institution_id = public.get_auth_user_institution_id());

-- INSERT: Only Super Admin can create new departments
CREATE POLICY "departments_insert_admin" ON public.departments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin());

-- UPDATE: Super Admin has full control; HOD can update descriptive fields for their own department only
CREATE POLICY "departments_update_scoped" ON public.departments
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (public.is_hod_for_department(id))
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            -- HOD cannot alter status, code, or institution
            public.is_hod_for_department(id)
            AND status = (SELECT d.status FROM public.departments d WHERE d.id = departments.id)
            AND code = (SELECT d.code FROM public.departments d WHERE d.id = departments.id)
            AND institution_id = (SELECT d.institution_id FROM public.departments d WHERE d.id = departments.id)
        )
    );

-- DELETE: Strictly restricted to Super Admin
CREATE POLICY "departments_delete_admin" ON public.departments
    FOR DELETE TO authenticated
    USING (public.is_super_admin());

-- ==============================================================================
-- B. PROFILES POLICIES (DEPARTMENT-SCOPED HOD ACCESS)
-- ==============================================================================
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_guarded" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_hod" ON public.profiles;

CREATE POLICY "profiles_select_scoped" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        -- 1. Student / Mentor / HOD can read self
        auth.uid() = id
        -- 2. Super Admin can read all institutional profiles
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.is_super_admin()
        )
        -- 3. HOD can read profiles ONLY in their authorized department
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(profiles.department_id)
        )
        -- 4. Mentor can read assigned students in their cohort
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(profiles.id)
        )
    );

CREATE POLICY "profiles_update_scoped" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id
        OR public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(profiles.department_id)
        )
    )
    WITH CHECK (
        (
            -- Self update guard
            auth.uid() = id
            AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            AND account_status = (SELECT p.account_status FROM public.profiles p WHERE p.id = auth.uid())
            AND institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = auth.uid())
            AND department_id = (SELECT p.department_id FROM public.profiles p WHERE p.id = auth.uid())
        )
        OR public.is_super_admin()
        OR (
            -- HOD updating profile within their department
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(profiles.department_id)
            AND institution_id = public.get_auth_user_institution_id()
            -- Cannot elevate to admin or reassign department
            AND role <> 'super_admin'
            AND role <> 'admin'
            AND department_id = (SELECT p.department_id FROM public.profiles p WHERE p.id = profiles.id)
        )
    );

-- ==============================================================================
-- C. STUDENTS POLICIES (DEPARTMENT-SCOPED HOD ACCESS)
-- ==============================================================================
DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
DROP POLICY IF EXISTS "students_insert_mentor_hod" ON public.students;
DROP POLICY IF EXISTS "students_update_scoped" ON public.students;

CREATE POLICY "students_select_scoped" ON public.students
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(students.profile_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(students.department_id)
        )
    );

CREATE POLICY "students_insert_scoped" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(students.department_id)
        )
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_department(students.department_id)
        )
    );

CREATE POLICY "students_update_scoped" ON public.students
    FOR UPDATE TO authenticated
    USING (
        (profile_id = auth.uid())
        OR public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(students.profile_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(students.department_id)
        )
    )
    WITH CHECK (
        (
            -- Student cannot modify register number, status, department, or institution
            profile_id = auth.uid()
            AND register_number = (SELECT s.register_number FROM public.students s WHERE s.profile_id = auth.uid())
            AND status = (SELECT s.status FROM public.students s WHERE s.profile_id = auth.uid())
            AND institution_id = (SELECT s.institution_id FROM public.students s WHERE s.profile_id = auth.uid())
            AND department_id = (SELECT s.department_id FROM public.students s WHERE s.profile_id = auth.uid())
        )
        OR public.is_super_admin()
        OR (
            -- HOD can update students within their department only
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(students.department_id)
            AND department_id = (SELECT s.department_id FROM public.students s WHERE s.id = students.id)
        )
        OR (
            -- Mentor can update students within their authorized cohort only
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(students.profile_id)
            AND public.is_mentor_authorized_for_department(students.department_id)
            AND department_id = (SELECT s.department_id FROM public.students s WHERE s.id = students.id)
        )
    );

-- ==============================================================================
-- D. MENTORS POLICIES (DEPARTMENT-SCOPED HOD ACCESS)
-- ==============================================================================
DROP POLICY IF EXISTS "mentors_select_scoped" ON public.mentors;
DROP POLICY IF EXISTS "mentors_insert_hod" ON public.mentors;
DROP POLICY IF EXISTS "mentors_update_scoped" ON public.mentors;

CREATE POLICY "mentors_select_scoped" ON public.mentors
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(mentors.department_id)
        )
        OR (
            -- Mentors in the same department can view colleague directory
            public.get_auth_user_role() = 'mentor'
            AND department_id = public.get_auth_user_department_id()
        )
    );

CREATE POLICY "mentors_insert_scoped" ON public.mentors
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(mentors.department_id)
        )
    );

CREATE POLICY "mentors_update_scoped" ON public.mentors
    FOR UPDATE TO authenticated
    USING (
        (profile_id = auth.uid())
        OR public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(mentors.department_id)
        )
    )
    WITH CHECK (
        (
            -- Mentor self-update guard
            profile_id = auth.uid()
            AND institution_id = (SELECT m.institution_id FROM public.mentors m WHERE m.profile_id = auth.uid())
            AND department_id = (SELECT m.department_id FROM public.mentors m WHERE m.profile_id = auth.uid())
            AND max_capacity = (SELECT m.max_capacity FROM public.mentors m WHERE m.profile_id = auth.uid())
        )
        OR public.is_super_admin()
        OR (
            -- HOD can manage mentors in their department
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(mentors.department_id)
            AND department_id = (SELECT m.department_id FROM public.mentors m WHERE m.id = mentors.id)
        )
    );

-- ==============================================================================
-- E. INTERNSHIP ASSIGNMENTS POLICIES (DEPARTMENT-SCOPED HOD ACCESS)
-- ==============================================================================
DROP POLICY IF EXISTS "assignments_select_policy" ON public.internship_assignments;
DROP POLICY IF EXISTS "assignments_insert_scoped" ON public.internship_assignments;
DROP POLICY IF EXISTS "assignments_update_scoped" ON public.internship_assignments;

CREATE POLICY "assignments_select_scoped" ON public.internship_assignments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR mentor_id = auth.uid()
        OR public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(internship_assignments.department_id)
        )
    );

CREATE POLICY "assignments_insert_scoped" ON public.internship_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(internship_assignments.department_id)
        )
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
            AND public.is_mentor_authorized_for_department(internship_assignments.department_id)
        )
    );

CREATE POLICY "assignments_update_scoped" ON public.internship_assignments
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(internship_assignments.department_id)
        )
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'hod'
            AND public.is_hod_for_department(internship_assignments.department_id)
        )
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(internship_assignments.student_id)
        )
    );

-- ==============================================================================
-- F. ATTENDANCE SESSIONS POLICIES (DEPARTMENT-SCOPED HOD ACCESS)
-- ==============================================================================
DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_mentor_hod_manage" ON public.attendance_sessions;

CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(attendance_sessions.student_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = attendance_sessions.student_id 
                  AND public.is_hod_for_department(p.department_id)
            )
        )
    );

CREATE POLICY "attendance_sessions_mentor_hod_manage" ON public.attendance_sessions
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(attendance_sessions.student_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = attendance_sessions.student_id 
                  AND public.is_hod_for_department(p.department_id)
            )
        )
    )
    WITH CHECK (
        public.is_super_admin()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_authorized_for_student(attendance_sessions.student_id)
        )
        OR (
            public.get_auth_user_role() = 'hod'
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE p.id = attendance_sessions.student_id 
                  AND public.is_hod_for_department(p.department_id)
            )
        )
    );

-- ==============================================================================
-- G. VERIFICATION SCHEDULES POLICIES (FIX GAP-02: ELIMINATE JOIN public.hods)
-- ==============================================================================
DROP POLICY IF EXISTS "schedules_select_scoped" ON public.verification_schedules;

CREATE POLICY "schedules_select_scoped" ON public.verification_schedules
    FOR SELECT TO authenticated
    USING (
        -- 1. Assigned mentor can audit
        public.is_mentor_assigned_to_assignment(verification_schedules.assignment_id)
        -- 2. HOD of the student's department can audit (FIXED: references profiles/departments)
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            JOIN public.profiles s ON s.id = a.student_id
            WHERE a.id = verification_schedules.assignment_id
              AND public.is_hod_for_department(s.department_id)
        )
        -- 3. Super Admin can audit all schedules
        OR public.is_super_admin()
        -- 4. Student can ONLY inspect OPEN or past windows (Anti-prediction guard)
        OR (
            student_id = auth.uid()
            AND (
                status IN ('OPEN', 'SUBMITTED', 'VERIFIED', 'MISSED', 'LOCATION_UNAVAILABLE', 'EXPIRED', 'CANCELLED', 'dispatched', 'responded')
                OR window_start <= timezone('utc'::text, now())
            )
        )
    );

-- ==============================================================================
-- H. NEW TABLES POLICIES (department_admins, batches, enrollments)
-- ==============================================================================

-- department_admins
CREATE POLICY "dept_admins_select" ON public.department_admins
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
        OR profile_id = auth.uid()
    );

CREATE POLICY "dept_admins_manage" ON public.department_admins
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- department_memberships
CREATE POLICY "dept_members_select" ON public.department_memberships
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
        OR profile_id = auth.uid()
    );

CREATE POLICY "dept_members_manage" ON public.department_memberships
    FOR ALL TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
    );

-- internship_batches
CREATE POLICY "batches_select" ON public.internship_batches
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.can_access_department(department_id)
    );

CREATE POLICY "batches_manage" ON public.internship_batches
    FOR ALL TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
    );

-- student_department_enrollments
CREATE POLICY "enrollments_select" ON public.student_department_enrollments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_super_admin()
        OR public.is_hod_for_department(department_id)
        OR public.is_mentor_authorized_for_student(student_id)
    );

CREATE POLICY "enrollments_manage" ON public.student_department_enrollments
    FOR ALL TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_hod_for_department(department_id)
    );

-- ------------------------------------------------------------------------------
-- 8. AUTOMATED AUDIT TRIGGERS FOR DEPARTMENT GOVERNANCE
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_departments ON public.departments;
CREATE TRIGGER audit_departments
    AFTER INSERT OR UPDATE OR DELETE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

DROP TRIGGER IF EXISTS audit_department_admins ON public.department_admins;
CREATE TRIGGER audit_department_admins
    AFTER INSERT OR UPDATE OR DELETE ON public.department_admins
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

DROP TRIGGER IF EXISTS audit_internship_batches ON public.internship_batches;
CREATE TRIGGER audit_internship_batches
    AFTER INSERT OR UPDATE OR DELETE ON public.internship_batches
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

-- ------------------------------------------------------------------------------
-- 9. BACKWARD-COMPATIBLE SEEDING & VIEWS
-- ------------------------------------------------------------------------------

-- Seed department_admins for existing CSEBS HOD
INSERT INTO public.department_admins (department_id, profile_id, role_type, is_primary, status)
SELECT 
    d.id,
    p.id,
    'hod',
    true,
    'active'
FROM public.departments d
JOIN public.profiles p ON p.department_code = d.code
WHERE d.code = 'CSEBS' AND p.role = 'hod'
ON CONFLICT (department_id, profile_id) DO NOTHING;

-- Seed department_admins for IT HOD
INSERT INTO public.department_admins (department_id, profile_id, role_type, is_primary, status)
SELECT 
    d.id,
    p.id,
    'hod',
    true,
    'active'
FROM public.departments d
JOIN public.profiles p ON p.department_code = d.code
WHERE d.code = 'IT' AND p.role = 'hod'
ON CONFLICT (department_id, profile_id) DO NOTHING;

-- Seed initial batch for CSEBS
INSERT INTO public.internship_batches (
    department_id, batch_name, academic_year, term_code, start_date, end_date, status
)
SELECT 
    d.id,
    'CSEBS 2023-2027 Final Year Internship',
    '2026-2027',
    'EVEN',
    '2026-01-05'::date,
    '2026-06-30'::date,
    'active'
FROM public.departments d
WHERE d.code = 'CSEBS'
ON CONFLICT DO NOTHING;

-- Backfill student_department_enrollments from existing students
INSERT INTO public.student_department_enrollments (
    student_id, department_id, batch_id, register_number, current_semester, enrollment_status
)
SELECT 
    s.profile_id,
    s.department_id,
    b.id,
    s.register_number,
    COALESCE(s.current_semester, 6),
    'active'
FROM public.students s
LEFT JOIN public.internship_batches b ON b.department_id = s.department_id AND b.status = 'active'
ON CONFLICT (student_id, department_id, batch_id) DO NOTHING;

-- Canonical View: mentor_assignments (Standard relational access over assignments)
CREATE OR REPLACE VIEW public.mentor_assignments AS
SELECT 
    a.id AS assignment_id,
    a.student_id,
    sp.full_name AS student_name,
    sp.email AS student_email,
    a.mentor_id,
    mp.full_name AS mentor_name,
    mp.email AS mentor_email,
    a.department_id,
    d.code AS department_code,
    d.name AS department_name,
    a.location_id,
    l.location_name,
    l.company_name,
    a.start_date,
    a.end_date,
    a.status AS assignment_status,
    a.created_at
FROM public.internship_assignments a
JOIN public.profiles sp ON sp.id = a.student_id
JOIN public.profiles mp ON mp.id = a.mentor_id
JOIN public.departments d ON d.id = a.department_id
LEFT JOIN public.internship_locations l ON l.id = a.location_id;

-- Canonical View: department_directory
CREATE OR REPLACE VIEW public.department_directory AS
SELECT 
    d.id AS department_id,
    d.institution_id,
    d.code AS department_code,
    d.name AS department_name,
    d.status AS department_status,
    d.is_pilot_authorized,
    d.max_student_capacity,
    d.academic_head_name,
    da.profile_id AS hod_profile_id,
    p.full_name AS hod_name,
    p.email AS hod_email,
    COUNT(DISTINCT s.id) AS total_enrolled_students,
    COUNT(DISTINCT m.id) AS total_faculty_mentors
FROM public.departments d
LEFT JOIN public.department_admins da ON da.department_id = d.id AND da.is_primary = true AND da.status = 'active'
LEFT JOIN public.profiles p ON p.id = da.profile_id
LEFT JOIN public.students s ON s.department_id = d.id AND s.status = 'active'
LEFT JOIN public.mentors m ON m.department_id = d.id AND m.status = 'active'
GROUP BY d.id, d.institution_id, d.code, d.name, d.status, d.is_pilot_authorized, d.max_student_capacity, d.academic_head_name, da.profile_id, p.full_name, p.email;

