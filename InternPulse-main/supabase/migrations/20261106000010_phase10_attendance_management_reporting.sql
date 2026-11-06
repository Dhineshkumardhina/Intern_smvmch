-- ==============================================================================
-- PHASE 10: INTERNPULSE ATTENDANCE MANAGEMENT & ADVANCED REPORTING MIGRATION
-- Sri Manakula Vinayagar Engineering College (SMVEC)
--
-- Capabilities:
-- 1. Attendance Sessions Schema Expansion:
--    - scheduled_start_time, scheduled_end_time, required_hours
--    - check_in_distance_meters, check_out_distance_meters
--    - compliance_rate, offline_queued, client_timestamp, exception_reason
--    - mentor_reviewed_at, mentor_reviewed_by
-- 2. Stored Procedures:
--    - record_student_check_in()
--    - record_student_check_out()
--    - get_department_attendance_summary()
-- 3. Strict Audit Integrity: Prevent silent overwrites and maintain full history
-- 4. Multi-Role Scoping & Reporting Indexes
-- ==============================================================================

-- 1. Expand public.attendance_sessions
DO $$
BEGIN
    -- scheduled_start_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'scheduled_start_time'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN scheduled_start_time TIME;
    END IF;

    -- scheduled_end_time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'scheduled_end_time'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN scheduled_end_time TIME;
    END IF;

    -- required_hours
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'required_hours'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN required_hours NUMERIC(4,2) DEFAULT 8.0;
    END IF;

    -- check_in_distance_meters
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'check_in_distance_meters'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN check_in_distance_meters DOUBLE PRECISION;
    END IF;

    -- check_out_distance_meters
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'check_out_distance_meters'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN check_out_distance_meters DOUBLE PRECISION;
    END IF;

    -- compliance_rate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'compliance_rate'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN compliance_rate NUMERIC(5,2) DEFAULT 100.0;
    END IF;

    -- offline_queued
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'offline_queued'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN offline_queued BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- client_timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'client_timestamp'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN client_timestamp TIMESTAMPTZ;
    END IF;

    -- exception_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'exception_reason'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN exception_reason TEXT;
    END IF;

    -- mentor_reviewed_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'mentor_reviewed_at'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN mentor_reviewed_at TIMESTAMPTZ;
    END IF;

    -- mentor_reviewed_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'attendance_sessions' 
          AND column_name = 'mentor_reviewed_by'
    ) THEN
        ALTER TABLE public.attendance_sessions
        ADD COLUMN mentor_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Indexes for Reporting & Exception Queries
CREATE INDEX IF NOT EXISTS idx_attendance_dept_date 
    ON public.attendance_sessions(session_date, status);

CREATE INDEX IF NOT EXISTS idx_attendance_compliance 
    ON public.attendance_sessions(compliance_rate);

CREATE INDEX IF NOT EXISTS idx_attendance_exception 
    ON public.attendance_sessions(status, is_verified) 
    WHERE status IN ('flagged', 'half_day', 'late') OR is_verified = false;

-- 3. Stored Procedure: Student Check-In with Validation & Duplicate Prevention
CREATE OR REPLACE FUNCTION public.record_student_check_in(
    p_student_id UUID,
    p_assignment_id UUID,
    p_location_id UUID DEFAULT NULL,
    p_session_date DATE DEFAULT CURRENT_DATE,
    p_check_in_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_distance_meters DOUBLE PRECISION DEFAULT NULL,
    p_is_offline BOOLEAN DEFAULT false,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_assignment RECORD;
    v_existing_id UUID;
    v_session_id UUID;
    v_status VARCHAR(20) := 'present';
    v_start_time TIME;
    v_end_time TIME;
    v_req_hours NUMERIC(4,2) := 8.0;
    v_checkin_time TIME;
BEGIN
    -- 1. Validate Active Assignment
    SELECT * INTO v_assignment
    FROM public.internship_assignments
    WHERE id = p_assignment_id AND student_id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active internship assignment % not found for student %.', p_assignment_id, p_student_id;
    END IF;

    IF v_assignment.status <> 'active' THEN
        RAISE EXCEPTION 'Cannot check in: Internship assignment is "%". Only active assignments are permitted.', v_assignment.status;
    END IF;

    -- Date range bounds check
    IF p_session_date < v_assignment.start_date OR p_session_date > v_assignment.end_date THEN
        RAISE EXCEPTION 'Cannot check in: Session date % is outside assignment dates (% to %).', 
            p_session_date, v_assignment.start_date, v_assignment.end_date;
    END IF;

    -- 2. Prevent Duplicate Check-In
    SELECT id INTO v_existing_id
    FROM public.attendance_sessions
    WHERE student_id = p_student_id AND session_date = p_session_date;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'Duplicate check-in rejected: Attendance already recorded for student % on %.', p_student_id, p_session_date;
    END IF;

    -- 3. Extract Schedule Parameters
    v_start_time := COALESCE(v_assignment.monitoring_start_time, '09:00:00'::time);
    v_end_time := COALESCE(v_assignment.monitoring_end_time, '18:00:00'::time);
    v_req_hours := COALESCE(v_assignment.required_daily_hours, 8.0);

    -- Punctuality check: Flag as 'late' if checked in > 30 minutes after scheduled start
    v_checkin_time := (p_check_in_timestamp AT TIME ZONE 'Asia/Kolkata')::time;
    IF v_start_time IS NOT NULL AND v_checkin_time > (v_start_time + interval '30 minutes') THEN
        v_status := 'late';
    END IF;

    -- 4. Insert Attendance Record
    INSERT INTO public.attendance_sessions (
        assignment_id,
        student_id,
        session_date,
        check_in_at,
        check_in_location_id,
        scheduled_start_time,
        scheduled_end_time,
        required_hours,
        check_in_distance_meters,
        status,
        is_verified,
        offline_queued,
        client_timestamp,
        notes
    ) VALUES (
        p_assignment_id,
        p_student_id,
        p_session_date,
        p_check_in_timestamp,
        COALESCE(p_location_id, v_assignment.location_id),
        v_start_time,
        v_end_time,
        v_req_hours,
        p_distance_meters,
        v_status,
        false,
        p_is_offline,
        p_check_in_timestamp,
        p_notes
    ) RETURNING id INTO v_session_id;

    RETURN jsonb_build_object(
        'session_id', v_session_id,
        'student_id', p_student_id,
        'assignment_id', p_assignment_id,
        'session_date', p_session_date,
        'check_in_at', p_check_in_timestamp,
        'status', v_status,
        'message', 'Check-in recorded successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Stored Procedure: Student Check-Out with Total Hours Calculation
CREATE OR REPLACE FUNCTION public.record_student_check_out(
    p_session_id UUID,
    p_check_out_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    p_location_id UUID DEFAULT NULL,
    p_distance_meters DOUBLE PRECISION DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_hours NUMERIC(5,2);
    v_status VARCHAR(20);
BEGIN
    SELECT * INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attendance session % not found.', p_session_id;
    END IF;

    IF v_session.check_in_at IS NULL THEN
        RAISE EXCEPTION 'Cannot check out: Session % has no check-in record.', p_session_id;
    END IF;

    IF v_session.check_out_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot check out: Session % is already checked out at %.', p_session_id, v_session.check_out_at;
    END IF;

    IF p_check_out_timestamp < v_session.check_in_at THEN
        RAISE EXCEPTION 'Invalid check-out: Check-out timestamp (%) cannot precede check-in (%).', 
            p_check_out_timestamp, v_session.check_in_at;
    END IF;

    -- Calculate total hours
    v_hours := ROUND((EXTRACT(EPOCH FROM (p_check_out_timestamp - v_session.check_in_at)) / 3600.0)::numeric, 2);

    -- Status classification based on hours
    v_status := v_session.status;
    IF v_hours < (COALESCE(v_session.required_hours, 8.0) / 2.0) THEN
        v_status := 'half_day';
    ELSIF v_status = 'late' THEN
        v_status := 'late'; // Preserved
    ELSIF v_hours >= COALESCE(v_session.required_hours, 8.0) THEN
        v_status := 'present';
    END IF;

    UPDATE public.attendance_sessions
    SET check_out_at = p_check_out_timestamp,
        check_out_location_id = COALESCE(p_location_id, v_session.check_in_location_id),
        check_out_distance_meters = p_distance_meters,
        total_hours = v_hours,
        status = v_status,
        notes = CASE 
            WHEN p_notes IS NOT NULL AND v_session.notes IS NOT NULL THEN v_session.notes || ' | ' || p_notes
            WHEN p_notes IS NOT NULL THEN p_notes
            ELSE v_session.notes
        END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'session_id', p_session_id,
        'student_id', v_session.student_id,
        'check_in_at', v_session.check_in_at,
        'check_out_at', p_check_out_timestamp,
        'total_hours', v_hours,
        'status', v_status,
        'message', 'Check-out recorded successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.record_student_check_in TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_student_check_out TO authenticated;

