-- ==============================================================================
-- PHASE 7: INTERNPULSE GEOLOCATION VERIFICATION ENGINE MIGRATION
-- Sri Manakula Vinayagar Engineering College (SMVEC)
--
-- Capabilities:
-- 1. Schema Expansion for the 8 Canonical Result States:
--    - WITHIN_GEOFENCE
--    - OUTSIDE_GEOFENCE
--    - LOCATION_UNAVAILABLE
--    - GPS_DISABLED
--    - PERMISSION_DENIED
--    - LOW_ACCURACY
--    - NETWORK_UNAVAILABLE
--    - VERIFICATION_PENDING
-- 2. Telemetry & Context Tracking (Geofence radius, Connectivity, Battery optimization, Consent, Monitoring schedule)
-- 3. Safety Rule Enforcement: GPS/Network/Permission failures are NEVER classified as geofence violations
-- 4. Geospatial Verification Engine RPC (verify_student_geofence) using PostGIS geography
-- 5. Historical Record Immutability & Audit Trail Preservation
-- ==============================================================================

-- 1. Enhance location_verifications table with Phase 7 fields
DO $$
BEGIN
    -- Add verification_result column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'location_verifications' 
          AND column_name = 'verification_result'
    ) THEN
        ALTER TABLE public.location_verifications
        ADD COLUMN verification_result VARCHAR(40) 
        CHECK (verification_result IN (
            'WITHIN_GEOFENCE',
            'OUTSIDE_GEOFENCE',
            'LOCATION_UNAVAILABLE',
            'GPS_DISABLED',
            'PERMISSION_DENIED',
            'LOW_ACCURACY',
            'NETWORK_UNAVAILABLE',
            'VERIFICATION_PENDING'
        )) DEFAULT 'VERIFICATION_PENDING';
    END IF;

    -- Add geofence_radius_meters column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'location_verifications' 
          AND column_name = 'geofence_radius_meters'
    ) THEN
        ALTER TABLE public.location_verifications
        ADD COLUMN geofence_radius_meters DOUBLE PRECISION 
        CHECK (geofence_radius_meters IS NULL OR geofence_radius_meters > 0);
    END IF;

    -- Add connectivity_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'location_verifications' 
          AND column_name = 'connectivity_status'
    ) THEN
        ALTER TABLE public.location_verifications
        ADD COLUMN connectivity_status VARCHAR(20) DEFAULT 'UNKNOWN'
        CHECK (connectivity_status IN ('WIFI', 'CELLULAR', 'ETHERNET', 'NONE', 'UNKNOWN'));
    END IF;

    -- Add battery_optimization_status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'location_verifications' 
          AND column_name = 'battery_optimization_status'
    ) THEN
        ALTER TABLE public.location_verifications
        ADD COLUMN battery_optimization_status VARCHAR(40) DEFAULT 'UNKNOWN';
    END IF;

    -- Add consent_verified column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'location_verifications' 
          AND column_name = 'consent_verified'
    ) THEN
        ALTER TABLE public.location_verifications
        ADD COLUMN consent_verified BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add consent_timestamp column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'location_verifications' 
          AND column_name = 'consent_timestamp'
    ) THEN
        ALTER TABLE public.location_verifications
        ADD COLUMN consent_timestamp TIMESTAMPTZ;
    END IF;

    -- Add within_monitoring_window column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'location_verifications' 
          AND column_name = 'within_monitoring_window'
    ) THEN
        ALTER TABLE public.location_verifications
        ADD COLUMN within_monitoring_window BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 2. Indexes for Phase 7 Performance
CREATE INDEX IF NOT EXISTS idx_verifications_result 
    ON public.location_verifications(verification_result);

CREATE INDEX IF NOT EXISTS idx_verifications_student_created 
    ON public.location_verifications(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_assignment_result 
    ON public.location_verifications(assignment_id, verification_result);

-- 3. Backward Compatibility Sync Trigger between status and verification_result
CREATE OR REPLACE FUNCTION public.sync_phase7_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize verification_result -> status & is_within_geofence
    IF NEW.verification_result IS NOT NULL THEN
        CASE NEW.verification_result
            WHEN 'WITHIN_GEOFENCE' THEN
                NEW.is_within_geofence := true;
                NEW.status := 'verified';
            WHEN 'OUTSIDE_GEOFENCE' THEN
                NEW.is_within_geofence := false;
                NEW.status := 'out_of_bounds';
            WHEN 'LOW_ACCURACY' THEN
                NEW.is_within_geofence := NULL;
                NEW.status := 'low_accuracy_rejected';
            WHEN 'LOCATION_UNAVAILABLE' THEN
                NEW.is_within_geofence := NULL;
                NEW.status := 'timeout';
            WHEN 'GPS_DISABLED' THEN
                NEW.is_within_geofence := NULL;
                NEW.status := 'timeout';
            WHEN 'PERMISSION_DENIED' THEN
                NEW.is_within_geofence := NULL;
                NEW.status := 'timeout';
            WHEN 'NETWORK_UNAVAILABLE' THEN
                NEW.is_within_geofence := NULL;
                NEW.status := 'timeout';
            WHEN 'VERIFICATION_PENDING' THEN
                NEW.is_within_geofence := NULL;
                NEW.status := 'pending';
        END CASE;
    -- Synchronize legacy status -> verification_result if legacy is provided
    ELSIF NEW.status IS NOT NULL THEN
        CASE NEW.status
            WHEN 'verified' THEN
                NEW.verification_result := 'WITHIN_GEOFENCE';
                NEW.is_within_geofence := true;
            WHEN 'out_of_bounds' THEN
                NEW.verification_result := 'OUTSIDE_GEOFENCE';
                NEW.is_within_geofence := false;
            WHEN 'low_accuracy_rejected' THEN
                NEW.verification_result := 'LOW_ACCURACY';
            WHEN 'timeout' THEN
                NEW.verification_result := 'LOCATION_UNAVAILABLE';
            ELSE
                NEW.verification_result := 'VERIFICATION_PENDING';
        END CASE;
    END IF;

    -- Ensure PostGIS point is synced
    IF (NEW.captured_latitude IS NOT NULL AND NEW.captured_longitude IS NOT NULL) THEN
        NEW.captured_location := ST_SetSRID(ST_MakePoint(NEW.captured_longitude, NEW.captured_latitude), 4326)::geography;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_phase7_verification_status ON public.location_verifications;
CREATE TRIGGER trigger_sync_phase7_verification_status
    BEFORE INSERT OR UPDATE ON public.location_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_phase7_verification_status();

-- 4. Audit Trail Preservation Trigger (Immutable Historical Records)
CREATE OR REPLACE FUNCTION public.preserve_verification_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent altering primary verification outcome attributes once recorded
    IF OLD.verification_result IS NOT NULL AND OLD.verification_result <> 'VERIFICATION_PENDING' THEN
        IF NEW.verification_result <> OLD.verification_result THEN
            RAISE EXCEPTION 'Historical verification result is immutable and cannot be altered.';
        END IF;
        IF NEW.distance_to_center_meters IS DISTINCT FROM OLD.distance_to_center_meters THEN
            RAISE EXCEPTION 'Historical geofence distance calculation cannot be altered.';
        END IF;
        IF NEW.captured_latitude IS DISTINCT FROM OLD.captured_latitude OR NEW.captured_longitude IS DISTINCT FROM OLD.captured_longitude THEN
            RAISE EXCEPTION 'Historical captured GPS coordinates cannot be altered.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_preserve_verification_audit_trail ON public.location_verifications;
CREATE TRIGGER trigger_preserve_verification_audit_trail
    BEFORE UPDATE ON public.location_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.preserve_verification_audit_trail();

-- 5. Stored Procedure / RPC: verify_student_geofence
-- Evaluates location telemetry against student assignment, enforcing the safety rule and privacy guards
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
RETURNS JSONB AS $$
DECLARE
    v_assignment RECORD;
    v_location RECORD;
    v_assigned_point geography;
    v_captured_point geography;
    v_distance_meters DOUBLE PRECISION;
    v_geofence_radius DOUBLE PRECISION;
    v_result_state VARCHAR(40);
    v_accuracy_threshold CONSTANT DOUBLE PRECISION := 65.0; -- Max allowable horizontal accuracy error in meters
    v_current_time TIME;
    v_is_within_window BOOLEAN := true;
    v_verification_id UUID;
    v_record JSONB;
BEGIN
    -- 1. Anti-Surveillance & Consent Check
    IF NOT p_consent_given THEN
        v_result_state := 'PERMISSION_DENIED';
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

    SELECT * INTO v_location
    FROM public.internship_locations
    WHERE id = v_assignment.location_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workplace internship location % not found', v_assignment.location_id;
    END IF;

    v_geofence_radius := COALESCE(v_location.geofence_radius_meters, 200.0);

    -- 3. Anti-Surveillance Monitoring Period Check
    v_current_time := (p_timestamp AT TIME ZONE 'Asia/Kolkata')::time;
    IF v_assignment.monitoring_start_time IS NOT NULL AND v_assignment.monitoring_end_time IS NOT NULL THEN
        IF v_current_time < v_assignment.monitoring_start_time OR v_current_time > v_assignment.monitoring_end_time THEN
            v_is_within_window := false;
        END IF;
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
            -- Only high-confidence measurements can trigger OUTSIDE_GEOFENCE
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.verify_student_geofence TO authenticated;

