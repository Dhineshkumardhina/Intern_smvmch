import React, { useState } from 'react';
import { 
  Plus, 
  TrendingUp, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  Check,
  Download,
  Briefcase,
  Compass,
  ArrowRight
} from 'lucide-react';
import { StudentRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';
import { internshipRepository } from '../core/repository/internshipRepository';
import { locationRepository } from '../core/repository/locationRepository';
import { InstitutionalReportExportModal } from './analytics/InstitutionalReportExportModal';

interface StudentDashboardProps {
  currentUser: AuthUser;
  studentData: StudentRecord;
  onSubmitDailyLog: (work: string, hours: number, status: StudentRecord['status'], blocker?: string) => Promise<void>;
  isSubmitting: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string }> = {
  onTrack: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
  inProgress: { label: 'In Progress', bg: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  delayed: { label: 'Delayed', bg: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700', border: 'border-slate-300' },
  completed: { label: 'Completed', bg: 'bg-teal-50 text-teal-700', border: 'border-teal-200' },
};

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  studentData,
  onSubmitDailyLog,
  isSubmitting,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'log'>('overview');
  const [work, setWork] = useState('');
  const [hours, setHours] = useState('8');
  const [status, setStatus] = useState<StudentRecord['status']>('onTrack');
  const [blocker, setBlocker] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!work.trim()) return;

    await onSubmitDailyLog(work, parseFloat(hours) || 8, status, blocker);
    setWork('');
    setBlocker('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
    setActiveTab('overview');
  };

  const statusConfig = STATUS_CONFIG[studentData.status] || STATUS_CONFIG.onTrack;

  const activeAssignment = internshipRepository.getActiveAssignmentForStudent(studentData.studentId, currentUser);
  const location = studentData.internshipLocationId 
    ? locationRepository.getLocationById(studentData.internshipLocationId)
    : (activeAssignment ? locationRepository.getLocationById(activeAssignment.locationId) : null);

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assigned Tasks (4)
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'log'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Submit Log</span>
          </button>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
          <div className="text-xs text-slate-600 flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Faculty Guide: <strong>{studentData.mentor}</strong></span>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Daily work log submitted successfully to your faculty mentor.</span>
          </div>
          <button onClick={() => setShowSuccess(false)} className="text-emerald-700 font-semibold text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Welcome Profile Banner */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl border border-blue-100">
                {studentData.studentName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl font-bold text-slate-900">
                    {studentData.studentName}
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">({studentData.studentId})</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} border ${statusConfig.border}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2 flex-wrap">
                  <span>Department of {studentData.dept}</span>
                  <span>•</span>
                  <span>{studentData.year}</span>
                  <span>•</span>
                  <span className="font-medium text-slate-700">Host Company: <strong>{studentData.company}</strong></span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('log')}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Log Today's Work</span>
            </button>
          </div>

          {/* 4 Clean Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Internship Progress</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{studentData.progress}%</div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${studentData.progress}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Daily Work Target</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{studentData.hours || 8} hrs/day</div>
              <p className="text-xs text-slate-500 mt-1">Logged today: {studentData.hours || 8} hours</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Milestones</span>
                <FileText className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">4 Active</div>
              <p className="text-xs text-slate-500 mt-1">Current term sprint</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Faculty Mentor</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">{studentData.mentor}</div>
              <p className="text-xs text-slate-500 mt-1 truncate">{studentData.dept} Department</p>
            </div>
          </div>

          {/* Placement & Geofence Details */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeAssignment?.companyName || studentData.company}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Designation: <span className="text-slate-800 font-medium">{activeAssignment?.roleTitle || studentData.role}</span>
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Verified Placement</span>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center text-slate-500 space-x-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Workplace Facility</span>
                </div>
                <div className="font-semibold text-slate-900 truncate">
                  {location?.locationName || activeAssignment?.locationName || 'Institutional Host Facility'}
                </div>
                <p className="text-slate-500 text-[11px] line-clamp-2">
                  {location?.address || activeAssignment?.locationAddress || 'Campus Designated Hub'}
                </p>
                <div className="pt-1 text-[11px] text-blue-700 font-semibold">
                  Geofence: {location?.geofenceRadiusMeters || activeAssignment?.geofenceRadiusMeters || 200}m radius
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center text-slate-500 space-x-1.5 font-medium">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Work Schedule</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {activeAssignment?.monitoringSchedule.startTime || location?.monitoringStartTime || '09:00:00'} – {activeAssignment?.monitoringSchedule.endTime || location?.monitoringEndTime || '17:00:00'}
                </div>
                <p className="text-slate-500 text-[11px]">
                  Required Daily: <strong>{activeAssignment?.monitoringSchedule.requiredDailyHours || 8.0} hours</strong>
                </p>
                <div className="pt-1 text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Standard Shift Active</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center text-slate-500 space-x-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Duration</span>
                </div>
                <div className="font-semibold text-slate-900">
                  {activeAssignment?.startDate || studentData.internshipStartDate || '2026-01-05'} to {activeAssignment?.endDate || studentData.internshipEndDate || '2026-06-30'}
                </div>
                <p className="text-slate-500 text-[11px]">
                  Assigned Guide: <strong>{activeAssignment?.mentorName || studentData.mentor}</strong>
                </p>
                <div className="pt-1 text-[11px] text-slate-400 font-mono">
                  ID: {activeAssignment?.id || 'INST-ASGN-01'}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Latest Logged Activity</h3>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} border ${statusConfig.border}`}>
                    {statusConfig.label}
                  </span>
                  <span className="text-xs text-slate-400">• {studentData.time || 'Today'}</span>
                </div>
                <span className="text-xs font-medium text-slate-600">{studentData.hours || 8} hrs logged</span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">{studentData.work}</p>
              {studentData.blocker && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs font-medium flex items-center space-x-2 border border-rose-100">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Blocker: {studentData.blocker}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-base text-slate-900">Internship Milestones & Tasks</h3>
              <p className="text-xs text-slate-500">Host Organization: {studentData.company}</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">4 Total Tasks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Project Architecture & Setup', desc: 'Environment initialization and repository check-in', due: 'In 2 days', progress: 80, status: 'In Progress' },
              { title: 'Feature Module Implementation', desc: 'Core business logic and integration with host systems', due: 'In 5 days', progress: studentData.progress, status: 'In Progress' },
              { title: 'Testing & Code Reviews', desc: 'Unit tests and guide feedback session', due: 'In 12 days', progress: 30, status: 'In Progress' },
              { title: 'Final Technical Report & Presentation', desc: 'Prepare final submission to SMVEC internal guide', due: 'Nov 28', progress: 0, status: 'Not Started' },
            ].map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-slate-900">{t.title}</h4>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${t.progress === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{t.desc}</p>
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Progress: {t.progress}%</span>
                    <span>Due: {t.due}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${t.progress}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: LOG DAILY WORK */}
      {activeTab === 'log' && (
        <div className="bg-white p-7 rounded-xl border border-slate-200/80 shadow-xs max-w-2xl mx-auto space-y-5">
          <div>
            <h3 className="font-bold text-lg text-slate-900">Submit Daily Work Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Updates are sent directly to your faculty guide (<strong>{studentData.mentor}</strong>).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Completed Today <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="Describe milestones achieved, tickets resolved, modules tested, or meetings attended..."
                rows={4}
                className="w-full p-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                >
                  <option value="onTrack">On Track</option>
                  <option value="inProgress">In Progress</option>
                  <option value="delayed">Delayed</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hours Logged</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Blockers / Challenges (Optional)
              </label>
              <input
                type="text"
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="e.g. Awaiting repository permissions, CAD license renewal, server access..."
                className="w-full p-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-xs disabled:opacity-60 text-sm"
              >
                {isSubmitting ? 'Submitting Log...' : 'Submit Progress Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isExportModalOpen && (
        <InstitutionalReportExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentUser={currentUser}
          defaultReportType="student_dossier"
        />
      )}
    </div>
  );
};
