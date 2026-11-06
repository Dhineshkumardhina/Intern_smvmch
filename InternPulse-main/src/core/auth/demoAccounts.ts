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
 * Returns immediate, pre-configured institutional sample accounts for SMVEC.
 * These are available synchronously to ensure the UI NEVER renders 0 accounts
 * while waiting for remote database queries or if offline.
 */
export function getDefaultSampleLogins(): {
  hods: SampleLoginAccount[];
  mentors: SampleLoginAccount[];
  students: SampleLoginAccount[];
  admins: SampleLoginAccount[];
} {
  return {
    hods: [
      {
        id: 'HOD_CSEBS',
        name: 'Dr. V. Gomathi',
        email: 'hod.csebs@smvec.ac.in',
        role: 'hod',
        departmentCode: 'CSEBS',
        designationOrYear: 'HOD, CSEBS',
        password: 'password123',
      },
      {
        id: 'HOD_IT',
        name: 'Dr. M. Auxilia',
        email: 'hod.it@smvec.ac.in',
        role: 'hod',
        departmentCode: 'IT',
        designationOrYear: 'HOD, IT',
        password: 'password123',
      },
      {
        id: 'HOD_SMVEC',
        name: 'Dr. K. Premkumar',
        email: 'hod@smvec.ac.in',
        role: 'hod',
        departmentCode: 'CSEBS',
        designationOrYear: 'Senior HOD, SMVEC',
        password: 'password123',
      },
    ],
    mentors: [
      {
        id: 'MENTOR_CSEBS_01',
        name: 'Prof. Anitha Kumar',
        email: 'anitha.mentor@college.edu',
        role: 'mentor',
        departmentCode: 'CSEBS',
        designationOrYear: 'Assistant Professor & Mentor',
        password: 'password123',
      },
      {
        id: 'MENTOR_CSEBS_02',
        name: 'Prof. V. Anand',
        email: 'mentor@smvec.ac.in',
        role: 'mentor',
        departmentCode: 'CSEBS',
        designationOrYear: 'Senior Faculty Mentor',
        password: 'password123',
      },
      {
        id: 'MENTOR_IT_01',
        name: 'Prof. R. Balamurugan',
        email: 'balamurugan.mentor@college.edu',
        role: 'mentor',
        departmentCode: 'IT',
        designationOrYear: 'Associate Professor & Mentor',
        password: 'password123',
      },
      {
        id: 'MENTOR_CSE_01',
        name: 'Prof. K. Sridhar',
        email: 'sridhar.mentor@college.edu',
        role: 'mentor',
        departmentCode: 'CSE',
        designationOrYear: 'Faculty Mentor',
        password: 'password123',
      },
    ],
    students: [
      {
        id: '23CSEBS001',
        name: 'Dhinesh Kumar R',
        email: 'student@smvec.ac.in',
        role: 'student',
        departmentCode: 'CSEBS',
        designationOrYear: '3rd Year Intern (Zoho)',
        password: 'password123',
      },
      {
        id: '23CSEBS002',
        name: 'Harish R',
        email: '23csebs001@college.edu',
        role: 'student',
        departmentCode: 'CSEBS',
        designationOrYear: '3rd Year Intern (TCS)',
        password: 'password123',
      },
      {
        id: '23CSEBS003',
        name: 'Priya M',
        email: '23csebs002@college.edu',
        role: 'student',
        departmentCode: 'CSEBS',
        designationOrYear: '3rd Year Intern (Infosys)',
        password: 'password123',
      },
      {
        id: '23IT001',
        name: 'Kavitha K',
        email: '23it001@college.edu',
        role: 'student',
        departmentCode: 'IT',
        designationOrYear: '3rd Year Intern (Wipro)',
        password: 'password123',
      },
    ],
    admins: [
      {
        id: 'ADMIN_PLATFORM_01',
        name: 'SMVEC Platform Administrator',
        email: 'superadmin@smvec.ac.in',
        role: 'platform_super_admin',
        departmentCode: 'ADMIN',
        designationOrYear: 'Platform Super Admin',
        password: 'password123',
      },
    ],
  };
}

/**
 * Fetches institutional sample accounts directly from your Supabase database (`profiles` table)
 * for test and preview convenience. Immediately falls back to seeded SMVEC accounts if offline.
 */
export async function fetchSupabaseLiveSampleLogins(): Promise<{
  hods: SampleLoginAccount[];
  mentors: SampleLoginAccount[];
  students: SampleLoginAccount[];
  admins: SampleLoginAccount[];
}> {
  const defaults = getDefaultSampleLogins();
  if (!isDemoAccountAccessPermitted()) {
    return { hods: [], mentors: [], students: [], admins: [] };
  }

  const client = getSupabaseClient();
  if (!client) {
    return defaults;
  }

  try {
    // Fast 1500ms timeout race so UI NEVER hangs on unresolvable DNS or network disconnects
    const fetchDb = async () => {
      const { data: profiles, error } = await client
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .limit(30);

      if (!error && profiles && profiles.length > 0) {
        const live: {
          hods: SampleLoginAccount[];
          mentors: SampleLoginAccount[];
          students: SampleLoginAccount[];
          admins: SampleLoginAccount[];
        } = { hods: [], mentors: [], students: [], admins: [] };

        profiles.forEach((p: DbProfile) => {
          const item: SampleLoginAccount = {
            id: p.student_id || p.mentor_id || p.id,
            name: p.full_name,
            email: p.email,
            role: p.role,
            departmentCode: (p.department_code || 'CSEBS').toUpperCase(),
            designationOrYear: p.role === 'hod' ? `HOD, ${(p.department_code || 'CSEBS').toUpperCase()}`
              : p.role === 'mentor' ? 'Faculty Mentor'
              : p.role === 'platform_super_admin' || p.role === 'super_admin' || p.role === 'admin' ? 'Institutional Administrator'
              : 'Student Intern',
            password: 'password123',
          };

          if (p.role === 'hod') live.hods.push(item);
          else if (p.role === 'mentor') live.mentors.push(item);
          else if (p.role === 'student') live.students.push(item);
          else if (p.role === 'platform_super_admin' || p.role === 'super_admin' || p.role === 'admin') live.admins.push(item);
        });

        if (live.hods.length > 0 || live.mentors.length > 0 || live.students.length > 0) {
          return {
            hods: live.hods.length > 0 ? live.hods : defaults.hods,
            mentors: live.mentors.length > 0 ? live.mentors : defaults.mentors,
            students: live.students.length > 0 ? live.students : defaults.students,
            admins: live.admins.length > 0 ? live.admins : defaults.admins,
          };
        }
      }
      return defaults;
    };

    const timeout = new Promise<{
      hods: SampleLoginAccount[];
      mentors: SampleLoginAccount[];
      students: SampleLoginAccount[];
      admins: SampleLoginAccount[];
    }>((resolve) => setTimeout(() => resolve(defaults), 1500));

    return await Promise.race([fetchDb(), timeout]);
  } catch (err) {
    console.warn('Live sample login fetch failed; using default SMVEC accounts:', err);
    return defaults;
  }
}

export const DEMO_ACCOUNTS: { email: string; password?: string; user: AuthUser }[] = [];
