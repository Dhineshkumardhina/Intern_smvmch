import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Building, 
  Briefcase, 
  TrendingUp, 
  AlertTriangle, 
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  Search, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Filter,
  Upload
} from 'lucide-react';
import { StudentRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';
import { internshipRepository } from '../core/repository/internshipRepository';
import { StudentBulkImportModal } from './onboarding/StudentBulkImportModal';
import { InstitutionalReportExportModal } from './analytics/InstitutionalReportExportModal';
import { institutionalAnalyticsService } from '../core/analytics/institutionalAnalyticsService';

interface AdminDashboardProps {
  currentUser: AuthUser;
  students: StudentRecord[];
  onUpdateStudents: (students: StudentRecord[]) => void;
}

const DEPARTMENTS = [
  { code: 'IT', name: 'Information Technology', hod: 'Dr. M. Auxilia' },
  { code: 'ECE', name: 'Electronics & Communication', hod: 'Dr. R. Senthamilselvan' },
  { code: 'EEE', name: 'Electrical & Electronics', hod: 'Dr. S. Anbumozhi' },
  { code: 'MECH', name: 'Mechanical Engineering', hod: 'Dr. N. Alagumoorthy' },
  { code: 'CIVIL', name: 'Civil Engineering', hod: 'Dr. G. Sundararaj' },
  { code: 'BME', name: 'Biomedical Engineering', hod: 'Dr. P. Dhanalakshmi' },
  { code: 'MECT', name: 'Mechatronics Engineering', hod: 'Dr. K. Velmurugan' },
  { code: 'ICE', name: 'Instrumentation & Control', hod: 'Dr. S. Sivakumar' },
  { code: 'CSEBS', name: 'CSE & Business Systems', hod: 'Dr. V. Gomathi' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  students,
  onUpdateStudents,
}) => {
  const [adminTab, setAdminTab] = useState<'overview' | 'students' | 'mentors' | 'departments' | 'companies' | 'reports'>('overview');
  const [filterDept, setFilterDept] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Re-assign Mentor Modal State
  const [selectedStudentForMentor, setSelectedStudentForMentor] = useState<StudentRecord | null>(null);
  const [newMentorName, setNewMentorName] = useState('');
  const [assignmentSuccess, setAssignmentSuccess] = useState(false);

  // Derive active mentors and companies
  const dynamicMentors = useMemo(() => {
    const map = new Map<string, { name: string; dept: string; studentsCount: number }>();
    students.forEach((s) => {
      const mName = s.mentor || 'Unassigned';
      if (!map.has(mName)) {
        map.set(mName, { name: mName, dept: s.dept, studentsCount: 0 });
      }
      map.get(mName)!.studentsCount += 1;
    });
    return Array.from(map.values());
  }, [students]);

  const dynamicCompanies = useMemo(() => {
    const map = new Map<string, { name: string; count: number; depts: Set<string> }>();
    students.forEach((s) => {
      const cName = s.company || 'Unassigned';
      if (!map.has(cName)) {
        map.set(cName, { name: cName, count: 0, depts: new Set() });
      }
      const entry = map.get(cName)!;
      entry.count += 1;
      entry.depts.add(s.dept);
    });
    return Array.from(map.values());
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterDept !== 'All' && s.dept.toUpperCase() !== filterDept.toUpperCase()) return false;
      if (filterYear !== 'All' && s.year !== filterYear) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.studentName.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q) ||
          s.mentor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, filterDept, filterYear, searchQuery]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const multiDeptStats = useMemo(() => {
    return internshipRepository.getMultiDepartmentInternshipStats(currentUser);
  }, [currentUser, students]);

  const handleAssignMentor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForMentor || !newMentorName.trim()) return;

    const updated = students.map((s) => {
      if (s.id === selectedStudentForMentor.id) {
        return { ...s, mentor: newMentorName.trim() };
      }
      return s;
    });

    onUpdateStudents(updated);
    setAssignmentSuccess(true);
    setTimeout(() => {
      setAssignmentSuccess(false);
      setSelectedStudentForMentor(null);
      setNewMentorName('');
    }, 1200);
  };

  const handleExportCsv = () => {
    const headers = ['Student ID,Student Name,Academic Year,Department,Host Company,Faculty Mentor,Status,Progress'];
    const rows = filteredStudents.map((s) =>
      `"${s.studentId}","${s.studentName}","${s.year}","${s.dept}","${s.company}","${s.mentor}","${s.status}","${s.progress}%"`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SMVEC_Internship_Registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Top Navigation & Institutional Badge */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-slate-900">Institutional Administration Console</h2>
              <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                Deanery Level
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              SMVEC Academic & Placement Cell • Overall Governance & Mentorship Oversight
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto text-xs">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'students', label: `Students (${students.length})` },
            { key: 'mentors', label: `Mentors (${dynamicMentors.length})` },
            { key: 'departments', label: 'Departments (9)' },
            { key: 'companies', label: `Companies (${dynamicCompanies.length})` },
            { key: 'reports', label: 'Reports' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAdminTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                adminTab === tab.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          {/* Institutional KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">Total Students</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{students.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">9 Departments</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">Faculty Mentors</div>
              <div className="text-2xl font-semibold text-blue-600 mt-1">{dynamicMentors.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Guides Assigned</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-medium text-emerald-700">On Track / Active</div>
              <div className="text-2xl font-semibold text-emerald-800 mt-1">
                {students.filter((s) => s.status === 'onTrack' || s.status === 'inProgress').length}
              </div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Normal Pace</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-medium text-teal-700">Completed</div>
              <div className="text-2xl font-semibold text-teal-800 mt-1">
                {students.filter((s) => s.status === 'completed').length}
              </div>
              <div className="text-[11px] text-teal-600 mt-0.5">Certified Interns</div>
            </div>

            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200/80 shadow-2xs">
              <div className="text-xs font-medium text-rose-800">Needs Attention</div>
              <div className="text-2xl font-semibold text-rose-900 mt-1">
                {students.filter((s) => s.status === 'blocked').length}
              </div>
              <div className="text-[11px] text-rose-700 font-medium mt-0.5">Action Required</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-medium text-slate-500">Host Companies</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{dynamicCompanies.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Industry Partners</div>
            </div>
          </div>

          {/* Quick Actions & Department Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
                  Department Progress Matrix
                </h3>
                <span className="text-xs text-blue-600 font-medium">9 Active SMVEC Branches</span>
              </div>
              <div className="space-y-2.5">
                {DEPARTMENTS.map((dept) => {
                  const deptStudents = students.filter(
                    (s) => s.dept.toUpperCase() === dept.code.toUpperCase()
                  );
                  const activeCount = deptStudents.filter(
                    (s) => s.status === 'onTrack' || s.status === 'inProgress'
                  ).length;
                  const blockedCount = deptStudents.filter((s) => s.status === 'blocked').length;
                  const avgProgress = deptStudents.length
                    ? Math.round(
                        deptStudents.reduce((acc, curr) => acc + curr.progress, 0) /
                          deptStudents.length
                      )
                    : 0;

                  return (
                    <div
                      key={dept.code}
                      className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs hover:border-slate-300 transition-all"
                    >
                      <div className="w-1/3">
                        <span className="font-semibold text-slate-900">{dept.code}</span>
                        <p className="text-[11px] text-slate-500 truncate">{dept.name}</p>
                      </div>
                      <div className="text-center w-1/4">
                        <span className="font-medium text-slate-800">{deptStudents.length} Interns</span>
                        <div className="text-[11px] text-emerald-700">
                          {activeCount} Active {blockedCount > 0 && <span className="text-rose-600 font-medium">• {blockedCount} Delayed</span>}
                        </div>
                      </div>
                      <div className="w-1/3 flex items-center space-x-2">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold text-slate-700 shrink-0 w-8 text-right">{avgProgress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Controls Panel */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3.5">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-500 mb-2">
                Administrative Actions
              </h3>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 text-xs font-medium flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Bulk Onboard Students (CSV / XLSX)</span>
                </div>
                <span className="text-blue-700 text-xs font-semibold">Import</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="w-full p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-medium flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Export Institutional CSV</span>
                </div>
                <span className="text-slate-400 text-xs">.csv</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-900 text-xs font-medium flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Institutional Reports</span>
                </div>
                <span className="text-emerald-700 text-[10px] font-semibold px-2 py-0.5 bg-emerald-200/60 rounded-md uppercase">PDF • XLSX</span>
              </button>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 mt-2">
                <div className="flex items-center space-x-2 text-slate-800 font-medium text-xs">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Administrative Role Authority</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Supervisory access across all SMVEC departments, faculty guide allocations, and verified attendance records.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS REGISTRY */}
      {adminTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E3E1EA] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-[#757684] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student, ID, mentor, company..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF]"
                />
              </div>

              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="p-2 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] font-medium"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="p-2 text-xs rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] font-medium"
              >
                <option value="All">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium flex items-center space-x-1.5 hover:bg-slate-50 shadow-xs transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Bulk Import</span>
              </button>

              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium flex items-center space-x-1.5 hover:bg-blue-700 shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Filtered ({filteredStudents.length})</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 font-medium">Student ID</th>
                  <th className="p-3.5 font-medium">Student Name</th>
                  <th className="p-3.5 font-medium">Dept & Year</th>
                  <th className="p-3.5 font-medium">Faculty Mentor</th>
                  <th className="p-3.5 font-medium">Host Company</th>
                  <th className="p-3.5 font-medium">Progress</th>
                  <th className="p-3.5 font-medium">Status</th>
                  <th className="p-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                      No student records found in registry.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-medium font-mono text-slate-800">{st.studentId}</td>
                      <td className="p-3.5 font-medium text-slate-900">{st.studentName}</td>
                      <td className="p-3.5 text-slate-500">{st.dept} • {st.year}</td>
                      <td className="p-3.5 text-slate-700">{st.mentor}</td>
                      <td className="p-3.5 text-slate-500">{st.company}</td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-700">{st.progress}%</span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${st.status === 'blocked' ? 'bg-rose-500' : 'bg-blue-600'}`}
                              style={{ width: `${st.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          st.status === 'blocked' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {st.status === 'onTrack' ? 'On Track' : st.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudentForMentor(st);
                            setNewMentorName(st.mentor);
                          }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg bg-blue-50/70 hover:bg-blue-100/70 transition-colors"
                        >
                          Re-assign Guide
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MENTORS */}
      {adminTab === 'mentors' && (
        <div>
          {dynamicMentors.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200/80 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-800">No Faculty Mentors with active mentees yet.</div>
              <p className="text-xs text-slate-500">
                Mentors will appear here as students register and are assigned to faculty coordinators.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dynamicMentors.map((m) => (
                <div key={m.name} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{m.name}</h4>
                      <p className="text-xs text-slate-500">{m.dept} Faculty Coordinator</p>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-semibold text-xs">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Assigned Students:</span>
                    <span className="font-semibold text-slate-900 text-sm">{m.studentsCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DEPARTMENTS */}
      {adminTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900">Department Governance & Overview</h3>
            <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              {multiDeptStats.length} Registered Departments
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {multiDeptStats.map((dept) => {
              return (
                <div key={dept.code} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-base text-slate-900">{dept.code}</span>
                        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full border ${
                          dept.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {dept.status}
                        </span>
                        {dept.isPilotAuthorized && (
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                            Pilot
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-xs text-slate-600 mt-0.5">{dept.name}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-xs">
                      {dept.totalStudents} Interns
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 block">Active Placements:</span>
                      <strong className="text-emerald-700">{dept.activeInternships}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 block">Completed:</span>
                      <strong className="text-teal-700">{dept.completedInternships}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 block">At Risk / Blocked:</span>
                      <strong className="text-rose-700">{dept.atRiskInternships}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 block">Active Batches:</span>
                      <strong className="text-blue-700">{dept.activeBatches}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                    <span>Mentors: <strong className="text-slate-800">{dept.activeMentors}</strong></span>
                    <span>Locations: <strong className="text-slate-800">{dept.approvedLocations}</strong></span>
                    <span>Attendance: <strong className="text-emerald-700">{dept.attendanceRate}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: COMPANIES */}
      {adminTab === 'companies' && (
        <div>
          {dynamicCompanies.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200/80 text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-800">No Host Companies registered yet.</div>
              <p className="text-xs text-slate-500">
                Organizations will appear as students register their internship host companies.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dynamicCompanies.map((comp) => (
                <div key={comp.name} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{comp.name}</h4>
                      <p className="text-xs text-slate-500">Industry Partner</p>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-medium text-xs">
                      <Building2 className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Intern Placements:</span>
                    <span className="font-semibold text-blue-600">{comp.count} Students</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: REPORTS */}
      {adminTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-base text-slate-900">Institutional Compliance & Accreditation Reports</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate and export comprehensive audit summaries for Sri Manakula Vinayagar Engineering College.
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition shadow-xs flex items-center space-x-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Launch Report Exporter</span>
              </button>
            </div>

            {/* Quick Export Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">Student Internship Ledger</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Complete roster of student IDs, mentors, and progress</p>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  Download CSV
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">At-Risk Students Memo</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Filtered summary of delayed & blocked student cases</p>
                </div>
                <button
                  onClick={() => {
                    const blocked = students.filter((s) => s.status === 'blocked' || s.status === 'inactive');
                    const rows = blocked.map((s) => `"${s.studentId}","${s.studentName}","${s.dept}","${s.mentor}","${s.blocker || 'Inactive'}"`);
                    const csv = ['Student ID,Name,Dept,Mentor,Blocker', ...rows].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'SMVEC_AtRisk_Students_Report.csv';
                    a.click();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium hover:bg-rose-100 transition-colors shadow-2xs"
                >
                  Export At-Risk
                </button>
              </div>
            </div>
          </div>

          {/* Verification Outcomes & Telemetry Compliance Overview */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-semibold text-sm text-slate-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Workplace Geofence Verification Breakdown</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Evaluation outcomes across all departments
                </p>
              </div>
              <span className="text-[11px] font-medium px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                Active Policy Enforced
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
                <span className="text-xs font-medium text-emerald-800">Within Geofence</span>
                <p className="text-xl font-semibold text-emerald-900 mt-1">100%</p>
                <span className="text-[11px] text-emerald-700">Verified Workplace Sessions</span>
              </div>
              <div className="p-3.5 bg-rose-50/50 border border-rose-200/80 rounded-xl">
                <span className="text-xs font-medium text-rose-800">Outside Geofence</span>
                <p className="text-xl font-semibold text-rose-900 mt-1">0</p>
                <span className="text-[11px] text-rose-700">Geofence Breaches</span>
              </div>
              <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-xl">
                <span className="text-xs font-medium text-amber-800">Exceptions</span>
                <p className="text-xl font-semibold text-amber-900 mt-1">Classified</p>
                <span className="text-[11px] text-amber-700">GPS / Offline Fallbacks</span>
              </div>
              <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl">
                <span className="text-xs font-medium text-blue-800">Scheduled Checks</span>
                <p className="text-xl font-semibold text-blue-900 mt-1">Active</p>
                <span className="text-[11px] text-blue-700">Verification Windows</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RE-ASSIGN FACULTY MENTOR MODAL */}
      {selectedStudentForMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-semibold text-base text-slate-900 mb-1">Re-assign Faculty Mentor</h3>
            <p className="text-xs text-slate-500 mb-4">
              Update assigned faculty guide for <strong>{selectedStudentForMentor.studentName}</strong> ({selectedStudentForMentor.studentId}).
            </p>

            {assignmentSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mentor reassignment saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleAssignMentor} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Select or Enter Faculty Mentor Name
                </label>
                <input
                  type="text"
                  value={newMentorName}
                  onChange={(e) => setNewMentorName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh K., Prof. Anitha S."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForMentor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save Re-assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 17D: Student Bulk Import Modal */}
      <StudentBulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentUser={currentUser}
        onImportComplete={() => {
          onUpdateStudents(internshipRepository.getAllStudents());
        }}
      />

      {/* Phase 17E: Institutional Report Exporter Modal */}
      <InstitutionalReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
