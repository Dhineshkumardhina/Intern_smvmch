-- ==============================================================================
-- Migration: 20261105000002_phase2_database_expansion.sql
-- Description: Phase 2 Database Architecture Expansion & Normalization
-- Project: InternPulse (Sri Manakula Vinayagar Engineering College)
-- Supports: 
--   1. institutions
--   2. departments
--   3. users (profiles enhanced + users view)
--   4. mentors
--   5. students
--   6. internship_locations (PostGIS geofences + multi-dept support)
--   7. internship_assignments (Historical preservation + duplicate prevention)
--   8. attendance_sessions (Daily tracking + attendance_records view)
--   9. location_verifications (Geospatial verification + verification_events view)
--  10. verification_schedules (Automated ping windows)
--  11. notifications (Push & system alerts)
--  12. audit_logs (Tamper-evident operational audit trail)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & SEARCH PATH SETUP
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable PostGIS in extensions schema (standard Supabase configuration)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback if extensions schema is not partitioned
        CREATE EXTENSION IF NOT EXISTS postgis;
END $$;

-- ------------------------------------------------------------------------------
-- 2. INSTITUTIONS TABLE (Multi-Institution Root Anchor)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Puducherry',
    state VARCHAR(100) DEFAULT 'Puducherry',
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_institutions_code ON public.institutions(code);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(status);

-- Seed Default Anchor Institution: Sri Manakula Vinayagar Engineering College (SMVEC)
INSERT INTO public.institutions (id, code, name, short_name, city, state, country, website, status)
VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'SMVEC',
    'Sri Manakula Vinayagar Engineering College (Autonomous)',
    'SMVEC',
    'Madagadipet, Puducherry',
    'Puducherry',
    'India',
    'https://smvec.ac.in',
    'active'
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. DEPARTMENTS TABLE (Multi-Department Governance)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hod_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_dept_institution_code UNIQUE (institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_institution ON public.departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_hod_id ON public.departments(hod_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON public.departments(status);

-- Seed Institutional Departments
INSERT INTO public.departments (id, institution_id, code, name, status)
VALUES
    ('b0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'CSEBS', 'Computer Science & Business Systems', 'active'),
    ('b0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'IT', 'Information Technology', 'active'),
    ('b0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'ECE', 'Electronics & Communication Engineering', 'active'),
    ('b0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'EEE', 'Electrical & Electronics Engineering', 'active'),
    ('b0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'MECH', 'Mechanical Engineering', 'active'),
    ('b0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'CIVIL', 'Civil Engineering', 'active'),
    ('b0000000-0000-0000-0000-000000000007'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'BME', 'Biomedical Engineering', 'active'),
    ('b0000000-0000-0000-0000-000000000008'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'MECT', 'Mechatronics Engineering', 'active'),
    ('b0000000-0000-0000-0000-000000000009'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'ICE', 'Instrumentation & Control Engineering', 'active')
ON CONFLICT (institution_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 4. USERS (PROFILES) ENHANCEMENTS (Explicit Statuses, FKs, Audit Tracking)
-- ------------------------------------------------------------------------------
-- Non-destructively add relational columns to public.profiles
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enforce check constraint on account_status if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_profiles_account_status'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT check_profiles_account_status 
            CHECK (account_status IN ('active', 'suspended', 'pending_approval', 'deactivated'));
    END IF;
END $$;

-- Backfill institution_id and department_id in public.profiles
UPDATE public.profiles p
SET 
    institution_id = 'a0000000-0000-0000-0000-000000000001'::uuid,
    department_id = COALESCE(p.department_id, d.id),
    account_status = CASE WHEN p.is_active = true THEN 'active' ELSE 'deactivated' END
FROM public.departments d
WHERE p.institution_id IS NULL 
  AND d.code = p.department_code;

-- Also handle any profile whose department_code didn't match directly
UPDATE public.profiles
SET institution_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE institution_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON public.profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- Synchronize is_active and account_status bidirectionally
CREATE OR REPLACE FUNCTION public.sync_profile_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (OLD.account_status IS DISTINCT FROM NEW.account_status) THEN
        NEW.is_active := (NEW.account_status = 'active');
    ELSIF (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        IF NEW.is_active = true AND NEW.account_status = 'deactivated' THEN
            NEW.account_status := 'active';
        ELSIF NEW.is_active = false AND NEW.account_status = 'active' THEN
            NEW.account_status := 'deactivated';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_profile_status ON public.profiles;
CREATE TRIGGER trigger_sync_profile_status
    BEFORE INSERT OR UPDATE OF account_status, is_active ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_status();

-- Canonical USERS view for system-wide user queries
CREATE OR REPLACE VIEW public.users AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.account_status,
    p.is_active,
    p.phone,
    p.department_code,
    p.department_id,
    p.institution_id,
    p.student_id,
    p.mentor_id,
    p.avatar_url,
    p.created_at,
    p.updated_at
FROM public.profiles p;

-- ------------------------------------------------------------------------------
-- 5. MENTORS TABLE (Normalized Faculty Mentors Domain Entity)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor',
    max_capacity INTEGER NOT NULL DEFAULT 10 CHECK (max_capacity >= 0),
    current_mentee_count INTEGER NOT NULL DEFAULT 0 CHECK (current_mentee_count >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
    office_location VARCHAR(150),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mentors_profile_id ON public.mentors(profile_id);
CREATE INDEX IF NOT EXISTS idx_mentors_department_id ON public.mentors(department_id);
CREATE INDEX IF NOT EXISTS idx_mentors_institution_id ON public.mentors(institution_id);
CREATE INDEX IF NOT EXISTS idx_mentors_status ON public.mentors(status);
CREATE INDEX IF NOT EXISTS idx_mentors_employee_id ON public.mentors(employee_id);

-- Backfill mentors from profiles where role = 'mentor'
INSERT INTO public.mentors (
    profile_id, institution_id, department_id, employee_id, status
)
SELECT 
    p.id,
    COALESCE(p.institution_id, 'a0000000-0000-0000-0000-000000000001'::uuid),
    COALESCE(p.department_id, 'b0000000-0000-0000-0000-000000000001'::uuid),
    COALESCE(p.mentor_id, 'EMP_' || substr(p.id::text, 1, 8)),
    CASE WHEN p.is_active = true THEN 'active' ELSE 'inactive' END
FROM public.profiles p
WHERE p.role = 'mentor'
ON CONFLICT (profile_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. STUDENTS TABLE (Normalized Student Interns Domain Entity)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    register_number VARCHAR(50) NOT NULL UNIQUE,
    academic_year VARCHAR(20) NOT NULL DEFAULT '3rd Year',
    current_semester INTEGER CHECK (current_semester BETWEEN 1 AND 8),
    batch_year VARCHAR(20) DEFAULT '2023-2027',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'interning', 'delayed', 'blocked', 'completed', 'inactive')),
    cgpa NUMERIC(3,2) CHECK (cgpa IS NULL OR (cgpa >= 0.0 AND cgpa <= 10.0)),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_department_id ON public.students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON public.students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON public.students(register_number);

-- Backfill students from profiles where role = 'student'
INSERT INTO public.students (
    profile_id, institution_id, department_id, register_number, status
)
SELECT 
    p.id,
    COALESCE(p.institution_id, 'a0000000-0000-0000-0000-000000000001'::uuid),
    COALESCE(p.department_id, 'b0000000-0000-0000-0000-000000000001'::uuid),
    COALESCE(p.student_id, 'REG_' || substr(p.id::text, 1, 8)),
    CASE WHEN p.is_active = true THEN 'active' ELSE 'inactive' END
FROM public.profiles p
WHERE p.role = 'student'
ON CONFLICT (profile_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. INTERNSHIP LOCATIONS (PostGIS Geofence Expansion & Multi-Dept Scoping)
-- ------------------------------------------------------------------------------
-- Non-destructively augment public.internship_locations
ALTER TABLE public.internship_locations
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS contact_person_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Add PostGIS spatial columns safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'internship_locations' 
          AND column_name = 'geofence_center'
    ) THEN
        ALTER TABLE public.internship_locations 
            ADD COLUMN geofence_center geography(Point, 4326);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'internship_locations' 
          AND column_name = 'polygon_boundary'
    ) THEN
        ALTER TABLE public.internship_locations 
            ADD COLUMN polygon_boundary geography(Polygon, 4326);
    END IF;
END $$;

-- Add constraints on radius and status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_locations_geofence_radius'
    ) THEN
        ALTER TABLE public.internship_locations
            ADD CONSTRAINT check_locations_geofence_radius 
            CHECK (geofence_radius_meters > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_locations_status'
    ) THEN
        ALTER TABLE public.internship_locations
            ADD CONSTRAINT check_locations_status 
            CHECK (status IN ('active', 'inactive', 'pending_approval', 'archived'));
    END IF;
END $$;

-- Populate geofence_center from latitude & longitude
UPDATE public.internship_locations
SET 
    geofence_center = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
    institution_id = COALESCE(institution_id, 'a0000000-0000-0000-0000-000000000001'::uuid)
WHERE geofence_center IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Spatial and B-Tree Indexes on internship_locations
CREATE INDEX IF NOT EXISTS idx_locations_geofence_center ON public.internship_locations USING GIST (geofence_center);
CREATE INDEX IF NOT EXISTS idx_locations_institution ON public.internship_locations(institution_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON public.internship_locations(status);

-- Trigger to keep geofence_center and (latitude, longitude) synchronized
CREATE OR REPLACE FUNCTION public.sync_internship_location_coordinates()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
        IF (TG_OP = 'INSERT') OR 
           (OLD.latitude IS DISTINCT FROM NEW.latitude) OR 
           (OLD.longitude IS DISTINCT FROM NEW.longitude) OR 
           (NEW.geofence_center IS NULL) THEN
            NEW.geofence_center := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        END IF;
    ELSIF (NEW.geofence_center IS NOT NULL) THEN
        NEW.latitude := ST_Y(NEW.geofence_center::geometry);
        NEW.longitude := ST_X(NEW.geofence_center::geometry);
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_location_coordinates ON public.internship_locations;
CREATE TRIGGER trigger_sync_location_coordinates
    BEFORE INSERT OR UPDATE ON public.internship_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_internship_location_coordinates();

-- Junction Table: Multi-Department Location Support
CREATE TABLE IF NOT EXISTS public.location_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.internship_locations(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_location_department UNIQUE (location_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_loc_dept_loc ON public.location_departments(location_id);
CREATE INDEX IF NOT EXISTS idx_loc_dept_dept ON public.location_departments(department_id);

-- ------------------------------------------------------------------------------
-- 8. INTERNSHIP ASSIGNMENTS (Duplicate Prevention & History Preservation)
-- ------------------------------------------------------------------------------
-- Non-destructively augment public.internship_assignments
ALTER TABLE public.internship_assignments
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS work_start_time TIME NOT NULL DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS work_end_time TIME NOT NULL DEFAULT '17:00:00',
    ADD COLUMN IF NOT EXISTS required_daily_hours NUMERIC(4,2) NOT NULL DEFAULT 8.0,
    ADD COLUMN IF NOT EXISTS academic_term VARCHAR(50) DEFAULT '2026-Even',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Constraints on assignment dates and status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_assignment_dates'
    ) THEN
        ALTER TABLE public.internship_assignments
            ADD CONSTRAINT check_assignment_dates 
            CHECK (end_date >= start_date);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_assignment_daily_hours'
    ) THEN
        ALTER TABLE public.internship_assignments
            ADD CONSTRAINT check_assignment_daily_hours 
            CHECK (required_daily_hours > 0 AND required_daily_hours <= 24);
    END IF;
END $$;

-- Update foreign keys: enforce ON DELETE RESTRICT on historical student assignments to PRESERVE history
DO $$
BEGIN
    -- Drop old cascade constraint if present to protect history
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'internship_assignments_student_id_fkey'
    ) THEN
        ALTER TABLE public.internship_assignments DROP CONSTRAINT internship_assignments_student_id_fkey;
        ALTER TABLE public.internship_assignments 
            ADD CONSTRAINT internship_assignments_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Backfill assignment institution and department
UPDATE public.internship_assignments a
SET 
    institution_id = 'a0000000-0000-0000-0000-000000000001'::uuid,
    department_id = COALESCE(a.department_id, p.department_id)
FROM public.profiles p
WHERE a.student_id = p.id AND a.institution_id IS NULL;

-- REQUIREMENT: PREVENT DUPLICATE ASSIGNMENTS
-- 1. Unique Partial Index: A student can only have ONE 'active' assignment at any point in time!
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_student_assignment 
ON public.internship_assignments (student_id) 
WHERE status = 'active';

-- 2. Trigger to prevent overlapping assignment date intervals for a student
CREATE OR REPLACE FUNCTION public.check_assignment_overlap()
RETURNS TRIGGER AS $$
DECLARE
    overlap_count INTEGER;
BEGIN
    IF NEW.status = 'active' THEN
        SELECT count(*) INTO overlap_count
        FROM public.internship_assignments
        WHERE student_id = NEW.student_id
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND status = 'active'
          AND (
              (NEW.start_date BETWEEN start_date AND end_date) OR
              (NEW.end_date BETWEEN start_date AND end_date) OR
              (start_date BETWEEN NEW.start_date AND NEW.end_date)
          );
        
        IF overlap_count > 0 THEN
            RAISE EXCEPTION 'Assignment Conflict: Student % already has an active overlapping internship assignment in this date range.', NEW.student_id;
        END IF;
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_assignment_overlap ON public.internship_assignments;
CREATE TRIGGER trigger_check_assignment_overlap
    BEFORE INSERT OR UPDATE OF start_date, end_date, status, student_id ON public.internship_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_assignment_overlap();

CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON public.internship_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_mentor_id ON public.internship_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_location_id ON public.internship_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.internship_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON public.internship_assignments(start_date, end_date);

-- ------------------------------------------------------------------------------
-- 9. ATTENDANCE SESSIONS (Daily Shift Tracking & Attendance Lifecycle)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.internship_assignments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    check_in_location_id UUID REFERENCES public.internship_locations(id) ON DELETE SET NULL,
    check_out_location_id UUID REFERENCES public.internship_locations(id) ON DELETE SET NULL,
    total_hours NUMERIC(5,2) DEFAULT 0.0 CHECK (total_hours >= 0.0),
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'late', 'flagged', 'holiday', 'leave')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_session_date UNIQUE (student_id, session_date),
    CONSTRAINT check_session_checkout CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_student_date ON public.attendance_sessions(student_id, session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_assignment ON public.attendance_sessions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status ON public.attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(session_date);

-- Trigger to calculate total_hours on attendance_sessions check_out
CREATE OR REPLACE FUNCTION public.calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in_at IS NOT NULL AND NEW.check_out_at IS NOT NULL THEN
        NEW.total_hours := ROUND((EXTRACT(EPOCH FROM (NEW.check_out_at - NEW.check_in_at)) / 3600.0)::numeric, 2);
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_attendance_hours ON public.attendance_sessions;
CREATE TRIGGER trigger_calculate_attendance_hours
    BEFORE INSERT OR UPDATE OF check_in_at, check_out_at ON public.attendance_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_attendance_hours();

-- Canonical ATTENDANCE_RECORDS View (for target architecture and reporting compatibility)
CREATE OR REPLACE VIEW public.attendance_records AS
SELECT 
    s.id,
    s.assignment_id,
    s.student_id,
    s.session_date AS date,
    s.check_in_at,
    s.check_out_at,
    s.total_hours,
    s.status,
    s.is_verified,
    s.notes,
    s.created_at,
    s.updated_at
FROM public.attendance_sessions s;

-- ------------------------------------------------------------------------------
-- 10. LOCATION VERIFICATIONS (Spatial Geofence Events & Anti-Spoof Audit)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
    assignment_id UUID NOT NULL REFERENCES public.internship_assignments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.internship_locations(id) ON DELETE SET NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('check_in', 'check_out', 'random_ping', 'scheduled_ping', 'manual_ping', 'mentor_check')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    responded_at TIMESTAMPTZ,
    captured_latitude DOUBLE PRECISION,
    captured_longitude DOUBLE PRECISION,
    captured_location geography(Point, 4326),
    accuracy_meters DOUBLE PRECISION CHECK (accuracy_meters IS NULL OR accuracy_meters >= 0),
    distance_to_center_meters DOUBLE PRECISION CHECK (distance_to_center_meters IS NULL OR distance_to_center_meters >= 0),
    is_within_geofence BOOLEAN,
    is_mock_location BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'out_of_bounds', 'timeout', 'spoof_detected', 'low_accuracy_rejected', 'pending')),
    device_metadata JSONB DEFAULT '{}'::jsonb,
    remarks TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Spatial and B-Tree Indexes on location_verifications
CREATE INDEX IF NOT EXISTS idx_verifications_captured_location ON public.location_verifications USING GIST (captured_location);
CREATE INDEX IF NOT EXISTS idx_verifications_student_id ON public.location_verifications(student_id);
CREATE INDEX IF NOT EXISTS idx_verifications_assignment_id ON public.location_verifications(assignment_id);
CREATE INDEX IF NOT EXISTS idx_verifications_session_id ON public.location_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON public.location_verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_requested_at ON public.location_verifications(requested_at);

-- Trigger to sync PostGIS geography column on location_verifications
CREATE OR REPLACE FUNCTION public.sync_verification_geography()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.captured_latitude IS NOT NULL AND NEW.captured_longitude IS NOT NULL) THEN
        NEW.captured_location := ST_SetSRID(ST_MakePoint(NEW.captured_longitude, NEW.captured_latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_verification_geography ON public.location_verifications;
CREATE TRIGGER trigger_sync_verification_geography
    BEFORE INSERT OR UPDATE OF captured_latitude, captured_longitude ON public.location_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_verification_geography();

-- Canonical VERIFICATION_EVENTS View (for target architecture and client feeds)
CREATE OR REPLACE VIEW public.verification_events AS
SELECT 
    v.id,
    v.session_id AS attendance_id,
    v.student_id,
    v.assignment_id,
    v.location_id,
    v.event_type,
    v.requested_at,
    v.responded_at,
    v.captured_latitude,
    v.captured_longitude,
    v.captured_location,
    v.accuracy_meters,
    v.distance_to_center_meters,
    v.is_within_geofence,
    v.is_mock_location,
    v.status AS verification_status,
    v.device_metadata,
    v.remarks,
    v.created_at
FROM public.location_verifications v;

-- ------------------------------------------------------------------------------
-- 11. VERIFICATION SCHEDULES (Random & Periodic Ping Windows)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.internship_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'responded', 'expired', 'cancelled')),
    verification_id UUID REFERENCES public.location_verifications(id) ON DELETE SET NULL,
    dispatched_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_schedule_window CHECK (window_end >= window_start)
);

CREATE INDEX IF NOT EXISTS idx_verification_schedules_student_date ON public.verification_schedules(student_id, target_date);
CREATE INDEX IF NOT EXISTS idx_verification_schedules_status ON public.verification_schedules(status);
CREATE INDEX IF NOT EXISTS idx_verification_schedules_window ON public.verification_schedules(window_start, window_end);

-- ------------------------------------------------------------------------------
-- 12. NOTIFICATIONS (Alerts, Risk Events, Verification Prompts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'verification_request', 'verification_result', 'attendance_alert', 
        'risk_alert', 'log_feedback', 'assignment_update', 'system_announcement'
    )),
    action_url VARCHAR(255),
    payload JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Device Tokens Table for Firebase Cloud Messaging (FCM)
CREATE TABLE IF NOT EXISTS public.fcm_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_device_tokens(user_id);

-- ------------------------------------------------------------------------------
-- 13. AUDIT LOGS (Tamper-Evident System Event & Governance Journal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Generalized Audit Trigger Function
CREATE OR REPLACE FUNCTION public.log_table_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_inst_id UUID;
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_entity_id VARCHAR;
BEGIN
    v_actor_id := auth.uid();

    IF (TG_OP = 'DELETE') THEN
        v_entity_id := OLD.id::text;
        v_old := to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        v_entity_id := NEW.id::text;
        v_new := to_jsonb(NEW);
    ELSE
        v_entity_id := NEW.id::text;
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    END IF;

    -- Extract institution_id if present
    IF (TG_OP = 'DELETE') THEN
        IF v_old ? 'institution_id' THEN
            v_inst_id := (v_old->>'institution_id')::uuid;
        END IF;
    ELSE
        IF v_new ? 'institution_id' THEN
            v_inst_id := (v_new->>'institution_id')::uuid;
        END IF;
    END IF;

    INSERT INTO public.audit_logs (
        institution_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        v_inst_id,
        v_actor_id,
        TG_OP,
        TG_TABLE_NAME,
        v_entity_id,
        v_old,
        v_new
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Trigger to sensitive tables
DROP TRIGGER IF EXISTS audit_internship_assignments ON public.internship_assignments;
CREATE TRIGGER audit_internship_assignments
    AFTER INSERT OR UPDATE OR DELETE ON public.internship_assignments
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

DROP TRIGGER IF EXISTS audit_internship_locations ON public.internship_locations;
CREATE TRIGGER audit_internship_locations
    AFTER INSERT OR UPDATE OR DELETE ON public.internship_locations
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
    AFTER UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_table_audit_trail();

-- ------------------------------------------------------------------------------
-- 14. ENHANCE EXISTING student_daily_logs (Non-Destructive Linkages)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_daily_logs
    ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.internship_assignments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_daily_logs_session_id ON public.student_daily_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_student_daily_logs_assignment_id ON public.student_daily_logs(assignment_id);

-- ------------------------------------------------------------------------------
-- 15. POSTGIS STORED PROCEDURE: validate_student_location
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_student_location(
    p_student_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_accuracy DOUBLE PRECISION,
    p_is_mock BOOLEAN,
    p_event_type VARCHAR,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_assignment RECORD;
    v_captured_point geography;
    v_distance DOUBLE PRECISION;
    v_is_inside BOOLEAN;
    v_status VARCHAR;
    v_event_id UUID;
    v_session_id UUID;
    v_today DATE := CURRENT_DATE;
    v_now TIMESTAMPTZ := CLOCK_TIMESTAMP();
BEGIN
    -- 1. Anti-Spoofing & Accuracy Evaluation
    IF p_is_mock = TRUE THEN
        v_status := 'spoof_detected';
    ELSIF p_accuracy IS NOT NULL AND p_accuracy > 60.0 THEN
        v_status := 'low_accuracy_rejected';
    END IF;

    -- 2. Resolve Active Assignment for Student
    SELECT a.id, a.location_id, l.geofence_center, l.geofence_radius_meters, l.company_name
    INTO v_assignment
    FROM public.internship_assignments a
    JOIN public.internship_locations l ON l.id = a.location_id
    WHERE a.student_id = p_student_id
      AND a.status = 'active'
      AND v_today BETWEEN a.start_date AND a.end_date
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active internship assignment found for student % on date %', p_student_id, v_today;
    END IF;

    -- 3. PostGIS Geodesic Distance Calculation (WGS 84 Ellipsoid)
    v_captured_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
    v_distance := ST_Distance(v_captured_point, v_assignment.geofence_center);
    v_is_inside := (v_distance <= v_assignment.geofence_radius_meters);

    -- 4. Final Verification State
    IF v_status IS NULL THEN
        IF v_is_inside THEN
            v_status := 'verified';
        ELSE
            v_status := 'out_of_bounds';
        END IF;
    END IF;

    -- 5. Session Integration (Create or Update Today's Attendance Session)
    SELECT id INTO v_session_id
    FROM public.attendance_sessions
    WHERE student_id = p_student_id AND session_date = v_today;

    IF v_session_id IS NULL THEN
        INSERT INTO public.attendance_sessions (
            assignment_id,
            student_id,
            session_date,
            check_in_at,
            check_in_location_id,
            status,
            is_verified
        ) VALUES (
            v_assignment.id,
            p_student_id,
            v_today,
            v_now,
            v_assignment.location_id,
            CASE WHEN v_status = 'verified' THEN 'present' ELSE 'flagged' END,
            (v_status = 'verified')
        ) RETURNING id INTO v_session_id;
    ELSIF p_event_type = 'check_out' AND v_status = 'verified' THEN
        UPDATE public.attendance_sessions
        SET 
            check_out_at = v_now,
            check_out_location_id = v_assignment.location_id,
            is_verified = true
        WHERE id = v_session_id;
    ELSIF v_status <> 'verified' THEN
        -- Flag session on verification failure
        UPDATE public.attendance_sessions
        SET status = 'flagged'
        WHERE id = v_session_id;
    END IF;

    -- 6. Record Location Verification Event
    INSERT INTO public.location_verifications (
        session_id,
        assignment_id,
        student_id,
        location_id,
        event_type,
        requested_at,
        responded_at,
        captured_latitude,
        captured_longitude,
        captured_location,
        accuracy_meters,
        distance_to_center_meters,
        is_within_geofence,
        is_mock_location,
        status,
        device_metadata,
        verified_at
    ) VALUES (
        v_session_id,
        v_assignment.id,
        p_student_id,
        v_assignment.location_id,
        p_event_type,
        v_now,
        v_now,
        p_latitude,
        p_longitude,
        v_captured_point,
        p_accuracy,
        ROUND(v_distance::numeric, 2),
        v_is_inside,
        p_is_mock,
        v_status,
        p_device_info,
        CASE WHEN v_status = 'verified' THEN v_now ELSE NULL END
    ) RETURNING id INTO v_event_id;

    -- 7. Automated Notification on Security Violations
    IF v_status IN ('spoof_detected', 'out_of_bounds') THEN
        INSERT INTO public.notifications (
            recipient_id,
            title,
            message,
            notification_type,
            payload
        ) VALUES (
            p_student_id,
            'Verification Alert: ' || replace(v_status, '_', ' '),
            'Your recent ' || p_event_type || ' was flagged as ' || v_status || ' (Distance: ' || ROUND(v_distance::numeric, 1) || 'm). Please contact your mentor.',
            'risk_alert',
            jsonb_build_object(
                'event_id', v_event_id,
                'status', v_status,
                'distance_meters', ROUND(v_distance::numeric, 2)
            )
        );
    END IF;

    -- 8. Return Detailed Verification Response
    RETURN jsonb_build_object(
        'event_id', v_event_id,
        'session_id', v_session_id,
        'verification_status', v_status,
        'distance_meters', ROUND(v_distance::numeric, 2),
        'geofence_radius_meters', v_assignment.geofence_radius_meters,
        'is_inside', v_is_inside,
        'accuracy_meters', p_accuracy,
        'company_name', v_assignment.company_name,
        'timestamp', v_now
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 16. ROW LEVEL SECURITY (RLS) POLICIES ON ALL EXPANDED TABLES
-- ------------------------------------------------------------------------------

-- A. INSTITUTIONS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institutions_select_authenticated" ON public.institutions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "institutions_hod_manage" ON public.institutions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

-- B. DEPARTMENTS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select_authenticated" ON public.departments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "departments_hod_manage" ON public.departments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

-- C. MENTORS
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mentors_select_authenticated" ON public.mentors
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "mentors_hod_manage" ON public.mentors
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE POLICY "mentors_update_self" ON public.mentors
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- D. STUDENTS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select_policy" ON public.students
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.student_id = students.profile_id AND a.mentor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE POLICY "students_hod_manage" ON public.students
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

-- E. LOCATION DEPARTMENTS
ALTER TABLE public.location_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_departments_select" ON public.location_departments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "location_departments_hod_manage" ON public.location_departments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

-- F. ATTENDANCE SESSIONS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_sessions_select" ON public.attendance_sessions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = attendance_sessions.assignment_id AND a.mentor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE POLICY "attendance_sessions_student_insert" ON public.attendance_sessions
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "attendance_sessions_student_update" ON public.attendance_sessions
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "attendance_sessions_mentor_hod_manage" ON public.attendance_sessions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('mentor', 'hod') AND p.is_active = true
        )
    );

-- G. LOCATION VERIFICATIONS
ALTER TABLE public.location_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_verifications_select" ON public.location_verifications
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = location_verifications.assignment_id AND a.mentor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE POLICY "location_verifications_student_insert" ON public.location_verifications
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "location_verifications_mentor_hod_all" ON public.location_verifications
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('mentor', 'hod') AND p.is_active = true
        )
    );

-- H. VERIFICATION SCHEDULES
ALTER TABLE public.verification_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_schedules_select" ON public.verification_schedules
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            WHERE a.id = verification_schedules.assignment_id AND a.mentor_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE POLICY "verification_schedules_mentor_hod_manage" ON public.verification_schedules
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('mentor', 'hod') AND p.is_active = true
        )
    );

-- I. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "notifications_insert_all" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- J. FCM DEVICE TOKENS
ALTER TABLE public.fcm_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fcm_tokens_user_own" ON public.fcm_device_tokens
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- K. AUDIT LOGS (Append-only & HOD Audit Isolation)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_hod" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'hod' AND p.is_active = true
        )
    );

CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

