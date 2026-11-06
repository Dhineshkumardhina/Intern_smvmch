-- ==============================================================================
-- Migration: 20261106000013_phase17c_multi_department_internship_management.sql
-- Description: Phase 17C Multi-Department Internship Management & Governance
-- Target Database: Supabase PostgreSQL (PostGIS / WGS 84 / RLS Zero-Trust)
-- Institution: Sri Manakula Vinayagar Engineering College (Autonomous) - SMVEC
-- Capabilities:
--   1. Department Configuration Extensions (phone, description, default hours)
--   2. Internship Batches Enhancement (link to internship_assignments)
--   3. Location Change History Table & Triggers (Audit Trail for geofences)
--   4. Student Department Transfers Table (Audit Trail for department moves)
--   5. Provider Directory View (Multi-department industry partners)
--   6. RLS Policies for Batches, Location History, and Transfers
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND DEPARTMENTS CONFIGURATION NON-DESTRUCTIVELY
-- ------------------------------------------------------------------------------
ALTER TABLE public.departments
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(25),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS default_monitoring_start_time TIME NOT NULL DEFAULT '09:00:00',
    ADD COLUMN IF NOT EXISTS default_monitoring_end_time TIME NOT NULL DEFAULT '17:00:00';

-- Update pilot CSEBS configuration defaults
UPDATE public.departments
SET 
    contact_phone = '+91 413 264 3007',
    description = 'Department of Computer Science & Business Systems (AICTE-TCS Joint Program)',
    default_monitoring_start_time = '09:00:00',
    default_monitoring_end_time = '17:00:00'
WHERE code = 'CSEBS';

-- Update IT department configuration defaults
UPDATE public.departments
SET 
    contact_phone = '+91 413 264 3008',
    description = 'Department of Information Technology',
    default_monitoring_start_time = '09:00:00',
    default_monitoring_end_time = '17:30:00'
WHERE code = 'IT';

-- ------------------------------------------------------------------------------
-- 2. ENHANCE INTERNSHIP ASSIGNMENTS WITH BATCH LINK
-- ------------------------------------------------------------------------------
ALTER TABLE public.internship_assignments
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.internship_batches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_assignments_batch_id ON public.internship_assignments(batch_id);

-- ------------------------------------------------------------------------------
-- 3. CREATE LOCATION CHANGE HISTORY AUDIT TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.internship_locations(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    change_type VARCHAR(50) NOT NULL CHECK (
        change_type IN (
            'created',
            'status_changed',
            'geofence_updated',
            'coordinates_updated',
            'schedule_updated',
            'approved',
            'reassigned',
            'metadata_updated'
        )
    ),
    previous_state JSONB,
    new_state JSONB,
    remarks TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_loc_history_location ON public.location_change_history(location_id);
CREATE INDEX IF NOT EXISTS idx_loc_history_changed_at ON public.location_change_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_loc_history_type ON public.location_change_history(change_type);

-- Enable RLS on location_change_history
ALTER TABLE public.location_change_history ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admins can view all history
CREATE POLICY "location_history_super_admin_select" ON public.location_change_history
    FOR SELECT
    USING (public.is_super_admin());

-- Policy: HODs can view history for their department's locations
CREATE POLICY "location_history_hod_select" ON public.location_change_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.internship_locations loc
            JOIN public.profiles hod_prof ON hod_prof.id = auth.uid()
            WHERE loc.id = location_change_history.location_id
              AND loc.department_code = hod_prof.department_code
              AND hod_prof.role = 'hod'
              AND hod_prof.is_active = true
        )
    );

-- Policy: Authorized HODs and Admins can insert history records
CREATE POLICY "location_history_insert_scoped" ON public.location_change_history
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
        OR EXISTS (
            SELECT 1 
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('hod', 'admin')
        )
    );

-- ------------------------------------------------------------------------------
-- 4. CREATE STUDENT DEPARTMENT TRANSFERS AUDIT TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_department_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    to_department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    authorized_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    previous_batch_id UUID REFERENCES public.internship_batches(id) ON DELETE SET NULL,
    new_batch_id UUID REFERENCES public.internship_batches(id) ON DELETE SET NULL,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transfers_student ON public.student_department_transfers(student_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_dept ON public.student_department_transfers(from_department_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_dept ON public.student_department_transfers(to_department_id);
CREATE INDEX IF NOT EXISTS idx_transfers_time ON public.student_department_transfers(transferred_at DESC);

-- Enable RLS on student_department_transfers
ALTER TABLE public.student_department_transfers ENABLE ROW LEVEL SECURITY;

-- Super Admin can view all transfer records
CREATE POLICY "transfers_super_admin_select" ON public.student_department_transfers
    FOR SELECT
    USING (public.is_super_admin());

-- HOD can view transfers involving their department (either as from or to)
CREATE POLICY "transfers_hod_select" ON public.student_department_transfers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.profiles hod_prof
            WHERE hod_prof.id = auth.uid()
              AND hod_prof.role = 'hod'
              AND hod_prof.is_active = true
              AND (
                  hod_prof.department_id = student_department_transfers.from_department_id
                  OR hod_prof.department_id = student_department_transfers.to_department_id
              )
        )
    );

-- Only Super Admin can insert transfer records
CREATE POLICY "transfers_super_admin_insert" ON public.student_department_transfers
    FOR INSERT
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES FOR INTERNSHIP BATCHES
-- ------------------------------------------------------------------------------
ALTER TABLE public.internship_batches ENABLE ROW LEVEL SECURITY;

-- Super Admin can select all batches
CREATE POLICY "batches_super_admin_select" ON public.internship_batches
    FOR SELECT
    USING (public.is_super_admin());

-- Department members (HOD, mentors, students) can view batches in their department
CREATE POLICY "batches_department_select" ON public.internship_batches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.department_id = internship_batches.department_id
        )
    );

-- HOD can create and update batches for their own department
CREATE POLICY "batches_hod_insert" ON public.internship_batches
    FOR INSERT
    WITH CHECK (
        public.is_super_admin()
        OR EXISTS (
            SELECT 1 
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role = 'hod'
              AND p.department_id = internship_batches.department_id
        )
    );

CREATE POLICY "batches_hod_update" ON public.internship_batches
    FOR UPDATE
    USING (
        public.is_super_admin()
        OR EXISTS (
            SELECT 1 
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role = 'hod'
              AND p.department_id = internship_batches.department_id
        )
    );

-- ------------------------------------------------------------------------------
-- 6. PROVIDERS DIRECTORY VIEW
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.internship_providers_directory AS
SELECT 
    loc.company_name,
    COUNT(DISTINCT loc.id) AS total_locations,
    COUNT(DISTINCT loc.department_code) AS department_count,
    STRING_AGG(DISTINCT loc.department_code, ', ' ORDER BY loc.department_code) AS participating_departments,
    CASE 
        WHEN BOOL_OR(loc.status = 'active') THEN 'active'
        WHEN BOOL_OR(loc.status = 'pending_approval') THEN 'pending_approval'
        ELSE 'inactive'
    END AS provider_status,
    MIN(loc.internship_start_date) AS earliest_start_date,
    MAX(loc.internship_end_date) AS latest_end_date,
    COUNT(DISTINCT asgn.student_id) AS active_interns_count
FROM public.internship_locations loc
LEFT JOIN public.internship_assignments asgn 
    ON asgn.location_id = loc.id AND asgn.status = 'active'
GROUP BY loc.company_name;

-- ------------------------------------------------------------------------------
-- 7. REVERT & DOWN MIGRATION CAPABILITY (DOCUMENTED)
-- ------------------------------------------------------------------------------
-- DROP VIEW IF EXISTS public.internship_providers_directory;
-- DROP TABLE IF EXISTS public.student_department_transfers CASCADE;
-- DROP TABLE IF EXISTS public.location_change_history CASCADE;
-- ALTER TABLE public.internship_assignments DROP COLUMN IF EXISTS batch_id, DROP COLUMN IF EXISTS batch_name;
-- ALTER TABLE public.departments DROP COLUMN IF EXISTS contact_phone, DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS default_monitoring_start_time, DROP COLUMN IF EXISTS default_monitoring_end_time;

