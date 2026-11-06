-- ==============================================================================
-- Migration: 20261106000018_phase18c_institution_registration_and_provisioning.sql
-- Description: Phase 18C Institution Registration, Provisioning & Administration
-- Target Database: Supabase PostgreSQL (PostGIS / WGS 84 / RLS Zero-Trust)
-- Architecture: Multi-Tenant Educational SaaS Platform
-- Capabilities:
--   1. Institution Registration Requests Table (pending, approved, rejected, suspended)
--   2. Safe, Idempotent Provisioning Tracking
--   3. Platform Super Admin Audit Logs Table (immutable write-once audit log)
--   4. Institution Lifecycle State Transitions & History Table
--   5. Strict Anti-Surveillance RLS Hardening (blocks platform admins from GPS data)
--   6. Performance Indexes & Audit Constraints
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: INSTITUTION REGISTRATION REQUESTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name VARCHAR(255) NOT NULL,
    institution_code VARCHAR(20) NOT NULL,
    institution_type VARCHAR(50) NOT NULL CHECK (
        institution_type IN (
            'engineering', 
            'medical', 
            'arts_science', 
            'polytechnic', 
            'university', 
            'standalone_institute'
        )
    ),
    domain VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    postal_code VARCHAR(20),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    website VARCHAR(255),
    admin_name VARCHAR(255) NOT NULL,
    admin_email VARCHAR(255) NOT NULL,
    admin_phone VARCHAR(50),
    admin_designation VARCHAR(100) NOT NULL DEFAULT 'Institution Administrator',
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'suspended', 'cancelled')
    ),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    provisioning_status VARCHAR(30) NOT NULL DEFAULT 'unprovisioned' CHECK (
        provisioning_status IN ('unprovisioned', 'provisioning', 'provisioned', 'failed')
    ),
    provisioning_error TEXT,
    provisioned_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_reg_req_code UNIQUE (institution_code),
    CONSTRAINT uq_reg_req_domain UNIQUE (domain)
);

CREATE INDEX IF NOT EXISTS idx_reg_req_status ON public.institution_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_reg_req_prov_status ON public.institution_registration_requests(provisioning_status);
CREATE INDEX IF NOT EXISTS idx_reg_req_domain ON public.institution_registration_requests(domain);
CREATE INDEX IF NOT EXISTS idx_reg_req_created ON public.institution_registration_requests(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. TABLE: PLATFORM AUDIT LOGS (IMMUTABLE AUDIT TRAIL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    performed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    performed_by_name VARCHAR(255) NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL,
    target_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    target_institution_code VARCHAR(50),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON public.platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_target_inst ON public.platform_audit_logs(target_institution_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON public.platform_audit_logs(performed_by_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. TABLE: INSTITUTION LIFECYCLE LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_lifecycle_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    action_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_by_name VARCHAR(255) NOT NULL,
    action_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inst_lifecycle_inst ON public.institution_lifecycle_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_lifecycle_created ON public.institution_lifecycle_logs(action_at DESC);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- A. REGISTRATION REQUESTS RLS
ALTER TABLE public.institution_registration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reg_requests_select_platform_admin" ON public.institution_registration_requests;
DROP POLICY IF EXISTS "reg_requests_insert_applicant" ON public.institution_registration_requests;
DROP POLICY IF EXISTS "reg_requests_update_platform_admin" ON public.institution_registration_requests;

-- Platform Super Admin can view all registration requests; applicants can view matching contact email
CREATE POLICY "reg_requests_select_platform_admin" ON public.institution_registration_requests
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR contact_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        OR admin_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

-- Any authenticated user or public applicant can submit a registration request
CREATE POLICY "reg_requests_insert_applicant" ON public.institution_registration_requests
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        status = 'pending'
        AND provisioning_status = 'unprovisioned'
    );

-- Only Platform Super Admin can approve, reject, or trigger provisioning
CREATE POLICY "reg_requests_update_platform_admin" ON public.institution_registration_requests
    FOR UPDATE TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- B. PLATFORM AUDIT LOGS RLS (IMMUTABLE LOGS)
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_audit_select_admin" ON public.platform_audit_logs;
DROP POLICY IF EXISTS "platform_audit_insert_service" ON public.platform_audit_logs;

-- Only Platform Super Admin can read platform audit logs
CREATE POLICY "platform_audit_select_admin" ON public.platform_audit_logs
    FOR SELECT TO authenticated
    USING (public.is_platform_admin());

-- Any authenticated actor or system process can append to audit logs
CREATE POLICY "platform_audit_insert_service" ON public.platform_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- No UPDATE or DELETE allowed on platform audit logs (ensuring immutability)

-- C. INSTITUTION LIFECYCLE LOGS RLS
ALTER TABLE public.institution_lifecycle_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inst_lifecycle_select" ON public.institution_lifecycle_logs;
DROP POLICY IF EXISTS "inst_lifecycle_insert" ON public.institution_lifecycle_logs;

CREATE POLICY "inst_lifecycle_select" ON public.institution_lifecycle_logs
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR institution_id = public.get_auth_user_institution_id()
    );

CREATE POLICY "inst_lifecycle_insert" ON public.institution_lifecycle_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_admin());

-- ------------------------------------------------------------------------------
-- 5. ANTI-SURVEILLANCE RLS HARDENING: EXCLUDE PLATFORM ADMINS FROM RAW GPS
-- ------------------------------------------------------------------------------
-- Platform Super Admins oversee registration, tenant lifecycle, and system health.
-- Per DPDP statutory mandates, Platform Super Admins MUST NOT have unrestricted
-- access to student physical location tracking data or raw GPS verification logs.

DROP POLICY IF EXISTS "verifications_select_scoped" ON public.location_verifications;
DROP POLICY IF EXISTS "verifications_select_scoped_anti_surveillance" ON public.location_verifications;

CREATE POLICY "verifications_select_scoped_anti_surveillance" ON public.location_verifications
    FOR SELECT TO authenticated
    USING (
        -- Platform super admins are strictly excluded from viewing raw student GPS coordinates
        NOT public.is_platform_admin()
        AND institution_id = public.get_auth_user_institution_id()
        AND (
            student_id = auth.uid()
            OR public.is_institution_admin(location_verifications.institution_id)
            OR public.is_mentor_assigned_to_assignment(location_verifications.assignment_id)
            OR EXISTS (
                SELECT 1 FROM public.internship_assignments a
                JOIN public.profiles s ON s.id = a.student_id
                WHERE a.id = location_verifications.assignment_id
                  AND public.is_hod_for_department(s.department_id)
            )
        )
    );

