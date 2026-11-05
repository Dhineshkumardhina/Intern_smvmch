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
  Filter
} from 'lucide-react';
import { StudentRecord } from '../data/initialData';
import { AuthUser } from '../core/auth/authUser';

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
      <div className="bg-white rounded-2xl p-4 border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-[#24389C] text-white flex items-center justify-center font-bold shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-[#1A1B22]">Institutional Administration Console</h2>
              <span className="text-[10px] font-bold bg-[#DEE0FF] text-[#00105C] px-2 py-0.5 rounded-full uppercase">
                Deanery Level
              </span>
            </div>
            <p className="text-xs text-[#57657A]">
              SMVEC Academic & Placement Cell • Overall Governance & Mentorship Oversight
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1.5 bg-[#EFEDF6] p-1 rounded-xl overflow-x-auto">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'students', label: `🎓 Students (${students.length})` },
            { key: 'mentors', label: `👨‍🏫 Mentors (${dynamicMentors.length})` },
            { key: 'departments', label: '🏛️ Departments (9)' },
            { key: 'companies', label: `🏢 Companies (${dynamicCompanies.length})` },
            { key: 'reports', label: '📑 Reports' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAdminTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                adminTab === tab.key
                  ? 'bg-white text-[#24389C] shadow-sm font-bold'
                  : 'text-[#57657A] hover:text-[#1A1B22]'
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
            <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
              <div className="text-[11px] font-semibold text-[#57657A]">Total Students</div>
              <div className="text-2xl font-bold text-[#1A1B22] mt-1">{students.length}</div>
              <div className="text-[10px] text-[#57657A] mt-1">9 Departments</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
              <div className="text-[11px] font-semibold text-[#57657A]">Faculty Mentors</div>
              <div className="text-2xl font-bold text-[#24389C] mt-1">{dynamicMentors.length}</div>
              <div className="text-[10px] text-emerald-600 mt-1">Guides Assigned</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
              <div className="text-[11px] font-semibold text-emerald-700">On Track / Active</div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">
                {students.filter((s) => s.status === 'onTrack' || s.status === 'inProgress').length}
              </div>
              <div className="text-[10px] text-emerald-600 mt-1">Normal Pace</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
              <div className="text-[11px] font-semibold text-teal-700">Completed</div>
              <div className="text-2xl font-bold text-teal-800 mt-1">
                {students.filter((s) => s.status === 'completed').length}
              </div>
              <div className="text-[10px] text-teal-600 mt-1">Certified Interns</div>
            </div>

            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
              <div className="text-[11px] font-semibold text-rose-800">Blocked / At-Risk</div>
              <div className="text-2xl font-bold text-rose-900 mt-1">
                {students.filter((s) => s.status === 'blocked').length}
              </div>
              <div className="text-[10px] text-rose-700 font-bold mt-1">Needs Dean Action</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
              <div className="text-[11px] font-semibold text-slate-600">Host Companies</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{dynamicCompanies.length}</div>
              <div className="text-[10px] text-slate-500 mt-1">MoU Partners</div>
            </div>
          </div>

          {/* Quick Actions & Department Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#57657A]">
                  Departmental Compliance & Progress Matrix
                </h3>
                <span className="text-xs text-[#24389C] font-semibold">9 Active SMVEC Branches</span>
              </div>
              <div className="space-y-3">
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
                      className="p-3 rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] flex items-center justify-between text-xs hover:border-[#24389C] transition-all"
                    >
                      <div className="w-1/3">
                        <span className="font-bold text-[#1A1B22]">{dept.code}</span>
                        <p className="text-[11px] text-[#57657A] truncate">{dept.name}</p>
                      </div>
                      <div className="text-center w-1/4">
                        <span className="font-bold text-[#1A1B22]">{deptStudents.length} Interns</span>
                        <div className="text-[10px] text-emerald-700">
                          {activeCount} Active • {blockedCount > 0 && <span className="text-rose-600 font-bold">{blockedCount} Blocked</span>}
                        </div>
                      </div>
                      <div className="w-1/3 flex items-center space-x-2">
                        <div className="w-full bg-[#EFEDF6] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#24389C] h-full rounded-full"
                            style={{ width: `${avgProgress}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-[#1A1B22] shrink-0">{avgProgress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Controls Panel */}
            <div className="bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#57657A]">
                Administrative Shortcuts
              </h3>

              <button
                onClick={handleExportCsv}
                className="w-full p-3 rounded-xl border border-[#E3E1EA] hover:border-[#24389C] text-[#1A1B22] text-xs font-semibold flex items-center justify-between transition-all bg-[#FBF8FF]"
              >
                <div className="flex items-center space-x-2">
                  <Download className="w-4 h-4 text-[#57657A]" />
                  <span>Export Complete Institutional CSV</span>
                </div>
                <span className="text-[#57657A] text-[11px]">.csv</span>
              </button>

              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Role Separation Governance</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  As System Admin, you possess supervisory rights across all SMVEC departments, faculty guide allocations, and verified student daily log records.
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

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-[#24389C] text-white text-xs font-semibold flex items-center space-x-1.5 hover:bg-[#1E2E80]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Filtered ({filteredStudents.length})</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3E1EA] shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EFEDF6] text-[#57657A] border-b border-[#E3E1EA]">
                <tr>
                  <th className="p-3.5 font-semibold">Student ID</th>
                  <th className="p-3.5 font-bold text-emerald-800 bg-emerald-50/60">Student Name 🎓</th>
                  <th className="p-3.5 font-semibold">Dept & Year</th>
                  <th className="p-3.5 font-bold text-indigo-800 bg-indigo-50/60">Faculty Mentor 👨‍🏫</th>
                  <th className="p-3.5 font-semibold">Host Company</th>
                  <th className="p-3.5 font-semibold">Progress</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E1EA]">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-[#57657A]">
                      No student records found in registry.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-[#FBF8FF]">
                      <td className="p-3.5 font-bold font-mono text-[#1A1B22]">{st.studentId}</td>
                      <td className="p-3.5 font-bold text-[#1A1B22] bg-emerald-50/20">{st.studentName}</td>
                      <td className="p-3.5 text-[#57657A]">{st.dept} ({st.year})</td>
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
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${st.status === 'blocked' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {st.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudentForMentor(st);
                            setNewMentorName(st.mentor);
                          }}
                          className="text-xs font-semibold text-[#24389C] hover:underline px-2 py-1 rounded bg-[#DEE0FF]/40"
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
            <div className="bg-white p-10 rounded-2xl border border-[#E3E1EA] text-center space-y-2">
              <Users className="w-8 h-8 text-[#757684] mx-auto opacity-50" />
              <div className="text-sm font-semibold text-[#1A1B22]">No Faculty Mentors with active mentees yet.</div>
              <p className="text-xs text-[#57657A]">
                Mentors will appear here as students register and are assigned to faculty coordinators.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dynamicMentors.map((m) => (
                <div key={m.name} className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#1A1B22]">{m.name}</h4>
                      <p className="text-xs text-[#57657A]">{m.dept} Faculty Coordinator</p>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-bold text-xs">
                      👨‍🏫
                    </span>
                  </div>
                  <div className="p-3 bg-[#FBF8FF] rounded-xl border border-[#E3E1EA] flex items-center justify-between text-xs">
                    <span className="text-[#57657A]">Assigned Students:</span>
                    <span className="font-bold text-[#24389C] text-sm">{m.studentsCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DEPARTMENTS */}
      {adminTab === 'departments' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DEPARTMENTS.map((dept) => {
            const count = students.filter((s) => s.dept.toUpperCase() === dept.code.toUpperCase()).length;
            return (
              <div key={dept.code} className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-lg text-[#24389C]">{dept.code}</span>
                    <h4 className="font-semibold text-xs text-[#1A1B22] mt-0.5">{dept.name}</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[#DEE0FF] text-[#00105C] font-bold text-xs">
                    {count} Interns
                  </span>
                </div>
                <div className="text-xs text-[#57657A] pt-2 border-t border-[#E3E1EA]">
                  <span>HOD: <strong>{dept.hod}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: COMPANIES */}
      {adminTab === 'companies' && (
        <div>
          {dynamicCompanies.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-[#E3E1EA] text-center space-y-2">
              <Building2 className="w-8 h-8 text-[#757684] mx-auto opacity-50" />
              <div className="text-sm font-semibold text-[#1A1B22]">No Host Companies registered yet.</div>
              <p className="text-xs text-[#57657A]">
                Organizations will appear as students register their internship host companies.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dynamicCompanies.map((comp) => (
                <div key={comp.name} className="bg-white p-5 rounded-2xl border border-[#E3E1EA] shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#1A1B22]">{comp.name}</h4>
                      <p className="text-xs text-[#57657A]">Host Organization Partner</p>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-[#DEE0FF] text-[#00105C] flex items-center justify-center font-bold text-xs">
                      🏢
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E3E1EA]">
                    <span className="text-[#57657A]">Intern Placements:</span>
                    <span className="font-bold text-[#24389C]">{comp.count} Students</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: REPORTS */}
      {adminTab === 'reports' && (
        <div className="bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[#1A1B22]">Institutional Compliance & AICTE/NAAC Reports</h3>
          <p className="text-xs text-[#57657A]">
            Generate and export comprehensive audit summaries for Sri Manakula Vinayagar Engineering College accreditation bodies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-[#1A1B22]">Full Student Internship Ledger</h4>
                <p className="text-[11px] text-[#57657A]">Complete roster of student IDs, mentors, and progress</p>
              </div>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-lg bg-[#24389C] text-white text-xs font-semibold hover:bg-[#1E2E80]"
              >
                Download CSV
              </button>
            </div>

            <div className="p-4 rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-[#1A1B22]">At-Risk Students Action Memo</h4>
                <p className="text-[11px] text-[#57657A]">Filtered summary of blocked & inactive student cases</p>
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
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
              >
                Export At-Risk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RE-ASSIGN FACULTY MENTOR MODAL */}
      {selectedStudentForMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3E1EA] animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-base text-[#1A1B22] mb-1">Re-assign Faculty Mentor</h3>
            <p className="text-xs text-[#57657A] mb-4">
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
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Select or Enter Faculty Mentor Name
                </label>
                <input
                  type="text"
                  value={newMentorName}
                  onChange={(e) => setNewMentorName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh K., Prof. Anitha S."
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] text-xs bg-[#FBF8FF]"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForMentor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#EFEDF6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#24389C] text-white hover:bg-[#1E2E80]"
                >
                  Save Re-assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
