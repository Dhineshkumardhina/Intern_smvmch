-- ==============================================================================
-- INTERNPULSE — PHASE 17F SCHEMA MIGRATION
-- Independent Multi-Department Security, Privacy & Governance Hardening
-- Sri Manakula Vinayagar Engineering College (Autonomous) - SMVEC
-- ==============================================================================

-- 1. HARDEN PURGE FUNCTION WITH DEPARTMENT-LEVEL SCOPING & SUPER ADMIN SUPPORT
-- Remediates SEC-17F-01: purge_expired_location_coordinates lacked departmental scoping
-- for HOD invocations and denied explicit super_admin profile callers.

CREATE OR REPLACE FUNCTION public.purge_expired_location_coordinates(
    p_retention_days INT DEFAULT 30,
    p_department_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purged_count INT := 0;
    v_cutoff_timestamp TIMESTAMPTZ;
    v_caller_role VARCHAR(30);
    v_caller_dept_id UUID;
    v_effective_dept_id UUID;
BEGIN
    -- 1. Identify and authenticate caller
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        v_caller_role := 'service_role';
        v_effective_dept_id := p_department_id;
    ELSE
        v_caller_role := public.get_auth_user_role();
        v_caller_dept_id := public.get_auth_user_department_id();

        IF v_caller_role NOT IN ('super_admin', 'admin', 'hod') THEN
            RAISE EXCEPTION 'Access Denied: Only Institution Administrators or HODs can purge location coordinates.';
        END IF;

        -- If caller is HOD, strictly enforce their assigned department
        IF v_caller_role = 'hod' THEN
            IF v_caller_dept_id IS NULL THEN
                RAISE EXCEPTION 'Security Violation: HOD has no assigned department.';
            END IF;
            v_effective_dept_id := v_caller_dept_id;
        ELSE
            -- Super Admin / Admin can target a specific department or purge institution-wide (NULL)
            v_effective_dept_id := p_department_id;
        END IF;
    END IF;

    v_cutoff_timestamp := timezone('utc'::text, now()) - (p_retention_days || ' days')::interval;

    -- 2. Purge exact GPS coordinates older than retention threshold
    WITH target_students AS (
        SELECT id FROM public.profiles
        WHERE (v_effective_dept_id IS NULL OR department_id = v_effective_dept_id)
    ),
    purged AS (
        UPDATE public.location_verifications lv
        SET captured_latitude = NULL,
            captured_longitude = NULL,
            captured_location = NULL,
            accuracy_meters = NULL,
            remarks = COALESCE(lv.remarks, '') || ' [Coordinates purged in accordance with 30-day DPDP retention policy]'
        WHERE lv.requested_at < v_cutoff_timestamp
          AND (lv.captured_latitude IS NOT NULL OR lv.captured_longitude IS NOT NULL)
          AND lv.student_id IN (SELECT id FROM target_students)
        RETURNING lv.id
    )
    SELECT count(*) INTO v_purged_count FROM purged;

    RETURN jsonb_build_object(
        'cutoff_timestamp', v_cutoff_timestamp,
        'retention_days', p_retention_days,
        'department_id', v_effective_dept_id,
        'purged_records_count', v_purged_count,
        'executed_by_role', v_caller_role,
        'message', format('Successfully purged exact GPS coordinates for %s verification records older than %s days (Department Scope: %s).', 
            v_purged_count, 
            p_retention_days, 
            COALESCE(v_effective_dept_id::text, 'INSTITUTION-WIDE')
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_location_coordinates TO authenticated;

-- 2. HARDEN REPORT EXPORT LOGS RLS POLICY FOR HOD ISOLATION
-- Ensures HOD can ONLY inspect export logs for their own department code.
DROP POLICY IF EXISTS "HOD department access on report_export_logs" ON public.report_export_logs;

CREATE POLICY "HOD department access on report_export_logs"
  ON public.report_export_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'hod'
        AND profiles.is_active = true
        AND report_export_logs.department_filter = profiles.department_code
    )
  );

-- 3. AUDIT TRIGGER PROTECTION FOR REPORT EXPORT LOGS
-- Ensure report_export_logs is append-only for non-super-admins
DROP TRIGGER IF EXISTS audit_report_export_logs ON public.report_export_logs;
CREATE TRIGGER audit_report_export_logs
    AFTER INSERT OR UPDATE OR DELETE ON public.report_export_logs
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

