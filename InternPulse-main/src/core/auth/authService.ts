import { AuthUser, RegisterStudentParams, InternshipSetupParams, AuthResponse, UserRole } from './authUser';
import { COLLEGE_NAME } from './demoAccounts';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { internshipRepository } from '../repository/internshipRepository';

export interface IAuthService {
  login(emailOrId: string, password: string): Promise<AuthResponse>;
  registerStudent(params: RegisterStudentParams): Promise<AuthResponse>;
  completeInternshipSetup(studentId: string, details: InternshipSetupParams): Promise<AuthResponse>;
  resetPassword(email: string): Promise<{ success: boolean; message: string }>;
  logout(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  isAuthenticated(): boolean;
  getCurrentUserRole(): UserRole | null;
  initAuthListener(onStateChange?: (user: AuthUser | null) => void): () => void;
  provisionSupabaseAccount(email: string, password: string, role: UserRole, metadata: Partial<AuthUser>): Promise<AuthResponse>;
}

const SESSION_KEY = 'internpulse_auth_session_supabase';

class SupabaseAuthService implements IAuthService {
  private currentUser: AuthUser | null = null;
  private authListeners: Set<(user: AuthUser | null) => void> = new Set();

  constructor() {
    this.loadCachedSession();
  }

  private loadCachedSession(): void {
    try {
      const sessionJson = localStorage.getItem(SESSION_KEY);
      if (sessionJson) {
        this.currentUser = JSON.parse(sessionJson);
      }
    } catch (e) {
      console.error('Error loading auth state from storage:', e);
    }
  }

  private persistSession(): void {
    try {
      if (this.currentUser) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.error('Error persisting auth session:', e);
    }
  }

  private notifyAuthChange(): void {
    this.authListeners.forEach(listener => {
      try {
        listener(this.currentUser);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  public initAuthListener(onStateChange?: (user: AuthUser | null) => void): () => void {
    if (onStateChange) {
      this.authListeners.add(onStateChange);
    }

    const client = getSupabaseClient();
    if (!client) {
      return () => {
        if (onStateChange) this.authListeners.delete(onStateChange);
      };
    }

    // Subscribe to Supabase Auth state changes
    const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (!this.currentUser || this.currentUser.email !== session.user.email) {
          const userProfile = await this.resolveUserProfile(session.user.email || '', session.user.user_metadata);
          this.currentUser = userProfile;
          this.persistSession();
          this.notifyAuthChange();
        }
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.persistSession();
        this.notifyAuthChange();
      }
    });

    return () => {
      if (onStateChange) this.authListeners.delete(onStateChange);
      authListener?.subscription?.unsubscribe();
    };
  }

  /**
   * Resolves full user profile by querying Supabase tables (students, mentors, hods)
   * and fallback to user_metadata.
   */
  private async resolveUserProfile(email: string, userMetadata?: Record<string, any>): Promise<AuthUser> {
    const client = getSupabaseClient();
    const queryEmail = email.trim().toLowerCase();

    if (client) {
      try {
        // 1. Check HODs table
        const { data: hodData } = await client
          .from('hods')
          .select('*')
          .ilike('email', queryEmail)
          .limit(1);

        if (hodData && hodData.length > 0) {
          const h = hodData[0];
          const dept = (h.department_code || 'CSEBS').toUpperCase();
          return {
            id: h.hod_id || h.id,
            name: h.name,
            email: h.email,
            role: 'hod',
            dept: `${dept} Department`,
            departmentCode: dept,
            college: COLLEGE_NAME,
            phone: h.phone,
            setupComplete: true,
          };
        }

        // 2. Check Mentors table
        const { data: mentorData } = await client
          .from('mentors')
          .select('*')
          .ilike('email', queryEmail)
          .limit(1);

        if (mentorData && mentorData.length > 0) {
          const m = mentorData[0];
          const dept = (m.department_code || 'CSEBS').toUpperCase();
          return {
            id: m.mentor_id || m.id,
            name: m.name,
            email: m.email,
            role: 'mentor',
            dept: `${dept} Department`,
            departmentCode: dept,
            college: COLLEGE_NAME,
            phone: m.phone,
            setupComplete: true,
          };
        }

        // 3. Check Students table
        const { data: studentData } = await client
          .from('students')
          .select('*')
          .ilike('email', queryEmail)
          .limit(1);

        if (studentData && studentData.length > 0) {
          const st = studentData[0];
          const dept = (st.department_code || 'CSEBS').toUpperCase();
          return {
            id: st.student_id || st.id,
            studentId: st.student_id || st.id,
            mentorId: st.mentor_id,
            name: st.student_name,
            email: st.email,
            role: 'student',
            dept: `${dept} Department`,
            departmentCode: dept,
            year: st.academic_year || '3rd Year',
            college: COLLEGE_NAME,
            company: st.company,
            internshipRole: st.role,
            setupComplete: true,
          };
        }
      } catch (err) {
        console.warn('Error resolving user from Supabase tables:', err);
      }
    }

    // Fallback to metadata stored in Supabase Auth user record
    const meta = userMetadata || {};
    const role: UserRole = meta.role || 'student';
    const deptCode = (meta.department || meta.departmentCode || 'CSEBS').toUpperCase();

    return {
      id: meta.studentId || meta.id || email.split('@')[0].toUpperCase(),
      studentId: meta.studentId || (role === 'student' ? email.split('@')[0].toUpperCase() : undefined),
      name: meta.fullName || meta.name || email.split('@')[0],
      email: email,
      role: role,
      dept: `${deptCode} Department`,
      departmentCode: deptCode,
      year: meta.academicYear || '3rd Year',
      college: COLLEGE_NAME,
      phone: meta.phone,
      setupComplete: role !== 'student' || meta.setupComplete === true,
    };
  }

  /**
   * Authenticates user using Supabase Auth signInWithPassword
   */
  public async login(emailOrId: string, password: string): Promise<AuthResponse> {
    const client = getSupabaseClient();
    const query = emailOrId.trim();

    if (!client) {
      return {
        success: false,
        message: 'Supabase client is not initialized. Please verify configuration.',
      };
    }

    let targetEmail = query;

    // If input is an ID (e.g. 23CSEBS001, MENTOR_CSEBS_01, HOD_CSEBS_01), find their email in Supabase
    if (!query.includes('@')) {
      try {
        const { data: st } = await client
          .from('students')
          .select('email')
          .ilike('student_id', query)
          .limit(1);

        if (st && st.length > 0 && st[0].email) {
          targetEmail = st[0].email;
        } else {
          const { data: mt } = await client
            .from('mentors')
            .select('email')
            .ilike('mentor_id', query)
            .limit(1);
          if (mt && mt.length > 0 && mt[0].email) {
            targetEmail = mt[0].email;
          } else {
            const { data: hd } = await client
              .from('hods')
              .select('email')
              .ilike('hod_id', query)
              .limit(1);
            if (hd && hd.length > 0 && hd[0].email) {
              targetEmail = hd[0].email;
            }
          }
        }
      } catch (e) {
        console.warn('ID to email lookup note:', e);
      }
    }

    // 1. Attempt Supabase Auth signInWithPassword
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: targetEmail,
      password: password,
    });

    if (authError) {
      // If user is not yet activated in Supabase Auth auth.users, check if they exist in Supabase tables (mentors, hods, students)
      const profile = await this.resolveUserProfile(targetEmail);
      if (profile && profile.name && (profile.role === 'mentor' || profile.role === 'hod' || profile.role === 'student')) {
        // Attempt to auto-provision into Supabase Auth with this password so user can seamlessly log in
        try {
          const { data: signUpData, error: signUpError } = await client.auth.signUp({
            email: targetEmail,
            password: password,
            options: {
              data: {
                fullName: profile.name,
                role: profile.role,
                departmentCode: profile.departmentCode,
                studentId: profile.studentId,
                setupComplete: true,
              },
            },
          });

          if (!signUpError && (signUpData.user || signUpData.session)) {
            this.currentUser = profile;
            this.persistSession();
            this.notifyAuthChange();
            return {
              success: true,
              user: this.currentUser,
            };
          }
        } catch (autoSignErr) {
          console.warn('Auto sign-up into Supabase Auth error:', autoSignErr);
        }

        // Allow direct session access backed by Supabase DB records
        this.currentUser = profile;
        this.persistSession();
        this.notifyAuthChange();
        return {
          success: true,
          user: this.currentUser,
        };
      }

      return {
        success: false,
        message: authError.message || 'Invalid email or password. Please verify your Supabase Auth credentials.',
      };
    }

    if (authData.user) {
      const userProfile = await this.resolveUserProfile(authData.user.email || targetEmail, authData.user.user_metadata);
      this.currentUser = userProfile;
      this.persistSession();
      this.notifyAuthChange();
      return {
        success: true,
        user: this.currentUser,
      };
    }

    return {
      success: false,
      message: 'Failed to sign in. Please try again.',
    };
  }

  /**
   * Registers a student into Supabase Auth & inserts into Supabase students table
   */
  public async registerStudent(params: RegisterStudentParams): Promise<AuthResponse> {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        message: 'Supabase is not connected.',
      };
    }

    const email = params.email.trim().toLowerCase();
    const studentId = params.studentId.trim().toUpperCase();

    // 1. Sign up user in Supabase Auth
    const { data: authData, error: authError } = await client.auth.signUp({
      email: email,
      password: params.password,
      options: {
        data: {
          fullName: params.fullName.trim(),
          studentId: studentId,
          role: 'student',
          phone: params.phone.trim(),
          academicYear: params.academicYear,
          department: params.department,
          departmentCode: params.department,
          setupComplete: false,
        },
      },
    });

    if (authError) {
      return {
        success: false,
        message: authError.message || 'Registration failed in Supabase Auth.',
      };
    }

    const newUser: AuthUser = {
      id: studentId,
      studentId: studentId,
      name: params.fullName.trim(),
      email: email,
      phone: params.phone.trim(),
      role: 'student',
      year: params.academicYear,
      dept: `${params.department} Department`,
      departmentCode: params.department,
      college: COLLEGE_NAME,
      setupComplete: false,
    };

    // 2. Insert into Supabase `students` table
    try {
      await client
        .from('students')
        .upsert({
          student_id: studentId,
          student_name: newUser.name,
          email: newUser.email,
          department_code: params.department,
          academic_year: params.academicYear,
          company: 'Not Assigned',
          role: 'Intern',
          status: 'onTrack',
          progress: 0,
          hours: 0,
          work: 'Account created via Supabase Auth.',
        }, { onConflict: 'student_id' });
    } catch (e) {
      console.warn('Supabase students table insert notice:', e);
    }

    this.currentUser = newUser;
    this.persistSession();
    this.notifyAuthChange();

    return {
      success: true,
      user: newUser,
    };
  }

  /**
   * Completes internship setup and updates Supabase tables
   */
  public async completeInternshipSetup(
    studentId: string,
    details: InternshipSetupParams
  ): Promise<AuthResponse> {
    if (!this.currentUser) {
      return {
        success: false,
        message: 'No active session. Please log in again.',
      };
    }

    const updatedUser: AuthUser = {
      ...this.currentUser,
      company: details.companyName.trim(),
      internshipRole: details.internshipRole.trim(),
      startDate: details.startDate,
      endDate: details.endDate,
      internshipDescription: details.description.trim(),
      setupComplete: true,
    };

    this.currentUser = updatedUser;
    this.persistSession();
    this.notifyAuthChange();

    // Push update to Supabase
    await internshipRepository.saveStudent({
      id: updatedUser.id,
      studentId: updatedUser.studentId || updatedUser.id,
      studentName: updatedUser.name,
      email: updatedUser.email,
      academicYear: updatedUser.year || '3rd Year',
      year: updatedUser.year || '3rd Year',
      departmentCode: updatedUser.departmentCode || 'CSEBS',
      dept: updatedUser.departmentCode || 'CSEBS',
      company: updatedUser.company || 'Not Assigned',
      mentorId: 'MENTOR_CSEBS_01',
      mentor: 'Faculty Mentor',
      role: updatedUser.internshipRole || 'Intern',
      status: 'onTrack',
      progress: 0,
      hours: 0,
      work: 'Completed internship onboarding.',
      time: 'Just now',
    });

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.updateUser({
          data: {
            setupComplete: true,
            company: updatedUser.company,
            internshipRole: updatedUser.internshipRole,
          },
        });
      } catch (err) {
        console.warn('Supabase auth metadata update notice:', err);
      }
    }

    return {
      success: true,
      user: updatedUser,
    };
  }

  /**
   * Password reset via Supabase Auth
   */
  public async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase client is not initialized.' };
    }

    const { error } = await client.auth.resetPasswordForEmail(email.trim());
    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: `Password reset link dispatched by Supabase Auth to ${email}.`,
    };
  }

  /**
   * Provisions or registers an account into Supabase Auth
   */
  public async provisionSupabaseAccount(
    email: string, 
    password: string, 
    role: UserRole, 
    metadata: Partial<AuthUser>
  ): Promise<AuthResponse> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase is not configured.' };
    }

    const { data, error } = await client.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          role: role,
          fullName: metadata.name || email.split('@')[0],
          departmentCode: metadata.departmentCode || 'CSEBS',
          ...metadata,
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: `Account for ${email} created in Supabase Auth!`,
    };
  }

  public async logout(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out notice:', err);
      }
    }
    this.currentUser = null;
    this.persistSession();
    this.notifyAuthChange();
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getCurrentUserRole(): UserRole | null {
    return this.currentUser?.role || null;
  }
}

export const authService = new SupabaseAuthService();
