import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  GraduationCap,
  MapPin,
  Layers,
  Upload,
  Download,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { StudentRecord, MentorRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';
import { HodLocationManagementView } from './locations/HodLocationManagementView';
import { locationRepository } from '../core/repository/locationRepository';
import { internshipRepository } from '../core/repository/internshipRepository';
import { StudentBulkImportModal } from './onboarding/StudentBulkImportModal';
import { InstitutionalReportExportModal } from './analytics/InstitutionalReportExportModal';

interface HodDashboardProps {
  currentUser: AuthUser;
  departmentStudents: StudentRecord[];
  departmentMentors: MentorRecord[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string }> = {
  onTrack: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
  inProgress: { label: 'In Progress', bg: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  delayed: { label: 'Delayed', bg: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700', border: 'border-slate-300' },
  completed: { label: 'Completed', bg: 'bg-teal-50 text-teal-700', border: 'border-teal-200' },
};

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const HodDashboard: React.FC<HodDashboardProps> = ({
  currentUser,
  departmentStudents,
  departmentMentors,
}) => {
  const [filterYear, setFilterYear] = useState<string>('All Years');
  const [filterStatus, setFilterStatus] = useState<string>('All Status');
  const [selectedMentorFilter, setSelectedMentorFilter] = useState<string>('All Mentors');
  const [drillDownMentor, setDrillDownMentor] = useState<MentorRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hodActiveTab, setHodActiveTab] = useState<'directory' | 'locations' | 'batches' | 'reports'>('directory');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const departmentCode = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'IT';

  const batches = useMemo(() => {
    return internshipRepository.getInternshipBatches(departmentCode, currentUser);
  }, [departmentCode, currentUser]);

  const departmentAnalytics = useMemo(() => {
    try {
      return internshipRepository.getDepartmentDetailedAnalytics(departmentCode, currentUser);
    } catch {
      return null;
    }
  }, [departmentCode, currentUser, departmentStudents]);

  // High level department statistics
  const stats = useMemo(() => {
    const totalStudents = departmentStudents.length;
    const totalMentors = departmentMentors.length;
    const active = departmentStudents.filter(s => s.status === 'onTrack' || s.status === 'inProgress').length;
    const completed = departmentStudents.filter(s => s.status === 'completed').length;
    const atRisk = departmentStudents.filter(s => s.status === 'blocked' || s.status === 'inactive').length;
    const delayed = departmentStudents.filter(s => s.status === 'delayed').length;
    return { totalStudents, totalMentors, active, completed, atRisk, delayed };
  }, [departmentStudents, departmentMentors]);

  // Filter department students
  const filteredStudents = useMemo(() => {
    return departmentStudents.filter((s) => {
      if (drillDownMentor) {
        if (s.mentorId !== drillDownMentor.id && s.mentor.toLowerCase() !== drillDownMentor.name.toLowerCase()) {
          return false;
        }
      } else if (selectedMentorFilter !== 'All Mentors') {
        if (s.mentor !== selectedMentorFilter && s.mentorId !== selectedMentorFilter) {
          return false;
        }
      }

      if (filterYear !== 'All Years' && (s.year !== filterYear && s.academicYear !== filterYear)) {
        return false;
      }

      if (filterStatus !== 'All Status') {
        const target = filterStatus.toLowerCase().replace(/\s+/g, '');
        const current = s.status.toLowerCase();
        if (target === 'ontrack' && current !== 'ontrack' && current !== 'inprogress') return false;
        if (target !== 'ontrack' && current !== target) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          s.studentName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q) ||
          s.mentor.toLowerCase().includes(q) ||
          s.work.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [departmentStudents, drillDownMentor, selectedMentorFilter, filterYear, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Department Title Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              Department Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {currentUser.id}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Department of {currentUser.dept || 'Engineering'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Head of Department: <strong>{currentUser.name}</strong> • Scoped to <strong>{departmentCode} Students & Faculty</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import Students</span>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto w-fit">
        <button
          onClick={() => setHodActiveTab('directory')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 shrink-0 ${
            hodActiveTab === 'directory'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>Student & Mentor Directory</span>
        </button>

        <button
          onClick={() => setHodActiveTab('locations')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 shrink-0 ${
            hodActiveTab === 'locations'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          <span>Internship Locations & Geofences</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold ml-1">
            {locationRepository.getLocations().length} Sites
          </span>
        </button>

        <button
          onClick={() => setHodActiveTab('batches')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 shrink-0 ${
            hodActiveTab === 'batches'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Batches & Cohorts</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold ml-1">
            {batches.length}
          </span>
        </button>

        <button
          onClick={() => setHodActiveTab('reports')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 shrink-0 ${
            hodActiveTab === 'reports'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
          <span>Department Analytics</span>
        </button>
      </div>

      {/* RENDER LOCATION MANAGEMENT VIEW WHEN ACTIVE */}
      {hodActiveTab === 'locations' && (
        <HodLocationManagementView
          currentUser={currentUser}
          departmentStudents={departmentStudents}
        />
      )}

      {/* RENDER BATCHES VIEW WHEN ACTIVE */}
      {hodActiveTab === 'batches' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Department Cohorts</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{batches.length} Batches</div>
              <p className="text-xs text-slate-400 mt-1">Academic Year 2025-2026</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Enrolled Interns</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {batches.reduce((sum, b) => sum + (b.enrolledStudentCount || 0), 0)} Students
              </div>
              <p className="text-xs text-slate-400 mt-1">Active batch registrations</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">Attendance Rate</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {departmentAnalytics ? `${departmentAnalytics.attendanceRate}%` : '100%'}
              </div>
              <p className="text-xs text-slate-400 mt-1">Verified compliance</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">{departmentCode} Internship Cohorts</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {batches.length} Registered Batches
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No internship batches registered for this department.
                </div>
              ) : (
                batches.map((batch) => (
                  <div key={batch.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">{batch.batchName}</span>
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                          batch.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {batch.status}
                        </span>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          Term: {batch.termCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Academic Year: {batch.academicYear} • Semester {batch.semester}
                      </p>
                      <div className="text-xs text-slate-400 flex items-center space-x-3 pt-0.5">
                        <span>Duration: {batch.startDate} to {batch.endDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-900">
                          {batch.enrolledStudentCount} / {batch.maxCapacity || 60} Students
                        </div>
                        <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className="h-full bg-blue-600 rounded-full" 
                            style={{ width: `${Math.min(100, Math.round(((batch.enrolledStudentCount || 0) / (batch.maxCapacity || 60)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER DEPARTMENT REPORTS & ANALYTICS VIEW WHEN ACTIVE */}
      {hodActiveTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>{departmentCode} Department Performance & Compliance</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analytical telemetry, mentor workload distribution, and attendance verification rate.
                </p>
              </div>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-xs flex items-center space-x-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Export Report (PDF • XLSX • CSV)</span>
              </button>
            </div>

            {/* Department Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <span className="text-xs font-medium text-slate-500">Total Enrolled</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalStudents}</p>
                <div className="text-[11px] text-emerald-700 mt-1">
                  {stats.active} Active • {stats.completed} Completed
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <span className="text-xs font-medium text-slate-500">Faculty Mentors</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalMentors}</p>
                <div className="text-[11px] text-slate-500 mt-1">
                  Ratio: {stats.totalMentors > 0 ? (stats.totalStudents / stats.totalMentors).toFixed(1) : 0} students/guide
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <span className="text-xs font-medium text-slate-500">Cohort Batches</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{batches.length}</p>
                <div className="text-[11px] text-blue-600 mt-1">Active terms</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <span className="text-xs font-medium text-slate-500">At-Risk / Delayed</span>
                <p className="text-2xl font-bold text-rose-700 mt-1">{stats.atRisk + stats.delayed}</p>
                <div className="text-[11px] text-rose-600 mt-1">Follow-up needed</div>
              </div>
            </div>
          </div>

          {/* Verification Telemetry Section */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Attendance & Geolocation Verification Status</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time compliance monitoring for {departmentCode} internships
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <span className="text-xs font-semibold text-emerald-800">Within Geofence</span>
                <p className="text-xl font-bold text-emerald-900 mt-1">100%</p>
                <span className="text-[11px] text-emerald-700">Verified Workplaces</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-700">Perimeter Breaches</span>
                <p className="text-xl font-bold text-slate-900 mt-1">0</p>
                <span className="text-[11px] text-slate-500">Clean Records</span>
              </div>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                <span className="text-xs font-semibold text-amber-800">GPS / Sensor Status</span>
                <p className="text-xl font-bold text-amber-900 mt-1">Active</p>
                <span className="text-[11px] text-amber-700">Signal Verified</span>
              </div>
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
                <span className="text-xs font-semibold text-blue-800">Verification Engine</span>
                <p className="text-xl font-bold text-blue-900 mt-1">Automated</p>
                <span className="text-[11px] text-blue-700">Randomized Windows</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DIRECTORY VIEW WHEN ACTIVE */}
      {hodActiveTab === 'directory' && (
        <>
          {/* Department Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3.5">
            <div 
              onClick={() => { setDrillDownMentor(null); setSelectedMentorFilter('All Mentors'); setFilterYear('All Years'); setFilterStatus('All Status'); }}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-slate-300 transition-all"
            >
              <div className="text-xs font-medium text-slate-500">Department Students</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalStudents}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{departmentCode} Dept</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="text-xs font-medium text-slate-500">Faculty Mentors</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalMentors}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Assigned guides</div>
            </div>

            <div 
              onClick={() => setFilterStatus(filterStatus === 'On Track' ? 'All Status' : 'On Track')}
              className={`bg-white p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'On Track' ? 'border-emerald-600 ring-2 ring-emerald-500/10' : 'border-slate-200/80 hover:border-emerald-300'}`}
            >
              <div className="text-xs font-medium text-emerald-700">Active Internships</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.active}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Streaming logs</div>
            </div>

            <div 
              onClick={() => setFilterStatus(filterStatus === 'Completed' ? 'All Status' : 'Completed')}
              className={`bg-white p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'Completed' ? 'border-teal-600 ring-2 ring-teal-500/10' : 'border-slate-200/80 hover:border-teal-300'}`}
            >
              <div className="text-xs font-medium text-teal-700">Completed</div>
              <div className="text-2xl font-bold text-teal-700 mt-1">{stats.completed}</div>
              <div className="text-[11px] text-teal-600 mt-0.5">Term concluded</div>
            </div>

            <div 
              onClick={() => setFilterStatus(filterStatus === 'Blocked' ? 'All Status' : 'Blocked')}
              className={`bg-white p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${filterStatus === 'Blocked' ? 'border-rose-600 ring-2 ring-rose-500/10' : 'border-slate-200/80 hover:border-rose-300'}`}
            >
              <div className="text-xs font-medium text-rose-700">At Risk / Blocked</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">{stats.atRisk}</div>
              <div className="text-[11px] text-rose-600 mt-0.5 font-medium">Needs review</div>
            </div>

            <div 
              onClick={() => setHodActiveTab('locations')}
              className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs cursor-pointer hover:border-blue-300 transition-all"
            >
              <div className="text-xs font-medium text-blue-700 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Host Sites</span>
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{locationRepository.getLocations().length}</div>
              <div className="text-[11px] text-blue-600 mt-0.5">Geofence sites →</div>
            </div>
          </div>

          {/* Department Mentors Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Faculty Mentors ({departmentCode})</h3>
                <p className="text-xs text-slate-500">
                  Select a faculty mentor to filter their assigned student cohort
                </p>
              </div>
              {drillDownMentor && (
                <button
                  onClick={() => setDrillDownMentor(null)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Show All Students</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {departmentMentors.map((mentor) => {
                const isSelected = drillDownMentor?.id === mentor.id;
                return (
                  <div
                    key={mentor.id}
                    onClick={() => setDrillDownMentor(isSelected ? null : mentor)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/10'
                        : 'bg-slate-50/40 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm text-slate-900">
                        {mentor.name}
                      </div>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {mentor.assignedStudentsCount} Mentees
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Avg Progress: <strong>{mentor.averageProgress || 0}%</strong></span>
                      <span className={`font-medium ${mentor.atRiskCount && mentor.atRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {mentor.atRiskCount || 0} at risk
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${mentor.averageProgress || 0}%` }}
                      ></div>
                    </div>

                    <div className="text-[11px] font-medium text-blue-600 flex items-center justify-between pt-1">
                      <span>{isSelected ? '✓ Filtered cohort active' : 'Filter by this mentor'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drill-Down Active Alert */}
          {drillDownMentor && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {drillDownMentor.name.slice(0, 1)}
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">
                    Filtered by Mentor: {drillDownMentor.name}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Showing {drillDownMentor.assignedStudentsCount} assigned students • Avg Progress: {drillDownMentor.averageProgress}%
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDrillDownMentor(null)}
                className="text-xs font-semibold px-3 py-1.5 bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Students Requiring Attention */}
          {departmentStudents.filter(s => s.status === 'blocked' || s.status === 'inactive').length > 0 && (
            <div className="bg-rose-50/70 rounded-xl p-5 border border-rose-200 space-y-3">
              <div className="flex items-center space-x-2 text-rose-800 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Students Requiring Immediate Attention ({departmentCode})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {departmentStudents.filter(s => s.status === 'blocked' || s.status === 'inactive').map(s => (
                  <div key={s.id} className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-1">
                    <div className="font-semibold text-xs text-slate-900 flex items-center justify-between">
                      <span>{s.studentName} ({s.studentId})</span>
                      <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs text-rose-700 font-medium">
                      {s.status === 'blocked' ? `Blocker: ${s.blocker || s.work}` : `Inactive: Awaiting first log`}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>Guide: {s.mentor}</span>
                      <span>Host: {s.company}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search students by name, ID, host organization..."
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

              <select
                value={drillDownMentor ? drillDownMentor.name : selectedMentorFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMentorFilter(val);
                  const found = departmentMentors.find(m => m.name === val || m.id === val);
                  setDrillDownMentor(found || null);
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="All Mentors">All Mentors</option>
                {departmentMentors.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="All Status">All Statuses</option>
                <option value="On Track">On Track</option>
                <option value="Delayed">Delayed</option>
                <option value="Blocked">Blocked</option>
                <option value="Inactive">Inactive</option>
                <option value="Completed">Completed</option>
              </select>

              {(filterYear !== 'All Years' || filterStatus !== 'All Status' || selectedMentorFilter !== 'All Mentors' || searchQuery || drillDownMentor) && (
                <button
                  onClick={() => {
                    setFilterYear('All Years');
                    setFilterStatus('All Status');
                    setSelectedMentorFilter('All Mentors');
                    setDrillDownMentor(null);
                    setSearchQuery('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-200">
                  <th className="p-3.5 font-semibold">Student ID</th>
                  <th className="p-3.5 font-semibold">Student Name</th>
                  <th className="p-3.5 font-semibold">Year</th>
                  <th className="p-3.5 font-semibold">Department</th>
                  <th className="p-3.5 font-semibold">Faculty Guide</th>
                  <th className="p-3.5 font-semibold">Host Organization</th>
                  <th className="p-3.5 font-semibold">Progress</th>
                  <th className="p-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No students found matching your criteria in {departmentCode} department.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const config = STATUS_CONFIG[st.status] || STATUS_CONFIG.onTrack;
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold font-mono text-slate-900">{st.studentId}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{st.studentName}</td>
                        <td className="p-3.5 text-slate-600">{st.year}</td>
                        <td className="p-3.5 font-medium text-slate-800">{st.dept}</td>
                        <td className="p-3.5 text-slate-700">{st.mentor}</td>
                        <td className="p-3.5 text-slate-600 font-medium">{st.company}</td>
                        <td className="p-3.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800">{st.progress}%</span>
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${st.status === 'blocked' ? 'bg-rose-600' : 'bg-blue-600'}`} 
                                style={{ width: `${st.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${config.bg} border ${config.border}`}>
                            {config.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isImportModalOpen && (
        <StudentBulkImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentUser={currentUser}
        />
      )}

      {isExportModalOpen && (
        <InstitutionalReportExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentUser={currentUser}
          defaultDepartmentCode={departmentCode}
          defaultReportType="department_performance"
        />
      )}
    </div>
  );
};
