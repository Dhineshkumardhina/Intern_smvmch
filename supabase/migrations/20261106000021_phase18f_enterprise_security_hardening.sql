-- =====================================================================================
-- Migration: 20261106000021_phase18f_enterprise_security_hardening.sql
-- Description: Phase 18F: Enterprise Security, Privacy & Cross-Tenant Governance Hardening
--              Remediates:
--              1. VULN-18F-02: Cross-Tenant Data Tampering in purge_expired_location_coordinates
--              2. VULN-18F-03: Cross-Tenant Window Sweeping in process_window_transitions
--              3. Cross-Tenant FCM Token Invalidation in invalidate_expired_device_token
--              4. student_consents RLS Hardening (Mentor Auditing & WITH CHECK)
--              5. storage.objects Path Traversal Protection (CWE-22)
-- Target: PostgreSQL 15+ / PostGIS 3+ / Supabase Multi-Tenant Architecture
-- Date: 2026-11-06
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. HARDEN purge_expired_location_coordinates (VULN-18F-02 Remediation)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_location_coordinates(
    p_retention_days INT DEFAULT 30,
    p_department_id UUID DEFAULT NULL,
    p_institution_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_purged_count INT := 0;
    v_cutoff_timestamp TIMESTAMPTZ;
    v_caller_role VARCHAR(30);
    v_caller_dept_id UUID;
    v_caller_inst_id UUID;
    v_effective_dept_id UUID;
    v_effective_inst_id UUID;
BEGIN
    -- 1. Identify and authenticate caller
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        v_caller_role := 'service_role';
        v_effective_dept_id := p_department_id;
        v_effective_inst_id := p_institution_id;
    ELSE
        v_caller_role := public.get_auth_user_role();
        v_caller_dept_id := public.get_auth_user_department_id();
        v_caller_inst_id := public.get_auth_user_institution_id();

        IF v_caller_role NOT IN ('super_admin', 'admin', 'hod', 'platform_super_admin') THEN
            RAISE EXCEPTION 'Access Denied: Only Institution Administrators, HODs, or Platform Admins can purge location coordinates.';
        END IF;

        -- If caller is Platform Super Admin, allow targeted institution or null
        IF public.is_platform_admin() THEN
            v_effective_inst_id := COALESCE(p_institution_id, v_caller_inst_id);
            v_effective_dept_id := p_department_id;
        ELSE
            -- Strictly bind to caller's own verified institution
            IF v_caller_inst_id IS NULL THEN
                RAISE EXCEPTION 'Security Violation: Caller has no verified institutional membership.';
            END IF;
            v_effective_inst_id := v_caller_inst_id;

            -- If caller is HOD, strictly enforce their assigned department
            IF v_caller_role = 'hod' THEN
                IF v_caller_dept_id IS NULL THEN
                    RAISE EXCEPTION 'Security Violation: HOD has no assigned department.';
                END IF;
                v_effective_dept_id := v_caller_dept_id;
            ELSE
                -- Institution Admin can target specific department in their own institution
                v_effective_dept_id := p_department_id;
            END IF;
        END IF;
    END IF;

    v_cutoff_timestamp := timezone('utc'::text, now()) - (p_retention_days || ' days')::interval;

    -- 2. Purge exact GPS coordinates older than retention threshold within authorized tenant boundary
    WITH target_students AS (
        SELECT id FROM public.profiles
        WHERE (v_effective_inst_id IS NULL OR institution_id = v_effective_inst_id)
          AND (v_effective_dept_id IS NULL OR department_id = v_effective_dept_id)
    ),
    purged AS (
        UPDATE public.location_verifications lv
        SET captured_latitude = NULL,
            captured_longitude = NULL,
            geog = NULL,
            remarks = COALESCE(lv.remarks, '') || ' [Coordinates purged in accordance with 30-day DPDP retention policy]'
        WHERE lv.student_id IN (SELECT id FROM target_students)
          AND (v_effective_inst_id IS NULL OR lv.institution_id = v_effective_inst_id)
          AND lv.created_at < v_cutoff_timestamp
          AND (lv.captured_latitude IS NOT NULL OR lv.captured_longitude IS NOT NULL)
        RETURNING lv.id
    )
    SELECT count(*) INTO v_purged_count FROM purged;

    RETURN jsonb_build_object(
        'status', 'success',
        'retention_days', p_retention_days,
        'institution_id', v_effective_inst_id,
        'department_id', v_effective_dept_id,
        'purged_records_count', v_purged_count,
        'message', format('Successfully purged exact GPS coordinates for %s verification records older than %s days (Institution Scope: %s).', 
            v_purged_count, 
            p_retention_days, 
            COALESCE(v_effective_inst_id::text, 'ALL_PLATFORM')
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_location_coordinates TO authenticated;

-- -------------------------------------------------------------------------------------
-- 2. HARDEN process_window_transitions (VULN-18F-03 Remediation)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_window_transitions(
    p_current_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    p_institution_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rec RECORD;
    v_opened_count INT := 0;
    v_missed_count INT := 0;
    v_caller_role VARCHAR(30);
    v_caller_inst_id UUID;
    v_effective_inst_id UUID;
BEGIN
    -- Privileged Caller Check
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        v_effective_inst_id := p_institution_id;
    ELSE
        v_caller_role := public.get_auth_user_role();
        v_caller_inst_id := public.get_auth_user_institution_id();

        IF v_caller_role NOT IN ('hod', 'admin', 'super_admin', 'platform_super_admin') THEN
            RAISE EXCEPTION 'Access Denied: Only authorized HODs, Institution Admins, or Scheduler services can trigger window transitions.';
        END IF;

        IF public.is_platform_admin() THEN
            v_effective_inst_id := COALESCE(p_institution_id, v_caller_inst_id);
        ELSE
            -- Strictly bind to caller's verified institution
            IF v_caller_inst_id IS NULL THEN
                RAISE EXCEPTION 'Security Violation: Caller has no verified institutional membership.';
            END IF;
            v_effective_inst_id := v_caller_inst_id;
        END IF;
    END IF;

    -- 1. Transition SCHEDULED windows to OPEN within scoped institution
    FOR v_rec IN 
        SELECT id, student_id, assignment_id, window_start, window_end, institution_id
        FROM public.verification_schedules
        WHERE status = 'SCHEDULED'
          AND (v_effective_inst_id IS NULL OR institution_id = v_effective_inst_id)
          AND window_start <= p_current_timestamp
          AND window_end > p_current_timestamp
    LOOP
        UPDATE public.verification_schedules
        SET status = 'OPEN',
            updated_at = p_current_timestamp
        WHERE id = v_rec.id;

        -- Create verification request notification scoped to institution
        INSERT INTO public.notifications (
            institution_id,
            recipient_id,
            title,
            body,
            notification_type,
            action_url,
            data
        ) VALUES (
            v_rec.institution_id,
            v_rec.student_id,
            'Internship Location Verification Prompt',
            'A 15-minute verification window is now open. Please submit your workplace location.',
            'verification_request',
            '/student/attendance',
            jsonb_build_object(
                'schedule_id', v_rec.id,
                'assignment_id', v_rec.assignment_id,
                'window_start', v_rec.window_start,
                'window_end', v_rec.window_end
            )
        );

        v_opened_count := v_opened_count + 1;
    END LOOP;

    -- 2. Transition expired windows to MISSED within scoped institution
    FOR v_rec IN
        SELECT id, student_id, assignment_id
        FROM public.verification_schedules
        WHERE status = 'OPEN'
          AND (v_effective_inst_id IS NULL OR institution_id = v_effective_inst_id)
          AND window_end <= p_current_timestamp
    LOOP
        UPDATE public.verification_schedules
        SET status = 'MISSED',
            missed_reason = 'Student did not submit location telemetry during the open window.',
            updated_at = p_current_timestamp
        WHERE id = v_rec.id;

        v_missed_count := v_missed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'success',
        'opened_windows_count', v_opened_count,
        'missed_windows_count', v_missed_count,
        'institution_id', v_effective_inst_id,
        'evaluated_at', p_current_timestamp
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_window_transitions TO authenticated;

-- -------------------------------------------------------------------------------------
-- 3. HARDEN invalidate_expired_device_token WITH TENANT ISOLATION
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_expired_device_token(
    p_token TEXT,
    p_reason TEXT DEFAULT 'Unregistered / Expired by FCM'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.fcm_device_tokens
    SET is_active = false,
        expired_at = timezone('utc'::text, now()),
        failure_count = failure_count + 1
    WHERE token = p_token
      AND (
          current_user IN ('postgres', 'service_role', 'supabase_admin')
          OR user_id = auth.uid()
          OR (
              public.get_auth_user_role() IN ('hod', 'admin', 'super_admin')
              AND user_id IN (
                  SELECT id FROM public.profiles 
                  WHERE institution_id = public.get_auth_user_institution_id()
              )
          )
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.invalidate_expired_device_token TO authenticated;

-- -------------------------------------------------------------------------------------
-- 4. HARDEN student_consents RLS POLICIES (Mentor Auditing & WITH CHECK)
-- -------------------------------------------------------------------------------------
DROP POLICY IF EXISTS "student_consents_select" ON public.student_consents;
DROP POLICY IF EXISTS "student_consents_update" ON public.student_consents;

-- SELECT: Student themselves, Institution Admin, or assigned Mentor/HOD
CREATE POLICY "student_consents_select" ON public.student_consents
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND (
                student_id = auth.uid()
                OR public.is_institution_admin(institution_id)
                OR public.is_mentor_authorized_for_student(student_id)
                OR public.can_access_department(
                    (SELECT department_id FROM public.profiles WHERE id = student_consents.student_id)
                )
            )
        )
    );

-- UPDATE: Student or Admin in same institution, with strict WITH CHECK
CREATE POLICY "student_consents_update" ON public.student_consents
    FOR UPDATE TO authenticated
    USING (
        public.is_platform_admin()
        OR (
            institution_id = public.get_auth_user_institution_id()
            AND (
                student_id = auth.uid()
                OR public.is_institution_admin(institution_id)
            )
        )
    )
    WITH CHECK (
        public.is_platform_admin()
        OR institution_id = public.get_auth_user_institution_id()
    );

-- -------------------------------------------------------------------------------------
-- 5. HARDEN storage.objects RLS POLICIES (Anti-Path Traversal CWE-22)
-- -------------------------------------------------------------------------------------
DO $$
BEGIN
    DROP POLICY IF EXISTS "tenant_storage_select" ON storage.objects;
    DROP POLICY IF EXISTS "tenant_storage_insert" ON storage.objects;
    DROP POLICY IF EXISTS "tenant_storage_update" ON storage.objects;
    DROP POLICY IF EXISTS "tenant_storage_delete" ON storage.objects;

    -- SELECT: Enforce institution prefix & prevent path traversal
    CREATE POLICY "tenant_storage_select" ON storage.objects
        FOR SELECT TO authenticated
        USING (
            name NOT LIKE '%..%' 
            AND name NOT LIKE '%//%'
            AND (
                public.is_platform_admin()
                OR (storage.foldername(name))[1] = public.get_auth_user_institution_id()::text
            )
        );

    -- INSERT: Enforce institution prefix & prevent path traversal
    CREATE POLICY "tenant_storage_insert" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            name NOT LIKE '%..%' 
            AND name NOT LIKE '%//%'
            AND (storage.foldername(name))[1] = public.get_auth_user_institution_id()::text
        );

    -- UPDATE: Enforce institution prefix & prevent path traversal
    CREATE POLICY "tenant_storage_update" ON storage.objects
        FOR UPDATE TO authenticated
        USING (
            name NOT LIKE '%..%' 
            AND name NOT LIKE '%//%'
            AND (storage.foldername(name))[1] = public.get_auth_user_institution_id()::text
        )
        WITH CHECK (
            name NOT LIKE '%..%' 
            AND name NOT LIKE '%//%'
            AND (storage.foldername(name))[1] = public.get_auth_user_institution_id()::text
        );

    -- DELETE: Enforce institution prefix & prevent path traversal
    CREATE POLICY "tenant_storage_delete" ON storage.objects
        FOR DELETE TO authenticated
        USING (
            name NOT LIKE '%..%' 
            AND name NOT LIKE '%//%'
            AND (
                public.is_platform_admin()
                OR (
                    (storage.foldername(name))[1] = public.get_auth_user_institution_id()::text
                    AND public.is_institution_admin(public.get_auth_user_institution_id())
                )
            )
        );
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- storage.objects might not be initialized in all environments
END $$;

