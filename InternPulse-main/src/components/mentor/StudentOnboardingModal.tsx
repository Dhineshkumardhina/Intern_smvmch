import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Building2,
  Mail,
  Phone,
  User,
  GraduationCap
} from 'lucide-react';
import { StudentRecord } from '../../data/initialData';
import { AuthUser } from '../../core/auth/authUser';

interface StudentOnboardingModalProps {
  isOpen: boolean;
  currentUser: AuthUser;
  onClose: () => void;
  onSubmit: (studentData: Omit<StudentRecord, 'id'>) => Promise<void>;
  existingStudents: StudentRecord[];
}

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const StudentOnboardingModal: React.FC<StudentOnboardingModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSubmit,
  existingStudents,
}) => {
  const mentorDept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';

  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [academicYear, setAcademicYear] = useState('3rd Year');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('Intern');
  const [accountStatus, setAccountStatus] = useState<'active' | 'inactive' | 'pending_approval'>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanReg = studentId.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = studentName.trim();
    const cleanPhone = phone.trim();

    // 1. Basic validation
    if (!cleanReg) {
      setError('Register Number is required.');
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(cleanReg)) {
      setError('Register Number must be alphanumeric.');
      return;
    }
    if (!cleanName || cleanName.length < 2) {
      setError('Student Name must contain at least 2 characters.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please provide a valid student email address.');
      return;
    }
    const cleanDigits = cleanPhone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanDigits.length < 7 || cleanDigits.length > 15) {
      setError('Phone number must contain between 7 and 15 digits.');
      return;
    }

    // 2. Duplicate Detection
    const duplicateReg = existingStudents.find(
      s => s.studentId.trim().toLowerCase() === cleanReg.toLowerCase()
    );
    if (duplicateReg) {
      setError(`Duplicate Register Number: '${cleanReg}' already belongs to ${duplicateReg.studentName} in ${duplicateReg.dept}.`);
      return;
    }

    const duplicateEmail = existingStudents.find(
      s => (s.email || '').trim().toLowerCase() === cleanEmail
    );
    if (duplicateEmail) {
      setError(`Duplicate Email: '${cleanEmail}' is already registered to ${duplicateEmail.studentName}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        studentId: cleanReg,
        studentName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        departmentCode: mentorDept,
        dept: mentorDept,
        academicYear: academicYear,
        year: academicYear,
        company: company.trim() || 'Unassigned',
        role: role.trim() || 'Intern',
        mentorId: currentUser.mentorId || currentUser.id,
        mentor: currentUser.name,
        mentorEmail: currentUser.email,
        status: 'onTrack',
        accountStatus: accountStatus,
        progress: 0,
        hours: 0,
        work: 'Student onboarded. Pending placement tracking.',
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to onboard student. Please check input data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-[#E3E1EA] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-white border-b border-[#E3E1EA] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-[#24389C] flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1B22]">Onboard New Student</h3>
              <p className="text-xs text-[#57657A]">
                Authorized Department: <strong className="text-[#24389C]">{mentorDept}</strong> • Guide: <strong>{currentUser.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#757684] hover:text-[#1A1B22] hover:bg-[#EFEDF6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {success ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-[#1A1B22]">Student Successfully Onboarded!</h4>
            <p className="text-xs text-[#57657A]">
              <strong>{studentName}</strong> ({studentId}) has been added to <strong>{mentorDept}</strong> and synced to Supabase.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Register Number */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Register Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 23CSEBS015"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] font-mono focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anandha Krishnan"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. anand.23csebs@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98401 23456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Department (Read-only, locked to mentor department) */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Authorized Department
                </label>
                <input
                  type="text"
                  disabled
                  value={`${mentorDept} (Locked to your authorized department)`}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] bg-[#EFEDF6] text-[#57657A] font-medium"
                />
              </div>

              {/* Academic Year */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] bg-white font-medium focus:outline-none focus:border-[#24389C]"
                >
                  {ACADEMIC_YEARS.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Host Organization (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Host Company (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zoho Corporation"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Role Title */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Internship Role / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer Intern"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>
            </div>

            {/* Scope Boundary Notice */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center space-x-2 text-[11px] text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                New student will be onboarded to <strong>{mentorDept}</strong> under faculty supervisor <strong>{currentUser.name}</strong>.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#E3E1EA] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#EFEDF6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#24389C] text-white hover:bg-[#1E2E80] disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span>Validating & Onboarding...</span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Complete Onboarding</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

