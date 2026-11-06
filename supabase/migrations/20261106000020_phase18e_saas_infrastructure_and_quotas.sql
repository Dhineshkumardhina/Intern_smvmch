-- =====================================================================================
-- Migration: 20261106000020_phase18e_saas_infrastructure_and_quotas.sql
-- Description: Phase 18E: Multi-Institution SaaS Infrastructure, Resource Quotas,
--              Health Monitoring, Rate Limiting & Disaster Recovery Logging
-- Target: PostgreSQL 15+ / PostGIS 3+ / Supabase Multi-Tenant SaaS
-- Date: 2026-11-06
-- =====================================================================================

-- 1. INSTITUTION RESOURCE QUOTAS TABLE
CREATE TABLE IF NOT EXISTS public.institution_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    max_active_students INTEGER NOT NULL DEFAULT 1000,
    max_storage_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10 GB default
    max_daily_verifications INTEGER NOT NULL DEFAULT 5000,
    max_daily_notifications INTEGER NOT NULL DEFAULT 10000,
    max_api_rpm INTEGER NOT NULL DEFAULT 600, -- 600 requests per minute
    current_storage_bytes BIGINT NOT NULL DEFAULT 0,
    current_active_students INTEGER NOT NULL DEFAULT 0,
    quota_tier TEXT NOT NULL DEFAULT 'standard' CHECK (quota_tier IN ('pilot', 'standard', 'premium', 'enterprise')),
    is_throttled BOOLEAN NOT NULL DEFAULT FALSE,
    throttled_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_institution_quotas_institution_id UNIQUE (institution_id)
);

-- Index for instant quota lookups during request throttling
CREATE INDEX IF NOT EXISTS idx_institution_quotas_inst_id ON public.institution_quotas(institution_id);

-- Enable Row Level Security
ALTER TABLE public.institution_quotas ENABLE ROW LEVEL SECURITY;

-- RLS: Platform super admins have unrestricted quota oversight
CREATE POLICY "platform_admin_quotas_all"
ON public.institution_quotas FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- RLS: Institution administrators can view their own resource quotas
CREATE POLICY "institution_admin_quotas_select"
ON public.institution_quotas FOR SELECT TO authenticated
USING (institution_id = public.get_auth_user_institution_id());

-- 2. SYSTEM HEALTH CHECKS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.system_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('HEALTHY', 'DEGRADED', 'UNHEALTHY')),
    database_latency_ms NUMERIC(8, 2) NOT NULL,
    postgis_latency_ms NUMERIC(8, 2) NOT NULL,
    storage_accessible BOOLEAN NOT NULL DEFAULT TRUE,
    auth_service_accessible BOOLEAN NOT NULL DEFAULT TRUE,
    active_connections INTEGER,
    component_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_system_health_checks_checked_at ON public.system_health_checks(checked_at DESC);

-- Enable RLS (Platform Super Admin only)
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_health_checks"
ON public.system_health_checks FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- 3. DISASTER RECOVERY & BACKUP VERIFICATION LOGS
CREATE TABLE IF NOT EXISTS public.disaster_recovery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drill_type TEXT NOT NULL CHECK (drill_type IN ('PITR_SIMULATION', 'SNAPSHOT_VERIFICATION', 'SCHEMA_DRIFT_AUDIT', 'FAILOVER_TEST')),
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'WARNING', 'FAILURE')),
    target_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    rpo_seconds INTEGER NOT NULL, -- Recovery Point Objective observed
    rto_seconds INTEGER NOT NULL, -- Recovery Time Objective observed
    records_verified INTEGER NOT NULL DEFAULT 0,
    checksum_verified BOOLEAN NOT NULL DEFAULT TRUE,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    executed_by TEXT NOT NULL DEFAULT 'automated_backup_verifier',
    executed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_disaster_recovery_logs_executed_at ON public.disaster_recovery_logs(executed_at DESC);

-- Enable RLS (Platform Super Admin only)
ALTER TABLE public.disaster_recovery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_dr_logs"
ON public.disaster_recovery_logs FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- 4. FUNCTION: Check Institution Rate Limit & Quota Enforcement
CREATE OR REPLACE FUNCTION public.check_institution_quota(
    p_institution_id UUID,
    p_resource_type TEXT,
    p_requested_amount BIGINT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_quota RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_quota
    FROM public.institution_quotas
    WHERE institution_id = p_institution_id;

    -- If no quota row exists, initialize default standard tier
    IF NOT FOUND THEN
        INSERT INTO public.institution_quotas (institution_id)
        VALUES (p_institution_id)
        RETURNING * INTO v_quota;
    END IF;

    -- Check resource limits
    IF p_resource_type = 'student' THEN
        IF (v_quota.current_active_students + p_requested_amount) > v_quota.max_active_students THEN
            RETURN jsonb_build_object(
                'allowed', FALSE,
                'reason', 'Active student quota exceeded',
                'current', v_quota.current_active_students,
                'limit', v_quota.max_active_students
            );
        END IF;
    ELSIF p_resource_type = 'storage' THEN
        IF (v_quota.current_storage_bytes + p_requested_amount) > v_quota.max_storage_bytes THEN
            RETURN jsonb_build_object(
                'allowed', FALSE,
                'reason', 'Storage quota exceeded',
                'current_bytes', v_quota.current_storage_bytes,
                'limit_bytes', v_quota.max_storage_bytes
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('allowed', TRUE, 'reason', 'Quota available');
END;
$$;

-- 5. SEED INITIAL QUOTAS FOR EXISTING INSTITUTIONS
INSERT INTO public.institution_quotas (
    institution_id, 
    max_active_students, 
    max_storage_bytes, 
    max_daily_verifications, 
    max_daily_notifications, 
    max_api_rpm, 
    quota_tier
)
SELECT 
    id,
    CASE 
        WHEN code = 'SMVEC' THEN 3000
        WHEN code = 'SMVMCH' THEN 1500
        ELSE 1000
    END,
    CASE 
        WHEN code = 'SMVEC' THEN 53687091200 -- 50 GB
        ELSE 10737418240 -- 10 GB
    END,
    15000,
    30000,
    1200,
    'enterprise'
FROM public.institutions
ON CONFLICT (institution_id) DO NOTHING;

