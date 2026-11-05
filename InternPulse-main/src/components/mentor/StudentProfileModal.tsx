import React from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  User, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Briefcase, 
  CheckCircle2,
  TrendingUp,
  MapPin,
  Power
} from 'lucide-react';
import { StudentRecord } from '../../data/initialData';
import { AuthUser } from '../../core/auth/authUser';

interface StudentProfileModalProps {
  isOpen: boolean;
  student: StudentRecord | null;
  currentUser: AuthUser;
  onClose: () => void;
  onToggleActivation?: (student: StudentRecord) => void;
  onOpenAssignment?: (student: StudentRecord) => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; icon: any }> = {
  onTrack: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2 },
  inProgress: { label: 'In Progress', bg: 'bg-indigo-50 text-indigo-800', border: 'border-indigo-200', icon: TrendingUp },
  delayed: { label: 'Delayed', bg: 'bg-amber-50 text-amber-800', border: 'border-amber-200', icon: Clock },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 text-rose-800', border: 'border-rose-200', icon: AlertTriangle },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700', border: 'border-slate-300', icon: Clock },
  completed: { label: 'Completed', bg: 'bg-teal-50 text-teal-800', border: 'border-teal-200', icon: CheckCircle2 },
};

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  student,
  currentUser,
  onClose,
  onToggleActivation,
  onOpenAssignment,
}) => {
  if (!isOpen || !student) return null;

  const config = STATUS_CONFIG[student.status] || STATUS_CONFIG.onTrack;
  const StatusIcon = config.icon;
  const isAccountActive = (student.accountStatus || 'active') === 'active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E3E1EA] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Banner */}
        <div className="p-6 bg-[#24389C] text-white flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xl text-white">
              {student.studentName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-xl font-bold text-white">{student.studentName}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20 text-white font-semibold">
                  {student.studentId}
                </span>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${isAccountActive ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'}`}>
                  {isAccountActive ? '● Active Account' : '○ Deactivated'}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-1 flex items-center space-x-2">
                <span>{student.dept || student.departmentCode} Department</span>
                <span>•</span>
                <span>{student.academicYear || student.year}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-[#1A1B22]">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FBF8FF] border border-[#E3E1EA]">
              <div className="text-[11px] text-[#57657A] font-medium">Internship Status</div>
              <div className="flex items-center space-x-1.5 mt-1 font-bold">
                <StatusIcon className="w-4 h-4 text-[#24389C]" />
                <span className="text-sm">{config.label}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FBF8FF] border border-[#E3E1EA]">
              <div className="text-[11px] text-[#57657A] font-medium">Progress Metric</div>
              <div className="text-sm font-bold mt-1 text-[#24389C]">
                {student.progress}% Completed
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FBF8FF] border border-[#E3E1EA]">
              <div className="text-[11px] text-[#57657A] font-medium">Hours Logged</div>
              <div className="text-sm font-bold mt-1 text-emerald-700">
                {student.hours} Hours
              </div>
            </div>
          </div>

          {/* Section 1: Contact & Personal Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#57657A] flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-[#24389C]" />
              <span>Contact & Student Profile</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FBF8FF] border border-[#E3E1EA]">
              <div>
                <span className="text-[#57657A] block text-[11px]">Email Address</span>
                <div className="flex items-center space-x-1.5 mt-0.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-[#757684]" />
                  <span className="font-mono">{student.email || 'Not specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-[#57657A] block text-[11px]">Phone Number</span>
                <div className="flex items-center space-x-1.5 mt-0.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-[#757684]" />
                  <span>{student.phone || '+91 98401 00000'}</span>
                </div>
              </div>

              <div>
                <span className="text-[#57657A] block text-[11px]">Authorized Department</span>
                <span className="font-bold mt-0.5 block">{student.dept || student.departmentCode}</span>
              </div>

              <div>
                <span className="text-[#57657A] block text-[11px]">Assigned Faculty Mentor</span>
                <span className="font-bold mt-0.5 block text-[#24389C]">{student.mentor}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Internship Placement Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#57657A] flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#24389C]" />
              <span>Internship Assignment & Work</span>
            </h4>

            <div className="p-4 rounded-2xl bg-[#FBF8FF] border border-[#E3E1EA] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[#57657A] block text-[11px]">Host Organization</span>
                  <div className="flex items-center space-x-1.5 mt-0.5 font-bold text-sm">
                    <Building2 className="w-4 h-4 text-[#24389C]" />
                    <span>{student.company}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#57657A] block text-[11px]">Designated Role / Title</span>
                  <span className="font-bold mt-0.5 block">{student.role || 'Intern'}</span>
                </div>

                {student.internshipStartDate && (
                  <div>
                    <span className="text-[#57657A] block text-[11px]">Duration</span>
                    <div className="flex items-center space-x-1.5 mt-0.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#757684]" />
                      <span>{student.internshipStartDate} → {student.internshipEndDate || 'Ongoing'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Latest Logged Update */}
              <div className="pt-2 border-t border-[#E3E1EA]">
                <span className="text-[#57657A] font-medium block mb-1">Latest Logged Submission:</span>
                <p className="p-3 bg-white rounded-xl border border-[#E3E1EA] text-xs">
                  {student.work}
                </p>
                {student.blocker && (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Blocker Reported: {student.blocker}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Mentor Governance Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-indigo-900 leading-relaxed">
              <strong>Authorized Faculty Oversight:</strong> You have authorization to manage this student because they are in your department (<strong>{student.dept}</strong>) or assigned to your mentorship cohort.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F4F2FA] border-t border-[#E3E1EA] flex items-center justify-between gap-3">
          {onToggleActivation && (
            <button
              onClick={() => onToggleActivation(student)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                isAccountActive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isAccountActive ? 'Deactivate Student' : 'Activate Student'}</span>
            </button>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            {onOpenAssignment && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAssignment(student);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#24389C] text-white hover:bg-[#1E2E80] flex items-center space-x-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Assign Internship</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#E3E1EA]"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

