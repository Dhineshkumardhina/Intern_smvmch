-- =====================================================================================
-- Migration: 20261106000023_phase19c_configurable_pricing_and_plans.sql
-- Description: Phase 19C: Configurable SaaS Pricing Plans, Central Catalog,
--              Custom Institution Agreements & Entitlement Retention
-- Target: PostgreSQL 15+ / Supabase Multi-Tenant SaaS
-- Date: 2026-11-06
-- =====================================================================================

-- 1. UPDATE SAAS_PLANS TIER CONSTRAINT
-- Expand tier check constraint to support 'professional' and 'custom'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'saas_plans_tier_check'
    ) THEN
        ALTER TABLE public.saas_plans DROP CONSTRAINT saas_plans_tier_check;
    END IF;

    ALTER TABLE public.saas_plans
        ADD CONSTRAINT saas_plans_tier_check
        CHECK (tier IN ('pilot', 'starter', 'professional', 'standard', 'premium', 'enterprise', 'custom'));
END $$;

-- 2. SEED PHASE 19C STANDARD CONFIGURABLE PLANS
INSERT INTO public.saas_plans (
    id, plan_code, name, description, tier, billing_interval,
    base_price_annual_inr, base_price_monthly_inr, price_per_additional_student_inr,
    included_active_students, max_departments, max_faculty_mentors, included_storage_bytes,
    feature_entitlements, is_active
) VALUES
(
    '00000000-0000-0000-0000-000000000010'::uuid,
    'STARTER',
    'Starter Educational Tier',
    'Configured for small educational institutions. Core internship tracking, student onboarding, attendance and standard reporting.',
    'starter',
    'annual',
    75000.00,
    7500.00,
    180.00,
    250,
    2,
    10,
    10737418240, -- 10 GB
    '{
        "basic_internship_management": true,
        "student_onboarding": true,
        "attendance_tracking": true,
        "standard_reporting": true,
        "multiple_departments": false,
        "advanced_reporting": false,
        "enhanced_administrative_controls": false,
        "extended_operational_analytics": false,
        "custom_domain": false,
        "erp_integration": false,
        "ai_spoof_detection": true,
        "dpdp_dpo_dashboard": true,
        "priority_support": false,
        "dedicated_sla": false,
        "custom_integrations": false,
        "export_pdf_reports": true,
        "geofence_calibration_support": false
    }'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000020'::uuid,
    'PROFESSIONAL',
    'Professional Institutional Tier',
    'Configured for larger institutions with multiple departments, advanced reporting, enhanced administrative controls and extended operational analytics.',
    'professional',
    'annual',
    220000.00,
    22000.00,
    140.00,
    1000,
    8,
    40,
    32212254720, -- 30 GB
    '{
        "basic_internship_management": true,
        "student_onboarding": true,
        "attendance_tracking": true,
        "standard_reporting": true,
        "multiple_departments": true,
        "advanced_reporting": true,
        "enhanced_administrative_controls": true,
        "extended_operational_analytics": true,
        "custom_domain": true,
        "erp_integration": false,
        "ai_spoof_detection": true,
        "dpdp_dpo_dashboard": true,
        "priority_support": false,
        "dedicated_sla": false,
        "custom_integrations": false,
        "export_pdf_reports": true,
        "geofence_calibration_support": false
    }'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000030'::uuid,
    'ENTERPRISE',
    'Enterprise Institutional Tier',
    'Configured for large universities and institutional networks. Advanced institution configurations, custom capacity, enterprise reporting, priority support and custom integrations.',
    'enterprise',
    'annual',
    550000.00,
    55000.00,
    100.00,
    3000,
    -1, -- Unlimited departments
    -1, -- Unlimited mentors
    107374182400, -- 100 GB
    '{
        "basic_internship_management": true,
        "student_onboarding": true,
        "attendance_tracking": true,
        "standard_reporting": true,
        "multiple_departments": true,
        "advanced_reporting": true,
        "enhanced_administrative_controls": true,
        "extended_operational_analytics": true,
        "custom_domain": true,
        "erp_integration": true,
        "ai_spoof_detection": true,
        "dpdp_dpo_dashboard": true,
        "priority_support": true,
        "dedicated_sla": true,
        "custom_integrations": true,
        "export_pdf_reports": true,
        "geofence_calibration_support": true
    }'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000040'::uuid,
    'CUSTOM',
    'Custom Institutional Agreement',
    'Tailored institutional agreement with negotiated student capacity, custom department limits, bespoke feature entitlements and contract-specific billing.',
    'custom',
    'annual',
    0.00, -- Negotiated custom price
    0.00,
    0.00,
    1000,
    -1,
    -1,
    53687091200, -- 50 GB
    '{
        "basic_internship_management": true,
        "student_onboarding": true,
        "attendance_tracking": true,
        "standard_reporting": true,
        "multiple_departments": true,
        "advanced_reporting": true,
        "enhanced_administrative_controls": true,
        "extended_operational_analytics": true,
        "custom_domain": true,
        "erp_integration": true,
        "ai_spoof_detection": true,
        "dpdp_dpo_dashboard": true,
        "priority_support": true,
        "dedicated_sla": true,
        "custom_integrations": true,
        "export_pdf_reports": true,
        "geofence_calibration_support": true
    }'::jsonb,
    TRUE
)
ON CONFLICT (plan_code) DO NOTHING;

-- 3. STORED FUNCTION: CLONE CUSTOM PLAN FOR INSTITUTION
CREATE OR REPLACE FUNCTION public.create_custom_institution_plan(
    p_institution_id UUID,
    p_plan_name TEXT,
    p_plan_code TEXT,
    p_student_capacity INTEGER,
    p_max_departments INTEGER,
    p_annual_price_inr NUMERIC(12, 2),
    p_feature_entitlements JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_plan_id UUID;
BEGIN
    IF NOT public.is_platform_super_admin() THEN
        RAISE EXCEPTION 'Access denied. Only Platform Super Admin can create custom institutional plans.';
    END IF;

    INSERT INTO public.saas_plans (
        plan_code, name, description, tier, billing_interval,
        base_price_annual_inr, included_active_students, max_departments,
        feature_entitlements, is_active
    ) VALUES (
        p_plan_code,
        p_plan_name,
        'Custom negotiated plan for institution ID: ' || p_institution_id,
        'custom',
        'annual',
        p_annual_price_inr,
        p_student_capacity,
        p_max_departments,
        p_feature_entitlements,
        TRUE
    )
    RETURNING id INTO v_new_plan_id;

    RETURN v_new_plan_id;
END;
$$;

