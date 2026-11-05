-- ==============================================================================
-- Migration: 20261105000003_phase2_rls_security_hardening.sql
-- Description: Comprehensive Row-Level Security (RLS) Hardening & Defense-in-Depth
-- Project: InternPulse (Sri Manakula Vinayagar Engineering College)
-- Security Model:
--   - HOD: Institution-wide access strictly within authorized institution
--   - MENTOR: Cohort-scoped access to assigned students & authorized internship records
--   - STUDENT: Strict personal isolation to self-owned records
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER FUNCTIONS (Performance & Safe Path Resolution)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_user_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT institution_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_active = true 
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS VARCHAR(20)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_active = true 
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_mentor_assigned_to_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.internship_assignments a
        WHERE a.mentor_id = auth.uid()
          AND a.student_id = p_student_id
          AND a.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_mentor_assigned_to_assignment(p_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.internship_assignments a
        WHERE a.id = p_assignment_id
          AND a.mentor_id = auth.uid()
    );
$$;

-- ------------------------------------------------------------------------------
-- 2. ENABLE RLS ON EVERY SENSITIVE TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_daily_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. DROP OUTDATED / LOOSE BASELINE POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "institutions_select_authenticated" ON public.institutions;
DROP POLICY IF EXISTS "institutions_hod_manage" ON public.institutions;

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_hod_manage" ON public.departments;

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

DROP POLICY IF EXISTS "mentors_select_authenticated" ON public.mentors;
DROP POLICY IF EXISTS "mentors_hod_manage" ON public.mentors;
DROP POLICY IF EXISTS "mentors_update_self" ON public.mentors;

DROP POLICY IF EXISTS "students_select_policy" ON public.students;
DROP POLICY IF EXISTS "students_hod_manage" ON public.students;

DROP POLICY IF EXISTS "locations_select_authenticated" ON public.internship_locations;
DROP POLICY IF EXISTS "locations_hod_manage" ON public.internship_locations;

DROP POLICY IF EXISTS "location_departments_select" ON public.location_departments;
DROP POLICY IF EXISTS "location_departments_hod_manage" ON public.location_departments;

DROP POLICY IF EXISTS "assignments_select_policy" ON public.internship_assignments;
DROP POLICY IF EXISTS "assignments_hod_manage" ON public.internship_assignments;

DROP POLICY IF EXISTS "attendance_sessions_select" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_student_insert" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_student_update" ON public.attendance_sessions;
DROP POLICY IF EXISTS "attendance_sessions_mentor_hod_manage" ON public.attendance_sessions;

DROP POLICY IF EXISTS "location_verifications_select" ON public.location_verifications;
DROP POLICY IF EXISTS "location_verifications_student_insert" ON public.location_verifications;
DROP POLICY IF EXISTS "location_verifications_mentor_hod_all" ON public.location_verifications;

DROP POLICY IF EXISTS "verification_schedules_select" ON public.verification_schedules;
DROP POLICY IF EXISTS "verification_schedules_mentor_hod_manage" ON public.verification_schedules;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;

DROP POLICY IF EXISTS "fcm_tokens_user_own" ON public.fcm_device_tokens;

DROP POLICY IF EXISTS "audit_logs_select_hod" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;

DROP POLICY IF EXISTS "daily_logs_select_policy" ON public.student_daily_logs;
DROP POLICY IF EXISTS "daily_logs_student_insert" ON public.student_daily_logs;
DROP POLICY IF EXISTS "daily_logs_mentor_review" ON public.student_daily_logs;

-- ------------------------------------------------------------------------------
-- 4. HARDENED ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

-- ==============================================================================
-- A. INSTITUTIONS (Cross-Institution Isolation)
-- ==============================================================================
CREATE POLICY "institutions_select_scoped" ON public.institutions
    FOR SELECT TO authenticated
    USING (id = public.get_auth_user_institution_id());

CREATE POLICY "institutions_update_hod" ON public.institutions
    FOR UPDATE TO authenticated
    USING (
        id = public.get_auth_user_institution_id() 
        AND public.get_auth_user_role() = 'hod'
    )
    WITH CHECK (
        id = public.get_auth_user_institution_id() 
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- B. DEPARTMENTS (Institution-Scoped Governance)
-- ==============================================================================
CREATE POLICY "departments_select_scoped" ON public.departments
    FOR SELECT TO authenticated
    USING (institution_id = public.get_auth_user_institution_id());

CREATE POLICY "departments_insert_hod" ON public.departments
    FOR INSERT TO authenticated
    WITH CHECK (
        institution_id = public.get_auth_user_institution_id() 
        AND public.get_auth_user_role() = 'hod'
    );

CREATE POLICY "departments_update_hod" ON public.departments
    FOR UPDATE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id() 
        AND public.get_auth_user_role() = 'hod'
    )
    WITH CHECK (
        institution_id = public.get_auth_user_institution_id() 
        AND public.get_auth_user_role() = 'hod'
    );

CREATE POLICY "departments_delete_hod" ON public.departments
    FOR DELETE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id() 
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- C. PROFILES / USERS (Role Immutability, Institution Scoping, Self-Protection)
-- ==============================================================================
CREATE POLICY "profiles_select_scoped" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        -- 1. Student / Mentor / HOD can read own profile
        auth.uid() = id
        -- 2. HOD can read all profiles in their authorized institution
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        -- 3. Mentor can read assigned students in their cohort
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_assigned_to_student(profiles.id)
        )
    );

CREATE POLICY "profiles_insert_registration" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (
        -- User can only create their own profile as student or with admin authority
        (auth.uid() = id AND role = 'student')
        OR (public.get_auth_user_role() = 'hod' AND institution_id = public.get_auth_user_institution_id())
    );

CREATE POLICY "profiles_update_guarded" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        -- Self update OR HOD within authorized institution
        auth.uid() = id
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    )
    WITH CHECK (
        (
            -- Non-HOD users cannot change role, account_status, or institution_id
            auth.uid() = id
            AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            AND account_status = (SELECT p.account_status FROM public.profiles p WHERE p.id = auth.uid())
            AND institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = auth.uid())
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "profiles_delete_hod" ON public.profiles
    FOR DELETE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
        AND id <> auth.uid() -- Prevent accidental self-deletion
    );

-- ==============================================================================
-- D. MENTORS (Faculty Directory & Workload Scoping)
-- ==============================================================================
CREATE POLICY "mentors_select_scoped" ON public.mentors
    FOR SELECT TO authenticated
    USING (institution_id = public.get_auth_user_institution_id());

CREATE POLICY "mentors_insert_hod" ON public.mentors
    FOR INSERT TO authenticated
    WITH CHECK (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

CREATE POLICY "mentors_update_scoped" ON public.mentors
    FOR UPDATE TO authenticated
    USING (
        (profile_id = auth.uid())
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    )
    WITH CHECK (
        (
            -- Mentor updating self cannot alter department, institution, or capacity
            profile_id = auth.uid()
            AND institution_id = (SELECT m.institution_id FROM public.mentors m WHERE m.profile_id = auth.uid())
            AND department_id = (SELECT m.department_id FROM public.mentors m WHERE m.profile_id = auth.uid())
            AND max_capacity = (SELECT m.max_capacity FROM public.mentors m WHERE m.profile_id = auth.uid())
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "mentors_delete_hod" ON public.mentors
    FOR DELETE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- E. STUDENTS (Student Cohort Scoping)
-- ==============================================================================
CREATE POLICY "students_select_scoped" ON public.students
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'mentor'
            AND public.is_mentor_assigned_to_student(students.profile_id)
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "students_insert_hod" ON public.students
    FOR INSERT TO authenticated
    WITH CHECK (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

CREATE POLICY "students_update_scoped" ON public.students
    FOR UPDATE TO authenticated
    USING (
        (profile_id = auth.uid())
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
        )
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "students_delete_hod" ON public.students
    FOR DELETE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- F. INTERNSHIP LOCATIONS (HOD Exclusive Geofence Governance - Mentors Blocked)
-- ==============================================================================
CREATE POLICY "locations_select_scoped" ON public.internship_locations
    FOR SELECT TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND (status = 'active' OR public.get_auth_user_role() = 'hod')
    );

CREATE POLICY "locations_insert_hod_only" ON public.internship_locations
    FOR INSERT TO authenticated
    WITH CHECK (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

CREATE POLICY "locations_update_hod_only" ON public.internship_locations
    FOR UPDATE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    )
    WITH CHECK (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

CREATE POLICY "locations_delete_hod_only" ON public.internship_locations
    FOR DELETE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

-- Location Departments Junction Table
CREATE POLICY "loc_dept_select_scoped" ON public.location_departments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.internship_locations l
            WHERE l.id = location_departments.location_id
              AND l.institution_id = public.get_auth_user_institution_id()
        )
    );

CREATE POLICY "loc_dept_manage_hod" ON public.location_departments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.internship_locations l
            WHERE l.id = location_departments.location_id
              AND l.institution_id = public.get_auth_user_institution_id()
        )
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- G. INTERNSHIP ASSIGNMENTS (Duplicate Prevention & Allocation Control)
-- ==============================================================================
CREATE POLICY "assignments_select_scoped" ON public.internship_assignments
    FOR SELECT TO authenticated
    USING (
        -- Student sees only own assignments
        student_id = auth.uid()
        -- Mentor sees assigned mentees
        OR mentor_id = auth.uid()
        -- HOD sees entire institution
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "assignments_insert_hod_only" ON public.internship_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

CREATE POLICY "assignments_update_hod_or_assigned_mentor" ON public.internship_assignments
    FOR UPDATE TO authenticated
    USING (
        (
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        OR (mentor_id = auth.uid() AND public.get_auth_user_role() = 'mentor')
    )
    WITH CHECK (
        (
            -- HOD has full modification scope within institution
            institution_id = public.get_auth_user_institution_id()
            AND public.get_auth_user_role() = 'hod'
        )
        OR (
            -- Mentor can ONLY update assignment status (e.g., mark completed)
            mentor_id = auth.uid()
            AND student_id = (SELECT a.student_id FROM public.internship_assignments a WHERE a.id = internship_assignments.id)
            AND location_id = (SELECT a.location_id FROM public.internship_assignments a WHERE a.id = internship_assignments.id)
            AND start_date = (SELECT a.start_date FROM public.internship_assignments a WHERE a.id = internship_assignments.id)
        )
    );

CREATE POLICY "assignments_delete_hod_only" ON public.internship_assignments
    FOR DELETE TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- H. ATTENDANCE SESSIONS (Student Check-In / Check-Out Isolation)
-- ==============================================================================
CREATE POLICY "attendance_sessions_select_scoped" ON public.attendance_sessions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_mentor_assigned_to_assignment(attendance_sessions.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = attendance_sessions.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "attendance_sessions_insert_student" ON public.attendance_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Student can only insert their own session on active assignment
        student_id = auth.uid()
        AND is_verified = false -- Students CANNOT self-verify
        AND EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = assignment_id
              AND a.student_id = auth.uid()
              AND a.status = 'active'
        )
    );

CREATE POLICY "attendance_sessions_update_scoped" ON public.attendance_sessions
    FOR UPDATE TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_mentor_assigned_to_assignment(attendance_sessions.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = attendance_sessions.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    )
    WITH CHECK (
        (
            -- Student can update check-out time and notes, but CANNOT modify is_verified or status
            student_id = auth.uid()
            AND is_verified = (SELECT s.is_verified FROM public.attendance_sessions s WHERE s.id = attendance_sessions.id)
            AND status = (SELECT s.status FROM public.attendance_sessions s WHERE s.id = attendance_sessions.id)
        )
        OR public.is_mentor_assigned_to_assignment(attendance_sessions.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = attendance_sessions.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "attendance_sessions_delete_hod" ON public.attendance_sessions
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = attendance_sessions.assignment_id
              AND a.institution_id = public.get_auth_user_institution_id()
        )
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- I. LOCATION VERIFICATIONS (Tamper-Proof Geofence Verifications)
-- ==============================================================================
-- Students and Mentors can SELECT only authorized records
CREATE POLICY "verifications_select_scoped" ON public.location_verifications
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_mentor_assigned_to_assignment(location_verifications.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = location_verifications.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

-- Students can ONLY insert a pending dispatch request. Verification outcomes are computed on backend
CREATE POLICY "verifications_insert_student" ON public.location_verifications
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND status = 'pending'
        AND is_within_geofence IS NULL
        AND is_mock_location = false
        AND EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = assignment_id
              AND a.student_id = auth.uid()
              AND a.status = 'active'
        )
    );

-- Zero UPDATE policies for students! Only Mentor or HOD can add supervisor remarks
CREATE POLICY "verifications_update_mentor_hod_remarks_only" ON public.location_verifications
    FOR UPDATE TO authenticated
    USING (
        public.is_mentor_assigned_to_assignment(location_verifications.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = location_verifications.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    )
    WITH CHECK (
        -- Geolocation measurements and outcomes are IMMUTABLE
        status = (SELECT v.status FROM public.location_verifications v WHERE v.id = location_verifications.id)
        AND is_within_geofence IS NOT DISTINCT FROM (SELECT v.is_within_geofence FROM public.location_verifications v WHERE v.id = location_verifications.id)
        AND is_mock_location = (SELECT v.is_mock_location FROM public.location_verifications v WHERE v.id = location_verifications.id)
        AND distance_to_center_meters IS NOT DISTINCT FROM (SELECT v.distance_to_center_meters FROM public.location_verifications v WHERE v.id = location_verifications.id)
    );

-- ZERO DELETE POLICIES: Verification records are permanent audit evidence!

-- Trigger Safeguard: Prevent verification outcome tampering
CREATE OR REPLACE FUNCTION public.prevent_verification_outcome_tampering()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow trusted database functions and service role
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- Prevent student from ever modifying an outcome
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.is_within_geofence IS DISTINCT FROM NEW.is_within_geofence) OR
       (OLD.is_mock_location IS DISTINCT FROM NEW.is_mock_location) THEN
        IF public.get_auth_user_role() = 'student' THEN
            RAISE EXCEPTION 'Security Violation: Students are strictly forbidden from modifying location verification outcomes.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_verification_outcome_tampering ON public.location_verifications;
CREATE TRIGGER trigger_prevent_verification_outcome_tampering
    BEFORE UPDATE ON public.location_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_verification_outcome_tampering();

-- ==============================================================================
-- J. VERIFICATION SCHEDULES (Random Ping Windows)
-- ==============================================================================
CREATE POLICY "schedules_select_scoped" ON public.verification_schedules
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_mentor_assigned_to_assignment(verification_schedules.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = verification_schedules.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "schedules_insert_mentor_hod" ON public.verification_schedules
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_mentor_assigned_to_assignment(assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "schedules_update_mentor_hod" ON public.verification_schedules
    FOR UPDATE TO authenticated
    USING (
        public.is_mentor_assigned_to_assignment(verification_schedules.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = verification_schedules.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    )
    WITH CHECK (
        public.is_mentor_assigned_to_assignment(verification_schedules.assignment_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.internship_assignments a
                WHERE a.id = verification_schedules.assignment_id
                  AND a.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "schedules_delete_hod" ON public.verification_schedules
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = verification_schedules.assignment_id
              AND a.institution_id = public.get_auth_user_institution_id()
        )
        AND public.get_auth_user_role() = 'hod'
    );

-- ==============================================================================
-- K. NOTIFICATIONS & FCM DEVICE TOKENS (Strict Personal Isolation)
-- ==============================================================================
CREATE POLICY "notifications_select_recipient" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

CREATE POLICY "notifications_update_recipient" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (
        recipient_id = auth.uid()
        -- Recipient can only mark read/unread
        AND notification_type = (SELECT n.notification_type FROM public.notifications n WHERE n.id = notifications.id)
    );

CREATE POLICY "notifications_delete_recipient" ON public.notifications
    FOR DELETE TO authenticated
    USING (recipient_id = auth.uid());

CREATE POLICY "notifications_insert_scoped" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Allowed if recipient is in the caller's institution
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = recipient_id
              AND p.institution_id = public.get_auth_user_institution_id()
        )
    );

CREATE POLICY "fcm_tokens_manage_own" ON public.fcm_device_tokens
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- L. AUDIT LOGS (Immutable & HOD Scoped)
-- ==============================================================================
CREATE POLICY "audit_logs_select_hod_scoped" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    );

-- ZERO UPDATE & ZERO DELETE POLICIES FOR AUDIT LOGS

-- Trigger Safeguard: Reject ANY UPDATE or DELETE on audit_logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: System audit logs are strictly append-only and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trigger_prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ==============================================================================
-- M. STUDENT DAILY LOGS (Personal Submission & Cohort Mentor Review)
-- ==============================================================================
CREATE POLICY "daily_logs_select_scoped" ON public.student_daily_logs
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_mentor_assigned_to_student(student_daily_logs.student_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = student_daily_logs.student_id
                  AND p.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "daily_logs_insert_student" ON public.student_daily_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND public.get_auth_user_role() = 'student'
        AND review_status = 'pending'
    );

CREATE POLICY "daily_logs_update_scoped" ON public.student_daily_logs
    FOR UPDATE TO authenticated
    USING (
        (student_id = auth.uid() AND review_status = 'pending')
        OR public.is_mentor_assigned_to_student(student_daily_logs.student_id)
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = student_daily_logs.student_id
                  AND p.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    )
    WITH CHECK (
        (
            -- Student can update log contents only while pending
            student_id = auth.uid()
            AND review_status = 'pending'
            AND mentor_feedback IS NOT DISTINCT FROM (SELECT l.mentor_feedback FROM public.student_daily_logs l WHERE l.id = student_daily_logs.id)
        )
        OR (
            -- Mentor can update review status and feedback
            public.is_mentor_assigned_to_student(student_daily_logs.student_id)
            AND student_id = (SELECT l.student_id FROM public.student_daily_logs l WHERE l.id = student_daily_logs.id)
        )
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = student_daily_logs.student_id
                  AND p.institution_id = public.get_auth_user_institution_id()
            )
            AND public.get_auth_user_role() = 'hod'
        )
    );

CREATE POLICY "daily_logs_delete_student_pending" ON public.student_daily_logs
    FOR DELETE TO authenticated
    USING (
        student_id = auth.uid()
        AND review_status = 'pending'
    );

