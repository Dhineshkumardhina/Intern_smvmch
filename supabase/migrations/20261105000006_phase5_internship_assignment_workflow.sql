-- ==============================================================================
-- Migration: 20261105000006_phase5_internship_assignment_workflow.sql
-- Description: Phase 5 Complete Internship Assignment Workflow & Validation Constraints
-- Target Database: Supabase PostgreSQL (WGS 84 / PostGIS / RLS Hardened)
-- Institution: Sri Manakula Vinayagar Engineering College (Autonomous) - SMVEC
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD ASSIGNMENT METADATA AND TIMESTAMP COLUMNS (NON-DESTRUCTIVE)
-- ------------------------------------------------------------------------------
ALTER TABLE public.internship_assignments
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS monitoring_start_time TIME NOT NULL DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS monitoring_end_time TIME NOT NULL DEFAULT '17:00:00';

-- Backfill assigned_at from created_at
UPDATE public.internship_assignments
SET assigned_at = created_at
WHERE assigned_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. VALIDATION TRIGGER: ENFORCE APPROVED LOCATION ASSIGNMENT ONLY
-- ------------------------------------------------------------------------------
-- Requirement: Only approved locations can be assigned!
CREATE OR REPLACE FUNCTION public.validate_assignment_location_approval()
RETURNS TRIGGER AS $$
DECLARE
    loc_status VARCHAR(20);
    loc_active BOOLEAN;
    loc_approved_by UUID;
BEGIN
    IF NEW.location_id IS NOT NULL THEN
        SELECT status, is_active, approved_by 
        INTO loc_status, loc_active, loc_approved_by
        FROM public.internship_locations
        WHERE id = NEW.location_id;

        IF loc_status IS NULL THEN
            RAISE EXCEPTION 'Validation Error: Referenced internship location % does not exist.', NEW.location_id;
        END IF;

        IF loc_status <> 'active' OR loc_active <> true THEN
            RAISE EXCEPTION 'Validation Error: Only approved active internship locations can be assigned. Location % has status "%" (active: %).', 
                NEW.location_id, loc_status, loc_active;
        END IF;
    END IF;

    -- Validate date range
    IF NEW.end_date < NEW.start_date THEN
        RAISE EXCEPTION 'Validation Error: Internship end date (%) cannot precede start date (%).', NEW.end_date, NEW.start_date;
    END IF;

    -- Default assigned_at
    IF NEW.assigned_at IS NULL THEN
        NEW.assigned_at := timezone('utc'::text, now());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_assignment_location_approval ON public.internship_assignments;
CREATE TRIGGER trigger_validate_assignment_location_approval
    BEFORE INSERT OR UPDATE OF location_id, start_date, end_date ON public.internship_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_assignment_location_approval();

-- ------------------------------------------------------------------------------
-- 3. ANTI-TAMPER TRIGGER: PREVENT STUDENTS FROM MODIFYING ASSIGNMENT DETAILS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_student_assignment_modification()
RETURNS TRIGGER AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    user_role := public.get_auth_user_role();
    IF user_role = 'student' THEN
        RAISE EXCEPTION 'Security Violation: Students cannot create or modify internship assignment details.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_student_assignment_tamper ON public.internship_assignments;
CREATE TRIGGER trigger_prevent_student_assignment_tamper
    BEFORE INSERT OR UPDATE OR DELETE ON public.internship_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_student_assignment_modification();

-- ------------------------------------------------------------------------------
-- 4. HISTORICAL INTEGRITY CONSTRAINTS
-- ------------------------------------------------------------------------------
-- Enforce ON DELETE RESTRICT on location_id to preserve assignment history
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'internship_assignments_location_id_fkey'
    ) THEN
        ALTER TABLE public.internship_assignments DROP CONSTRAINT internship_assignments_location_id_fkey;
        ALTER TABLE public.internship_assignments 
            ADD CONSTRAINT internship_assignments_location_id_fkey 
            FOREIGN KEY (location_id) REFERENCES public.internship_locations(id) ON DELETE RESTRICT;
    END IF;
END $$;

