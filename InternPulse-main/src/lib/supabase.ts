import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable resolution (Vite import.meta.env or Node process.env in tests)
function getEnvVar(key: string, fallback = ''): string {
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch {
    // ignore
  }

  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch {
    // ignore
  }

  return fallback;
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://gvnakdxtjjnfcjkcnavz.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'sb_publishable_9rHXjELSfv1I-BH8o3_qLQ_o212kYfQ');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Lazy singleton client creation with secure token management
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

export function setCustomSupabaseClient(client: SupabaseClient | null): void {
  supabaseInstance = client;
}

export const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

// ==========================================
// Centralized Database Schema Types (Phase 1)
// ==========================================

export type ApplicationRole = 'super_admin' | 'admin' | 'hod' | 'mentor' | 'student';

export interface DbProfile {
  id: string; // auth.users UUID foreign key
  role: ApplicationRole;
  full_name: string;
  email: string;
  phone?: string | null;
  department_code: string;
  department_id?: string | null;
  institution_id?: string | null;
  account_status?: 'active' | 'suspended' | 'pending_approval' | 'deactivated';
  avatar_url?: string | null;
  student_id?: string | null;
  mentor_id?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbHod {
  id?: string;
  hod_id: string;
  name: string;
  email: string;
  department_code: string;
  phone?: string;
  office_location?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbMentor {
  id?: string;
  mentor_id: string;
  name: string;
  email: string;
  department_code: string;
  designation?: string;
  capacity?: number;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbStudent {
  id?: string;
  student_id: string;
  student_name: string;
  email: string;
  department_code: string;
  academic_year?: string;
  company?: string;
  role?: string;
  mentor_id?: string;
  mentor_name?: string;
  status?: 'onTrack' | 'inProgress' | 'delayed' | 'blocked' | 'inactive' | 'completed';
  progress?: number;
  hours?: number;
  work?: string;
  blocker?: string;
  last_log_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbStudentDailyLog {
  id?: string;
  student_id: string;
  institution_id?: string;
  session_id?: string;
  assignment_id?: string;
  log_date?: string;
  hours_logged: number;
  work_summary: string;
  blockers_faced?: string;
  status?: string;
  verified_by_mentor?: boolean;
  mentor_feedback?: string;
  created_at?: string;
  updated_at?: string;
}

// ==========================================
// Phase 2 Normalized Relational Schema Types
// ==========================================

export type AccountStatus = 'active' | 'suspended' | 'pending_approval' | 'deactivated';

export interface DbInstitution {
  id: string;
  code: string;
  name: string;
  short_name?: string | null;
  domain?: string | null;
  subdomain?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  status: 'provisioning' | 'pilot' | 'active' | 'suspended' | 'inactive' | 'archived';
  branding_config?: Record<string, any> | null;
  institutional_settings?: Record<string, any> | null;
  dpdp_compliance_config?: Record<string, any> | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbInstitutionAdmin {
  id: string;
  institution_id: string;
  profile_id: string;
  admin_tier: 'institution_admin' | 'dean_academic' | 'principal' | 'compliance_officer';
  appointed_at: string;
  is_active: boolean;
  created_at?: string;
}

export interface DbInstitutionMembership {
  id: string;
  institution_id: string;
  profile_id: string;
  membership_role: 'super_admin' | 'admin' | 'hod' | 'mentor' | 'student' | 'staff';
  status: 'active' | 'suspended' | 'inactive' | 'transferred' | 'graduated';
  valid_from: string;
  valid_to?: string | null;
  created_at?: string;
}

export interface DbStudentConsent {
  id: string;
  institution_id: string;
  student_id: string;
  consent_given: boolean;
  notice_version: string;
  consent_timestamp: string;
  withdrawn_at?: string | null;
  withdrawal_reason?: string | null;
  created_at?: string;
}

export interface DbDepartment {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  hod_id?: string | null;
  contact_email?: string | null;
  status: 'active' | 'inactive';
  is_pilot_authorized?: boolean;
  max_student_capacity?: number;
  academic_head_name?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbDepartmentAdmin {
  id: string;
  institution_id?: string;
  department_id: string;
  profile_id: string;
  role_type: 'hod' | 'deputy_hod' | 'coordinator' | 'technical_auditor';
  is_primary: boolean;
  appointed_at: string;
  status: 'active' | 'inactive' | 'on_leave';
  created_at?: string;
  updated_at?: string;
}

export interface DbDepartmentMembership {
  id: string;
  institution_id?: string;
  profile_id: string;
  department_id: string;
  membership_role: 'hod' | 'mentor' | 'staff' | 'student';
  is_primary: boolean;
  valid_from: string;
  valid_to?: string | null;
  status: 'active' | 'inactive' | 'transferred';
  created_at?: string;
}

export interface DbInternshipBatch {
  id: string;
  institution_id?: string;
  department_id: string;
  batch_name: string;
  academic_year: string;
  term_code: 'ODD' | 'EVEN' | 'SUMMER';
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbStudentDepartmentEnrollment {
  id: string;
  institution_id?: string;
  student_id: string;
  department_id: string;
  batch_id?: string | null;
  register_number: string;
  current_semester: number;
  enrollment_status: 'active' | 'transferred' | 'graduated' | 'suspended' | 'withdrawn';
  enrolled_at: string;
  created_at?: string;
}

export interface DbMentorEntity {
  id: string;
  profile_id: string;
  institution_id: string;
  department_id: string;
  employee_id: string;
  designation: string;
  max_capacity: number;
  current_mentee_count: number;
  status: 'active' | 'on_leave' | 'inactive';
  office_location?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbStudentEntity {
  id: string;
  profile_id: string;
  institution_id: string;
  department_id: string;
  register_number: string;
  academic_year: string;
  current_semester?: number | null;
  batch_year?: string | null;
  status: 'active' | 'interning' | 'delayed' | 'blocked' | 'completed' | 'inactive';
  cgpa?: number | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbInternshipLocation {
  id: string;
  institution_id?: string;
  location_name?: string;
  company_name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_center?: string | null;
  geofence_radius_meters: number;
  polygon_boundary?: string | null;
  internship_start_date?: string;
  internship_end_date?: string;
  monitoring_start_time?: string;
  monitoring_end_time?: string;
  department_code?: string;
  contact_person_name?: string | null;
  contact_person_phone?: string | null;
  contact_person_email?: string | null;
  status: 'active' | 'inactive' | 'pending_approval' | 'archived';
  is_active: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbInternshipAssignment {
  id: string;
  institution_id?: string;
  department_id?: string;
  student_id: string;
  mentor_id: string;
  location_id?: string | null;
  role_title: string;
  start_date: string;
  end_date: string;
  work_start_time?: string;
  work_end_time?: string;
  required_daily_hours?: number;
  academic_term?: string;
  notes?: string | null;
  status: 'active' | 'completed' | 'terminated' | 'cancelled' | 'on_hold';
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbAttendanceSession {
  id: string;
  institution_id?: string;
  assignment_id: string;
  student_id: string;
  session_date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  check_in_location_id?: string | null;
  check_out_location_id?: string | null;
  total_hours: number;
  required_hours?: number;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  check_in_distance_meters?: number | null;
  check_out_distance_meters?: number | null;
  compliance_rate?: number;
  offline_queued?: boolean;
  client_timestamp?: string | null;
  exception_reason?: string | null;
  mentor_reviewed_at?: string | null;
  mentor_reviewed_by?: string | null;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'flagged' | 'holiday' | 'leave';
  is_verified: boolean;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbLocationVerification {
  id: string;
  institution_id?: string;
  session_id?: string | null;
  assignment_id: string;
  student_id: string;
  location_id?: string | null;
  event_type: 'check_in' | 'check_out' | 'random_ping' | 'scheduled_ping' | 'manual_ping' | 'mentor_check';
  requested_at: string;
  responded_at?: string | null;
  captured_latitude?: number | null;
  captured_longitude?: number | null;
  captured_location?: string | null;
  accuracy_meters?: number | null;
  distance_to_center_meters?: number | null;
  is_within_geofence?: boolean | null;
  is_mock_location: boolean;
  status: 'verified' | 'out_of_bounds' | 'timeout' | 'spoof_detected' | 'low_accuracy_rejected' | 'pending';
  device_metadata?: Record<string, any>;
  remarks?: string | null;
  verified_at?: string | null;
  created_at?: string;
}

export interface DbVerificationSchedule {
  id: string;
  institution_id?: string;
  assignment_id: string;
  student_id: string;
  target_date: string;
  window_start: string;
  window_end: string;
  status:
    | 'SCHEDULED'
    | 'OPEN'
    | 'SUBMITTED'
    | 'VERIFIED'
    | 'MISSED'
    | 'LOCATION_UNAVAILABLE'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'pending'
    | 'dispatched'
    | 'responded';
  verification_id?: string | null;
  submission_timestamp?: string | null;
  notification_dispatched_at?: string | null;
  retry_count?: number;
  max_retries?: number;
  missed_reason?: string | null;
  timezone?: string;
  dispatched_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbNotification {
  id: string;
  institution_id?: string | null;
  recipient_id: string;
  sender_id?: string | null;
  title: string;
  message: string;
  notification_type:
    | 'new_internship_assignment'
    | 'upcoming_verification'
    | 'verification_request'
    | 'successful_verification'
    | 'confirmed_outside_geofence'
    | 'missed_verification'
    | 'gps_disabled'
    | 'location_permission_revoked'
    | 'student_device_offline'
    | 'internship_assignment_updated'
    | 'verification_result'
    | 'attendance_alert'
    | 'risk_alert'
    | 'log_feedback'
    | 'assignment_update'
    | 'system_announcement';
  category?: 'VIOLATION' | 'TECHNICAL_FAILURE' | 'ATTENDANCE_PROMPT' | 'SYSTEM_UPDATE';
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  delivery_status?: 'PENDING' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED';
  deduplication_key?: string | null;
  retry_count?: number;
  action_url?: string | null;
  payload?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  created_at?: string;
}

export interface DbAuditLog {
  id: string;
  institution_id?: string | null;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string;
}

export interface DbLocationChangeHistory {
  id: string;
  institution_id?: string;
  location_id: string;
  changed_by?: string | null;
  change_type: 'created' | 'status_changed' | 'geofence_updated' | 'coordinates_updated' | 'schedule_updated' | 'approved' | 'metadata_updated';
  previous_state?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  remarks?: string | null;
  changed_at?: string;
}

export interface DbStudentTransfer {
  id: string;
  institution_id?: string;
  student_id: string;
  from_department_id: string;
  to_department_id: string;
  authorized_by: string;
  reason: string;
  previous_batch_id?: string | null;
  new_batch_id?: string | null;
  academic_year: string;
  transferred_at?: string;
}

export interface DbStudentImportBatch {
  id: string;
  institution_id?: string;
  file_name: string;
  file_format: string;
  file_hash: string;
  uploaded_by?: string | null;
  uploaded_by_name: string;
  target_department_code: string;
  total_rows: number;
  valid_rows: number;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
  is_dry_run: boolean;
  status: string;
  imported_student_ids: any;
  error_log_json: any;
  created_at?: string;
  completed_at?: string | null;
}

export interface DbStudentOnboardingToken {
  id: string;
  institution_id?: string;
  student_id: string;
  register_number: string;
  email: string;
  token_hash: string;
  is_used: boolean;
  expires_at: string;
  created_at?: string;
  used_at?: string | null;
}

export interface DbReportExportLog {
  id: string;
  institution_id?: string;
  report_type: string;
  format: 'pdf' | 'csv' | 'xlsx';
  requested_by_id: string;
  requested_by_name: string;
  requested_by_role: string;
  department_filter?: string | null;
  batch_filter?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  record_count: number;
  file_name: string;
  file_hash?: string | null;
  created_at?: string;
}

export interface DbInstitutionRegistrationRequest {
  id: string;
  institution_name: string;
  institution_code: string;
  institution_type: 'engineering' | 'medical' | 'arts_science' | 'polytechnic' | 'university' | 'standalone_institute';
  domain: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code?: string | null;
  contact_email: string;
  contact_phone: string;
  website?: string | null;
  admin_name: string;
  admin_email: string;
  admin_phone?: string | null;
  admin_designation: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'cancelled';
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  provisioning_status: 'unprovisioned' | 'provisioning' | 'provisioned' | 'failed';
  provisioning_error?: string | null;
  provisioned_institution_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbPlatformAuditLog {
  id: string;
  action: string;
  performed_by_id?: string | null;
  performed_by_name: string;
  performed_by_role: string;
  target_institution_id?: string | null;
  target_institution_code?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string;
}

export interface DbInstitutionLifecycleLog {
  id: string;
  institution_id: string;
  previous_status: string;
  new_status: string;
  reason: string;
  action_by?: string | null;
  action_by_name: string;
  action_at?: string;
}
