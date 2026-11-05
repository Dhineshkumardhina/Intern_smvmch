import React, { useState, useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Search, 
  Calendar, 
  Building2,
  ExternalLink,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { StudentRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';

interface MentorDashboardProps {
  currentUser: AuthUser;
  assignedStudents: StudentRecord[];
  onReviewStudent?: (studentId: string, remarks: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; icon: any }> = {
  onTrack: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2 },
  inProgress: { label: 'In Progress', bg: 'bg-indigo-50 text-indigo-800', border: 'border-indigo-200', icon: TrendingUp },
  delayed: { label: 'Delayed', bg: 'bg-amber-50 text-amber-800', border: 'border-amber-200', icon: Clock },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 text-rose-800', border: 'border-rose-200', icon: AlertTriangle },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700', border: 'border-slate-300', icon: Clock },
  completed: { label: 'Completed', bg: 'bg-teal-50 text-teal-800', border: 'border-teal-200', icon: CheckCircle2 },
};

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
  currentUser,
  assignedStudents,
  onReviewStudent,
}) => {
  const [filterYear, setFilterYear] = useState<string>('All Years');
  const [filterDept, setFilterDept] = useState<string>('All Departments');
  const [filterStatus, setFilterStatus] = useState<string>('All Status');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewModalStudent, setReviewModalStudent] = useState<StudentRecord | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Derive distinct departments represented among this mentor's assigned students
  const mentorDepartments = useMemo(() => {
    const set = new Set<string>();
    assignedStudents.forEach(s => {
      if (s.dept) set.add(s.dept.toUpperCase());
    });
    return Array.from(set);
  }, [assignedStudents]);

  // Scoped statistics calculated strictly on assignedStudents
  const stats = useMemo(() => {
    const total = assignedStudents.length;
    const onTrack = assignedStudents.filter(s => s.status === 'onTrack' || s.status === 'inProgress').length;
    const delayed = assignedStudents.filter(s => s.status === 'delayed').length;
    const blocked = assignedStudents.filter(s => s.status === 'blocked').length;
    const inactive = assignedStudents.filter(s => s.status === 'inactive').length;
    const completed = assignedStudents.filter(s => s.status === 'completed').length;
    return { total, onTrack, delayed, blocked, inactive, completed };
  }, [assignedStudents]);

  // Filter within this mentor's students only
  const filteredStudents = useMemo(() => {
    return assignedStudents.filter((s) => {
      if (filterYear !== 'All Years' && (s.year !== filterYear && s.academicYear !== filterYear)) return false;
      if (filterDept !== 'All Departments' && s.dept.toUpperCase() !== filterDept.toUpperCase() && s.departmentCode?.toUpperCase() !== filterDept.toUpperCase()) return false;
      if (filterStatus !== 'All Status') {
        const targetStatus = filterStatus.toLowerCase().replace(/\s+/g, '');
        const currentStatus = s.status.toLowerCase();
        if (targetStatus === 'ontrack' && currentStatus !== 'ontrack' && currentStatus !== 'inprogress') return false;
        if (targetStatus !== 'ontrack' && currentStatus !== targetStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          s.studentName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q) ||
          s.dept.toLowerCase().includes(q) ||
          s.work.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [assignedStudents, filterYear, filterDept, filterStatus, searchQuery]);

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalStudent) return;
    if (onReviewStudent) {
      onReviewStudent(reviewModalStudent.studentId, reviewRemarks);
    }
    setReviewSuccess(true);
    setTimeout(() => {
      setReviewSuccess(false);
      setReviewModalStudent(null);
      setReviewRemarks('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Mentor Identity & Scope Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              👨‍🏫 Faculty Mentor Workspace
            </span>
            <span className="text-xs text-[#57657A] font-mono">ID: {currentUser.id}</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A1B22] mt-1">
            {currentUser.name}
          </h2>
          <p className="text-xs text-[#57657A] mt-0.5">
            Department: <strong>{currentUser.dept}</strong> • Scope: <strong>Assigned Mentees Only ({assignedStudents.length} Students)</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#EFEDF6] px-3.5 py-2 rounded-xl text-xs text-[#57657A]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Strict Scoped View: <strong>Authorized for {currentUser.name} only</strong></span>
        </div>
      </div>

      {/* 6 Top Metric Cards (Calculated strictly from assigned students) */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div 
          onClick={() => { setFilterYear('All Years'); setFilterDept('All Departments'); setFilterStatus('All Status'); }}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-[#24389C] transition-all"
        >
          <div className="text-[11px] font-semibold text-[#57657A]">My Students</div>
          <div className="text-2xl font-bold text-[#1A1B22] mt-1">{stats.total}</div>
          <div className="text-[10px] text-[#57657A] mt-1">Assigned to you</div>
        </div>

        <div 
          onClick={() => setFilterStatus('On Track')}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-emerald-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-emerald-700">On Track</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.onTrack}</div>
          <div className="text-[10px] text-emerald-600 mt-1">Active progress</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Delayed')}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-amber-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-amber-700">Delayed</div>
          <div className="text-2xl font-bold text-amber-800 mt-1">{stats.delayed}</div>
          <div className="text-[10px] text-amber-600 mt-1">Slight lag</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Blocked')}
          className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm cursor-pointer hover:border-rose-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-rose-800">Blocked</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{stats.blocked}</div>
          <div className="text-[10px] text-rose-700 font-bold mt-1">Requires Help</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Inactive')}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-slate-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-slate-600">Inactive</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats.inactive}</div>
          <div className="text-[10px] text-slate-500 mt-1">No recent logs</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Completed')}
          className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm cursor-pointer hover:border-teal-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-teal-800">Completed</div>
          <div className="text-2xl font-bold text-teal-900 mt-1">{stats.completed}</div>
          <div className="text-[10px] text-teal-700 mt-1">Finished</div>
        </div>
      </div>

      {/* Mentor Department View (Restricted strictly to this mentor's students) */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E1EA] shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#57657A]">
            My Students by Department
          </span>
          {filterDept !== 'All Departments' && (
            <button 
              onClick={() => setFilterDept('All Departments')} 
              className="text-xs text-[#24389C] font-semibold hover:underline"
            >
              Reset Dept Filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {mentorDepartments.length === 0 ? (
            <span className="text-xs text-[#757684]">No assigned departments.</span>
          ) : (
            mentorDepartments.map((deptCode) => {
              const count = assignedStudents.filter(u => u.dept.toUpperCase() === deptCode.toUpperCase()).length;
              const isSelected = filterDept === deptCode;
              return (
                <button
                  key={deptCode}
                  onClick={() => setFilterDept(isSelected ? 'All Departments' : deptCode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isSelected 
                      ? 'bg-[#24389C] text-white border-[#24389C]' 
                      : 'bg-[#FBF8FF] text-[#1A1B22] border-[#E3E1EA] hover:border-[#24389C]'
                  }`}
                >
                  {deptCode} ({count} of {assignedStudents.length} Assigned)
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Year Classification Chips (Within this mentor's students only) */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E1EA] shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-[#57657A] mb-2.5">
          My Students by Academic Year
        </div>
        <div className="grid grid-cols-5 gap-2">
          {['All Years', ...ACADEMIC_YEARS].map((yr) => {
            const count = yr === 'All Years' 
              ? assignedStudents.length 
              : assignedStudents.filter(s => s.year === yr || s.academicYear === yr).length;
            const isSelected = filterYear === yr;
            return (
              <button
                key={yr}
                onClick={() => setFilterYear(yr)}
                className={`py-2 rounded-lg text-xs font-semibold text-center transition-all border ${
                  isSelected 
                    ? 'bg-[#24389C] text-white border-[#24389C]' 
                    : 'bg-[#FBF8FF] text-[#1A1B22] border-[#E3E1EA] hover:border-[#24389C]'
                }`}
              >
                {yr} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="font-bold text-lg text-[#1A1B22]">Assigned Mentees Stream</h3>
          <p className="text-xs text-[#57657A]">
            Showing {filteredStudents.length} of {assignedStudents.length} students assigned to {currentUser.name}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#757684] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search your mentees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E3E1EA] bg-white w-52 focus:outline-none focus:border-[#24389C]"
            />
          </div>
          {(filterYear !== 'All Years' || filterDept !== 'All Departments' || filterStatus !== 'All Status' || searchQuery) && (
            <button
              onClick={() => { setFilterYear('All Years'); setFilterDept('All Departments'); setFilterStatus('All Status'); setSearchQuery(''); }}
              className="text-xs font-semibold text-[#24389C] px-3 py-1.5 rounded-lg border border-[#E3E1EA] bg-white hover:bg-[#EFEDF6]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Student Cards Stream (Strictly this mentor's students) */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-[#E3E1EA] text-center space-y-2">
            <Users className="w-8 h-8 text-[#757684] mx-auto opacity-50" />
            <div className="text-sm font-semibold text-[#1A1B22]">No assigned students match the current filters.</div>
            <p className="text-xs text-[#57657A]">
              You only have visibility over students assigned specifically to your mentor account.
            </p>
          </div>
        ) : (
          filteredStudents.map((st) => {
            const config = STATUS_CONFIG[st.status] || STATUS_CONFIG.onTrack;
            const Icon = config.icon;
            return (
              <div key={st.id} className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm space-y-3 hover:border-[#24389C] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#DEE0FF] text-[#00105C] flex items-center justify-center font-bold text-sm">
                      {st.studentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          🎓 Mentee
                        </span>
                        <h4 className="font-bold text-sm text-[#1A1B22]">{st.studentName}</h4>
                        <span className="text-xs text-[#57657A]">({st.studentId})</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${config.bg} border ${config.border} flex items-center space-x-1`}>
                          <Icon className="w-2.5 h-2.5" />
                          <span>{config.label}</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#57657A] mt-1 flex items-center space-x-2 flex-wrap">
                        <span>Dept: <strong>{st.dept}</strong> ({st.year})</span>
                        <span>•</span>
                        <span>Host: <strong>{st.company}</strong></span>
                        <span>•</span>
                        <span>Role: <strong>{st.role || 'Intern'}</strong></span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-[#757684]">{st.time || 'Today'}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#FBF8FF] border border-[#E3E1EA] text-xs text-[#1A1B22]">
                  <div className="font-medium text-[#57657A] mb-1">Latest Logged Update:</div>
                  <p>{st.work}</p>
                  {st.blocker && (
                    <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Blocker: {st.blocker}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[#57657A]">
                  <div className="flex items-center space-x-3 w-1/2">
                    <span>Progress: {st.progress}%</span>
                    <div className="w-full bg-[#EFEDF6] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${st.status === 'blocked' ? 'bg-rose-600' : 'bg-[#24389C]'}`} 
                        style={{ width: `${st.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setReviewModalStudent(st);
                      setReviewRemarks('');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#24389C] text-white hover:bg-[#1E2E80] flex items-center space-x-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Review & Remark</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Feedback Modal */}
      {reviewModalStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#E3E1EA] shadow-2xl">
            <h3 className="text-lg font-bold text-[#1A1B22] mb-1">
              Provide Faculty Remarks
            </h3>
            <p className="text-xs text-[#57657A] mb-4">
              Mentee: <strong>{reviewModalStudent.studentName}</strong> ({reviewModalStudent.studentId}) • {reviewModalStudent.company}
            </p>

            {reviewSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Remarks recorded and synced to student!</span>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                    Faculty Remarks / Guidance <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="Enter review feedback, guidance on blockers, or approval notes..."
                    rows={4}
                    className="w-full p-3 text-xs rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                    required
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalStudent(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#EFEDF6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#24389C] text-white hover:bg-[#1E2E80]"
                  >
                    Send Remarks
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
