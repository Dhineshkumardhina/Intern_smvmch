import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  LogOut, 
  RefreshCw,
  Database,
  ShieldCheck,
  UserCheck,
  ImageIcon
} from 'lucide-react';
import { StudentRecord } from './data/initialData';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { InternshipSetupPage } from './components/InternshipSetupPage';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { StudentDashboard } from './components/StudentDashboard';
import { MentorDashboard } from './components/MentorDashboard';
import { HodDashboard } from './components/HodDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AppLogo } from './components/AppLogo';
import { LogoUploadModal } from './components/LogoUploadModal';
import { authService } from './core/auth/authService';
import { AuthUser, RegisterStudentParams, InternshipSetupParams } from './core/auth/authUser';
import { internshipRepository } from './core/repository/internshipRepository';

type AppRoute = 
  | '/login' 
  | '/register' 
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

  // 2. Navigation Routing
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const user = authService.getCurrentUser();
    if (!user) return '/login';
    if (user.role === 'student' && user.setupComplete === false) return '/setup-internship';
    if (user.role === 'student') return '/student/dashboard';
    if (user.role === 'mentor') return '/mentor/dashboard';
    if (user.role === 'hod') return '/hod/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/login';
  });

  // Subscribe to Supabase Auth State changes
  useEffect(() => {
    const unsubscribeAuth = authService.initAuthListener((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  // Role Enforcement & Route Synchronization
  useEffect(() => {
    if (!currentUser) {
      if (currentRoute !== '/login' && currentRoute !== '/register') {
        setCurrentRoute('/login');
      }
    } else {
      if (currentUser.role === 'student' && currentUser.setupComplete === false) {
        setCurrentRoute('/setup-internship');
      } else if (currentUser.role === 'student' && currentRoute !== '/student/dashboard') {
        setCurrentRoute('/student/dashboard');
      } else if (currentUser.role === 'mentor' && currentRoute !== '/mentor/dashboard') {
        setCurrentRoute('/mentor/dashboard');
      } else if (currentUser.role === 'hod' && currentRoute !== '/hod/dashboard') {
        setCurrentRoute('/hod/dashboard');
      } else if (currentUser.role === 'admin' && currentRoute !== '/admin/dashboard') {
        setCurrentRoute('/admin/dashboard');
      }
    }
  }, [currentUser, currentRoute]);

  // Subscribe to repository real-time updates (Supabase + Local)
  useEffect(() => {
    const unsubscribe = internshipRepository.subscribe(() => {
      setDataVersion(v => v + 1);
    });
    return () => unsubscribe();
  }, []);

  // Read institutional students list
  const totalStudents = useMemo(() => {
    return internshipRepository.getAllStudentsForAdmin();
  }, [dataVersion]);

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
    const found = internshipRepository.getStudentById(studentId);
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

  // Scoped Data for active Mentor
  const mentorAssignedStudents = useMemo(() => {
    if (!currentUser || currentUser.role !== 'mentor') return [];
    return internshipRepository.getStudentsForMentor(currentUser.id);
  }, [currentUser, dataVersion]);

  // Scoped Data for active HOD
  const hodDepartmentCode = currentUser?.departmentCode || currentUser?.dept?.split(' ')[0] || 'CSEBS';
  const hodDepartmentStudents = useMemo(() => {
    if (!currentUser || currentUser.role !== 'hod') return [];
    return internshipRepository.getStudentsForHod(hodDepartmentCode);
  }, [currentUser, hodDepartmentCode, dataVersion]);

  const hodDepartmentMentors = useMemo(() => {
    if (!currentUser || currentUser.role !== 'hod') return [];
    return internshipRepository.getMentorsForHod(hodDepartmentCode);
  }, [currentUser, hodDepartmentCode, dataVersion]);

  // Handle Login Authentication
  const handleLogin = async (emailOrId: string, pass: string) => {
    setAuthLoading(true);
    try {
      const resp = await authService.login(emailOrId, pass);
      setAuthLoading(false);
      if (resp.success && resp.user) {
        setCurrentUser(resp.user);
        if (resp.user.role === 'student' && resp.user.setupComplete === false) {
          setCurrentRoute('/setup-internship');
        } else if (resp.user.role === 'student') {
          setCurrentRoute('/student/dashboard');
        } else if (resp.user.role === 'mentor') {
          setCurrentRoute('/mentor/dashboard');
        } else if (resp.user.role === 'hod') {
          setCurrentRoute('/hod/dashboard');
        } else if (resp.user.role === 'admin') {
          setCurrentRoute('/admin/dashboard');
        }
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

  // Handle Logout
  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setCurrentRoute('/login');
  };

  // Submit Daily Log for active student via repository
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
      await internshipRepository.submitStudentDailyLog(studentId, {
        work,
        hours,
        status,
        blocker,
      });
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
  // UN-AUTHENTICATED ROUTE 1: LOGIN PAGE
  // ==========================================
  if (currentRoute === '/login' || (!currentUser && currentRoute !== '/register')) {
    return (
      <>
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
  if (currentRoute === '/setup-internship' && currentUser && currentUser.role === 'student') {
    return (
      <InternshipSetupPage
        currentUser={currentUser}
        onSubmit={handleCompleteInternshipSetup}
        isLoading={authLoading}
      />
    );
  }

  // ====================================================
  // AUTHENTICATED WORKSPACE (STUDENT, MENTOR, HOD, ADMIN)
  // ====================================================
  return (
    <div className="min-h-screen bg-[#FBF8FF] text-[#1A1B22] font-sans flex flex-col selection:bg-[#DEE0FF]">
      {/* Top Institutional Header */}
      <header className="bg-white border-b border-[#E3E1EA] sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Institution & App Brand */}
            <div className="flex items-center space-x-2">
              <AppLogo 
                size="md" 
                showText={true} 
                clickable={true}
                onClick={() => setIsLogoModalOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(true)}
                title="Customize or upload app logo image"
                className="p-1.5 rounded-lg text-[#757684] hover:text-[#24389C] hover:bg-[#EFEDF6] transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Right Header: Supabase Sync Status + User Badge + Logout */}
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

              {/* Active Supabase Auth User Identity Chip */}
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

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Logout from Supabase Auth"
                className="p-2 rounded-xl border border-[#E3E1EA] text-[#57657A] hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center space-x-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-semibold hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ==================================================== */}
        {/* ROLE 1: STUDENT DASHBOARD (STRICT OWN DATA ONLY)     */}
        {/* ==================================================== */}
        {currentUser?.role === 'student' && (
          <StudentDashboard
            currentUser={currentUser}
            studentData={activeStudentData}
            onSubmitDailyLog={handleSubmitDailyWork}
            isSubmitting={isSubmittingLog}
          />
        )}

        {/* ==================================================== */}
        {/* ROLE 2: MENTOR DASHBOARD (STRICT ASSIGNED MENTEES)   */}
        {/* ==================================================== */}
        {currentUser?.role === 'mentor' && (
          <MentorDashboard
            currentUser={currentUser}
            assignedStudents={mentorAssignedStudents}
            onReviewStudent={(studentId, remarks) => {
              console.log(`Mentor remarks for ${studentId}:`, remarks);
            }}
          />
        )}

        {/* ==================================================== */}
        {/* ROLE 3: HOD DASHBOARD (STRICT DEPARTMENT OVERSIGHT)  */}
        {/* ==================================================== */}
        {currentUser?.role === 'hod' && (
          <HodDashboard
            currentUser={currentUser}
            departmentStudents={hodDepartmentStudents}
            departmentMentors={hodDepartmentMentors}
          />
        )}

        {/* ==================================================== */}
        {/* ROLE 4: ADMIN DASHBOARD (COLLEGE-WIDE GOVERNANCE)    */}
        {/* ==================================================== */}
        {currentUser?.role === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
            students={totalStudents}
            onUpdateStudents={handleAdminUpdateStudents}
          />
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
