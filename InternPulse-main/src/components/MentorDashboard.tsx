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
  MessageSquare, 
  Download,
  X,
  ChevronDown
} from 'lucide-react';
import { StudentRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';
import { MentorStudentManagementView } from './mentor/MentorStudentManagementView';
import { MentorAttendanceOverview } from './mentor/MentorAttendanceOverview';
import { internshipRepository } from '../core/repository/internshipRepository';
import { InstitutionalReportExportModal } from './analytics/InstitutionalReportExportModal';

interface MentorDashboardProps {
  currentUser: AuthUser;
  assignedStudents: StudentRecord[];
  scopedStudents?: StudentRecord[];
  onReviewStudent?: (studentId: string, remarks: string) => void;
  onRefreshData?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; icon: any }> = {
  onTrack: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  inProgress: { label: 'In Progress', bg: 'bg-blue-50 text-blue-700', border: 'border-blue-200', icon: TrendingUp },
  delayed: { label: 'Delayed', bg: 'bg-amber-50 text-amber-700', border: 'border-amber-200', icon: Clock },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 text-rose-700', border: 'border-rose-200', icon: AlertTriangle },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700', border: 'border-slate-300', icon: Clock },
  completed: { label: 'Completed', bg: 'bg-teal-50 text-teal-700', border: 'border-teal-200', icon: CheckCircle2 },
};

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
  currentUser,
  assignedStudents,
  scopedStudents,
  onReviewStudent,
  onRefreshData,
}) => {
  const [mentorActiveTab, setMentorActiveTab] = useState<'stream' | 'management' | 'attendance'>('stream');
  const [filterYear, setFilterYear] = useState<string>('All Years');
  const [filterDept, setFilterDept] = useState<string>('All Departments');
  const [filterStatus, setFilterStatus] = useState<string>('All Status');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewModalStudent, setReviewModalStudent] = useState<StudentRecord | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const mentorDept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';

  // Scoped students within mentor's authorized department or assigned scope
  const effectiveScopedStudents = useMemo(() => {
    if (scopedStudents && scopedStudents.length > 0) return scopedStudents;
    return internshipRepository.getStudentsForMentorScope(currentUser.id, mentorDept, currentUser);
  }, [scopedStudents, currentUser, mentorDept]);

  // Scoped attendance sessions
  const attendanceSessions = useMemo(() => {
    return internshipRepository.getAttendanceSessionsForScope(currentUser.id, mentorDept, currentUser);
  }, [currentUser, mentorDept]);

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
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Faculty Mentor
            </span>
            <span className="text-xs text-slate-400">ID: {currentUser.id}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {currentUser.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Department of {currentUser.dept || 'Engineering'} • <strong>{assignedStudents.length} Assigned Mentees</strong>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Cohort Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-fit">
        <button
          onClick={() => setMentorActiveTab('stream')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 ${
            mentorActiveTab === 'stream'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span>Mentee Overview</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold ml-1">
            {assignedStudents.length}
          </span>
        </button>

        <button
          onClick={() => setMentorActiveTab('management')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 ${
            mentorActiveTab === 'management'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>Student Directory</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold ml-1">
            {effectiveScopedStudents.length}
          </span>
        </button>

        <button
          onClick={() => setMentorActiveTab('attendance')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 ${
            mentorActiveTab === 'attendance'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Attendance & Verification</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold ml-1">
            {attendanceSessions.length}
          </span>
        </button>
      </div>

      {/* TAB 2: STUDENT DIRECTORY */}
      {mentorActiveTab === 'management' && (
        <MentorStudentManagementView
          currentUser={currentUser}
          scopedStudents={effectiveScopedStudents}
          onRefreshData={onRefreshData}
        />
      )}

      {/* TAB 3: ATTENDANCE OVERVIEW */}
      {mentorActiveTab === 'attendance' && (
        <MentorAttendanceOverview
          currentUser={currentUser}
          attendanceSessions={attendanceSessions}
          onVerifySession={async (sessId, isVer, rem) => {
            await internshipRepository.verifyAttendanceSession(sessId, isVer, rem, currentUser);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* TAB 1: MENTEE PROGRESS STREAM */}
      {mentorActiveTab === 'stream' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div 
              onClick={() => { setFilterYear('All Years'); setFilterDept('All Departments'); setFilterStatus('All Status'); }}
              className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${filterStatus === 'All Status' ? 'border-blue-600 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="text-xs font-medium text-slate-500">Total Mentees</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Assigned cohort</div>
            </div>

            <div 
              onClick={() => setFilterStatus(filterStatus === 'On Track' ? 'All Status' : 'On Track')}
              className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${filterStatus === 'On Track' ? 'border-emerald-600 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-emerald-300'}`}
            >
              <div className="text-xs font-medium text-emerald-700">On Track</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.onTrack}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Consistent progress</div>
            </div>

            <div 
              onClick={() => setFilterStatus(filterStatus === 'Delayed' ? 'All Status' : 'Delayed')}
              className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${filterStatus === 'Delayed' ? 'border-amber-600 ring-2 ring-amber-500/10' : 'border-slate-200 hover:border-amber-300'}`}
            >
              <div className="text-xs font-medium text-amber-700">Delayed</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{stats.delayed}</div>
              <div className="text-[11px] text-amber-600 mt-0.5">Pending milestone</div>
            </div>

            <div 
              onClick={() => setFilterStatus(filterStatus === 'Blocked' ? 'All Status' : 'Blocked')}
              className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${filterStatus === 'Blocked' ? 'border-rose-600 ring-2 ring-rose-500/10' : 'border-slate-200 hover:border-rose-300'}`}
            >
              <div className="text-xs font-medium text-rose-700">Blocked</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">{stats.blocked}</div>
              <div className="text-[11px] text-rose-600 mt-0.5 font-medium">Needs assistance</div>
            </div>

            <div 
              onClick={() => setFilterStatus(filterStatus === 'Completed' ? 'All Status' : 'Completed')}
              className={`p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${filterStatus === 'Completed' ? 'border-teal-600 ring-2 ring-teal-500/10' : 'border-slate-200 hover:border-teal-300'}`}
            >
              <div className="text-xs font-medium text-teal-700">Completed</div>
              <div className="text-2xl font-bold text-teal-700 mt-1">{stats.completed}</div>
              <div className="text-[11px] text-teal-600 mt-0.5">Term concluded</div>
            </div>
          </div>

          {/* Integrated Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search mentees by name, ID, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="All Years">All Years</option>
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              {mentorDepartments.length > 1 && (
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="All Departments">All Departments</option>
                  {mentorDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}

              {(filterYear !== 'All Years' || filterDept !== 'All Departments' || filterStatus !== 'All Status' || searchQuery) && (
                <button
                  onClick={() => { setFilterYear('All Years'); setFilterDept('All Departments'); setFilterStatus('All Status'); setSearchQuery(''); }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Student Cards Stream */}
          <div className="space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-800">No assigned students match the current filters.</div>
                <p className="text-xs text-slate-500">
                  Try adjusting the search query or status filter above.
                </p>
              </div>
            ) : (
              filteredStudents.map((st) => {
                const config = STATUS_CONFIG[st.status] || STATUS_CONFIG.onTrack;
                const Icon = config.icon;
                return (
                  <div key={st.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-100">
                          {st.studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-slate-900">{st.studentName}</h4>
                            <span className="text-xs text-slate-400 font-mono">({st.studentId})</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${config.bg} border ${config.border} flex items-center space-x-1`}>
                              <Icon className="w-3 h-3" />
                              <span>{config.label}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                            <span>{st.dept} Dept ({st.year})</span>
                            <span>•</span>
                            <span className="font-medium text-slate-700">Host: {st.company}</span>
                            <span>•</span>
                            <span>Role: {st.role || 'Intern'}</span>
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-slate-400">{st.time || 'Today'}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs text-slate-800">
                      <div className="font-medium text-slate-500 mb-1">Latest Logged Update:</div>
                      <p className="leading-relaxed">{st.work}</p>
                      {st.blocker && (
                        <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center space-x-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Blocker: {st.blocker}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-3 w-1/2">
                        <span className="font-medium">Progress: {st.progress}%</span>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${st.status === 'blocked' ? 'bg-rose-600' : 'bg-blue-600'}`} 
                            style={{ width: `${st.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setReviewModalStudent(st);
                          setReviewRemarks('');
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-1.5 shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Review & Feedback</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Review Feedback Modal */}
      {reviewModalStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Provide Feedback for {reviewModalStudent.studentName}
              </h3>
              <button 
                onClick={() => setReviewModalStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              ID: <span className="font-mono text-slate-700">{reviewModalStudent.studentId}</span> • Host: <span className="font-medium text-slate-700">{reviewModalStudent.company}</span>
            </p>

            {reviewSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm font-semibold flex items-center space-x-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Remarks successfully recorded and sent to mentee.</span>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Faculty Remarks / Recommendations <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="Enter actionable guidance, approvals, or answers to blockers..."
                    rows={4}
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
                    required
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalStudent(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    Send Remarks
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <InstitutionalReportExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentUser={currentUser}
          defaultReportType="attendance_master"
        />
      )}
    </div>
  );
};
