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

export type ApplicationRole = 'hod' | 'mentor' | 'student';

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
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  status: 'active' | 'suspended' | 'inactive';
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbDepartment {
  id: string;
  institution_id: string;
  code: string;
  name: string;
  hod_id?: string | null;
  contact_email?: string | null;
  status: 'active' | 'inactive';
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
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
  assignment_id: string;
  student_id: string;
  session_date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  check_in_location_id?: string | null;
  check_out_location_id?: string | null;
  total_hours: number;
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
  assignment_id: string;
  student_id: string;
  target_date: string;
  window_start: string;
  window_end: string;
  status: 'pending' | 'dispatched' | 'responded' | 'expired' | 'cancelled';
  verification_id?: string | null;
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
  notification_type: 'verification_request' | 'verification_result' | 'attendance_alert' | 'risk_alert' | 'log_feedback' | 'assignment_update' | 'system_announcement';
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
