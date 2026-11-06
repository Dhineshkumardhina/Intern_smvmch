-- ==============================================================================
-- PHASE 9: INTERNPULSE PRODUCTION NOTIFICATION SYSTEM & FCM INTEGRATION
-- Sri Manakula Vinayagar Engineering College (SMVEC)
--
-- Capabilities:
-- 1. All 10 Canonical Notification Events Supported
-- 2. Notification Categorization (VIOLATION, TECHNICAL_FAILURE, ATTENDANCE_PROMPT, SYSTEM_UPDATE)
-- 3. FCM Device Token Lifecycle & Invalidation (is_active, expired_at)
-- 4. User Notification Preferences (Quiet hours, push opt-in, alert toggles)
-- 5. Deduplication & Idempotent Delivery (deduplication_key)
-- 6. Privacy: Strict exclusion of raw GPS coordinates from notification payloads
-- 7. RLS Security: Strict recipient isolation & role-authorized dispatch
-- ==============================================================================

-- 1. Upgrade notification_type check constraint on public.notifications
ALTER TABLE public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_notification_type_check
    CHECK (notification_type IN (
        -- 10 Canonical Phase 9 Events
        'new_internship_assignment',
        'upcoming_verification',
        'verification_request',
        'successful_verification',
        'confirmed_outside_geofence',
        'missed_verification',
        'gps_disabled',
        'location_permission_revoked',
        'student_device_offline',
        'internship_assignment_updated',
        -- Legacy compatibility types
        'verification_result',
        'attendance_alert',
        'risk_alert',
        'log_feedback',
        'assignment_update',
        'system_announcement'
    ));

-- 2. Add Phase 9 columns to public.notifications
DO $$
BEGIN
    -- category
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'notifications' 
          AND column_name = 'category'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN category VARCHAR(30) DEFAULT 'ATTENDANCE_PROMPT'
        CHECK (category IN ('VIOLATION', 'TECHNICAL_FAILURE', 'ATTENDANCE_PROMPT', 'SYSTEM_UPDATE'));
    END IF;

    -- priority
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'notifications' 
          AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN priority VARCHAR(20) DEFAULT 'NORMAL'
        CHECK (priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW'));
    END IF;

    -- delivery_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'notifications' 
          AND column_name = 'delivery_status'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'DELIVERED'
        CHECK (delivery_status IN ('PENDING', 'DELIVERED', 'FAILED', 'SUPPRESSED'));
    END IF;

    -- deduplication_key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'notifications' 
          AND column_name = 'deduplication_key'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN deduplication_key VARCHAR(255);
    END IF;

    -- retry_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'notifications' 
          AND column_name = 'retry_count'
    ) THEN
        ALTER TABLE public.notifications
        ADD COLUMN retry_count INT NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Deduplication index preventing identical duplicate alerts within time windows
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
    ON public.notifications(recipient_id, deduplication_key)
    WHERE deduplication_key IS NOT NULL;

-- 3. Upgrade public.fcm_device_tokens for Lifecycle Management
DO $$
BEGIN
    -- is_active
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'fcm_device_tokens' 
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.fcm_device_tokens
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- expired_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'fcm_device_tokens' 
          AND column_name = 'expired_at'
    ) THEN
        ALTER TABLE public.fcm_device_tokens
        ADD COLUMN expired_at TIMESTAMPTZ;
    END IF;

    -- failure_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'fcm_device_tokens' 
          AND column_name = 'failure_count'
    ) THEN
        ALTER TABLE public.fcm_device_tokens
        ADD COLUMN failure_count INT NOT NULL DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active 
    ON public.fcm_device_tokens(user_id, is_active);

-- 4. User Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    verification_alerts BOOLEAN NOT NULL DEFAULT true,
    assignment_alerts BOOLEAN NOT NULL DEFAULT true,
    technical_alerts BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_preferences UNIQUE (user_id)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preferences_select_own" ON public.user_notification_preferences
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "preferences_update_own" ON public.user_notification_preferences
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "preferences_insert_own" ON public.user_notification_preferences
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 5. Stored Procedure: Invalidate Stale / Expired FCM Device Tokens
CREATE OR REPLACE FUNCTION public.invalidate_expired_device_token(
    p_token TEXT,
    p_reason TEXT DEFAULT 'Unregistered / Expired by FCM'
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.fcm_device_tokens
    SET is_active = false,
        expired_at = timezone('utc'::text, now()),
        failure_count = failure_count + 1
    WHERE token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.invalidate_expired_device_token TO authenticated;

