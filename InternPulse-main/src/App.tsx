import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  LogOut, 
  RefreshCw,
  Database,
  ShieldCheck,
  UserCheck,
  ImageIcon,
  ShieldAlert,
  SlidersHorizontal,
  LayoutDashboard
} from 'lucide-react';
import { StudentRecord } from './data/initialData';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { InternshipSetupPage } from './components/InternshipSetupPage';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { AccessDeniedPage } from './components/AccessDeniedPage';
import { StudentDashboard } from './components/StudentDashboard';
import { MentorDashboard } from './components/MentorDashboard';
import { HodDashboard } from './components/HodDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AppLogo } from './components/AppLogo';
import { LogoUploadModal } from './components/LogoUploadModal';
import { authService } from './core/auth/authService';
import { AuthUser, RegisterStudentParams, InternshipSetupParams, UserRole } from './core/auth/authUser';
import { internshipRepository } from './core/repository/internshipRepository';
import { AuthorizationPolicy } from './core/auth/rbac/authorizationPolicy';

export type AppRoute = 
  | '/login' 
  | '/register' 
  | '/access-denied'
  | '/setup-internship' 
  | '/student/dashboard' 
  | '/mentor/dashboard' 
  | '/hod/dashboard' 
  | '/admin/dashboard';

export default function App() {
  // 1. Session State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [authLoading, setAuthLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // RBAC Routing & Navigation States
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<AppRoute | null>(null);
  const [attemptedUnauthorizedRoute, setAttemptedUnauthorizedRoute] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  // Helper: Default dashboard for role
  const getDefaultDashboardForRole = (role: UserRole, setupComplete = true): AppRoute => {
    switch (role) {
      case 'student':
        return setupComplete === false ? '/setup-internship' : '/student/dashboard';
      case 'mentor':
        return '/mentor/dashboard';
      case 'hod':
        return '/hod/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/login';
    }
  };

  // 2. Navigation Routing with Initial State Check
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const user = authService.getCurrentUser();
    if (!user) return '/login';
    return getDefaultDashboardForRole(user.role, user.setupComplete);
  });

  // Subscribe to Supabase Auth State changes & Session Expiration
  useEffect(() => {
    const unsubscribeAuth = authService.initAuthListener((user) => {
      // If user was previously authenticated and suddenly becomes null, session expired
      if (currentUser && !user) {
        setSessionExpiredNotice('Your authentication session has expired. Please log in again.');
        setCurrentRoute('/login');
      }
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, [currentUser]);

  // Initial Session Restoration on App Mount
  useEffect(() => {
    authService.restoreSession().then((restored) => {
      if (restored) {
        setCurrentUser(restored);
      }
    });
  }, []);

  // Protected Route & Navigation Guard
  const navigateTo = (targetRoute: AppRoute) => {
    if (targetRoute === '/login' || targetRoute === '/register') {
      setCurrentRoute(targetRoute);
      return;
    }

    if (!currentUser) {
      setRedirectAfterLogin(targetRoute);
      setCurrentRoute('/login');
      return;
    }

    // Evaluate RBAC Authorization Policy
    const authCheck = AuthorizationPolicy.canAccessRoute(currentUser, targetRoute);
    if (!authCheck.allowed) {
      setAttemptedUnauthorizedRoute(targetRoute);
      setCurrentRoute('/access-denied');
      return;
    }

    setCurrentRoute(targetRoute);
  };

  // Subscribe to repository real-time updates (Supabase + Local)
  useEffect(() => {
    const unsubscribe = internshipRepository.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Read institutional students list
  const totalStudents = useMemo(() => {
    return internshipRepository.getAllStudentsForAdmin(currentUser || undefined);
  }, [dataVersion, currentUser]);

  // Scoped Data for active Student
  const activeStudentData = useMemo(() => {
    if (!currentUser || currentUser.role !== 'student') {
      return {
        id: 'EMPTY',
        studentId: 'ST_EMPTY',
        studentName: 'Student',
        academicYear: '3rd Year',
        year: '3rd Year',
        departmentCode: 'CSEBS',
        dept: 'CSEBS',
        company: 'Not Assigned',
        mentor: 'Not Assigned',
        mentorId: '',
        role: 'Intern',
        status: 'onTrack',
        progress: 0,
        hours: 0,
        work: 'No logs submitted.',
        time: 'Today',
      } as StudentRecord;
    }
    const studentId = currentUser.studentId || currentUser.id;
    const found = internshipRepository.getStudentById(studentId, currentUser);
    if (found) return found;

    // Fallback for registered student
    const dept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';
    return {
      id: currentUser.id,
      studentId: studentId,
      studentName: currentUser.name,
      email: currentUser.email,
      year: currentUser.year || '3rd Year',
      academicYear: currentUser.year || '3rd Year',
      dept: dept,
      departmentCode: dept,
      company: currentUser.company || 'Host Organization',
      mentor: 'Faculty Mentor',
      mentorId: 'MENTOR_CSEBS_01',
      mentorEmail: 'anitha.mentor@college.edu',
      role: currentUser.internshipRole || 'Intern',
      status: 'onTrack',
      progress: 0,
      hours: 0,
      work: currentUser.internshipDescription || 'Internship setup complete. Submit daily logs to start tracking.',
      time: 'Today',
    } as StudentRecord;
  }, [currentUser, dataVersion]);

  // Scoped Data for active Mentor: Assigned mentees
  const mentorAssignedStudents = useMemo(() => {
    if (!currentUser || (currentUser.role !== 'mentor' && currentUser.role !== 'hod' && currentUser.role !== 'admin')) return [];
    return internshipRepository.getStudentsForMentor(currentUser.id, currentUser);
  }, [currentUser, dataVersion]);

  // Scoped Data for active Mentor: Department cohort scope
  const mentorScopeStudents = useMemo(() => {
    if (!currentUser || (currentUser.role !== 'mentor' && currentUser.role !== 'hod' && currentUser.role !== 'admin')) return [];
    const dept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';
    return internshipRepository.getStudentsForMentorScope(currentUser.id, dept, currentUser);
  }, [currentUser, dataVersion]);

  // Scoped Data for active HOD
  const hodDepartmentCode = currentUser?.departmentCode || currentUser?.dept?.split(' ')[0] || 'CSEBS';
  const hodDepartmentStudents = useMemo(() => {
    if (!currentUser || (currentUser.role !== 'hod' && currentUser.role !== 'admin')) return [];
    return internshipRepository.getStudentsForHod(hodDepartmentCode, currentUser);
  }, [currentUser, hodDepartmentCode, dataVersion]);

  const hodDepartmentMentors = useMemo(() => {
    if (!currentUser || (currentUser.role !== 'hod' && currentUser.role !== 'admin')) return [];
    return internshipRepository.getMentorsForHod(hodDepartmentCode);
  }, [currentUser, hodDepartmentCode, dataVersion]);

  // Handle Login Authentication with Redirect-After-Login
  const handleLogin = async (emailOrId: string, pass: string) => {
    setAuthLoading(true);
    setSessionExpiredNotice(null);
    try {
      const resp = await authService.login(emailOrId, pass);
      setAuthLoading(false);
      if (resp.success && resp.user) {
        setCurrentUser(resp.user);

        // Check if a valid redirect route was saved and caller is authorized for it
        if (redirectAfterLogin) {
          const check = AuthorizationPolicy.canAccessRoute(resp.user, redirectAfterLogin);
          if (check.allowed) {
            setCurrentRoute(redirectAfterLogin);
            setRedirectAfterLogin(null);
            return;
          }
        }

        // Navigate to default authorized dashboard
        const defaultRoute = getDefaultDashboardForRole(resp.user.role, resp.user.setupComplete);
        setCurrentRoute(defaultRoute);
        setRedirectAfterLogin(null);
      } else {
        throw new Error(resp.message || 'Invalid credentials.');
      }
    } catch (e) {
      setAuthLoading(false);
      throw e;
    }
  };

  // Handle Student Registration
  const handleRegisterStudent = async (params: RegisterStudentParams) => {
    setAuthLoading(true);
    try {
      const resp = await authService.registerStudent(params);
      setAuthLoading(false);
      if (resp.success && resp.user) {
        setCurrentUser(resp.user);
        setCurrentRoute('/setup-internship');
      } else {
        throw new Error(resp.message || 'Registration failed.');
      }
    } catch (e) {
      setAuthLoading(false);
      throw e;
    }
  };

  // Handle Internship Setup Completion
  const handleCompleteInternshipSetup = async (details: InternshipSetupParams) => {
    if (!currentUser) return;
    setAuthLoading(true);
    try {
      const resp = await authService.completeInternshipSetup(currentUser.id, details);
      setAuthLoading(false);
      if (resp.success && resp.user) {
        setCurrentUser(resp.user);

        const studentDept = resp.user.departmentCode || resp.user.dept || 'CSEBS';
        const defaultMentor = { name: 'Prof. Anitha Kumar', id: 'MENTOR_CSEBS_01', email: 'anitha.mentor@college.edu' };

        // Add or update the student record in our repository
        const newRecord: StudentRecord = {
          id: resp.user.id,
          studentId: resp.user.studentId || resp.user.id,
          studentName: resp.user.name,
          email: resp.user.email,
          year: resp.user.year || '3rd Year',
          academicYear: resp.user.year || '3rd Year',
          dept: studentDept,
          departmentCode: studentDept,
          company: details.companyName,
          mentor: defaultMentor.name,
          mentorId: defaultMentor.id,
          mentorEmail: defaultMentor.email,
          role: details.internshipRole,
          status: 'onTrack',
          progress: 10,
          hours: 8,
          work: details.description || 'Internship onboarding & setup complete.',
          time: 'Just now',
        };

        const all = internshipRepository.getAllStudentsForAdmin();
        const existingIdx = all.findIndex(s => s.studentId === resp.user!.id || s.id === resp.user!.id);
        if (existingIdx !== -1) {
          all[existingIdx] = newRecord;
          internshipRepository.replaceDataset(all);
        } else {
          internshipRepository.replaceDataset([newRecord, ...all]);
        }
        setDataVersion(v => v + 1);
        setCurrentRoute('/student/dashboard');
      } else {
        throw new Error(resp.message || 'Setup failed.');
      }
    } catch (e) {
      setAuthLoading(false);
      throw e;
    }
  };

  // Handle Secure Logout
  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setRedirectAfterLogin(null);
    setAttemptedUnauthorizedRoute(null);
    setCurrentRoute('/login');
  };

  // Submit Daily Log with server-side / repository authorization check
  const handleSubmitDailyWork = async (
    work: string, 
    hours: number, 
    status: StudentRecord['status'], 
    blocker?: string
  ) => {
    if (!currentUser) return;
    setIsSubmittingLog(true);
    try {
      const studentId = currentUser.studentId || currentUser.id;
      await internshipRepository.submitStudentDailyLog(
        studentId, 
        {
          work,
          hours,
          status,
          blocker,
        },
        currentUser // Pass caller identity for backend authorization validation
      );
      setDataVersion(v => v + 1);
    } catch (e) {
      console.error('Failed to submit daily log:', e);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Handle Admin dataset updates
  const handleAdminUpdateStudents = (updatedStudents: StudentRecord[]) => {
    internshipRepository.replaceDataset(updatedStudents);
    setDataVersion(v => v + 1);
  };

  // ==========================================
  // ROUTE 0: ACCESS DENIED (403 FORBIDDEN)
  // ==========================================
  if (currentRoute === '/access-denied') {
    return (
      <AccessDeniedPage
        currentUser={currentUser}
        attemptedRoute={attemptedUnauthorizedRoute || undefined}
        onReturnToDashboard={() => {
          if (!currentUser) {
            setCurrentRoute('/login');
          } else {
            setCurrentRoute(getDefaultDashboardForRole(currentUser.role, currentUser.setupComplete));
          }
        }}
        onLogout={handleLogout}
      />
    );
  }

  // ==========================================
  // UN-AUTHENTICATED ROUTE 1: LOGIN PAGE
  // ==========================================
  if (currentRoute === '/login' || (!currentUser && currentRoute !== '/register')) {
    return (
      <>
        {sessionExpiredNotice && (
          <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 text-center flex items-center justify-center space-x-2 shadow-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{sessionExpiredNotice}</span>
          </div>
        )}
        <LoginPage
          onLogin={handleLogin}
          onNavigateToRegister={() => setCurrentRoute('/register')}
          onOpenForgotPassword={() => setIsForgotModalOpen(true)}
          isLoading={authLoading}
        />
        <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
        />
      </>
    );
  }

  // ==========================================
  // UN-AUTHENTICATED ROUTE 2: REGISTER PAGE
  // ==========================================
  if (currentRoute === '/register') {
    return (
      <RegisterPage
        onRegister={handleRegisterStudent}
        onNavigateToLogin={() => setCurrentRoute('/login')}
        isLoading={authLoading}
      />
    );
  }

  // ==========================================
  // ROUTE 3: INTERNSHIP SETUP (STUDENT ONLY)
  // ==========================================
  if (currentRoute === '/setup-internship') {
    if (!currentUser || currentUser.role !== 'student') {
      return (
        <AccessDeniedPage
          currentUser={currentUser}
          attemptedRoute="/setup-internship"
          onReturnToDashboard={() => {
            if (!currentUser) setCurrentRoute('/login');
            else setCurrentRoute(getDefaultDashboardForRole(currentUser.role));
          }}
          onLogout={handleLogout}
        />
      );
    }
    return (
      <InternshipSetupPage
        currentUser={currentUser}
        onSubmit={handleCompleteInternshipSetup}
        isLoading={authLoading}
      />
    );
  }

  // ====================================================
  // AUTHENTICATED WORKSPACE (ROLE-PROTECTED LAYOUT)
  // ====================================================
  return (
    <div className="min-h-screen bg-[#FBF8FF] text-[#1A1B22] font-sans flex flex-col selection:bg-[#DEE0FF]">
      {/* Top Institutional Header with Role-Aware Controls */}
      <header className="bg-white border-b border-[#E3E1EA] sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Institution & App Brand */}
            <div className="flex items-center space-x-3">
              <AppLogo 
                size="md" 
                showText={true} 
                clickable={true}
                onClick={() => setIsLogoModalOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(true)}
                title="Customize app logo"
                className="p-1.5 rounded-lg text-[#757684] hover:text-[#24389C] hover:bg-[#EFEDF6] transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Role-Aware Navigation Tabs (HOD can toggle between Department & Institutional Governance) */}
              {currentUser && (currentUser.role === 'hod' || currentUser.role === 'admin') && (
                <div className="hidden md:flex items-center bg-[#F4F2FA] p-1 rounded-xl space-x-1 ml-4 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => navigateTo('/hod/dashboard')}
                    className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                      currentRoute === '/hod/dashboard'
                        ? 'bg-white text-[#24389C] shadow-xs'
                        : 'text-[#57657A] hover:text-[#1A1B22]'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>HOD Department</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('/admin/dashboard')}
                    className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
                      currentRoute === '/admin/dashboard'
                        ? 'bg-white text-[#24389C] shadow-xs'
                        : 'text-[#57657A] hover:text-[#1A1B22]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Institutional Admin</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Header: Sync Button + Identity Chip + Secure Logout */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              
              {/* Supabase Realtime Sync Button */}
              <button
                onClick={() => internshipRepository.syncWithSupabase()}
                title="Sync live data with Supabase"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all text-xs font-semibold"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Supabase Live</span>
                <RefreshCw className={`w-3 h-3 text-emerald-600 ${internshipRepository.getSyncStatus().isSyncing ? 'animate-spin' : ''}`} />
              </button>

              {/* Authoritative Supabase Auth User Identity Chip */}
              <div className="flex items-center space-x-2 bg-[#EFEDF6] px-3 py-1.5 rounded-xl text-xs border border-[#E3E1EA]">
                <div className="w-6 h-6 rounded-full bg-[#24389C] text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser?.name?.slice(0, 1) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-[#1A1B22] leading-tight text-xs flex items-center space-x-1">
                    <span className="truncate max-w-[120px]">{currentUser?.name}</span>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-[#DEE0FF] text-[#00105C] rounded">
                      {currentUser?.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#57657A] truncate font-mono">
                    {currentUser?.email}
                  </div>
                </div>
              </div>

              {/* Secure Logout Button */}
              <button
                onClick={handleLogout}
                title="Secure logout from Supabase Auth"
                className="p-2 rounded-xl border border-[#E3E1EA] text-[#57657A] hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center space-x-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-semibold hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body with Strict Role Enforcement */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ==================================================== */}
        {/* ROLE 1: STUDENT DASHBOARD (STRICT STUDENT ROLE ONLY) */}
        {/* ==================================================== */}
        {currentRoute === '/student/dashboard' && (
          currentUser?.role === 'student' ? (
            <StudentDashboard
              currentUser={currentUser}
              studentData={activeStudentData}
              onSubmitDailyLog={handleSubmitDailyWork}
              isSubmitting={isSubmittingLog}
            />
          ) : (
            <AccessDeniedPage
              currentUser={currentUser}
              attemptedRoute="/student/dashboard"
              onReturnToDashboard={() => setCurrentRoute(getDefaultDashboardForRole(currentUser?.role || 'student'))}
              onLogout={handleLogout}
            />
          )
        )}

        {/* ==================================================== */}
        {/* ROLE 2: MENTOR DASHBOARD (STRICT MENTOR ROLE ONLY)   */}
        {/* ==================================================== */}
        {currentRoute === '/mentor/dashboard' && (
          (currentUser?.role === 'mentor' || currentUser?.role === 'hod' || currentUser?.role === 'admin') ? (
            <MentorDashboard
              currentUser={currentUser}
              assignedStudents={mentorAssignedStudents}
              scopedStudents={mentorScopeStudents}
              onReviewStudent={(studentId, remarks) => {
                console.log(`Mentor remarks for ${studentId}:`, remarks);
              }}
              onRefreshData={() => setDataVersion(v => v + 1)}
            />
          ) : (
            <AccessDeniedPage
              currentUser={currentUser}
              attemptedRoute="/mentor/dashboard"
              onReturnToDashboard={() => setCurrentRoute(getDefaultDashboardForRole(currentUser?.role || 'student'))}
              onLogout={handleLogout}
            />
          )
        )}

        {/* ==================================================== */}
        {/* ROLE 3: HOD DASHBOARD (STRICT HOD ROLE ONLY)         */}
        {/* ==================================================== */}
        {currentRoute === '/hod/dashboard' && (
          (currentUser?.role === 'hod' || currentUser?.role === 'admin') ? (
            <HodDashboard
              currentUser={currentUser}
              departmentStudents={hodDepartmentStudents}
              departmentMentors={hodDepartmentMentors}
            />
          ) : (
            <AccessDeniedPage
              currentUser={currentUser}
              attemptedRoute="/hod/dashboard"
              onReturnToDashboard={() => setCurrentRoute(getDefaultDashboardForRole(currentUser?.role || 'student'))}
              onLogout={handleLogout}
            />
          )
        )}

        {/* ==================================================== */}
        {/* ROLE 4: ADMIN DASHBOARD (STRICT HOD/ADMIN ONLY)      */}
        {/* ==================================================== */}
        {currentRoute === '/admin/dashboard' && (
          (currentUser?.role === 'hod' || currentUser?.role === 'admin') ? (
            <AdminDashboard
              currentUser={currentUser}
              students={totalStudents}
              onUpdateStudents={handleAdminUpdateStudents}
            />
          ) : (
            <AccessDeniedPage
              currentUser={currentUser}
              attemptedRoute="/admin/dashboard"
              onReturnToDashboard={() => setCurrentRoute(getDefaultDashboardForRole(currentUser?.role || 'student'))}
              onLogout={handleLogout}
            />
          )
        )}

      </main>

      {/* App Logo Customization Modal */}
      <LogoUploadModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
      />
    </div>
  );
}
