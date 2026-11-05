export interface StudentRecord {
  id: string;
  studentId: string;
  studentName: string;
  email?: string;
  academicYear: string; // '1st Year' | '2nd Year' | '3rd Year' | '4th Year'
  year: string;
  departmentCode: string; // e.g. 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BME', 'MECT', 'ICE', 'CSEBS'
  dept: string;
  company: string; // Host Organization
  mentorId: string; // 'MENTOR001', 'MENTOR002', etc.
  mentor: string; // Faculty Mentor Name
  mentorEmail?: string;
  role?: string; // Internship Role / Title
  status: 'onTrack' | 'inProgress' | 'delayed' | 'blocked' | 'inactive' | 'completed';
  progress: number; // 0 to 100
  hours: number;
  work: string;
  blocker?: string;
  time?: string;
}

export interface MentorRecord {
  id: string;
  name: string;
  email: string;
  departmentCode: string;
  departmentCodes: string[];
  assignedStudentsCount: number;
  capacity: number;
  studentIds?: string[];
  averageProgress?: number;
  atRiskCount?: number;
  designation?: string;
}

export interface HodRecord {
  id: string;
  hodId: string;
  name: string;
  email: string;
  departmentCode: string;
  phone?: string;
  officeLocation?: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  domain: string;
  internCount: number;
  location?: string;
}

export const MENTOR_ACCOUNTS_MAP: Record<string, string> = {};

export const DEFAULT_HODS: HodRecord[] = [];

export const DEFAULT_MENTORS: MentorRecord[] = [];

// All data is dynamically loaded from Supabase tables: students, mentors, and hods.
export const DEFAULT_STUDENTS: StudentRecord[] = [];
