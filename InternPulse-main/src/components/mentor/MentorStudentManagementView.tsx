import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  Eye, 
  Briefcase, 
  Power, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StudentRecord } from '../../data/initialData';
import { AuthUser } from '../../core/auth/authUser';
import { StudentProfileModal } from './StudentProfileModal';
import { StudentOnboardingModal } from './StudentOnboardingModal';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import { InternshipAssignmentModal } from './InternshipAssignmentModal';
import { internshipRepository } from '../../core/repository/internshipRepository';

interface MentorStudentManagementViewProps {
  currentUser: AuthUser;
  scopedStudents: StudentRecord[];
  onRefreshData?: () => void;
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

export const MentorStudentManagementView: React.FC<MentorStudentManagementViewProps> = ({
  currentUser,
  scopedStudents,
  onRefreshData,
}) => {
  const mentorDept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('All Years');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterAccountStatus, setFilterAccountStatus] = useState('All');

  // Modals state
  const [profileModalStudent, setProfileModalStudent] = useState<StudentRecord | null>(null);
  const [assignmentModalStudent, setAssignmentModalStudent] = useState<StudentRecord | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => setActionToast(null), 3000);
  };

  // Scoped Department Metric Cards
  const stats = useMemo(() => {
    const total = scopedStudents.length;
    const active = scopedStudents.filter(s => (s.accountStatus || 'active') === 'active').length;
    const deactivated = scopedStudents.filter(s => s.accountStatus === 'inactive' || s.accountStatus === 'suspended').length;
    const unassigned = scopedStudents.filter(s => s.company === 'Not Assigned' || s.company === 'Unassigned').length;
    const completed = scopedStudents.filter(s => s.status === 'completed').length;
    const atRisk = scopedStudents.filter(s => s.status === 'blocked' || s.status === 'delayed').length;
    return { total, active, deactivated, unassigned, completed, atRisk };
  }, [scopedStudents]);

  // Filtered Students Stream
  const filteredStudents = useMemo(() => {
    return scopedStudents.filter(s => {
      if (filterYear !== 'All Years' && s.academicYear !== filterYear && s.year !== filterYear) {
        return false;
      }
      if (filterStatus !== 'All Status') {
        const target = filterStatus.toLowerCase().replace(/\s+/g, '');
        const current = s.status.toLowerCase();
        if (target === 'ontrack' && current !== 'ontrack' && current !== 'inprogress') return false;
        if (target !== 'ontrack' && current !== target) return false;
      }
      if (filterAccountStatus !== 'All') {
        const sAccount = s.accountStatus || 'active';
        if (sAccount !== filterAccountStatus.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          s.studentName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q)) ||
          s.company.toLowerCase().includes(q) ||
          (s.role && s.role.toLowerCase().includes(q)) ||
          s.mentor.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [scopedStudents, filterYear, filterStatus, filterAccountStatus, searchQuery]);

  // Toggle Activation
  const handleToggleActivation = async (student: StudentRecord) => {
    const current = student.accountStatus || 'active';
    const nextStatus = current === 'active' ? 'inactive' : 'active';
    try {
      await internshipRepository.setStudentAccountStatus(student.studentId, nextStatus, currentUser);
      showToast(
        nextStatus === 'active' 
          ? `Student ${student.studentName} has been activated.` 
          : `Student ${student.studentName} has been deactivated.`
      );
      if (onRefreshData) onRefreshData();
      if (profileModalStudent?.studentId === student.studentId) {
        setProfileModalStudent(prev => prev ? { ...prev, accountStatus: nextStatus } : null);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update student activation status.', 'error');
    }
  };

  // Handle Onboard Student Submit
  const handleOnboardSubmit = async (data: Omit<StudentRecord, 'id'>) => {
    await internshipRepository.onboardStudent(data, currentUser);
    showToast(`Student ${data.studentName} onboarded successfully!`);
    if (onRefreshData) onRefreshData();
  };

  // Handle Bulk Commit
  const handleBulkCommit = async (validStudents: Array<Omit<StudentRecord, 'id'>>) => {
    const result = await internshipRepository.bulkImportStudents(validStudents, currentUser);
    showToast(`Successfully imported ${result.count} students!`);
    if (onRefreshData) onRefreshData();
    return result;
  };

  // Handle Assignment Submit
  const handleAssignSubmit = async (assignment: any) => {
    await internshipRepository.assignInternship(assignment, currentUser);
    showToast(`Internship placement for ${assignment.company} assigned!`);
    if (onRefreshData) onRefreshData();
  };

  // Export CSV of currently filtered students
  const handleExportCsv = () => {
    const headers = ['Register Number,Student Name,Email,Phone,Department,Academic Year,Host Company,Role,Faculty Mentor,Status,Account Status,Progress,Hours'];
    const rows = filteredStudents.map(s => 
      `"${s.studentId}","${s.studentName}","${s.email || ''}","${s.phone || ''}","${s.dept || s.departmentCode}","${s.academicYear || s.year}","${s.company}","${s.role || 'Intern'}","${s.mentor}","${s.status}","${s.accountStatus || 'active'}","${s.progress}%","${s.hours}"`
    );
    const content = [headers, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SMVEC_${mentorDept}_Students_Registry_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {actionToast && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all ${
          actionToast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center space-x-2">
            {actionToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionToast.message}</span>
          </div>
          <button onClick={() => setActionToast(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Top Action Bar & Scoped Context */}
      <div className="bg-white rounded-2xl p-5 border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
              Department Cohort & Roster
            </span>
            <span className="text-xs text-[#57657A] font-semibold">Scope: <strong>{mentorDept} Department</strong></span>
          </div>
          <h3 className="text-lg font-bold text-[#1A1B22] mt-1">
            Student Lifecycle & Internship Management
          </h3>
          <p className="text-xs text-[#57657A]">
            Onboard, inspect profiles, configure internship assignments, and monitor mentee progress.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#24389C] text-white hover:bg-[#1E2E80] flex items-center space-x-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard Student</span>
          </button>

          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#E3E1EA] bg-[#FBF8FF] text-[#1A1B22] hover:border-[#24389C] flex items-center space-x-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#24389C]" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="p-2 rounded-xl text-xs font-semibold border border-[#E3E1EA] text-[#57657A] hover:bg-[#EFEDF6]"
            title="Export filtered student roster as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5 High-Level Scoped Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => { setFilterYear('All Years'); setFilterStatus('All Status'); setFilterAccountStatus('All'); setSearchQuery(''); }}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-[#24389C] transition-all"
        >
          <div className="text-[11px] font-semibold text-[#57657A]">Total in Scope</div>
          <div className="text-2xl font-bold text-[#1A1B22] mt-1">{stats.total}</div>
          <div className="text-[10px] text-[#57657A] mt-1">{mentorDept} Students</div>
        </div>

        <div 
          onClick={() => setFilterAccountStatus('active')}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-emerald-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-emerald-700">Active Accounts</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.active}</div>
          <div className="text-[10px] text-emerald-600 mt-1">Authorized logins</div>
        </div>

        <div 
          onClick={() => setFilterStatus('On Track')}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-indigo-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-indigo-700">Internship Active</div>
          <div className="text-2xl font-bold text-indigo-800 mt-1">{scopedStudents.filter(s => s.status === 'onTrack' || s.status === 'inProgress').length}</div>
          <div className="text-[10px] text-indigo-600 mt-1">Placement confirmed</div>
        </div>

        <div 
          onClick={() => setFilterAccountStatus('inactive')}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-slate-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-slate-600">Deactivated</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats.deactivated}</div>
          <div className="text-[10px] text-slate-500 mt-1">Access suspended</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Blocked')}
          className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm cursor-pointer hover:border-rose-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-rose-800">At-Risk / Blocked</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{stats.atRisk}</div>
          <div className="text-[10px] text-rose-700 font-bold mt-1">Needs guide support</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 flex-wrap gap-y-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#757684] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, register number, company, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] w-full focus:outline-none focus:border-[#24389C]"
            />
          </div>

          {/* Department Filter (Restricted to Authorized Mentor Department) */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-[#57657A] font-semibold">Dept:</span>
            <select
              disabled
              value={mentorDept}
              className="p-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#EFEDF6] text-[#57657A] font-bold cursor-not-allowed"
              title="Mentors can only manage their authorized department"
            >
              <option value={mentorDept}>{mentorDept} (Authorized Scope)</option>
            </select>
          </div>

          {/* Academic Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="p-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] font-medium"
          >
            <option value="All Years">All Years</option>
            {ACADEMIC_YEARS.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          {/* Progress Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] font-medium"
          >
            <option value="All Status">All Statuses</option>
            <option value="On Track">On Track</option>
            <option value="In Progress">In Progress</option>
            <option value="Delayed">Delayed</option>
            <option value="Blocked">Blocked</option>
            <option value="Inactive">Inactive</option>
            <option value="Completed">Completed</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={filterAccountStatus}
            onChange={(e) => setFilterAccountStatus(e.target.value)}
            className="p-1.5 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] font-medium"
          >
            <option value="All">All Accounts</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>
        </div>

        {(searchQuery || filterYear !== 'All Years' || filterStatus !== 'All Status' || filterAccountStatus !== 'All') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterYear('All Years');
              setFilterStatus('All Status');
              setFilterAccountStatus('All');
            }}
            className="text-xs font-semibold text-[#24389C] px-3 py-1.5 rounded-lg border border-[#E3E1EA] hover:bg-[#EFEDF6]"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Student Listing Table */}
      <div className="bg-white rounded-2xl border border-[#E3E1EA] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E3E1EA] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#24389C]" />
            <h4 className="font-bold text-sm text-[#1A1B22]">
              {mentorDept} Student Interns Registry
            </h4>
          </div>
          <span className="text-xs text-[#57657A]">
            Showing <strong>{filteredStudents.length}</strong> of {scopedStudents.length} students
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#757684] mx-auto opacity-50" />
            <div className="text-sm font-semibold text-[#1A1B22]">No students match the current filters.</div>
            <p className="text-xs text-[#57657A]">
              Try adjusting your search query or reset the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EFEDF6] text-[#57657A] font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Student Intern</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Year & Dept</th>
                  <th className="p-3">Host Placement</th>
                  <th className="p-3">Faculty Guide</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E1EA]">
                {filteredStudents.map(student => {
                  const config = STATUS_CONFIG[student.status] || STATUS_CONFIG.onTrack;
                  const isAccountActive = (student.accountStatus || 'active') === 'active';
                  const isMyMentee = student.mentorId?.toLowerCase() === (currentUser.mentorId || currentUser.id).toLowerCase() ||
                                     student.mentor.toLowerCase() === currentUser.name.toLowerCase();

                  return (
                    <tr key={student.id} className="hover:bg-[#FBF8FF] transition-colors">
                      {/* Student Name & Register Number */}
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#DEE0FF] text-[#00105C] flex items-center justify-center font-bold text-xs shrink-0">
                            {student.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#1A1B22] flex items-center space-x-1.5">
                              <span>{student.studentName}</span>
                              {isMyMentee && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                                  My Mentee
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-[#57657A]">{student.studentId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-3 text-[11px]">
                        <div className="flex items-center space-x-1 text-[#57657A] font-mono">
                          <Mail className="w-3 h-3 text-[#757684]" />
                          <span className="truncate max-w-[130px]">{student.email || 'None'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-[#57657A] mt-0.5">
                          <Phone className="w-3 h-3 text-[#757684]" />
                          <span>{student.phone || '+91 98401 00000'}</span>
                        </div>
                      </td>

                      {/* Year & Dept */}
                      <td className="p-3">
                        <div className="font-bold text-[#1A1B22]">{student.dept || student.departmentCode}</div>
                        <div className="text-[11px] text-[#57657A]">{student.academicYear || student.year}</div>
                      </td>

                      {/* Host Company & Role */}
                      <td className="p-3">
                        <div className="font-semibold text-[#1A1B22] flex items-center space-x-1">
                          <Building2 className="w-3 h-3 text-[#24389C]" />
                          <span className="truncate max-w-[130px]">{student.company}</span>
                        </div>
                        <div className="text-[11px] text-[#57657A] truncate max-w-[130px]">{student.role || 'Intern'}</div>
                      </td>

                      {/* Faculty Guide */}
                      <td className="p-3 font-medium text-[#1A1B22]">
                        <span className="text-xs">{student.mentor}</span>
                      </td>

                      {/* Account Status Badge */}
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAccountActive
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {isAccountActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-[#EFEDF6] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${student.status === 'blocked' ? 'bg-rose-600' : 'bg-[#24389C]'}`}
                              style={{ width: `${student.progress}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px] text-[#1A1B22]">{student.progress}%</span>
                        </div>
                        <div className="text-[10px] text-[#57657A] mt-0.5 font-medium">{student.hours} hrs logged</div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* View Profile */}
                          <button
                            onClick={() => setProfileModalStudent(student)}
                            className="p-1.5 rounded-lg border border-[#E3E1EA] text-[#57657A] hover:text-[#24389C] hover:bg-[#EFEDF6]"
                            title="View student profile details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Assign Internship */}
                          <button
                            onClick={() => setAssignmentModalStudent(student)}
                            className="p-1.5 rounded-lg border border-[#E3E1EA] text-[#57657A] hover:text-[#24389C] hover:bg-[#EFEDF6]"
                            title="Assign or update internship placement"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Activation */}
                          <button
                            onClick={() => handleToggleActivation(student)}
                            className={`p-1.5 rounded-lg border ${
                              isAccountActive 
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50' 
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isAccountActive ? 'Deactivate student account' : 'Activate student account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Student Profile Modal */}
      <StudentProfileModal
        isOpen={!!profileModalStudent}
        student={profileModalStudent}
        currentUser={currentUser}
        onClose={() => setProfileModalStudent(null)}
        onToggleActivation={handleToggleActivation}
        onOpenAssignment={(st) => setAssignmentModalStudent(st)}
      />

      {/* 2. Student Onboarding Modal */}
      <StudentOnboardingModal
        isOpen={isOnboardingOpen}
        currentUser={currentUser}
        onClose={() => setIsOnboardingOpen(false)}
        onSubmit={handleOnboardSubmit}
        existingStudents={scopedStudents}
      />

      {/* 3. Bulk CSV Import Modal */}
      <BulkStudentImportModal
        isOpen={isBulkImportOpen}
        currentUser={currentUser}
        existingStudents={scopedStudents}
        onClose={() => setIsBulkImportOpen(false)}
        onImportSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
        onCommitImport={handleBulkCommit}
      />

      {/* 4. Internship Assignment Modal */}
      <InternshipAssignmentModal
        isOpen={!!assignmentModalStudent}
        student={assignmentModalStudent}
        currentUser={currentUser}
        onClose={() => setAssignmentModalStudent(null)}
        onAssign={handleAssignSubmit}
      />

    </div>
  );
};

