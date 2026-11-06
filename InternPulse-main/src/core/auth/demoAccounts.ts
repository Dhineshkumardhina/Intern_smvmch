import { AuthUser, UserRole } from './authUser';
import { getSupabaseClient, DbMentor, DbHod, DbStudent, DbProfile } from '../../lib/supabase';
import { DEFAULT_HODS, DEFAULT_MENTORS, DEFAULT_STUDENTS } from '../../data/initialData';

export const COLLEGE_NAME = 'Sri Manakula Vinayagar Engineering College';

/**
 * Security Guard (SEC-16): Prevents demo accounts from being loaded or exposed in production environments.
 */
export function isDemoAccountAccessPermitted(): boolean {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return false;
  }
  return true;
}

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
 * Fetches institutional sample accounts directly from your Supabase database (`profiles` table)
 * for test and preview convenience. Credentials must be verified through Supabase Auth.
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

  if (!client || !isDemoAccountAccessPermitted()) return result;

  try {
    // 1. Primary: query authoritative `profiles` table
    const { data: profiles, error } = await client
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .limit(30);

    if (!error && profiles && profiles.length > 0) {
      profiles.forEach((p: DbProfile) => {
        const item: SampleLoginAccount = {
          id: p.student_id || p.mentor_id || p.id,
          name: p.full_name,
          email: p.email,
          role: p.role,
          departmentCode: (p.department_code || 'CSEBS').toUpperCase(),
          designationOrYear: p.role === 'hod' ? `HOD, ${(p.department_code || 'CSEBS').toUpperCase()}`
            : p.role === 'mentor' ? 'Faculty Mentor'
            : 'Student Intern',
          password: 'password123',
        };

        if (p.role === 'hod') result.hods.push(item);
        else if (p.role === 'mentor') result.mentors.push(item);
        else if (p.role === 'student') result.students.push(item);
      });

      if (result.hods.length > 0 || result.mentors.length > 0 || result.students.length > 0) {
        return result;
      }
    }

    // 2. Secondary fallback: check legacy tables
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
    console.warn('Error fetching sample logins from Supabase:', err);
  }

  // 3. Offline / Dev Fallback: If cloud Supabase is unreachable or unprovisioned, populate default SMVEC accounts
  if (isDemoAccountAccessPermitted()) {
    if (result.hods.length === 0) {
      result.hods = DEFAULT_HODS.map(h => ({
        id: h.hodId || h.id,
        name: h.name,
        email: h.email,
        role: 'hod' as UserRole,
        departmentCode: h.departmentCode,
        designationOrYear: `HOD, ${h.departmentCode}`,
        password: 'password123',
      }));
    }
    if (result.mentors.length === 0) {
      result.mentors = DEFAULT_MENTORS.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: 'mentor' as UserRole,
        departmentCode: m.departmentCode,
        designationOrYear: m.designation || 'Faculty Mentor',
        password: 'password123',
      }));
    }
    if (result.students.length === 0) {
      result.students = DEFAULT_STUDENTS.slice(0, 10).map(s => ({
        id: s.studentId,
        name: s.studentName,
        email: s.email || `${s.studentId.toLowerCase()}@college.edu`,
        role: 'student' as UserRole,
        departmentCode: s.departmentCode,
        designationOrYear: s.academicYear,
        password: 'password123',
      }));
    }
  }

  return result;
}

export const DEMO_ACCOUNTS: { email: string; password?: string; user: AuthUser }[] = [];
