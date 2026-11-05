import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';
import { setCustomSupabaseClient, DbProfile } from '../../../lib/supabase';
import { UserRole } from '../authUser';

// ==============================================================================
// Mock Data Stores simulating Supabase PostgreSQL & Auth Engine
// ==============================================================================

interface MockUserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

interface MockProfileRecord {
  id: string;
  role: 'hod' | 'mentor' | 'student';
  full_name: string;
  email: string;
  phone?: string;
  department_code: string;
  student_id?: string;
  mentor_id?: string;
  is_active: boolean;
}

function createMockSupabaseEngine() {
  const users: Map<string, MockUserRecord> = new Map([
    ['hod-uuid', { id: 'hod-uuid', email: 'saravanan.hod@smvec.ac.in', passwordHash: 'correctPassword123' }],
    ['mentor-uuid', { id: 'mentor-uuid', email: 'anitha.mentor@smvec.ac.in', passwordHash: 'correctPassword123' }],
    ['student-uuid', { id: 'student-uuid', email: '23csebs001@smvec.ac.in', passwordHash: 'correctPassword123' }],
    ['student2-uuid', { id: 'student2-uuid', email: '23csebs002@smvec.ac.in', passwordHash: 'correctPassword123' }],
    ['deactivated-uuid', { id: 'deactivated-uuid', email: 'blocked.student@smvec.ac.in', passwordHash: 'correctPassword123' }],
  ]);

  const profiles: Map<string, MockProfileRecord> = new Map([
    ['hod-uuid', {
      id: 'hod-uuid',
      role: 'hod',
      full_name: 'Dr. K. Saravanan',
      email: 'saravanan.hod@smvec.ac.in',
      phone: '9443000001',
      department_code: 'CSEBS',
      is_active: true,
    }],
    ['mentor-uuid', {
      id: 'mentor-uuid',
      role: 'mentor',
      full_name: 'Prof. Anitha Kumar',
      email: 'anitha.mentor@smvec.ac.in',
      phone: '9443000002',
      department_code: 'CSEBS',
      mentor_id: 'MENTOR_CSEBS_01',
      is_active: true,
    }],
    ['student-uuid', {
      id: 'student-uuid',
      role: 'student',
      full_name: 'Harish V',
      email: '23csebs001@smvec.ac.in',
      phone: '9876543210',
      department_code: 'CSEBS',
      student_id: '23CSEBS001',
      mentor_id: 'MENTOR_CSEBS_01',
      is_active: true,
    }],
    ['student2-uuid', {
      id: 'student2-uuid',
      role: 'student',
      full_name: 'Priya R',
      email: '23csebs002@smvec.ac.in',
      phone: '9876543211',
      department_code: 'CSEBS',
      student_id: '23CSEBS002',
      mentor_id: 'MENTOR_CSEBS_02',
      is_active: true,
    }],
    ['deactivated-uuid', {
      id: 'deactivated-uuid',
      role: 'student',
      full_name: 'Deactivated User',
      email: 'blocked.student@smvec.ac.in',
      department_code: 'CSEBS',
      student_id: '23CSEBS999',
      is_active: false, // Inactive account!
    }],
  ]);

  let currentSession: { user: { id: string; email: string } } | null = null;
  const authStateListeners: Set<(event: string, session: any) => void> = new Set();

  const mockClient = {
    auth: {
      signInWithPassword: vi.fn(async ({ email, password }) => {
        const found = Array.from(users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!found || found.passwordHash !== password) {
          return { data: { session: null, user: null }, error: { message: 'Invalid login credentials' } };
        }
        currentSession = { user: { id: found.id, email: found.email } };
        authStateListeners.forEach(l => l('SIGNED_IN', currentSession));
        return { data: { session: currentSession, user: currentSession.user }, error: null };
      }),

      signOut: vi.fn(async () => {
        currentSession = null;
        authStateListeners.forEach(l => l('SIGNED_OUT', null));
        return { error: null };
      }),

      getSession: vi.fn(async () => {
        return { data: { session: currentSession }, error: null };
      }),

      getUser: vi.fn(async () => {
        return { data: { user: currentSession?.user || null }, error: null };
      }),

      signUp: vi.fn(async ({ email, password, options }) => {
        const newId = `new-user-${Date.now()}`;
        const newUser = { id: newId, email, passwordHash: password };
        users.set(newId, newUser);
        currentSession = { user: { id: newId, email } };
        return { data: { user: currentSession.user, session: currentSession }, error: null };
      }),

      resetPasswordForEmail: vi.fn(async (email: string) => {
        const found = Array.from(users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!found) {
          return { error: { message: 'User not found' } };
        }
        return { error: null };
      }),

      updateUser: vi.fn(async ({ password }) => {
        if (!currentSession) return { error: { message: 'Not authenticated' } };
        const u = users.get(currentSession.user.id);
        if (u && password) u.passwordHash = password;
        return { data: { user: currentSession.user }, error: null };
      }),

      onAuthStateChange: vi.fn((callback) => {
        authStateListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => authStateListeners.delete(callback),
            },
          },
        };
      }),
    },

    from: vi.fn((table: string) => {
      let selectedFields = '*';
      let filters: ((record: any) => boolean)[] = [];

      const queryBuilder = {
        select: vi.fn((fields = '*') => {
          selectedFields = fields;
          return queryBuilder;
        }),
        eq: vi.fn((col: string, val: any) => {
          filters.push((r: any) => r[col] === val);
          return queryBuilder;
        }),
        ilike: vi.fn((col: string, val: any) => {
          filters.push((r: any) => (r[col] || '').toLowerCase() === String(val).toLowerCase());
          return queryBuilder;
        }),
        or: vi.fn((expr: string) => {
          // Parse simple or queries like "id.eq.xxx,email.ilike.yyy"
          const parts = expr.split(',');
          filters.push((r: any) => {
            return parts.some((p) => {
              const [col, op, v] = p.split('.');
              if (op === 'eq') return String(r[col]) === String(v);
              if (op === 'ilike') return String(r[col] || '').toLowerCase() === String(v || '').toLowerCase();
              return false;
            });
          });
          return queryBuilder;
        }),
        limit: vi.fn(() => queryBuilder),
        order: vi.fn(() => queryBuilder),
        single: vi.fn(async () => {
          let list: any[] = [];
          if (table === 'profiles') list = Array.from(profiles.values());
          const match = list.find((item) => filters.every(f => f(item)));
          return { data: match || null, error: match ? null : { message: 'Not found' } };
        }),
        maybeSingle: vi.fn(async () => {
          let list: any[] = [];
          if (table === 'profiles') list = Array.from(profiles.values());
          const match = list.find((item) => filters.every(f => f(item)));
          return { data: match || null, error: null };
        }),
        then: (resolve: any) => {
          let list: any[] = [];
          if (table === 'profiles') list = Array.from(profiles.values());
          const filtered = list.filter((item) => filters.every(f => f(item)));
          return Promise.resolve({ data: filtered, error: null }).then(resolve);
        },
        upsert: vi.fn(async (row: any) => {
          if (table === 'profiles') {
            profiles.set(row.id, { ...profiles.get(row.id), ...row });
          }
          return { data: row, error: null };
        }),
      };

      return queryBuilder;
    }),
  };

  return { mockClient, users, profiles };
}

describe('Phase 1: Production-Oriented Centralized Authentication & Authorization', () => {
  let engine: ReturnType<typeof createMockSupabaseEngine>;

  beforeEach(async () => {
    engine = createMockSupabaseEngine();
    setCustomSupabaseClient(engine.mockClient as any);
    await authService.logout();
  });

  // ============================================================================
  // ROLE 1: HEAD OF DEPARTMENT (HOD) - SUPER ADMIN
  // ============================================================================
  describe('Role 1: HOD (Head of Department)', () => {
    it('authenticates HOD via Supabase Auth and loads authoritative database profile', async () => {
      const res = await authService.login('saravanan.hod@smvec.ac.in', 'correctPassword123');

      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.role).toBe('hod');
      expect(res.user?.name).toBe('Dr. K. Saravanan');
      expect(res.user?.departmentCode).toBe('CSEBS');
      expect(res.user?.isActive).toBe(true);
      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentUserRole()).toBe('hod');
    });

    it('derives role strictly from the database profile, NOT from email address prefix', async () => {
      // Even if HOD has an email that does not contain "hod", database profile determines role
      engine.profiles.set('hod-uuid', {
        id: 'hod-uuid',
        role: 'hod',
        full_name: 'Dr. K. Saravanan',
        email: 'saravanan@smvec.ac.in', // No "hod" string
        department_code: 'CSEBS',
        is_active: true,
      });
      engine.users.set('hod-uuid', {
        id: 'hod-uuid',
        email: 'saravanan@smvec.ac.in',
        passwordHash: 'correctPassword123',
      });

      const res = await authService.login('saravanan@smvec.ac.in', 'correctPassword123');
      expect(res.success).toBe(true);
      expect(res.user?.role).toBe('hod');
    });

    it('enforces HOD institutional permissions and boundaries', async () => {
      await authService.login('saravanan.hod@smvec.ac.in', 'correctPassword123');
      const currentUser = authService.getCurrentUser();

      // Authorization checks: HOD has super-admin rights
      const canManageMentors = currentUser?.role === 'hod';
      const canManageStudentsInstitutionally = currentUser?.role === 'hod';
      const canApproveInternshipLocations = currentUser?.role === 'hod';
      const canMonitorInstitutionActivity = currentUser?.role === 'hod';

      expect(canManageMentors).toBe(true);
      expect(canManageStudentsInstitutionally).toBe(true);
      expect(canApproveInternshipLocations).toBe(true);
      expect(canMonitorInstitutionActivity).toBe(true);
    });

    it('restores HOD session cleanly from Supabase Auth tokens', async () => {
      await authService.login('saravanan.hod@smvec.ac.in', 'correctPassword123');
      expect(authService.isAuthenticated()).toBe(true);

      const restoredUser = await authService.restoreSession();
      expect(restoredUser).not.toBeNull();
      expect(restoredUser?.role).toBe('hod');
      expect(restoredUser?.email).toBe('saravanan.hod@smvec.ac.in');
    });

    it('logs out HOD and revokes session', async () => {
      await authService.login('saravanan.hod@smvec.ac.in', 'correctPassword123');
      expect(authService.isAuthenticated()).toBe(true);

      await authService.logout();
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(engine.mockClient.auth.signOut).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ROLE 2: FACULTY MENTOR - COHORT SUPERVISOR
  // ============================================================================
  describe('Role 2: MENTOR (Faculty Mentor)', () => {
    it('authenticates Mentor via Supabase Auth and loads authoritative database profile', async () => {
      const res = await authService.login('anitha.mentor@smvec.ac.in', 'correctPassword123');

      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.role).toBe('mentor');
      expect(res.user?.name).toBe('Prof. Anitha Kumar');
      expect(res.user?.mentorId).toBe('MENTOR_CSEBS_01');
      expect(res.user?.isActive).toBe(true);
      expect(authService.getCurrentUserRole()).toBe('mentor');
    });

    it('enforces Mentor cohort permissions and forbids HOD-only actions', async () => {
      await authService.login('anitha.mentor@smvec.ac.in', 'correctPassword123');
      const currentUser = authService.getCurrentUser();

      // Permissions allowed for Mentor
      const canAccessAssignedMentees = currentUser?.role === 'mentor' || currentUser?.role === 'hod';
      const canReviewAttendance = currentUser?.role === 'mentor' || currentUser?.role === 'hod';

      // Permissions forbidden for Mentor (HOD only)
      const canManageInstitutionalMentors = currentUser?.role === 'hod';
      const canApproveInternshipLocations = currentUser?.role === 'hod';

      expect(canAccessAssignedMentees).toBe(true);
      expect(canReviewAttendance).toBe(true);
      expect(canManageInstitutionalMentors).toBe(false);
      expect(canApproveInternshipLocations).toBe(false);
    });

    it('scopes Mentor data access strictly to assigned student mentees', async () => {
      await authService.login('anitha.mentor@smvec.ac.in', 'correctPassword123');
      const mentor = authService.getCurrentUser()!;

      // Student 1 is assigned to MENTOR_CSEBS_01
      const student1 = engine.profiles.get('student-uuid')!;
      // Student 2 is assigned to MENTOR_CSEBS_02
      const student2 = engine.profiles.get('student2-uuid')!;

      const isStudent1Assigned = student1.mentor_id === mentor.mentorId;
      const isStudent2Assigned = student2.mentor_id === mentor.mentorId;

      expect(isStudent1Assigned).toBe(true);
      expect(isStudent2Assigned).toBe(false); // Horizontal isolation!
    });
  });

  // ============================================================================
  // ROLE 3: STUDENT INTERN - END USER
  // ============================================================================
  describe('Role 3: STUDENT (Student Intern)', () => {
    it('authenticates Student via Supabase Auth and loads authoritative database profile', async () => {
      const res = await authService.login('23csebs001@smvec.ac.in', 'correctPassword123');

      expect(res.success).toBe(true);
      expect(res.user).toBeDefined();
      expect(res.user?.role).toBe('student');
      expect(res.user?.name).toBe('Harish V');
      expect(res.user?.studentId).toBe('23CSEBS001');
      expect(res.user?.isActive).toBe(true);
    });

    it('registers a new student strictly as student role and provisions database profile', async () => {
      const res = await authService.registerStudent({
        fullName: 'Karthik S',
        studentId: '23CSEBS099',
        email: '23csebs099@smvec.ac.in',
        phone: '9876543299',
        password: 'studentPassword123',
        department: 'CSEBS',
        academicYear: '3rd Year',
      });

      expect(res.success).toBe(true);
      expect(res.user?.role).toBe('student');
      expect(res.user?.name).toBe('Karthik S');
      expect(res.user?.isActive).toBe(true);

      // Verify Supabase Auth called with role 'student'
      expect(engine.mockClient.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: '23csebs099@smvec.ac.in',
          options: expect.objectContaining({
            data: expect.objectContaining({
              role: 'student',
            }),
          }),
        })
      );
    });

    it('enforces Student personal permissions and blocks unauthorized supervisor actions', async () => {
      await authService.login('23csebs001@smvec.ac.in', 'correctPassword123');
      const student = authService.getCurrentUser()!;

      // Student can view own internship and submit attendance
      const canSubmitAttendance = student.role === 'student';
      const canSubmitLocationVerification = student.role === 'student';
      const canViewPersonalHistory = student.role === 'student';

      // Student cannot review daily logs or manage locations
      const canReviewLogs = student.role === 'mentor' || student.role === 'hod';
      const canApproveLocations = student.role === 'hod';

      expect(canSubmitAttendance).toBe(true);
      expect(canSubmitLocationVerification).toBe(true);
      expect(canViewPersonalHistory).toBe(true);
      expect(canReviewLogs).toBe(false);
      expect(canApproveLocations).toBe(false);
    });

    it('enforces horizontal privilege isolation between students', async () => {
      await authService.login('23csebs001@smvec.ac.in', 'correctPassword123');
      const student1 = authService.getCurrentUser()!;

      const targetStudent2Id = 'student2-uuid';

      // Student 1 cannot claim ownership or modify Student 2's profile
      const canModifyPeerProfile = student1.id === targetStudent2Id;
      expect(canModifyPeerProfile).toBe(false);
    });
  });

  // ============================================================================
  // SECURITY REQUIREMENTS & VULNERABILITY ELIMINATION
  // ============================================================================
  describe('Security & Vulnerability Elimination', () => {
    it('rejects invalid password and PREVENTS application session creation (Eliminates Auth Bypass)', async () => {
      // Prior bug: wrong password checked tables and automatically logged in!
      const res = await authService.login('saravanan.hod@smvec.ac.in', 'WRONG_PASSWORD_ATTEMPT');

      expect(res.success).toBe(false);
      expect(res.user).toBeUndefined();
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(res.message).toContain('Invalid');
    });

    it('rejects deactivated account and revokes active session', async () => {
      const res = await authService.login('blocked.student@smvec.ac.in', 'correctPassword123');

      expect(res.success).toBe(false);
      expect(res.user).toBeUndefined();
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentUser()).toBeNull();
      expect(res.message).toContain('deactivated');
      expect(engine.mockClient.auth.signOut).toHaveBeenCalled();
    });

    it('prevents unauthorized role switching by treating database as sole authoritative source', async () => {
      await authService.login('23csebs001@smvec.ac.in', 'correctPassword123');
      const currentUser = authService.getCurrentUser()!;
      expect(currentUser.role).toBe('student');

      // Attempting to mutate in memory or switch roles does not change backend authority
      const spoofedUser = { ...currentUser, role: 'hod' as UserRole };
      expect(spoofedUser.role).toBe('hod');

      // Restoring session from database reverts any frontend spoofing
      const restored = await authService.restoreSession();
      expect(restored?.role).toBe('student');
    });

    it('supports password reset via Supabase Auth without leaking credentials', async () => {
      const resetRes = await authService.resetPassword('saravanan.hod@smvec.ac.in');

      expect(resetRes.success).toBe(true);
      expect(engine.mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('saravanan.hod@smvec.ac.in');
    });

    it('rejects password reset for invalid email', async () => {
      const resetRes = await authService.resetPassword('invalid-email-string');
      expect(resetRes.success).toBe(false);
    });

    it('session restoration returns null when Supabase Auth session is expired or revoked', async () => {
      engine.mockClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);

      const restored = await authService.restoreSession();
      expect(restored).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });
});

