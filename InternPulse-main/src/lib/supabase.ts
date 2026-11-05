import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables with fallback to your Supabase project
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://gvnakdxtjjnfcjkcnavz.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9rHXjELSfv1I-BH8o3_qLQ_o212kYfQ';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Lazy singleton client creation
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Database Types for HOD, Mentors, and Students
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
  log_date?: string;
  hours_logged: number;
  work_summary: string;
  blockers_faced?: string;
  status?: string;
  verified_by_mentor?: boolean;
  mentor_feedback?: string;
  created_at?: string;
}
