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
  Sparkles
} from 'lucide-react';
import { StudentRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';

interface StudentDashboardProps {
  currentUser: AuthUser;
  studentData: StudentRecord;
  onSubmitDailyLog: (work: string, hours: number, status: StudentRecord['status'], blocker?: string) => Promise<void>;
  isSubmitting: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string }> = {
  onTrack: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200' },
  inProgress: { label: 'In Progress', bg: 'bg-indigo-50 text-indigo-800', border: 'border-indigo-200' },
  delayed: { label: 'Delayed', bg: 'bg-amber-50 text-amber-800', border: 'border-amber-200' },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 text-rose-800', border: 'border-rose-200' },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700', border: 'border-slate-300' },
  completed: { label: 'Completed', bg: 'bg-teal-50 text-teal-800', border: 'border-teal-200' },
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

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-[#E3E1EA] pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'overview' ? 'bg-[#24389C] text-white shadow-sm' : 'text-[#57657A] hover:bg-[#EFEDF6]'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tasks' ? 'bg-[#24389C] text-white shadow-sm' : 'text-[#57657A] hover:bg-[#EFEDF6]'
            }`}
          >
            Internship Tasks (4)
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center space-x-1.5 ${
              activeTab === 'log' ? 'bg-[#24389C] text-white shadow-sm' : 'text-[#57657A] hover:bg-[#EFEDF6]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Update Progress</span>
          </button>
        </div>

        <div className="text-xs text-[#57657A] flex items-center space-x-1.5 bg-[#EFEDF6] px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Mentor Stream: <strong>{studentData.mentor}</strong></span>
        </div>
      </div>

      {showSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Daily log submitted successfully! Real-time update transmitted to <strong>{studentData.mentor}</strong> and the <strong>{studentData.dept} HOD</strong>.
            </span>
          </div>
          <button onClick={() => setShowSuccess(false)} className="text-emerald-700 font-bold hover:underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Hero Profile Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-[#DEE0FF] text-[#00105C] flex items-center justify-center font-bold text-xl">
                {studentData.studentName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    🎓 Student Intern
                  </span>
                  <h2 className="text-xl font-bold text-[#1A1B22]">
                    {studentData.studentName} ({studentData.studentId})
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} border ${statusConfig.border}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-sm text-[#57657A] mt-1 flex items-center space-x-2 flex-wrap">
                  <span>SMVEC • {studentData.dept} Dept ({studentData.year})</span>
                  <span>•</span>
                  <span>Host Organization: <strong>{studentData.company}</strong></span>
                  <span>•</span>
                  <span className="bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded border border-indigo-100 font-medium">
                    Guide: <strong>{studentData.mentor}</strong>
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('log')}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#24389C] text-white text-sm font-semibold hover:bg-[#1E2E80] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Today's Work
            </button>
          </div>

          {/* 4 Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm">
              <div className="flex items-center justify-between text-[#57657A] mb-3">
                <span className="text-xs font-medium">Overall Progress</span>
                <TrendingUp className="w-4 h-4 text-[#24389C]" />
              </div>
              <div className="text-2xl font-bold text-[#1A1B22]">{studentData.progress}%</div>
              <div className="w-full bg-[#EFEDF6] h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-[#24389C] h-full rounded-full" style={{ width: `${studentData.progress}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm">
              <div className="flex items-center justify-between text-[#57657A] mb-3">
                <span className="text-xs font-medium">Active Tasks</span>
                <FileText className="w-4 h-4 text-[#515F74]" />
              </div>
              <div className="text-2xl font-bold text-[#1A1B22]">4 Assigned</div>
              <p className="text-xs text-[#57657A] mt-2">Sprint milestone active</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm">
              <div className="flex items-center justify-between text-[#57657A] mb-3">
                <span className="text-xs font-medium">Timeline Duration</span>
                <Calendar className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-2xl font-bold text-[#1A1B22]">38 Days</div>
              <p className="text-xs text-[#57657A] mt-2">Nov 2026 Submission</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm">
              <div className="flex items-center justify-between text-[#57657A] mb-3">
                <span className="text-xs font-medium">Assigned Guide</span>
                <Users className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="text-sm font-bold text-[#1A1B22] truncate">{studentData.mentor}</div>
              <p className="text-xs text-[#57657A] mt-1 truncate">{studentData.dept} Department</p>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm">
            <h3 className="font-bold text-base text-[#1A1B22] mb-4">Latest Logged Activity</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} border ${statusConfig.border}`}>
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-[#757684]">• {studentData.time || 'Today'}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#515F74]">{studentData.hours || 8} hrs logged</span>
                </div>
                <p className="text-sm text-[#1A1B22]">{studentData.work}</p>
                {studentData.blocker && (
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-800 text-xs font-semibold">
                    ⚠️ Blocker: {studentData.blocker}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TASKS */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E3E1EA]">
          <h3 className="font-bold text-lg text-[#1A1B22] mb-4">Assigned Tasks ({studentData.company})</h3>
          <div className="space-y-3">
            {[
              { title: 'Project Architecture & Setup', desc: 'Environment initialization and repository check-in', due: 'In 2 days', progress: 80, status: 'In Progress' },
              { title: 'Feature Module Implementation', desc: 'Core business logic and integration with host systems', due: 'In 5 days', progress: studentData.progress, status: 'In Progress' },
              { title: 'Testing & Code Reviews', desc: 'Unit tests and guide feedback session', due: 'In 12 days', progress: 30, status: 'In Progress' },
              { title: 'Final Technical Report & Presentation', desc: 'Prepare final submission to SMVEC internal guide', due: 'Nov 28', progress: 0, status: 'Not Started' },
            ].map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[#E3E1EA] bg-[#FBF8FF]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm text-[#1A1B22]">{t.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${t.progress === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-[#57657A] mb-3">{t.desc}</p>
                <div className="flex items-center justify-between text-xs text-[#57657A] mb-1">
                  <span>Progress: {t.progress}%</span>
                  <span>Due: {t.due}</span>
                </div>
                <div className="w-full bg-[#E3E1EA] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#24389C] h-full rounded-full" style={{ width: `${t.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: LOG DAILY WORK */}
      {activeTab === 'log' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E3E1EA] max-w-2xl mx-auto shadow-sm">
          <h3 className="font-bold text-lg text-[#1A1B22] mb-1">Log Daily Progress Update</h3>
          <p className="text-xs text-[#57657A] mb-5">
            Submissions transmit directly to your faculty mentor (<strong>{studentData.mentor}</strong>) in real-time.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                Work Completed Today <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="Describe tickets resolved, code modules deployed, client meetings attended..."
                rows={4}
                className="w-full p-3 text-sm rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2.5 text-sm rounded-xl border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
                >
                  <option value="onTrack">On Track</option>
                  <option value="inProgress">In Progress</option>
                  <option value="delayed">Delayed</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">Hours Logged</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="16"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                Blockers / Challenges Encountered (Optional)
              </label>
              <input
                type="text"
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="e.g. Awaiting API credentials, missing CAD license, hardware delay..."
                className="w-full p-2.5 text-sm rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#24389C] text-white font-bold rounded-xl hover:bg-[#1E2E80] transition-colors shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting Log...' : 'Submit Progress to Mentor'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
