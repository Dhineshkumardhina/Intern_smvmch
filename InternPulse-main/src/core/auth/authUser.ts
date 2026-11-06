export type UserRole = 'hod' | 'mentor' | 'student' | 'admin' | 'super_admin' | 'platform_super_admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  dept: string;
  departmentCode: string;
  departmentId?: string;
  institutionId?: string;
  institutionCode?: string;
  institutionDomain?: string;
  brandingConfig?: Record<string, any>;
  institutionalSettings?: Record<string, any>;
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
  isActive: boolean;
}

export interface RegisterStudentParams {
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  password: string;
  academicYear: string;
  department: string;
  institutionId?: string;
  institutionCode?: string;
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
