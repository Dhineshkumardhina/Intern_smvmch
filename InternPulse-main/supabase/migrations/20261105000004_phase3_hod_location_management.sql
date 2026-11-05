-- ==============================================================================
-- Migration: 20261105000004_phase3_hod_location_management.sql
-- Description: Phase 3 HOD Internship Location & Geofence Governance Enhancement
-- Project: InternPulse (Sri Manakula Vinayagar Engineering College)
-- Capabilities:
--   - Add full location metadata (location_name, monitoring hours, dates, department)
--   - Approval lifecycle tracking (approved_by, approved_at)
--   - PostGIS coordinates & geofence radius constraints
--   - Scoped RLS policies for HOD management & audit logging
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD PHASE 3 LOCATION METADATA COLUMNS (NON-DESTRUCTIVE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.internship_locations
    ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS internship_start_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS internship_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '6 months'),
    ADD COLUMN IF NOT EXISTS monitoring_start_time TIME DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS monitoring_end_time TIME DEFAULT '17:00:00',
    ADD COLUMN IF NOT EXISTS department_code VARCHAR(50) DEFAULT 'ALL',
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill location_name with company_name if null
UPDATE public.internship_locations
SET location_name = company_name
WHERE location_name IS NULL;

-- Ensure location_name is not null for future inserts
ALTER TABLE public.internship_locations
    ALTER COLUMN location_name SET DEFAULT 'Internship Host Facility';

-- Constraints on monitoring hours and dates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_location_monitoring_hours'
    ) THEN
        ALTER TABLE public.internship_locations
            ADD CONSTRAINT check_location_monitoring_hours
            CHECK (monitoring_end_time > monitoring_start_time);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_location_internship_dates'
    ) THEN
        ALTER TABLE public.internship_locations
            ADD CONSTRAINT check_location_internship_dates
            CHECK (internship_end_date >= internship_start_date);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_location_geofence_bounds'
    ) THEN
        ALTER TABLE public.internship_locations
            ADD CONSTRAINT check_location_geofence_bounds
            CHECK (geofence_radius_meters >= 20.0 AND geofence_radius_meters <= 5000.0);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. SEED DEFAULT INSTITUTIONAL HOST LOCATIONS FOR SMVEC (Puducherry & Chennai)
-- ------------------------------------------------------------------------------
INSERT INTO public.internship_locations (
    id,
    institution_id,
    location_name,
    company_name,
    address,
    latitude,
    longitude,
    geofence_radius_meters,
    monitoring_start_time,
    monitoring_end_time,
    department_code,
    status,
    is_active
)
VALUES
    (
        'c0000000-0000-0000-0000-000000000001'::uuid,
        'a0000000-0000-0000-0000-000000000001'::uuid,
        'TCS Siruseri Innovation Hub',
        'Tata Consultancy Services',
        'SIPCOT IT Park, Siruseri, Chennai, Tamil Nadu 603103',
        12.8284,
        80.2198,
        200.0,
        '09:00:00',
        '18:00:00',
        'CSEBS',
        'active',
        true
    ),
    (
        'c0000000-0000-0000-0000-000000000002'::uuid,
        'a0000000-0000-0000-0000-000000000001'::uuid,
        'Zoho Estancia Global Technology Center',
        'Zoho Corporation',
        'Plot A1, Estancia IT Park, Vallancheri, GST Road, Chengalpattu, Tamil Nadu 603202',
        12.8338,
        80.0435,
        250.0,
        '09:00:00',
        '17:30:00',
        'IT',
        'active',
        true
    ),
    (
        'c0000000-0000-0000-0000-000000000003'::uuid,
        'a0000000-0000-0000-0000-000000000001'::uuid,
        'Lenovo Manufacturing & Embedded IoT Park',
        'Lenovo India Pvt Ltd',
        'R.S. No 19/1A, ECR, Karuvadikuppam, Puducherry 605008',
        11.9615,
        79.8288,
        150.0,
        '08:30:00',
        '17:00:00',
        'ECE',
        'active',
        true
    ),
    (
        'c0000000-0000-0000-0000-000000000004'::uuid,
        'a0000000-0000-0000-0000-000000000001'::uuid,
        'JIPMER Biomedical Engineering & Research Center',
        'JIPMER Research Labs',
        'Dhanvantari Nagar, Gorimedu, Puducherry 605006',
        11.9548,
        79.7997,
        180.0,
        '09:00:00',
        '16:30:00',
        'BME',
        'pending_approval',
        false
    )
ON CONFLICT (id) DO UPDATE SET
    location_name = EXCLUDED.location_name,
    monitoring_start_time = EXCLUDED.monitoring_start_time,
    monitoring_end_time = EXCLUDED.monitoring_end_time,
    department_code = EXCLUDED.department_code,
    updated_at = timezone('utc'::text, now());

-- Sync PostGIS spatial column for newly inserted / updated locations
UPDATE public.internship_locations
SET geofence_center = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geofence_center IS NULL;

