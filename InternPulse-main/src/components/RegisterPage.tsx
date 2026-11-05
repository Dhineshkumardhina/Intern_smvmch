import React, { useState } from 'react';
import { 
  Zap, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  GraduationCap, 
  Building, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { RegisterStudentParams } from '../core/auth/authUser';
import { COLLEGE_NAME } from '../core/auth/demoAccounts';
import { AppLogo } from './AppLogo';

interface RegisterPageProps {
  onRegister: (params: RegisterStudentParams) => Promise<void>;
  onNavigateToLogin: () => void;
  isLoading: boolean;
}

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const DEPARTMENTS = [
  { code: 'IT', name: 'Information Technology (IT)' },
  { code: 'ECE', name: 'Electronics and Communication Engineering (ECE)' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering (EEE)' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'BME', name: 'Biomedical Engineering' },
  { code: 'MECT', name: 'Mechatronics Engineering' },
  { code: 'ICE', name: 'Instrumentation and Control Engineering (ICE)' },
  { code: 'CSEBS', name: 'Computer Science and Engineering and Business Systems (CSEBS)' },
];

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegister,
  onNavigateToLogin,
  isLoading,
}) => {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [department, setDepartment] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!studentId.trim()) {
      setError('Student Registration ID / Roll Number is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid Email address is required.');
      return;
    }
    if (!phone.trim() || phone.length < 8) {
      setError('A valid Phone Number is required.');
      return;
    }
    if (!academicYear) {
      setError('Please select an Academic Year.');
      return;
    }
    if (!department) {
      setError('Please select a Department.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      await onRegister({
        fullName,
        studentId,
        email,
        phone,
        password,
        academicYear,
        department,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8FF] flex flex-col justify-center items-center px-4 py-8 selection:bg-[#DEE0FF]">
      <div className="max-w-2xl w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <AppLogo 
              size="xl" 
              showText={true}
              showTagline={true}
              layout="vertical"
              className="mx-auto" 
            />
          </div>
          <p className="text-xs text-[#57657A] font-medium mt-1">
            Sri Manakula Vinayagar Engineering College (SMVEC)
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-white rounded-3xl p-8 border border-[#E3E1EA] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#E3E1EA] pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1A1B22]">Student Registration</h2>
              <p className="text-xs text-[#57657A] mt-0.5">
                Create your student account to register your internship and log daily progress
              </p>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Student Portal Only
            </span>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Row 1: Full Name & Student ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Arunmozhi Varman"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Student ID / Roll Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 23IT001"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs uppercase bg-[#FBF8FF]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Email & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@smvec.ac.in"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Academic Year & Department Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF] font-medium"
                  required
                >
                  <option value="">Select Academic Year ▼</option>
                  {ACADEMIC_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF] font-medium truncate"
                  required
                >
                  <option value="">Select Department ▼</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* College Field (Read-only) */}
            <div>
              <label className="block font-semibold text-[#1A1B22] mb-1.5">
                College (Institutional Affiliation)
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-[#24389C] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={COLLEGE_NAME}
                  readOnly
                  disabled
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] bg-[#EFEDF6] text-[#1A1B22] font-semibold text-xs cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Row 4: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
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

              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-[#757684] hover:text-[#1A1B22]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Note regarding Mentor / HOD / Admin */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 flex items-start space-x-2 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p>
                <strong>Faculty & Administrative Notice:</strong> Faculty Mentor, HOD, and Admin accounts are institutional accounts assigned directly by SMVEC Deanery and do not require public registration.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#24389C] hover:bg-[#1E2E80] text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Registering account...</span>
                ) : (
                  <>
                    <span>Proceed to Internship Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Return to Login */}
          <div className="text-center mt-6 pt-4 border-t border-[#E3E1EA]">
            <p className="text-xs text-[#57657A]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-bold text-[#24389C] hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
