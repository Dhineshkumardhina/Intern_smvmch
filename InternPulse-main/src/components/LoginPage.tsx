import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertTriangle, 
  Database,
  UserPlus,
  CheckCircle2,
  KeyRound,
  Users,
  Shield,
  GraduationCap,
  Sparkles,
  RefreshCw,
  ImageIcon,
  UserCheck
} from 'lucide-react';
import { authService } from '../core/auth/authService';
import { UserRole } from '../core/auth/authUser';
import { fetchSupabaseLiveSampleLogins, getDefaultSampleLogins, SampleLoginAccount } from '../core/auth/demoAccounts';
import { AppLogo } from './AppLogo';
import { LogoUploadModal } from './LogoUploadModal';

interface LoginPageProps {
  onLogin: (emailOrId: string, password: string) => Promise<void>;
  onNavigateToRegister: () => void;
  onOpenForgotPassword: () => void;
  isLoading: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onNavigateToRegister,
  onOpenForgotPassword,
  isLoading,
}) => {
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  // Seed default sample accounts immediately so 0 accounts are never shown
  const initialLogins = getDefaultSampleLogins();
  const [supabaseHods, setSupabaseHods] = useState<SampleLoginAccount[]>(initialLogins.hods);
  const [supabaseMentors, setSupabaseMentors] = useState<SampleLoginAccount[]>(initialLogins.mentors);
  const [supabaseStudents, setSupabaseStudents] = useState<SampleLoginAccount[]>(initialLogins.students);
  const [supabaseAdmins, setSupabaseAdmins] = useState<SampleLoginAccount[]>(initialLogins.admins || []);
  const [loadingSupabaseAccounts, setLoadingSupabaseAccounts] = useState(false);
  const [activeTab, setActiveTab] = useState<'hod' | 'mentor' | 'student' | 'admin'>('hod');

  // Quick account creator modal for Supabase Auth
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('password123');
  const [provRole, setProvRole] = useState<UserRole>('mentor');
  const [provName, setProvName] = useState('');
  const [provDept, setProvDept] = useState('CSEBS');
  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState<string | null>(null);

  // Load sample logins directly from Supabase database tables or pre-seeded fallbacks
  const loadSupabaseSampleLogins = async () => {
    setLoadingSupabaseAccounts(true);
    try {
      const data = await fetchSupabaseLiveSampleLogins();
      if (data.hods && data.hods.length > 0) setSupabaseHods(data.hods);
      if (data.mentors && data.mentors.length > 0) setSupabaseMentors(data.mentors);
      if (data.students && data.students.length > 0) setSupabaseStudents(data.students);
      if (data.admins && data.admins.length > 0) setSupabaseAdmins(data.admins);
    } catch (err) {
      console.warn('Failed to load sample logins from Supabase:', err);
    } finally {
      setLoadingSupabaseAccounts(false);
    }
  };

  useEffect(() => {
    loadSupabaseSampleLogins();
  }, []);

  const handleSelectSampleLogin = (acc: SampleLoginAccount) => {
    setEmailOrId(acc.email);
    setPassword(acc.password || 'password123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrId.trim()) {
      setError('Please enter your Email or User ID.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      await onLogin(emailOrId, password);
    } catch (err: any) {
      setError(err.message || 'Invalid Supabase Auth credentials. Please check and try again.');
    }
  };

  const handleCreateSupabaseAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProvSuccess(null);
    setProvLoading(true);

    try {
      const res = await authService.provisionSupabaseAccount(
        provEmail,
        provPassword,
        provRole,
        {
          name: provName,
          departmentCode: provDept,
        }
      );

      if (res.success) {
        setProvSuccess(`Account created in Supabase Auth for ${provEmail}! You can now log in.`);
        setEmailOrId(provEmail);
        setPassword(provPassword);
        // Refresh live accounts list
        loadSupabaseSampleLogins();
        setTimeout(() => {
          setShowProvisionModal(false);
          setProvSuccess(null);
        }, 2000);
      } else {
        setError(res.message || 'Failed to create user in Supabase Auth.');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating account in Supabase Auth.');
    } finally {
      setProvLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-10 selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-xl w-full">
        
        {/* Institutional Branding */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center justify-center mb-2">
            <AppLogo 
              size="xl" 
              showText={true}
              showTagline={true}
              layout="vertical"
              clickable={true}
              onClick={() => setIsLogoModalOpen(true)}
              className="mx-auto"
            />
            <p className="text-xs text-slate-500 font-medium mt-2">
              Sri Manakula Vinayagar Engineering College (Autonomous)
            </p>
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 mt-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Institutional Verification Portal</span>
          </div>
        </div>

        {/* Quick Access Demo Profiles Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
                Quick Access Demo Profiles
              </h3>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={loadSupabaseSampleLogins}
                title="Reload accounts from Supabase tables"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-xs flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSupabaseAccounts ? 'animate-spin' : ''}`} />
                <span className="text-[11px] hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-2.5 mb-3">
            Click any profile below to autofill credentials for testing role-specific features:
          </p>

          {/* Role Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-xl mb-3 text-xs">
            <button
              onClick={() => setActiveTab('hod')}
              className={`py-1.5 px-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-all text-xs ${
                activeTab === 'hod'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span>HOD ({supabaseHods.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('mentor')}
              className={`py-1.5 px-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-all text-xs ${
                activeTab === 'mentor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>Mentors ({supabaseMentors.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`py-1.5 px-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-all text-xs ${
                activeTab === 'student'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
              <span>Students ({supabaseStudents.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-1.5 px-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-all text-xs ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0 text-purple-600" />
              <span>Admin ({supabaseAdmins.length})</span>
            </button>
          </div>

          {/* Accounts Grid */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {activeTab === 'hod' && (
              supabaseHods.length > 0 ? (
                supabaseHods.map((h) => (
                  <button
                    key={h.id || h.email}
                    type="button"
                    onClick={() => handleSelectSampleLogin(h)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0">
                        {h.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-blue-700 truncate">
                          {h.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {h.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {h.departmentCode} HOD
                      </span>
                      <span className="text-[11px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Use →
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No HOD records available.
                </div>
              )
            )}

            {activeTab === 'mentor' && (
              supabaseMentors.length > 0 ? (
                supabaseMentors.map((m) => (
                  <button
                    key={m.id || m.email}
                    type="button"
                    onClick={() => handleSelectSampleLogin(m)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-xs shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-emerald-700 truncate">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {m.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {m.departmentCode} Mentor
                      </span>
                      <span className="text-[11px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Use →
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No Mentor records available.
                </div>
              )
            )}

            {activeTab === 'student' && (
              supabaseStudents.length > 0 ? (
                supabaseStudents.map((s) => (
                  <button
                    key={s.id || s.email}
                    type="button"
                    onClick={() => handleSelectSampleLogin(s)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-indigo-700 truncate">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {s.email} ({s.id})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {s.departmentCode}
                      </span>
                      <span className="text-[11px] text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Use →
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No Student records available.
                </div>
              )
            )}

            {activeTab === 'admin' && (
              supabaseAdmins.length > 0 ? (
                supabaseAdmins.map((a) => (
                  <button
                    key={a.id || a.email}
                    type="button"
                    onClick={() => handleSelectSampleLogin(a)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-purple-500 hover:bg-purple-50/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center font-bold text-xs shrink-0">
                        {a.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-slate-800 group-hover:text-purple-700 truncate">
                          {a.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {a.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        Deanery Admin
                      </span>
                      <span className="text-[11px] text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Use →
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No Admin records available.
                </div>
              )
            )}
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-7 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900">Sign in to InternPulse</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials or select a demo profile above.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Email / User ID */}
            <div>
              <label className="block font-medium text-slate-700 mb-1.5">
                Email Address or Registration ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="e.g. user@college.edu or 23CSEBS001"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs text-slate-900 placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Actions: Register Student & Create Supabase Account */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">
                New Student?{' '}
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Register Account
                </button>
              </p>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowProvisionModal(true)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-all font-medium"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Create New Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal to create custom faculty/HOD in Supabase Auth */}
        {showProvisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-base text-slate-900">Create New Account</h3>
                </div>
                <button
                  onClick={() => setShowProvisionModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {provSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{provSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateSupabaseAccount} className="space-y-3.5 mt-4 text-xs">
                <p className="text-slate-500">
                  Provision an official profile directly into the SMVEC authentication registry.
                </p>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder="e.g. Dr. S. Ramesh"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Role</label>
                    <select
                      value={provRole}
                      onChange={(e) => setProvRole(e.target.value as UserRole)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="hod">HOD</option>
                      <option value="mentor">Faculty Mentor</option>
                      <option value="student">Student</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Department</label>
                    <select
                      value={provDept}
                      onChange={(e) => setProvDept(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="CSEBS">CSEBS</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="hod.csebs@college.edu"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={provPassword}
                    onChange={(e) => setProvPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provLoading}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center space-x-1.5"
                  >
                    {provLoading ? <span>Creating...</span> : <span>Create Account</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal to customize app logo */}
        <LogoUploadModal
          isOpen={isLogoModalOpen}
          onClose={() => setIsLogoModalOpen(false)}
        />

      </div>
    </div>
  );
};
