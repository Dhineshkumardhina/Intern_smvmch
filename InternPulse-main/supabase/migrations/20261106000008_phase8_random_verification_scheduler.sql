-- ==============================================================================
-- PHASE 8: INTERNPULSE SERVER-SIDE RANDOMIZED LOCATION VERIFICATION SCHEDULER
-- Sri Manakula Vinayagar Engineering College (SMVEC)
--
-- Capabilities:
-- 1. 8 Canonical Verification States on verification_schedules:
--    - SCHEDULED
--    - OPEN
--    - SUBMITTED
--    - VERIFIED
--    - MISSED
--    - LOCATION_UNAVAILABLE
--    - EXPIRED
--    - CANCELLED
-- 2. Enhanced Fields (retry_count, max_retries, submission_timestamp, notification_dispatched_at, timezone)
-- 3. Idempotent Schedule Storage (Unique index preventing duplicate windows)
-- 4. Anti-Prediction RLS Policy: Students cannot see future SCHEDULED windows before window_start
-- 5. Stored Procedures:
--    - generate_daily_verification_schedules(target_date)
--    - process_window_transitions(current_timestamp)
-- ==============================================================================

-- 1. Upgrade status check constraint on verification_schedules
ALTER TABLE public.verification_schedules 
    DROP CONSTRAINT IF EXISTS verification_schedules_status_check;

ALTER TABLE public.verification_schedules
    ADD CONSTRAINT verification_schedules_status_check
    CHECK (status IN (
        'SCHEDULED',
        'OPEN',
        'SUBMITTED',
        'VERIFIED',
        'MISSED',
        'LOCATION_UNAVAILABLE',
        'EXPIRED',
        'CANCELLED',
        -- Legacy status compatibility
        'pending',
        'dispatched',
        'responded'
    ));

-- Set default status to SCHEDULED
ALTER TABLE public.verification_schedules 
    ALTER COLUMN status SET DEFAULT 'SCHEDULED';

-- 2. Add Phase 8 fields to verification_schedules
DO $$
BEGIN
    -- retry_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'verification_schedules' 
          AND column_name = 'retry_count'
    ) THEN
        ALTER TABLE public.verification_schedules
        ADD COLUMN retry_count INT NOT NULL DEFAULT 0;
    END IF;

    -- max_retries
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'verification_schedules' 
          AND column_name = 'max_retries'
    ) THEN
        ALTER TABLE public.verification_schedules
        ADD COLUMN max_retries INT NOT NULL DEFAULT 3;
    END IF;

    -- submission_timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'verification_schedules' 
          AND column_name = 'submission_timestamp'
    ) THEN
        ALTER TABLE public.verification_schedules
        ADD COLUMN submission_timestamp TIMESTAMPTZ;
    END IF;

    -- notification_dispatched_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'verification_schedules' 
          AND column_name = 'notification_dispatched_at'
    ) THEN
        ALTER TABLE public.verification_schedules
        ADD COLUMN notification_dispatched_at TIMESTAMPTZ;
    END IF;

    -- missed_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'verification_schedules' 
          AND column_name = 'missed_reason'
    ) THEN
        ALTER TABLE public.verification_schedules
        ADD COLUMN missed_reason TEXT;
    END IF;

    -- timezone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'verification_schedules' 
          AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.verification_schedules
        ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata';
    END IF;
END $$;

-- 3. Unique Index preventing duplicate windows for same assignment and target start time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_schedule_window
    ON public.verification_schedules(assignment_id, target_date, window_start);

CREATE INDEX IF NOT EXISTS idx_verification_schedules_active_lookup
    ON public.verification_schedules(student_id, status, window_start, window_end);

-- 4. RLS Security: Anti-Prediction Policy for Students
-- Students can ONLY inspect schedules that have already opened or past states.
-- They CANNOT predict future SCHEDULED windows through exposed APIs.
DROP POLICY IF EXISTS "schedules_select_scoped" ON public.verification_schedules;

CREATE POLICY "schedules_select_scoped" ON public.verification_schedules
    FOR SELECT TO authenticated
    USING (
        -- Mentors assigned to the student's assignment can view full daily schedule
        public.is_mentor_assigned_to_assignment(verification_schedules.assignment_id)
        -- HODs within the department can audit full daily schedule
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            JOIN public.students s ON s.id = a.student_id
            JOIN public.hods h ON h.department_code = s.department_code
            WHERE a.id = verification_schedules.assignment_id
              AND h.id = auth.uid()
        )
        -- Admins can audit all schedules
        OR public.get_auth_user_role() = 'admin'
        -- Students can ONLY see schedules that are currently OPEN or in past states (NEVER future SCHEDULED windows)
        OR (
            student_id = auth.uid()
            AND (
                status IN ('OPEN', 'SUBMITTED', 'VERIFIED', 'MISSED', 'LOCATION_UNAVAILABLE', 'EXPIRED', 'CANCELLED', 'dispatched', 'responded')
                OR window_start <= timezone('utc'::text, now())
            )
        )
    );

-- 5. Stored Procedure: Transition Window States
-- Handles opening SCHEDULED windows when time arrives, and expiring unattended windows into MISSED
CREATE OR REPLACE FUNCTION public.process_window_transitions(
    p_current_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
)
RETURNS JSONB AS $$
DECLARE
    v_opened_count INT := 0;
    v_missed_count INT := 0;
    v_rec RECORD;
BEGIN
    -- 1. Open SCHEDULED windows whose window_start has arrived
    FOR v_rec IN 
        SELECT id, student_id, assignment_id, window_start, window_end
        FROM public.verification_schedules
        WHERE status IN ('SCHEDULED', 'pending')
          AND window_start <= p_current_timestamp
          AND window_end > p_current_timestamp
    LOOP
        UPDATE public.verification_schedules
        SET status = 'OPEN',
            notification_dispatched_at = p_current_timestamp,
            updated_at = p_current_timestamp
        WHERE id = v_rec.id;

        -- Create notification record for student
        INSERT INTO public.notifications (
            recipient_id,
            title,
            message,
            notification_type,
            action_url,
            payload
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution
GRANT EXECUTE ON FUNCTION public.process_window_transitions TO authenticated;

