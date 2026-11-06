-- =====================================================================================
-- Migration: 20261106000022_phase19b_subscription_and_licensing_engine.sql
-- Description: Phase 19B: Subscription Lifecycle State Machine, License Entitlements,
--              Capacity Enforcement, Commercial Audit Trail & Grandfathering Strategy
-- Target: PostgreSQL 15+ / Supabase Multi-Tenant SaaS
-- Date: 2026-11-06
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. SAAS PLANS CATALOG TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('pilot', 'starter', 'standard', 'premium', 'enterprise')),
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'annual' CHECK (billing_interval IN ('monthly', 'annual', 'multi_year')),
    base_price_annual_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    base_price_monthly_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    price_per_additional_student_inr NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
    included_active_students INTEGER NOT NULL DEFAULT 500,
    max_departments INTEGER NOT NULL DEFAULT 5, -- -1 for unlimited
    max_faculty_mentors INTEGER NOT NULL DEFAULT 20, -- -1 for unlimited
    included_storage_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10 GB
    feature_entitlements JSONB NOT NULL DEFAULT '{
        "custom_domain": false,
        "erp_integration": false,
        "ai_spoof_detection": true,
        "dpdp_dpo_dashboard": true,
        "dedicated_sla": false,
        "export_pdf_reports": true,
        "geofence_calibration_support": false
    }'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saas_plans_code ON public.saas_plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_saas_plans_tier ON public.saas_plans(tier);

-- -------------------------------------------------------------------------------------
-- 2. INSTITUTION SUBSCRIPTIONS TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.saas_plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'TRIAL' CHECK (
        status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED')
    ),
    billing_cadence VARCHAR(20) NOT NULL DEFAULT 'annual' CHECK (billing_cadence IN ('monthly', 'annual', 'term_cohort')),
    licensed_student_capacity INTEGER NOT NULL DEFAULT 500,
    licensed_department_capacity INTEGER NOT NULL DEFAULT 5, -- -1 for unlimited
    licensed_mentor_capacity INTEGER NOT NULL DEFAULT 20, -- -1 for unlimited
    start_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expiry_date TIMESTAMPTZ NOT NULL,
    renewal_date TIMESTAMPTZ NOT NULL,
    grace_period_end TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    contract_reference VARCHAR(100),
    is_grandfathered BOOLEAN NOT NULL DEFAULT FALSE,
    grandfathered_terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_institution_active_subscription UNIQUE (institution_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_inst ON public.institution_subscriptions(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_status ON public.institution_subscriptions(status);

-- -------------------------------------------------------------------------------------
-- 3. LICENSE ENTITLEMENTS TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.license_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.institution_subscriptions(id) ON DELETE CASCADE,
    max_active_students INTEGER NOT NULL DEFAULT 500,
    buffer_student_allowance INTEGER NOT NULL DEFAULT 50, -- 10% soft buffer
    max_departments INTEGER NOT NULL DEFAULT 5, -- -1 for unlimited
    max_faculty_mentors INTEGER NOT NULL DEFAULT 20, -- -1 for unlimited
    max_geofence_locations INTEGER NOT NULL DEFAULT 100,
    max_storage_bytes BIGINT NOT NULL DEFAULT 10737418240, -- 10 GB
    feature_flags JSONB NOT NULL DEFAULT '{
        "custom_domain": false,
        "erp_integration": false,
        "ai_spoof_detection": true,
        "dpdp_dpo_dashboard": true,
        "dedicated_sla": false,
        "export_pdf_reports": true,
        "geofence_calibration_support": false
    }'::jsonb,
    custom_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_hard_capped BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_license_entitlements_inst UNIQUE (institution_id)
);

CREATE INDEX IF NOT EXISTS idx_license_entitlements_inst ON public.license_entitlements(institution_id);

-- -------------------------------------------------------------------------------------
-- 4. SUBSCRIPTION INVOICES TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.institution_subscriptions(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'TAX_INVOICE' CHECK (invoice_type IN ('PRO_FORMA', 'TAX_INVOICE', 'CREDIT_NOTE')),
    status VARCHAR(20) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID', 'REFUNDED')),
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subtotal_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cgst_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_inst ON public.subscription_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_num ON public.subscription_invoices(invoice_number);

-- -------------------------------------------------------------------------------------
-- 5. SUBSCRIPTION PAYMENTS TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.subscription_invoices(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    payment_method VARCHAR(30) NOT NULL CHECK (
        payment_method IN ('NEFT_RTGS', 'NET_BANKING', 'CORPORATE_CARD', 'UPI', 'TREASURY_CHALLAN', 'PURCHASE_ORDER', 'CHEQUE_DD')
    ),
    transaction_reference VARCHAR(150) NOT NULL,
    amount_paid_inr NUMERIC(12, 2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    reconciliation_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
        reconciliation_status IN ('PENDING', 'RECONCILED', 'FAILED', 'REJECTED', 'REFUNDED')
    ),
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_inst ON public.subscription_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_inv ON public.subscription_payments(invoice_id);

-- -------------------------------------------------------------------------------------
-- 6. IMMUTABLE SUBSCRIPTION AUDIT LOG TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.institution_subscriptions(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    reason TEXT,
    actor_id UUID,
    actor_name VARCHAR(150),
    actor_role VARCHAR(50),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_inst ON public.subscription_audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_logs_ts ON public.subscription_audit_logs(timestamp DESC);

-- -------------------------------------------------------------------------------------
-- 7. STORED VALIDATION FUNCTIONS (Server-Side Enforcement)
-- -------------------------------------------------------------------------------------

-- Validate state transitions according to Phase 19A state machine
CREATE OR REPLACE FUNCTION public.check_subscription_state_transition(
    p_from_status TEXT,
    p_to_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_from_status = p_to_status THEN
        RETURN TRUE;
    END IF;

    -- Transitions from TRIAL
    IF p_from_status = 'TRIAL' THEN
        RETURN p_to_status IN ('ACTIVE', 'EXPIRED', 'CANCELLED');
    END IF;

    -- Transitions from ACTIVE
    IF p_from_status = 'ACTIVE' THEN
        RETURN p_to_status IN ('PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED');
    END IF;

    -- Transitions from PAST_DUE
    IF p_from_status = 'PAST_DUE' THEN
        RETURN p_to_status IN ('ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED');
    END IF;

    -- Transitions from GRACE_PERIOD
    IF p_from_status = 'GRACE_PERIOD' THEN
        RETURN p_to_status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED');
    END IF;

    -- Transitions from SUSPENDED
    IF p_from_status = 'SUSPENDED' THEN
        RETURN p_to_status IN ('ACTIVE', 'CANCELLED', 'EXPIRED');
    END IF;

    -- Transitions from EXPIRED
    IF p_from_status = 'EXPIRED' THEN
        RETURN p_to_status IN ('ACTIVE', 'CANCELLED');
    END IF;

    -- Transitions from CANCELLED (Terminal state, platform admin override to ACTIVE only)
    IF p_from_status = 'CANCELLED' THEN
        RETURN p_to_status IN ('ACTIVE');
    END IF;

    RETURN FALSE;
END;
$$;

-- Check capacity constraints at the database level
CREATE OR REPLACE FUNCTION public.check_institution_capacity(
    p_institution_id UUID,
    p_capacity_type TEXT,
    p_requested_amount INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_entitlements RECORD;
    v_sub RECORD;
    v_current_count INTEGER := 0;
    v_max_allowed INTEGER := 0;
BEGIN
    -- 1. Check subscription validity
    SELECT * INTO v_sub
    FROM public.institution_subscriptions
    WHERE institution_id = p_institution_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'No active subscription found for institution.'
        );
    END IF;

    -- Block operational additions if suspended, cancelled, or expired
    IF v_sub.status IN ('SUSPENDED', 'CANCELLED', 'EXPIRED') THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'Subscription is currently ' || v_sub.status || '. Resource modifications are frozen.'
        );
    END IF;

    -- 2. Fetch entitlements
    SELECT * INTO v_entitlements
    FROM public.license_entitlements
    WHERE institution_id = p_institution_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'reason', 'No license entitlements record found for institution.'
        );
    END IF;

    -- 3. Evaluate capacity by type
    IF p_capacity_type = 'student' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.students
        WHERE institution_id = p_institution_id AND is_active = TRUE;

        -- Check if unlimited
        IF v_entitlements.max_active_students = -1 THEN
            RETURN jsonb_build_object('allowed', TRUE, 'current', v_current_count, 'limit', -1);
        END IF;

        v_max_allowed := v_entitlements.max_active_students + COALESCE(v_entitlements.buffer_student_allowance, 0);

        IF (v_current_count + p_requested_amount) > v_max_allowed THEN
            RETURN jsonb_build_object(
                'allowed', FALSE,
                'reason', 'Student capacity limit exceeded. Licensed: ' || v_entitlements.max_active_students || ' (Buffer: ' || v_entitlements.buffer_student_allowance || ')',
                'current', v_current_count,
                'limit', v_max_allowed
            );
        END IF;

    ELSIF p_capacity_type = 'department' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.departments
        WHERE institution_id = p_institution_id AND is_active = TRUE;

        IF v_entitlements.max_departments = -1 THEN
            RETURN jsonb_build_object('allowed', TRUE, 'current', v_current_count, 'limit', -1);
        END IF;

        IF (v_current_count + p_requested_amount) > v_entitlements.max_departments THEN
            RETURN jsonb_build_object(
                'allowed', FALSE,
                'reason', 'Department capacity limit reached (' || v_current_count || '/' || v_entitlements.max_departments || '). Upgrade plan to add departments.',
                'current', v_current_count,
                'limit', v_entitlements.max_departments
            );
        END IF;

    ELSIF p_capacity_type = 'mentor' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM public.mentors
        WHERE institution_id = p_institution_id AND is_active = TRUE;

        IF v_entitlements.max_faculty_mentors = -1 THEN
            RETURN jsonb_build_object('allowed', TRUE, 'current', v_current_count, 'limit', -1);
        END IF;

        IF (v_current_count + p_requested_amount) > v_entitlements.max_faculty_mentors THEN
            RETURN jsonb_build_object(
                'allowed', FALSE,
                'reason', 'Faculty mentor capacity limit reached (' || v_current_count || '/' || v_entitlements.max_faculty_mentors || ').',
                'current', v_current_count,
                'limit', v_entitlements.max_faculty_mentors
            );
        END IF;
    END IF;

    RETURN jsonb_build_object('allowed', TRUE, 'reason', 'Capacity available');
END;
$$;

-- -------------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

-- saas_plans RLS:
CREATE POLICY "saas_plans_select_authenticated"
ON public.saas_plans FOR SELECT TO authenticated
USING (is_active = TRUE OR public.is_platform_super_admin());

CREATE POLICY "saas_plans_admin_all"
ON public.saas_plans FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- institution_subscriptions RLS:
CREATE POLICY "institution_subscriptions_select"
ON public.institution_subscriptions FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

-- Crucial Security: Institutions cannot insert, update, or delete subscriptions!
CREATE POLICY "institution_subscriptions_admin_modify"
ON public.institution_subscriptions FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- license_entitlements RLS:
CREATE POLICY "license_entitlements_select"
ON public.license_entitlements FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

CREATE POLICY "license_entitlements_admin_modify"
ON public.license_entitlements FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- subscription_invoices RLS:
CREATE POLICY "subscription_invoices_select"
ON public.subscription_invoices FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

CREATE POLICY "subscription_invoices_admin_modify"
ON public.subscription_invoices FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- subscription_payments RLS:
CREATE POLICY "subscription_payments_select"
ON public.subscription_payments FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

-- Allow institution admin to record payment proof
CREATE POLICY "subscription_payments_insert"
ON public.subscription_payments FOR INSERT TO authenticated
WITH CHECK (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

-- Only platform super admin can update reconciliation status
CREATE POLICY "subscription_payments_admin_update"
ON public.subscription_payments FOR UPDATE TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- subscription_audit_logs RLS:
CREATE POLICY "subscription_audit_logs_select"
ON public.subscription_audit_logs FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

CREATE POLICY "subscription_audit_logs_insert"
ON public.subscription_audit_logs FOR INSERT TO authenticated
WITH CHECK (TRUE); -- Logging allowed; updates/deletes prohibited (immutable)

-- -------------------------------------------------------------------------------------
-- 9. SEED DATA & GRANDFATHERING STRATEGY
-- -------------------------------------------------------------------------------------

-- Seed SaaS Plans
INSERT INTO public.saas_plans (
    id, plan_code, name, description, tier, billing_interval,
    base_price_annual_inr, base_price_monthly_inr, price_per_additional_student_inr,
    included_active_students, max_departments, max_faculty_mentors, included_storage_bytes,
    feature_entitlements, is_active
) VALUES
(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'PILOT_50',
    'Supervised Institutional Trial',
    'Controlled 30 to 60-day trial for single department pilot evaluations',
    'pilot',
    'annual',
    0.00,
    0.00,
    0.00,
    50,
    1,
    5,
    5368709120, -- 5 GB
    '{"custom_domain": false, "erp_integration": false, "ai_spoof_detection": true, "dpdp_dpo_dashboard": true, "dedicated_sla": false, "export_pdf_reports": true, "geofence_calibration_support": false}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000002'::uuid,
    'DEPT_STARTER',
    'Department Starter Tier',
    'Entry tier for small autonomous colleges or up to 2 departments',
    'starter',
    'annual',
    75000.00,
    7500.00,
    180.00,
    250,
    2,
    10,
    10737418240, -- 10 GB
    '{"custom_domain": false, "erp_integration": false, "ai_spoof_detection": true, "dpdp_dpo_dashboard": true, "dedicated_sla": false, "export_pdf_reports": true, "geofence_calibration_support": false}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000003'::uuid,
    'COLLEGE_STANDARD',
    'College Standard Tier',
    'Full college license for standard engineering, arts & science or polytechnic institutions',
    'standard',
    'annual',
    180000.00,
    18000.00,
    150.00,
    750,
    6,
    30,
    26843545600, -- 25 GB
    '{"custom_domain": true, "erp_integration": false, "ai_spoof_detection": true, "dpdp_dpo_dashboard": true, "dedicated_sla": false, "export_pdf_reports": true, "geofence_calibration_support": false}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000004'::uuid,
    'CAMPUS_PREMIUM',
    'Campus Premium Tier',
    'Comprehensive multi-department institution license with high student capacity',
    'premium',
    'annual',
    360000.00,
    36000.00,
    130.00,
    1800,
    15,
    75,
    53687091200, -- 50 GB
    '{"custom_domain": true, "erp_integration": true, "ai_spoof_detection": true, "dpdp_dpo_dashboard": true, "dedicated_sla": true, "export_pdf_reports": true, "geofence_calibration_support": true}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000005'::uuid,
    'UNIV_ENTERPRISE',
    'University Enterprise Tier',
    'Enterprise tier for autonomous universities, multi-campus trusts and large cohorts',
    'enterprise',
    'annual',
    650000.00,
    65000.00,
    100.00,
    3500,
    -1, -- Unlimited departments
    -1, -- Unlimited mentors
    107374182400, -- 100 GB
    '{"custom_domain": true, "erp_integration": true, "ai_spoof_detection": true, "dpdp_dpo_dashboard": true, "dedicated_sla": true, "export_pdf_reports": true, "geofence_calibration_support": true}'::jsonb,
    TRUE
)
ON CONFLICT (plan_code) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- GRANDFATHERING: SMVEC ANCHOR INSTITUTION
-- Sri Manakula Vinayagar Engineering College (Autonomous)
-- ID: a0000000-0000-0000-0000-000000000001
-- -------------------------------------------------------------------------------------
INSERT INTO public.institution_subscriptions (
    id, institution_id, plan_id, status, billing_cadence,
    licensed_student_capacity, licensed_department_capacity, licensed_mentor_capacity,
    start_date, expiry_date, renewal_date, auto_renew,
    contract_reference, is_grandfathered, grandfathered_terms
) VALUES (
    'sub-smvec-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000005'::uuid, -- UNIV_ENTERPRISE
    'ACTIVE',
    'annual',
    3000,
    -1, -- Unlimited departments
    -1, -- Unlimited mentors
    '2026-01-01T00:00:00Z'::timestamptz,
    '2036-01-01T00:00:00Z'::timestamptz, -- 10-year founding institutional term
    '2027-01-01T00:00:00Z'::timestamptz,
    TRUE,
    'MOU-SMVEC-FOUNDING-2026',
    TRUE,
    'Founding anchor institution grandfathered under perpetual academic development agreement. Unlimited departments, 3,000 active students, priority feature updates.'
)
ON CONFLICT (institution_id) DO NOTHING;

-- SMVEC License Entitlements
INSERT INTO public.license_entitlements (
    institution_id, subscription_id, max_active_students, buffer_student_allowance,
    max_departments, max_faculty_mentors, max_geofence_locations, max_storage_bytes,
    feature_flags, is_hard_capped
) VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'sub-smvec-0000-0000-0000-000000000001'::uuid,
    3000,
    300, -- 10% buffer
    -1,  -- Unlimited departments
    -1,  -- Unlimited mentors
    500,
    53687091200, -- 50 GB
    '{"custom_domain": true, "erp_integration": true, "ai_spoof_detection": true, "dpdp_dpo_dashboard": true, "dedicated_sla": true, "export_pdf_reports": true, "geofence_calibration_support": true}'::jsonb,
    FALSE
)
ON CONFLICT (institution_id) DO NOTHING;

-- SMVEC Historical Founding Invoice Record
INSERT INTO public.subscription_invoices (
    id, institution_id, subscription_id, invoice_number, invoice_type, status,
    billing_period_start, billing_period_end, subtotal_inr, cgst_amount_inr,
    sgst_amount_inr, igst_amount_inr, total_amount_inr, issue_date, due_date, paid_date, notes
) VALUES (
    'inv-smvec-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'sub-smvec-0000-0000-0000-000000000001'::uuid,
    'INV-2026-SMVEC-001',
    'TAX_INVOICE',
    'PAID',
    '2026-01-01',
    '2026-12-31',
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    '2026-01-01',
    '2026-01-31',
    '2026-01-01T00:00:00Z'::timestamptz,
    'Anchor founding institutional agreement grant - Zero INR initial billing.'
)
ON CONFLICT (invoice_number) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- SEED PILOT INSTITUTION: SMVMCH (Medical College & Hospital)
-- ID: a0000000-0000-0000-0000-000000000002
-- -------------------------------------------------------------------------------------
INSERT INTO public.institution_subscriptions (
    id, institution_id, plan_id, status, billing_cadence,
    licensed_student_capacity, licensed_department_capacity, licensed_mentor_capacity,
    start_date, expiry_date, renewal_date, auto_renew,
    contract_reference, is_grandfathered, grandfathered_terms
) VALUES (
    'sub-smvmch-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid, -- PILOT_50
    'ACTIVE',
    'annual',
    50,
    2, -- AHS and BPT departments
    10,
    '2026-11-01T00:00:00Z'::timestamptz,
    '2027-01-01T00:00:00Z'::timestamptz, -- 60-day medical pilot
    '2026-12-15T00:00:00Z'::timestamptz,
    TRUE,
    'PILOT-SMVMCH-MED-2026',
    FALSE,
    NULL
)
ON CONFLICT (institution_id) DO NOTHING;

-- SMVMCH License Entitlements
INSERT INTO public.license_entitlements (
    institution_id, subscription_id, max_active_students, buffer_student_allowance,
    max_departments, max_faculty_mentors, max_geofence_locations, max_storage_bytes,
    feature_flags, is_hard_capped
) VALUES (
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'sub-smvmch-0000-0000-0000-000000000002'::uuid,
    50,
    10,
    2,
    10,
    50,
    10737418240, -- 10 GB
    '{"custom_domain": false, "erp_integration": false, "ai_spoof_detection": true, "dpdp_dpo_dashboard": true, "dedicated_sla": false, "export_pdf_reports": true, "geofence_calibration_support": false}'::jsonb,
    TRUE
)
ON CONFLICT (institution_id) DO NOTHING;

