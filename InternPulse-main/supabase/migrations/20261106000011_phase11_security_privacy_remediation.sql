-- ==============================================================================
-- PHASE 11: INTERNPULSE SECURITY & PRIVACY REMEDIATION MIGRATION
-- Sri Manakula Vinayagar Engineering College (SMVEC)
--
-- Remediation Items Addressed:
-- 1. SEC-01 [CRITICAL]: Enforce caller authorization in verify_student_geofence
-- 2. SEC-02 [CRITICAL]: Halt execution and discard GPS coordinates outside monitoring windows
-- 3. SEC-03 [HIGH]: Enforce caller authorization in record_student_check_in and check_out
-- 4. SEC-04 [HIGH]: Restrict process_window_transitions to service_role and HOD
-- 5. SEC-05 [HIGH]: Fix missing search_path = public on all SECURITY DEFINER routines
-- 6. SEC-06 [HIGH]: Implement 30-day GPS coordinate purge policy for DPDP compliance
-- 7. SEC-09 [MEDIUM]: Add 60-second telemetry submission cooldown rate limiting
-- 8. SEC-10 [MEDIUM]: Attach automated audit triggers to public.attendance_sessions
-- 9. SEC-11 [MEDIUM]: Scope invalidate_expired_device_token to token owner or HOD
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REMEDIATION: SEC-01, SEC-02, SEC-05, SEC-09
-- Patch public.verify_student_geofence()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_student_geofence(
    p_student_id UUID,
    p_assignment_id UUID,
    p_captured_latitude DOUBLE PRECISION,
    p_captured_longitude DOUBLE PRECISION,
    p_accuracy_meters DOUBLE PRECISION,
    p_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    p_connectivity_status VARCHAR(20) DEFAULT 'WIFI',
    p_gps_available BOOLEAN DEFAULT true,
    p_permission_granted BOOLEAN DEFAULT true,
    p_consent_given BOOLEAN DEFAULT true,
    p_battery_status VARCHAR(40) DEFAULT 'OPTIMIZED',
    p_event_type VARCHAR(30) DEFAULT 'check_in',
    p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment RECORD;
    v_location RECORD;
    v_assigned_point geography;
    v_captured_point geography;
    v_distance_meters DOUBLE PRECISION;
    v_geofence_radius DOUBLE PRECISION;
    v_result_state VARCHAR(40);
    v_accuracy_threshold CONSTANT DOUBLE PRECISION := 65.0;
    v_current_time TIME;
    v_is_within_window BOOLEAN := true;
    v_verification_id UUID;
    v_record JSONB;
    v_caller_role VARCHAR(20);
    v_last_submission_time TIMESTAMPTZ;
BEGIN
    -- [SEC-01 REMEDIATION]: Enforce Caller Identity & Authorization
    -- Allow service_role, postgres, supabase_admin, the student themselves, their mentor, or HOD
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
        v_caller_role := public.get_auth_user_role();
        IF auth.uid() <> p_student_id THEN
            IF v_caller_role = 'mentor' THEN
                IF NOT public.is_mentor_assigned_to_student(p_student_id) THEN
                    RAISE EXCEPTION 'Access Denied: Mentor is not assigned to student %', p_student_id;
                END IF;
            ELSIF v_caller_role <> 'hod' THEN
                RAISE EXCEPTION 'Access Denied: You are not authorized to submit location telemetry for student %', p_student_id;
            END IF;
        END IF;
    END IF;

    -- [SEC-09 REMEDIATION]: 60-Second Cooldown Rate Limiting per student
    SELECT MAX(requested_at) INTO v_last_submission_time
    FROM public.location_verifications
    WHERE student_id = p_student_id;

    IF v_last_submission_time IS NOT NULL AND (p_timestamp - v_last_submission_time) < interval '60 seconds' THEN
        RAISE EXCEPTION 'Rate Limit Exceeded: Location verification requests must be spaced at least 60 seconds apart.';
    END IF;

    -- 1. Anti-Surveillance & Informed Consent Check
    IF NOT p_consent_given THEN
        INSERT INTO public.location_verifications (
            assignment_id, student_id, session_id, event_type,
            requested_at, responded_at, connectivity_status,
            battery_optimization_status, consent_verified,
            within_monitoring_window, verification_result, remarks
        ) VALUES (
            p_assignment_id, p_student_id, p_session_id, p_event_type,
            p_timestamp, p_timestamp, p_connectivity_status,
            p_battery_status, false, false, 'PERMISSION_DENIED',
            'Verification halted: Informed user consent not granted'
        ) RETURNING id INTO v_verification_id;

        RETURN jsonb_build_object(
            'id', v_verification_id,
            'student_id', p_student_id,
            'assignment_id', p_assignment_id,
            'verification_result', 'PERMISSION_DENIED',
            'message', 'Informed consent is required for location collection.'
        );
    END IF;

    -- 2. Retrieve Assignment and Assigned Workplace Location
    SELECT * INTO v_assignment
    FROM public.internship_assignments
    WHERE id = p_assignment_id AND student_id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active internship assignment % not found for student %', p_assignment_id, p_student_id;
    END IF;

    IF v_assignment.status <> 'active' THEN
        RAISE EXCEPTION 'Internship assignment % is not active (status: %)', p_assignment_id, v_assignment.status;
    END IF;

    SELECT * INTO v_location
    FROM public.internship_locations
    WHERE id = v_assignment.location_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workplace internship location % not found', v_assignment.location_id;
    END IF;

    v_geofence_radius := COALESCE(v_location.geofence_radius_meters, 200.0);

    -- 3. [SEC-02 REMEDIATION]: Anti-Surveillance Monitoring Period Check & Immediate Halting
    v_current_time := (p_timestamp AT TIME ZONE 'Asia/Kolkata')::time;
    IF v_assignment.monitoring_start_time IS NOT NULL AND v_assignment.monitoring_end_time IS NOT NULL THEN
        IF v_current_time < v_assignment.monitoring_start_time OR v_current_time > v_assignment.monitoring_end_time THEN
            v_is_within_window := false;
        END IF;
    END IF;

    -- If outside authorized monitoring window, HALT IMMEDIATELY and DISCARD coordinates!
    IF NOT v_is_within_window THEN
        INSERT INTO public.location_verifications (
            assignment_id,
            student_id,
            session_id,
            location_id,
            event_type,
            requested_at,
            responded_at,
            captured_latitude,
            captured_longitude,
            accuracy_meters,
            distance_to_center_meters,
            geofence_radius_meters,
            connectivity_status,
            battery_optimization_status,
            consent_verified,
            within_monitoring_window,
            verification_result,
            remarks
        ) VALUES (
            p_assignment_id,
            p_student_id,
            p_session_id,
            v_assignment.location_id,
            p_event_type,
            p_timestamp,
            p_timestamp,
            NULL, -- DO NOT STORE LATITUDE
            NULL, -- DO NOT STORE LONGITUDE
            NULL,
            NULL,
            v_geofence_radius,
            p_connectivity_status,
            p_battery_status,
            p_consent_given,
            false,
            'PERMISSION_DENIED',
            'Telemetry collection rejected: Request occurred outside authorized internship monitoring shift hours.'
        ) RETURNING id INTO v_verification_id;

        RETURN jsonb_build_object(
            'id', v_verification_id,
            'student_id', p_student_id,
            'assignment_id', p_assignment_id,
            'verification_result', 'PERMISSION_DENIED',
            'within_monitoring_window', false,
            'message', 'Location collection is prohibited outside authorized internship monitoring hours.'
        );
    END IF;

    -- 4. Apply Safety Rules & Device State Discrimination
    -- CRITICAL SAFETY RULE: Never classify GPS failure, network failure, permission denial or unavailable location as OUTSIDE_GEOFENCE
    IF p_connectivity_status = 'NONE' THEN
        v_result_state := 'NETWORK_UNAVAILABLE';
    ELSIF NOT p_permission_granted THEN
        v_result_state := 'PERMISSION_DENIED';
    ELSIF NOT p_gps_available THEN
        v_result_state := 'GPS_DISABLED';
    ELSIF p_captured_latitude IS NULL OR p_captured_longitude IS NULL THEN
        v_result_state := 'LOCATION_UNAVAILABLE';
    ELSIF p_accuracy_meters IS NOT NULL AND p_accuracy_meters > v_accuracy_threshold THEN
        v_result_state := 'LOW_ACCURACY';
    ELSE
        -- 5. Calculate Precise Geospatial Distance using PostGIS
        v_assigned_point := ST_SetSRID(ST_MakePoint(v_location.longitude, v_location.latitude), 4326)::geography;
        v_captured_point := ST_SetSRID(ST_MakePoint(p_captured_longitude, p_captured_latitude), 4326)::geography;
        v_distance_meters := ST_Distance(v_assigned_point, v_captured_point);

        IF v_distance_meters <= v_geofence_radius THEN
            v_result_state := 'WITHIN_GEOFENCE';
        ELSE
            -- Only high-confidence valid measurements can trigger OUTSIDE_GEOFENCE
            v_result_state := 'OUTSIDE_GEOFENCE';
        END IF;
    END IF;

    -- 6. Store Immutable Verification Record
    INSERT INTO public.location_verifications (
        assignment_id,
        student_id,
        session_id,
        location_id,
        event_type,
        requested_at,
        responded_at,
        captured_latitude,
        captured_longitude,
        accuracy_meters,
        distance_to_center_meters,
        geofence_radius_meters,
        connectivity_status,
        battery_optimization_status,
        consent_verified,
        consent_timestamp,
        within_monitoring_window,
        verification_result,
        remarks,
        verified_at
    ) VALUES (
        p_assignment_id,
        p_student_id,
        p_session_id,
        v_assignment.location_id,
        p_event_type,
        p_timestamp,
        p_timestamp,
        p_captured_latitude,
        p_captured_longitude,
        p_accuracy_meters,
        v_distance_meters,
        v_geofence_radius,
        p_connectivity_status,
        p_battery_status,
        p_consent_given,
        p_timestamp,
        v_is_within_window,
        v_result_state,
        CASE 
            WHEN v_result_state = 'WITHIN_GEOFENCE' THEN 'Device verified within approved workplace geofence radius.'
            WHEN v_result_state = 'OUTSIDE_GEOFENCE' THEN format('Device outside workplace geofence (Distance: %s m, Allowed: %s m).', round(v_distance_meters::numeric, 1), v_geofence_radius)
            WHEN v_result_state = 'LOW_ACCURACY' THEN format('Location rejected due to low GPS accuracy (Accuracy: %s m > Threshold: %s m).', round(p_accuracy_meters::numeric, 1), v_accuracy_threshold)
            WHEN v_result_state = 'GPS_DISABLED' THEN 'Device location services/GPS sensor switched off.'
            WHEN v_result_state = 'NETWORK_UNAVAILABLE' THEN 'Network offline; device could not transmit telemetric verification.'
            WHEN v_result_state = 'PERMISSION_DENIED' THEN 'Location permission not granted by device user.'
            ELSE 'Location unavailable or timed out.'
        END,
        CASE WHEN v_result_state = 'WITHIN_GEOFENCE' THEN p_timestamp ELSE NULL END
    )
    RETURNING jsonb_build_object(
        'id', id,
        'student_id', student_id,
        'assignment_id', assignment_id,
        'latitude', captured_latitude,
        'longitude', captured_longitude,
        'accuracy', accuracy_meters,
        'timestamp', requested_at,
        'distance_from_assigned_location', distance_to_center_meters,
        'geofence_radius', geofence_radius_meters,
        'verification_result', verification_result,
        'connectivity_status', connectivity_status,
        'consent_verified', consent_verified,
        'within_monitoring_window', within_monitoring_window
    ) INTO v_record;

    RETURN v_record;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. REMEDIATION: SEC-03, SEC-05
-- Patch public.record_student_check_in() & public.record_student_check_out()
-- ------------------------------------------------------------------------------
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
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment RECORD;
    v_existing_id UUID;
    v_session_id UUID;
    v_status VARCHAR(20) := 'present';
    v_start_time TIME;
    v_end_time TIME;
    v_req_hours NUMERIC(4,2) := 8.0;
    v_checkin_time TIME;
    v_caller_role VARCHAR(20);
BEGIN
    -- [SEC-03 REMEDIATION]: Enforce Caller Authorization
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
        v_caller_role := public.get_auth_user_role();
        IF auth.uid() <> p_student_id THEN
            IF v_caller_role = 'mentor' THEN
                IF NOT public.is_mentor_assigned_to_student(p_student_id) THEN
                    RAISE EXCEPTION 'Access Denied: Mentor is not assigned to student %', p_student_id;
                END IF;
            ELSIF v_caller_role <> 'hod' THEN
                RAISE EXCEPTION 'Access Denied: You cannot check in on behalf of another student.';
            END IF;
        END IF;
    END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.record_student_check_out(
    p_session_id UUID,
    p_check_out_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    p_location_id UUID DEFAULT NULL,
    p_distance_meters DOUBLE PRECISION DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_hours NUMERIC(5,2);
    v_status VARCHAR(20);
    v_caller_role VARCHAR(20);
BEGIN
    SELECT * INTO v_session
    FROM public.attendance_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attendance session % not found.', p_session_id;
    END IF;

    -- [SEC-03 REMEDIATION]: Enforce Caller Authorization on Check-Out
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
        v_caller_role := public.get_auth_user_role();
        IF auth.uid() <> v_session.student_id THEN
            IF v_caller_role = 'mentor' THEN
                IF NOT public.is_mentor_assigned_to_student(v_session.student_id) THEN
                    RAISE EXCEPTION 'Access Denied: Mentor is not assigned to student %', v_session.student_id;
                END IF;
            ELSIF v_caller_role <> 'hod' THEN
                RAISE EXCEPTION 'Access Denied: You cannot check out on behalf of another student.';
            END IF;
        END IF;
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
        v_status := 'late';
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
$$;

-- ------------------------------------------------------------------------------
-- 3. REMEDIATION: SEC-04, SEC-05
-- Restrict public.process_window_transitions()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_window_transitions(
    p_current_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_opened_count INT := 0;
    v_missed_count INT := 0;
BEGIN
    -- [SEC-04 REMEDIATION]: Enforce Privileged Caller Check (HOD, service_role, or postgres only)
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
        IF public.get_auth_user_role() <> 'hod' THEN
            RAISE EXCEPTION 'Access Denied: Only HOD administrators or backend scheduler services can trigger window transitions.';
        END IF;
    END IF;

    -- 1. Transition SCHEDULED windows to OPEN when window_start <= current_timestamp < window_end
    FOR v_rec IN 
        SELECT id, student_id, assignment_id, window_start, window_end
        FROM public.verification_schedules
        WHERE status = 'SCHEDULED'
          AND window_start <= p_current_timestamp
          AND window_end > p_current_timestamp
    LOOP
        UPDATE public.verification_schedules
        SET status = 'OPEN',
            updated_at = p_current_timestamp
        WHERE id = v_rec.id;

        -- Create verification request notification
        INSERT INTO public.notifications (
            recipient_id,
            title,
            body,
            notification_type,
            action_url,
            data
        ) VALUES (
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

    -- 2. Transition expired windows to MISSED if never responded
    FOR v_rec IN
        SELECT id, student_id, assignment_id
        FROM public.verification_schedules
        WHERE status = 'OPEN'
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
        'timestamp', p_current_timestamp,
        'windows_opened', v_opened_count,
        'windows_marked_missed', v_missed_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. REMEDIATION: SEC-05, SEC-11
-- Scope public.invalidate_expired_device_token()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invalidate_expired_device_token(
    p_token TEXT,
    p_reason TEXT DEFAULT 'Unregistered / Expired by FCM'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- [SEC-11 REMEDIATION]: Enforce token ownership or HOD/admin role
    UPDATE public.fcm_device_tokens
    SET is_active = false,
        expired_at = timezone('utc'::text, now()),
        failure_count = failure_count + 1
    WHERE token = p_token
      AND (
          current_user IN ('postgres', 'service_role', 'supabase_admin')
          OR user_id = auth.uid()
          OR public.get_auth_user_role() = 'hod'
      );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. REMEDIATION: SEC-06
-- Data Retention & Deletion Policy: 30-Day GPS Coordinate Purge Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_location_coordinates(
    p_retention_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purged_count INT := 0;
    v_cutoff_timestamp TIMESTAMPTZ;
BEGIN
    -- Only service_role or HOD can trigger data purge
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
        IF public.get_auth_user_role() <> 'hod' THEN
            RAISE EXCEPTION 'Access Denied: Only HOD administrators or maintenance routines can purge location coordinates.';
        END IF;
    END IF;

    v_cutoff_timestamp := timezone('utc'::text, now()) - (p_retention_days || ' days')::interval;

    -- Nullify exact GPS coordinates and geography points for records older than retention period
    -- Preserves verification_result, distance_to_center_meters, geofence_radius_meters, and timestamps
    WITH purged AS (
        UPDATE public.location_verifications
        SET captured_latitude = NULL,
            captured_longitude = NULL,
            captured_location = NULL,
            accuracy_meters = NULL,
            remarks = COALESCE(remarks, '') || ' [Coordinates purged in accordance with 30-day DPDP retention policy]'
        WHERE requested_at < v_cutoff_timestamp
          AND (captured_latitude IS NOT NULL OR captured_longitude IS NOT NULL)
        RETURNING id
    )
    SELECT count(*) INTO v_purged_count FROM purged;

    RETURN jsonb_build_object(
        'cutoff_timestamp', v_cutoff_timestamp,
        'retention_days', p_retention_days,
        'purged_records_count', v_purged_count,
        'message', format('Successfully purged exact GPS coordinates for %s verification records older than %s days.', v_purged_count, p_retention_days)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_location_coordinates TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. REMEDIATION: SEC-10
-- Attach Automated Audit Triggers to public.attendance_sessions
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_attendance_sessions ON public.attendance_sessions;
CREATE TRIGGER audit_attendance_sessions
    AFTER INSERT OR UPDATE OR DELETE ON public.attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

-- Ensure search_path on remaining security triggers
CREATE OR REPLACE FUNCTION public.prevent_verification_outcome_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.is_within_geofence IS DISTINCT FROM NEW.is_within_geofence) OR
       (OLD.is_mock_location IS DISTINCT FROM NEW.is_mock_location) THEN
        IF public.get_auth_user_role() = 'student' THEN
            RAISE EXCEPTION 'Security Violation: Students are strictly forbidden from modifying location verification outcomes.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: System audit logs are strictly append-only and cannot be updated or deleted.';
END;
$$;

