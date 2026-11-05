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
  GraduationCap
} from 'lucide-react';
import { StudentRecord, MentorRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';

interface HodDashboardProps {
  currentUser: AuthUser;
  departmentStudents: StudentRecord[];
  departmentMentors: MentorRecord[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string }> = {
  onTrack: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200' },
  inProgress: { label: 'In Progress', bg: 'bg-indigo-50 text-indigo-800', border: 'border-indigo-200' },
  delayed: { label: 'Delayed', bg: 'bg-amber-50 text-amber-800', border: 'border-amber-200' },
  blocked: { label: 'Blocked', bg: 'bg-rose-50 text-rose-800', border: 'border-rose-200' },
  inactive: { label: 'Inactive', bg: 'bg-slate-100 text-slate-700', border: 'border-slate-300' },
  completed: { label: 'Completed', bg: 'bg-teal-50 text-teal-800', border: 'border-teal-200' },
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

  const departmentCode = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'IT';

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
      // If mentor drill down is active, enforce only that mentor's students
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
      {/* Department Title & Scope Breadcrumb */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              🏛️ Head of Department (HOD)
            </span>
            <span className="text-xs text-[#57657A] font-mono">ID: {currentUser.id}</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A1B22] mt-1">
            {currentUser.dept || 'Information Technology (IT)'} Department
          </h2>
          <p className="text-xs text-[#57657A] mt-0.5">
            HOD: <strong>{currentUser.name}</strong> • Scoped to <strong>{departmentCode} Department Only</strong>
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#EFEDF6] px-3.5 py-2 rounded-xl text-xs text-[#57657A]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Departmental Boundary: <strong>{departmentCode} Mentors & Students Only</strong></span>
        </div>
      </div>

      {/* 5 High-Level Department Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => { setDrillDownMentor(null); setSelectedMentorFilter('All Mentors'); setFilterYear('All Years'); setFilterStatus('All Status'); }}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-[#24389C] transition-all"
        >
          <div className="text-[11px] font-semibold text-[#57657A]">Total Students</div>
          <div className="text-2xl font-bold text-[#1A1B22] mt-1">{stats.totalStudents}</div>
          <div className="text-[10px] text-[#57657A] mt-1">{departmentCode} Department</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
          <div className="text-[11px] font-semibold text-[#57657A]">Department Mentors</div>
          <div className="text-2xl font-bold text-[#1A1B22] mt-1">{stats.totalMentors}</div>
          <div className="text-[10px] text-indigo-600 mt-1">Active Faculty Guides</div>
        </div>

        <div 
          onClick={() => setFilterStatus('On Track')}
          className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm cursor-pointer hover:border-emerald-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-emerald-700">Active Internships</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.active}</div>
          <div className="text-[10px] text-emerald-600 mt-1">Streaming Updates</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Completed')}
          className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm cursor-pointer hover:border-teal-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-teal-800">Completed</div>
          <div className="text-2xl font-bold text-teal-900 mt-1">{stats.completed}</div>
          <div className="text-[10px] text-teal-700 mt-1">Graduated Interns</div>
        </div>

        <div 
          onClick={() => setFilterStatus('Blocked')}
          className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm cursor-pointer hover:border-rose-500 transition-all"
        >
          <div className="text-[11px] font-semibold text-rose-800">At Risk / Blocked</div>
          <div className="text-2xl font-bold text-rose-900 mt-1">{stats.atRisk}</div>
          <div className="text-[10px] text-rose-700 font-bold mt-1">Requires Attention</div>
        </div>
      </div>

      {/* DEPARTMENT MENTORS SECTION (Strictly mentors belonging to this department) */}
      <div className="bg-white p-6 rounded-2xl border border-[#E3E1EA] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-[#1A1B22]">Department Faculty Mentors</h3>
            <p className="text-xs text-[#57657A]">
              Mentors assigned to {departmentCode} department • Click any mentor to drill down to their assigned students
            </p>
          </div>
          {drillDownMentor && (
            <button
              onClick={() => setDrillDownMentor(null)}
              className="text-xs font-semibold text-[#24389C] px-3 py-1.5 rounded-lg border border-[#24389C] bg-[#DEE0FF]/40 hover:bg-[#DEE0FF] transition-all flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All {departmentCode} Students</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {departmentMentors.map((mentor) => {
            const isSelected = drillDownMentor?.id === mentor.id;
            return (
              <div
                key={mentor.id}
                onClick={() => setDrillDownMentor(isSelected ? null : mentor)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#DEE0FF]/50 border-[#24389C] shadow-md ring-2 ring-[#24389C]/20'
                    : 'bg-[#FBF8FF] border-[#E3E1EA] hover:border-[#24389C] hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm text-[#1A1B22] flex items-center space-x-1.5">
                    <span>{mentor.name}</span>
                    <span className="text-[10px] font-mono text-[#57657A] bg-white px-1.5 py-0.2 rounded border border-[#E3E1EA]">
                      {mentor.id}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#24389C] bg-white px-2 py-0.5 rounded-md border border-[#E3E1EA]">
                    {mentor.assignedStudentsCount} Students
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#57657A] mb-2">
                  <span>Avg Progress: <strong>{mentor.averageProgress || 0}%</strong></span>
                  <span className={`font-semibold ${mentor.atRiskCount && mentor.atRiskCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {mentor.atRiskCount || 0} At Risk
                  </span>
                </div>

                <div className="w-full bg-[#EFEDF6] h-1.5 rounded-full overflow-hidden mb-3">
                  <div 
                    className="bg-[#24389C] h-full rounded-full" 
                    style={{ width: `${mentor.averageProgress || 0}%` }}
                  ></div>
                </div>

                <div className="text-[11px] font-semibold text-[#24389C] flex items-center justify-between pt-1 border-t border-[#E3E1EA]">
                  <span>{isSelected ? '✓ Viewing Assigned Students' : 'Click to drill down'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MENTOR DRILL DOWN BANNER (When a mentor is clicked) */}
      {drillDownMentor && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#24389C] text-white flex items-center justify-center font-bold text-sm">
              {drillDownMentor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded">
                  Mentor Drill-Down
                </span>
                <h4 className="font-bold text-sm">{drillDownMentor.name} ({drillDownMentor.id})</h4>
              </div>
              <p className="text-xs text-indigo-800 mt-0.5">
                Department: {currentUser.dept} • Assigned Students: <strong>{drillDownMentor.assignedStudentsCount}</strong> • Average Progress: <strong>{drillDownMentor.averageProgress}%</strong> • At Risk: <strong>{drillDownMentor.atRiskCount}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setDrillDownMentor(null)}
            className="text-xs font-bold px-3 py-1.5 bg-white text-[#24389C] rounded-lg border border-indigo-200 hover:bg-indigo-100"
          >
            Clear Drill-Down
          </button>
        </div>
      )}

      {/* STUDENTS REQUIRING ATTENTION (AT-RISK / BLOCKED IN THIS DEPARTMENT ONLY) */}
      {departmentStudents.filter(s => s.status === 'blocked' || s.status === 'inactive').length > 0 && (
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200">
          <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{departmentCode} DEPARTMENT STUDENTS REQUIRING ATTENTION</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {departmentStudents.filter(s => s.status === 'blocked' || s.status === 'inactive').map(s => (
              <div key={s.id} className="bg-white p-3.5 rounded-xl border border-rose-200">
                <div className="font-bold text-xs text-[#1A1B22] flex items-center justify-between">
                  <span>{s.studentName} ({s.studentId}) • {s.year}</span>
                  <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-rose-700 mt-1 font-semibold">
                  {s.status === 'blocked' ? `BLOCKED: ${s.blocker || s.work}` : `INACTIVE: No logs submitted`}
                </div>
                <div className="text-[11px] text-[#57657A] mt-2 flex items-center justify-between">
                  <span>Guide: <strong>{s.mentor}</strong></span>
                  <span>Host: {s.company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOD FILTERS (Within this department only) */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E1EA] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-base text-[#1A1B22]">
              {drillDownMentor ? `${drillDownMentor.name}'s Students` : `${departmentCode} Department Student Registry`}
            </h3>
            <span className="text-xs text-[#57657A]">
              Showing {filteredStudents.length} matching students in {departmentCode}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#757684] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search students in dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E3E1EA] bg-white w-48 focus:outline-none focus:border-[#24389C]"
              />
            </div>
            {(filterYear !== 'All Years' || filterStatus !== 'All Status' || selectedMentorFilter !== 'All Mentors' || searchQuery || drillDownMentor) && (
              <button
                onClick={() => {
                  setFilterYear('All Years');
                  setFilterStatus('All Status');
                  setSelectedMentorFilter('All Mentors');
                  setDrillDownMentor(null);
                  setSearchQuery('');
                }}
                className="text-xs font-semibold text-[#24389C] px-3 py-1.5 rounded-lg border border-[#E3E1EA] bg-white hover:bg-[#EFEDF6]"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="p-2 text-xs rounded-lg border border-[#E3E1EA] bg-white font-medium"
          >
            <option value="All Years">All Academic Years</option>
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Department Mentors Filter (Dropdown contains ONLY mentors from this department) */}
          <select
            value={drillDownMentor ? drillDownMentor.name : selectedMentorFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMentorFilter(val);
              const found = departmentMentors.find(m => m.name === val || m.id === val);
              setDrillDownMentor(found || null);
            }}
            className="p-2 text-xs rounded-lg border border-[#E3E1EA] bg-white font-medium"
          >
            <option value="All Mentors">All {departmentCode} Mentors</option>
            {departmentMentors.map(m => (
              <option key={m.id} value={m.name}>
                {m.name} ({m.assignedStudentsCount} students)
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 text-xs rounded-lg border border-[#E3E1EA] bg-white font-medium"
          >
            <option value="All Status">All Statuses</option>
            <option value="On Track">On Track</option>
            <option value="Delayed">Delayed</option>
            <option value="Blocked">Blocked</option>
            <option value="Inactive">Inactive</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* HOD Full Student Data Table (Scoped to this department only) */}
      <div className="bg-white rounded-2xl border border-[#E3E1EA] shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#EFEDF6] text-[#57657A] border-b border-[#E3E1EA]">
              <th className="p-3.5 font-semibold">Student ID</th>
              <th className="p-3.5 font-bold text-emerald-800 bg-emerald-50/50">Student Name 🎓</th>
              <th className="p-3.5 font-semibold">Year</th>
              <th className="p-3.5 font-semibold">Department</th>
              <th className="p-3.5 font-bold text-indigo-800 bg-indigo-50/50">Faculty Guide 👨‍🏫</th>
              <th className="p-3.5 font-semibold">Host Company</th>
              <th className="p-3.5 font-semibold">Progress</th>
              <th className="p-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E1EA]">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#57657A]">
                  No students found matching your criteria in the {departmentCode} department.
                </td>
              </tr>
            ) : (
              filteredStudents.map((st) => {
                const config = STATUS_CONFIG[st.status] || STATUS_CONFIG.onTrack;
                return (
                  <tr key={st.id} className="hover:bg-[#FBF8FF]">
                    <td className="p-3.5 font-bold font-mono text-[#1A1B22]">{st.studentId}</td>
                    <td className="p-3.5 font-bold text-[#1A1B22] bg-emerald-50/20">{st.studentName}</td>
                    <td className="p-3.5 text-[#57657A]">{st.year}</td>
                    <td className="p-3.5 font-semibold text-[#1A1B22]">{st.dept}</td>
                    <td className="p-3.5 font-medium text-indigo-900 bg-indigo-50/20">{st.mentor}</td>
                    <td className="p-3.5 text-[#57657A] font-medium">{st.company}</td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{st.progress}%</span>
                        <div className="w-16 bg-[#EFEDF6] h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${st.status === 'blocked' ? 'bg-rose-600' : 'bg-[#24389C]'}`} 
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
    </div>
  );
};
