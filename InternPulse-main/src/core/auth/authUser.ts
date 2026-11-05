export type UserRole = 'student' | 'mentor' | 'hod' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dept: string;
  departmentCode?: string;
  phone?: string;
  year?: string;
  college: string;
  studentId?: string;
  mentorId?: string;
  company?: string;
  internshipRole?: string;
  startDate?: string;
  endDate?: string;
  internshipDescription?: string;
  setupComplete?: boolean;
}

export interface RegisterStudentParams {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  password: string;
  academicYear: string;
  department: string;
}

export interface InternshipSetupParams {
  companyName: string;
  internshipRole: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}
