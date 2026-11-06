-- ============================================================================
-- INTERNPULSE — PHASE 17D DATABASE MIGRATION
-- Scalable Student Onboarding & Institutional Data Migration
-- ============================================================================

-- 1. Extend profiles and students tables with onboarding lifecycle attributes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(30) DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(30) DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- 2. Create student_import_batches table for audit and transaction rollback
CREATE TABLE IF NOT EXISTS public.student_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('csv', 'xlsx', 'json')),
  file_hash VARCHAR(64) NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by_name VARCHAR(255) NOT NULL,
  target_department_code VARCHAR(20) DEFAULT 'ALL',
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  is_dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'dry_run', 'completed', 'failed', 'rolled_back')),
  imported_student_ids JSONB DEFAULT '[]'::jsonb,
  error_log_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. Create student_onboarding_tokens table for secure tokenized first-login
CREATE TABLE IF NOT EXISTS public.student_onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  register_number VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Indexes for high-throughput lookups
CREATE INDEX IF NOT EXISTS idx_import_batches_uploaded_by ON public.student_import_batches(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON public.student_import_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_lookup ON public.student_onboarding_tokens(token_hash) WHERE is_used = FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_import_batch ON public.profiles(import_batch_id);

-- Enable RLS
ALTER TABLE public.student_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS import_batches_select ON public.student_import_batches;
DROP POLICY IF EXISTS import_batches_insert ON public.student_import_batches;
DROP POLICY IF EXISTS import_batches_update ON public.student_import_batches;
DROP POLICY IF EXISTS onboarding_tokens_select ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS onboarding_tokens_insert ON public.student_onboarding_tokens;

-- 4. RLS Policies for student_import_batches
CREATE POLICY import_batches_select ON public.student_import_batches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'super_admin')
        OR (p.role = 'hod' AND (student_import_batches.target_department_code = p.department_code OR student_import_batches.target_department_code = 'ALL'))
      )
    )
  );

CREATE POLICY import_batches_insert ON public.student_import_batches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'hod')
    )
  );

CREATE POLICY import_batches_update ON public.student_import_batches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- 5. RLS Policies for student_onboarding_tokens
CREATE POLICY onboarding_tokens_select ON public.student_onboarding_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role IN ('admin', 'super_admin')
        OR p.id = student_onboarding_tokens.student_id
      )
    )
  );

CREATE POLICY onboarding_tokens_insert ON public.student_onboarding_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'hod')
    )
  );

