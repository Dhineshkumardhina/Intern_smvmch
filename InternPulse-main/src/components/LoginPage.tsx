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
  ImageIcon
} from 'lucide-react';
import { authService } from '../core/auth/authService';
import { UserRole } from '../core/auth/authUser';
import { fetchSupabaseLiveSampleLogins, SampleLoginAccount } from '../core/auth/demoAccounts';
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

  // Live Supabase table accounts (HODs & Mentors)
  const [supabaseHods, setSupabaseHods] = useState<SampleLoginAccount[]>([]);
  const [supabaseMentors, setSupabaseMentors] = useState<SampleLoginAccount[]>([]);
  const [supabaseStudents, setSupabaseStudents] = useState<SampleLoginAccount[]>([]);
  const [loadingSupabaseAccounts, setLoadingSupabaseAccounts] = useState(false);
  const [activeTab, setActiveTab] = useState<'hod' | 'mentor' | 'student'>('hod');

  // Quick account creator modal for Supabase Auth
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('password123');
  const [provRole, setProvRole] = useState<UserRole>('mentor');
  const [provName, setProvName] = useState('');
  const [provDept, setProvDept] = useState('CSEBS');
  const [provLoading, setProvLoading] = useState(false);
  const [provSuccess, setProvSuccess] = useState<string | null>(null);

  // Load sample logins directly from Supabase database tables
  const loadSupabaseSampleLogins = async () => {
    setLoadingSupabaseAccounts(true);
    try {
      const data = await fetchSupabaseLiveSampleLogins();
      setSupabaseHods(data.hods);
      setSupabaseMentors(data.mentors);
      setSupabaseStudents(data.students);
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
    <div className="min-h-screen bg-[#FBF8FF] flex flex-col justify-center items-center px-4 py-8 selection:bg-[#DEE0FF]">
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
            <p className="text-xs text-[#57657A] font-medium mt-2">
              Sri Manakula Vinayagar Engineering College (SMVEC)
            </p>
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 mt-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Database & Auth Live</span>
          </div>
        </div>

        {/* Live Supabase Sample Logins Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#E3E1EA] shadow-md mb-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E1EA]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#24389C]" />
              <h3 className="font-bold text-xs text-[#1A1B22] uppercase tracking-wider">
                Supabase Sample Logins
              </h3>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={loadSupabaseSampleLogins}
                title="Reload accounts from Supabase tables"
                className="p-1 rounded-lg text-[#57657A] hover:bg-[#EFEDF6] transition-colors text-xs flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSupabaseAccounts ? 'animate-spin' : ''}`} />
                <span className="text-[11px] hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-[#57657A] mt-2 mb-3">
            Click any account below to autofill its email & password directly from your Supabase <code className="bg-[#EFEDF6] px-1 py-0.5 rounded text-[#24389C]">hods</code> and <code className="bg-[#EFEDF6] px-1 py-0.5 rounded text-[#24389C]">mentors</code> tables:
          </p>

          {/* Role Tabs */}
          <div className="flex space-x-1 p-1 bg-[#F4F2FA] rounded-2xl mb-3 text-xs">
            <button
              onClick={() => setActiveTab('hod')}
              className={`flex-1 py-1.5 px-3 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'hod'
                  ? 'bg-white text-[#24389C] shadow-xs'
                  : 'text-[#57657A] hover:text-[#1A1B22]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>HOD Logins ({supabaseHods.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('mentor')}
              className={`flex-1 py-1.5 px-3 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'mentor'
                  ? 'bg-white text-[#24389C] shadow-xs'
                  : 'text-[#57657A] hover:text-[#1A1B22]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mentor Logins ({supabaseMentors.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 py-1.5 px-3 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'student'
                  ? 'bg-white text-[#24389C] shadow-xs'
                  : 'text-[#57657A] hover:text-[#1A1B22]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Students ({supabaseStudents.length})</span>
            </button>
          </div>

          {/* Accounts Grid */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {activeTab === 'hod' && (
              supabaseHods.length > 0 ? (
                supabaseHods.map((h) => (
                  <button
                    key={h.id || h.email}
                    type="button"
                    onClick={() => handleSelectSampleLogin(h)}
                    className="w-full text-left p-2.5 rounded-2xl border border-[#E3E1EA] hover:border-[#24389C] hover:bg-[#F6F4FD] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-[#24389C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {h.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[#1A1B22] group-hover:text-[#24389C] truncate">
                          {h.name}
                        </div>
                        <div className="text-[10px] text-[#57657A] font-mono truncate">
                          {h.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#DEE0FF] text-[#00105C] rounded-full">
                        {h.departmentCode} HOD
                      </span>
                      <span className="text-[10px] text-[#24389C] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Use →
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-[#57657A] bg-[#FAF9FD] rounded-2xl border border-dashed border-[#E3E1EA]">
                  No HOD records found in Supabase <code className="text-[#24389C]">hods</code> table.
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
                    className="w-full text-left p-2.5 rounded-2xl border border-[#E3E1EA] hover:border-[#24389C] hover:bg-[#F6F4FD] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-[#00574B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[#1A1B22] group-hover:text-[#24389C] truncate">
                          {m.name}
                        </div>
                        <div className="text-[10px] text-[#57657A] font-mono truncate">
                          {m.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#B2EBF2] text-[#004D40] rounded-full">
                        {m.departmentCode} Mentor
                      </span>
                      <span className="text-[10px] text-[#24389C] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Use →
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-[#57657A] bg-[#FAF9FD] rounded-2xl border border-dashed border-[#E3E1EA]">
                  No Mentor records found in Supabase <code className="text-[#24389C]">mentors</code> table.
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
                    className="w-full text-left p-2.5 rounded-2xl border border-[#E3E1EA] hover:border-[#24389C] hover:bg-[#F6F4FD] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[#1A1B22] group-hover:text-[#24389C] truncate">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-[#57657A] font-mono truncate">
                          {s.email} ({s.id})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EDE9FE] text-[#5B21B6] rounded-full">
                        {s.departmentCode}
                      </span>
                      <span className="text-[10px] text-[#24389C] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        Use →
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-[#57657A] bg-[#FAF9FD] rounded-2xl border border-dashed border-[#E3E1EA]">
                  No Student records found in Supabase <code className="text-[#24389C]">students</code> table.
                </div>
              )
            )}
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-[#E3E1EA] shadow-xl">
          <div className="mb-5 border-b border-[#E3E1EA] pb-4">
            <h2 className="text-xl font-bold text-[#1A1B22]">Sign In</h2>
            <p className="text-xs text-[#57657A] mt-0.5">
              Enter your credentials or click a Supabase account above
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Email / User ID */}
            <div>
              <label className="block font-semibold text-[#1A1B22] mb-1.5">
                Email Address or ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="e.g. user@college.edu or 23CSEBS001"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[#1A1B22]">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-xs font-semibold text-[#24389C] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-[#757684] hover:text-[#1A1B22]"
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
                className="w-full py-3 px-4 bg-[#24389C] hover:bg-[#1E2E80] text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Authenticating via Supabase...</span>
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
          <div className="mt-6 pt-5 border-t border-[#E3E1EA] space-y-3">
            <div className="text-center">
              <p className="text-xs text-[#57657A]">
                New Student?{' '}
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="font-bold text-[#24389C] hover:underline"
                >
                  Register Account
                </button>
              </p>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowProvisionModal(true)}
                className="inline-flex items-center space-x-1.5 text-xs text-[#57657A] hover:text-[#24389C] bg-[#F4F2FA] hover:bg-[#ECE8F6] px-3 py-1.5 rounded-xl border border-[#E3E1EA] transition-all font-medium"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#24389C]" />
                <span>Create New User in Supabase Auth</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal to create custom faculty/HOD in Supabase Auth */}
        {showProvisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E3E1EA] animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3E1EA]">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-[#24389C] text-white flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base text-[#1A1B22]">Create User in Supabase Auth</h3>
                </div>
                <button
                  onClick={() => setShowProvisionModal(false)}
                  className="p-1 rounded-lg text-[#757684] hover:bg-[#EFEDF6]"
                >
                  ✕
                </button>
              </div>

              {provSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{provSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateSupabaseAccount} className="space-y-3 mt-4 text-xs">
                <p className="text-[#57657A]">
                  This creates an official account directly inside your Supabase project (`auth.users`).
                </p>

                <div>
                  <label className="block font-semibold text-[#1A1B22] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    placeholder="e.g. Dr. S. Ramesh"
                    className="w-full p-2.5 rounded-xl border border-[#E3E1EA] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-[#1A1B22] mb-1">Role</label>
                    <select
                      value={provRole}
                      onChange={(e) => setProvRole(e.target.value as UserRole)}
                      className="w-full p-2.5 rounded-xl border border-[#E3E1EA] text-xs bg-[#FBF8FF]"
                    >
                      <option value="hod">HOD</option>
                      <option value="mentor">Faculty Mentor</option>
                      <option value="student">Student</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A1B22] mb-1">Department</label>
                    <select
                      value={provDept}
                      onChange={(e) => setProvDept(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#E3E1EA] text-xs bg-[#FBF8FF]"
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
                  <label className="block font-semibold text-[#1A1B22] mb-1">Email</label>
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="hod.csebs@college.edu"
                    className="w-full p-2.5 rounded-xl border border-[#E3E1EA] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1A1B22] mb-1">Password</label>
                  <input
                    type="password"
                    value={provPassword}
                    onChange={(e) => setProvPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full p-2.5 rounded-xl border border-[#E3E1EA] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#EFEDF6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provLoading}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#24389C] text-white hover:bg-[#1E2E80] disabled:opacity-60 flex items-center space-x-1.5"
                  >
                    {provLoading ? <span>Creating...</span> : <span>Create in Supabase</span>}
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
