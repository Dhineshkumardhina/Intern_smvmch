-- ==============================================================================
-- Migration: 20261105000001_phase1_auth_schema.sql
-- Description: Phase 1 Production-Oriented Centralized Authentication & Authorization
-- Project: InternPulse (Sri Manakula Vinayagar Engineering College)
-- Roles: HOD, MENTOR, STUDENT
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. APPLICATION ROLE ENUM / CHECK
-- Primary roles: 'hod', 'mentor', 'student'

-- 3. PROFILES TABLE (Authoritative user identity & role store)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('hod', 'mentor', 'student')),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    department_code VARCHAR(50) NOT NULL,
    student_id VARCHAR(50),
    mentor_id VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning-fast queries and RLS evaluation
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON public.profiles(department_code);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_mentor_id ON public.profiles(mentor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 4. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5. PREVENT UNAUTHORIZED ROLE SWITCHING & STATUS ESCALATION (SERVER-SIDE)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(20);
BEGIN
    -- Only evaluate if role or activation status is being modified
    IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        -- Allow service role and database admin
        IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
            RETURN NEW;
        END IF;

        -- Check the caller's authoritative role in profiles
        SELECT role INTO caller_role 
        FROM public.profiles 
        WHERE id = auth.uid() AND is_active = true;

        IF caller_role IS NULL OR caller_role <> 'hod' THEN
            RAISE EXCEPTION 'Security Violation: Only active HOD accounts can modify user roles or activation status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trigger_prevent_profile_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 6. AUTOMATIC PROFILE PROVISIONING TRIGGER (ON auth.users INSERT)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    inferred_role VARCHAR(20);
    inferred_dept VARCHAR(50);
    inferred_name VARCHAR(255);
    inferred_phone VARCHAR(50);
    inferred_student_id VARCHAR(50);
BEGIN
    -- Default role is 'student' unless explicitly granted in app_metadata by an admin
    inferred_role := COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        'student'
    );

    -- Ensure role is valid
    IF inferred_role NOT IN ('hod', 'mentor', 'student') THEN
        inferred_role := 'student';
    END IF;

    inferred_name := COALESCE(
        NEW.raw_user_meta_data->>'fullName',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    inferred_dept := COALESCE(
        NEW.raw_user_meta_data->>'departmentCode',
        NEW.raw_user_meta_data->>'department',
        'CSEBS'
    );

    inferred_phone := NEW.raw_user_meta_data->>'phone';
    inferred_student_id := NEW.raw_user_meta_data->>'studentId';

    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        email,
        phone,
        department_code,
        student_id,
        is_active
    ) VALUES (
        NEW.id,
        inferred_role,
        inferred_name,
        NEW.email,
        inferred_phone,
        inferred_dept,
        inferred_student_id,
        true
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- 7. ROW LEVEL SECURITY (RLS) FOR PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() 
                  AND p.role = 'hod' 
                  AND p.is_active = true
            )
        )
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() 
                  AND p.role = 'mentor' 
                  AND p.is_active = true
            )
            AND (
                mentor_id = (SELECT p2.mentor_id FROM public.profiles p2 WHERE p2.id = auth.uid())
                OR mentor_id = auth.uid()::text
            )
        )
    );

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() 
                  AND p.role = 'hod' 
                  AND p.is_active = true
            )
        )
    )
    WITH CHECK (
        auth.uid() = id
        OR (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() 
                  AND p.role = 'hod' 
                  AND p.is_active = true
            )
        )
    );

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- 8. CORE APPLICATION TABLES RLS

CREATE TABLE IF NOT EXISTS public.internship_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geofence_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.internship_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select_authenticated" ON public.internship_locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_hod_manage" ON public.internship_locations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE TABLE IF NOT EXISTS public.internship_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.internship_locations(id),
    role_title VARCHAR(150) NOT NULL DEFAULT 'Intern',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.internship_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_select_policy" ON public.internship_assignments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR mentor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE POLICY "assignments_hod_manage" ON public.internship_assignments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE TABLE IF NOT EXISTS public.student_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours_worked DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    work_summary TEXT NOT NULL,
    blockers_faced TEXT,
    review_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'needs_revision')),
    mentor_feedback TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.student_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_logs_select_policy" ON public.student_daily_logs
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = student_daily_logs.student_id AND a.mentor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND (p.role = 'mentor' OR p.role = 'hod') AND p.is_active = true
        )
    );

CREATE POLICY "daily_logs_student_insert" ON public.student_daily_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'student' AND p.is_active = true
        )
    );

CREATE POLICY "daily_logs_mentor_review" ON public.student_daily_logs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('mentor', 'hod') AND p.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('mentor', 'hod') AND p.is_active = true
        )
    );

