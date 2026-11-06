-- ============================================================================
-- INTERNPULSE — PHASE 17E SCHEMA MIGRATION
-- Institutional Analytics & Cross-Department Reporting
-- Real Database Aggregations, Distinct Verification State Metrics,
-- Formula-Injection-Protected Export Logs, and Strict Role-Based Scoping.
-- ============================================================================

-- 1. Create report_export_logs table for audit compliance
CREATE TABLE IF NOT EXISTS report_export_logs (
  id VARCHAR(100) PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'csv', 'xlsx')),
  requested_by_id VARCHAR(100) NOT NULL,
  requested_by_name VARCHAR(255) NOT NULL,
  requested_by_role VARCHAR(50) NOT NULL,
  department_filter VARCHAR(50),
  batch_filter VARCHAR(100),
  start_date VARCHAR(30),
  end_date VARCHAR(30),
  record_count INTEGER NOT NULL DEFAULT 0,
  file_name VARCHAR(255) NOT NULL,
  file_hash VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid reporting audit queries
CREATE INDEX IF NOT EXISTS idx_report_export_logs_requested_by 
  ON report_export_logs (requested_by_id);
CREATE INDEX IF NOT EXISTS idx_report_export_logs_dept 
  ON report_export_logs (department_filter);
CREATE INDEX IF NOT EXISTS idx_report_export_logs_created_at 
  ON report_export_logs (created_at DESC);

-- Enable RLS
ALTER TABLE report_export_logs ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies on report_export_logs
DROP POLICY IF EXISTS "Super admin full access on report_export_logs" ON report_export_logs;
CREATE POLICY "Super admin full access on report_export_logs"
  ON report_export_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "HOD department access on report_export_logs" ON report_export_logs;
CREATE POLICY "HOD department access on report_export_logs"
  ON report_export_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'hod'
        AND (report_export_logs.department_filter = profiles.department_code OR report_export_logs.department_filter = 'ALL')
    )
  );

DROP POLICY IF EXISTS "Users can insert own export logs" ON report_export_logs;
CREATE POLICY "Users can insert own export logs"
  ON report_export_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view own export logs" ON report_export_logs;
CREATE POLICY "Users can view own export logs"
  ON report_export_logs
  FOR SELECT
  TO authenticated
  USING (
    requested_by_id = auth.uid()::text
  );

