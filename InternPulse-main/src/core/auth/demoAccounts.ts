import { AuthUser, UserRole } from './authUser';
import { getSupabaseClient } from '../../lib/supabase';
import { DbMentor, DbHod, DbStudent } from '../../lib/supabase';

export const COLLEGE_NAME = 'Sri Manakula Vinayagar Engineering College';

export interface SampleLoginAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentCode: string;
  designationOrYear?: string;
  password?: string;
}

/**
 * Fetches actual live Mentors, HODs, and Students directly from your Supabase database tables
 * so users can click or use them to log in immediately without hardcoded files.
 */
export async function fetchSupabaseLiveSampleLogins(): Promise<{
  hods: SampleLoginAccount[];
  mentors: SampleLoginAccount[];
  students: SampleLoginAccount[];
}> {
  const client = getSupabaseClient();
  const result: {
    hods: SampleLoginAccount[];
    mentors: SampleLoginAccount[];
    students: SampleLoginAccount[];
  } = {
    hods: [],
    mentors: [],
    students: [],
  };

  if (!client) return result;

  try {
    // 1. Fetch HODs from Supabase
    const { data: hodData } = await client
      .from('hods')
      .select('*')
      .order('department_code', { ascending: true });

    if (hodData && hodData.length > 0) {
      result.hods = hodData.map((h: DbHod) => ({
        id: h.hod_id || h.id || 'HOD',
        name: h.name || 'Head of Department',
        email: h.email,
        role: 'hod' as UserRole,
        departmentCode: (h.department_code || 'CSEBS').toUpperCase(),
        designationOrYear: `HOD, ${(h.department_code || 'CSEBS').toUpperCase()}`,
        password: 'password123',
      }));
    }

    // 2. Fetch Mentors from Supabase
    const { data: mentorData } = await client
      .from('mentors')
      .select('*')
      .order('name', { ascending: true });

    if (mentorData && mentorData.length > 0) {
      result.mentors = mentorData.map((m: DbMentor) => ({
        id: m.mentor_id || m.id || 'MENTOR',
        name: m.name || 'Faculty Mentor',
        email: m.email,
        role: 'mentor' as UserRole,
        departmentCode: (m.department_code || 'CSEBS').toUpperCase(),
        designationOrYear: m.designation || 'Faculty Mentor',
        password: 'password123',
      }));
    }

    // 3. Fetch Students from Supabase
    const { data: studentData } = await client
      .from('students')
      .select('*')
      .limit(10);

    if (studentData && studentData.length > 0) {
      result.students = studentData.map((s: DbStudent) => ({
        id: s.student_id || s.id || 'STUDENT',
        name: s.student_name || 'Student',
        email: s.email,
        role: 'student' as UserRole,
        departmentCode: (s.department_code || 'CSEBS').toUpperCase(),
        designationOrYear: s.academic_year || '3rd Year',
        password: 'password123',
      }));
    }
  } catch (err) {
    console.warn('Error fetching sample logins from Supabase tables:', err);
  }

  return result;
}

export const DEMO_ACCOUNTS: { email: string; password?: string; user: AuthUser }[] = [];

