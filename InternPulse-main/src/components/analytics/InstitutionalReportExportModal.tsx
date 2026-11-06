/**
 * ============================================================================
 * INTERNPULSE — PHASE 17E: INSTITUTIONAL REPORT EXPORT MODAL
 * Secure Multi-Format Report Exporter (PDF, CSV, Excel) with Date & Dept Filters,
 * Role-Based Authorization Guardrails, and Formula-Injection Protection.
 * ============================================================================
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ShieldCheck, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Filter
} from 'lucide-react';
import { AuthUser } from '../../core/auth/authUser';
import { 
  institutionalAnalyticsService 
} from '../../core/analytics/institutionalAnalyticsService';
import { AnalyticsExportOptions, ReportExportLogRecord } from '../../data/initialData';
import { internshipRepository } from '../../core/repository/internshipRepository';

interface InstitutionalReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  defaultReportType?: AnalyticsExportOptions['reportType'];
  defaultDepartmentCode?: string;
}

export const InstitutionalReportExportModal: React.FC<InstitutionalReportExportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  defaultReportType,
  defaultDepartmentCode,
}) => {
  const isSuperAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isHod = currentUser.role === 'hod';
  const isMentor = currentUser.role === 'mentor';
  const isStudent = currentUser.role === 'student';

  const userDept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';

  // State
  const [activeTab, setActiveTab] = useState<'generate' | 'logs'>('generate');
  const [reportType, setReportType] = useState<AnalyticsExportOptions['reportType']>(
    defaultReportType || (isStudent ? 'student_dossier' : isSuperAdmin ? 'institution_summary' : 'department_performance')
  );
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [departmentCode, setDepartmentCode] = useState<string>(
    defaultDepartmentCode || (isSuperAdmin ? 'ALL' : userDept)
  );
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const departments = useMemo(() => {
    return internshipRepository.getAllDepartments().filter((d) => d.status === 'active');
  }, []);

  const exportLogs = useMemo(() => {
    return institutionalAnalyticsService.getExportLogs(currentUser, departmentCode);
  }, [currentUser, departmentCode, exportSuccess]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const options: AnalyticsExportOptions = {
        reportType,
        format,
        departmentCode: isSuperAdmin ? departmentCode : userDept,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        studentId: isStudent ? (currentUser.studentId || currentUser.id) : undefined,
      };

      const result = await institutionalAnalyticsService.exportAnalyticsReport(options, currentUser);

      // Trigger browser download
      let blob: Blob;
      if (format === 'xlsx') {
        blob = new Blob([result.content as any], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } else if (format === 'csv') {
        blob = new Blob([result.content as string], { type: 'text/csv;charset=utf-8;' });
      } else {
        blob = new Blob([result.content as string], { type: 'text/plain;charset=utf-8;' });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(`Successfully generated ${result.fileName} (${result.recordCount} records)`);
    } catch (err: any) {
      setExportError(err?.message || 'Failed to generate report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E3E1EA] flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E3E1EA]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#24389C] text-white flex items-center justify-center font-bold shadow-sm">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1B22]">Institutional Analytics & Report Exporter</h2>
              <p className="text-xs text-[#57657A]">
                Sri Manakula Vinayagar Engineering College • Verified Governance Reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#57657A] hover:text-[#1A1B22] rounded-lg hover:bg-[#F3F2F8] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2 pt-3 pb-2 border-b border-[#E3E1EA] text-xs">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'generate'
                ? 'bg-[#24389C] text-white shadow-xs'
                : 'text-[#57657A] hover:bg-[#F3F2F8]'
            }`}
          >
            ⚡ Configure & Export
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              activeTab === 'logs'
                ? 'bg-[#24389C] text-white shadow-xs'
                : 'text-[#57657A] hover:bg-[#F3F2F8]'
            }`}
          >
            📋 Export History ({exportLogs.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'generate' ? (
            <>
              {/* Report Type Selector */}
              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1.5">Select Report Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setReportType('institution_summary')}
                      className={`p-3 rounded-xl border text-left transition ${
                        reportType === 'institution_summary'
                          ? 'border-[#24389C] bg-[#DEE0FF]/30 text-[#00105C] font-bold'
                          : 'border-[#E3E1EA] hover:bg-[#FBF8FF] text-[#1A1B22]'
                      }`}
                    >
                      🏛️ Institution Summary
                      <p className="text-[10px] text-[#57657A] font-normal mt-0.5">Cross-department metrics & AICTE summary</p>
                    </button>
                  )}

                  {(isSuperAdmin || isHod) && (
                    <button
                      type="button"
                      onClick={() => setReportType('department_performance')}
                      className={`p-3 rounded-xl border text-left transition ${
                        reportType === 'department_performance'
                          ? 'border-[#24389C] bg-[#DEE0FF]/30 text-[#00105C] font-bold'
                          : 'border-[#E3E1EA] hover:bg-[#FBF8FF] text-[#1A1B22]'
                      }`}
                    >
                      📊 Department Performance
                      <p className="text-[10px] text-[#57657A] font-normal mt-0.5">Cohort batches & completion rates</p>
                    </button>
                  )}

                  {!isStudent && (
                    <button
                      type="button"
                      onClick={() => setReportType('attendance_master')}
                      className={`p-3 rounded-xl border text-left transition ${
                        reportType === 'attendance_master'
                          ? 'border-[#24389C] bg-[#DEE0FF]/30 text-[#00105C] font-bold'
                          : 'border-[#E3E1EA] hover:bg-[#FBF8FF] text-[#1A1B22]'
                      }`}
                    >
                      🕒 Attendance Master Ledger
                      <p className="text-[10px] text-[#57657A] font-normal mt-0.5">Daily check-in/out & geofence flags</p>
                    </button>
                  )}

                  {!isStudent && (
                    <button
                      type="button"
                      onClick={() => setReportType('verification_audit')}
                      className={`p-3 rounded-xl border text-left transition ${
                        reportType === 'verification_audit'
                          ? 'border-[#24389C] bg-[#DEE0FF]/30 text-[#00105C] font-bold'
                          : 'border-[#E3E1EA] hover:bg-[#FBF8FF] text-[#1A1B22]'
                      }`}
                    >
                      🛡️ Geolocation Verification Audit
                      <p className="text-[10px] text-[#57657A] font-normal mt-0.5">Canonical outcome states & GPS accuracy</p>
                    </button>
                  )}

                  {!isStudent && (
                    <button
                      type="button"
                      onClick={() => setReportType('mentor_workload')}
                      className={`p-3 rounded-xl border text-left transition ${
                        reportType === 'mentor_workload'
                          ? 'border-[#24389C] bg-[#DEE0FF]/30 text-[#00105C] font-bold'
                          : 'border-[#E3E1EA] hover:bg-[#FBF8FF] text-[#1A1B22]'
                      }`}
                    >
                      👨‍🏫 Mentor Workload & Allocation
                      <p className="text-[10px] text-[#57657A] font-normal mt-0.5">Faculty guide mentee distribution</p>
                    </button>
                  )}

                  {isStudent && (
                    <button
                      type="button"
                      onClick={() => setReportType('student_dossier')}
                      className="p-3 rounded-xl border border-[#24389C] bg-[#DEE0FF]/30 text-[#00105C] font-bold text-left"
                    >
                      🎓 Student Internship Dossier
                      <p className="text-[10px] text-[#57657A] font-normal mt-0.5">Personal attendance & verification ledger</p>
                    </button>
                  )}
                </div>
              </div>

              {/* Format Selector */}
              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1.5">Output Format</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormat('xlsx')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center space-x-1.5 font-bold transition ${
                      format === 'xlsx'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-[#E3E1EA] text-[#57657A] hover:bg-[#FBF8FF]'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('csv')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center space-x-1.5 font-bold transition ${
                      format === 'csv'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-[#E3E1EA] text-[#57657A] hover:bg-[#FBF8FF]'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>CSV (RFC 4180)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('pdf')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center space-x-1.5 font-bold transition ${
                      format === 'pdf'
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : 'border-[#E3E1EA] text-[#57657A] hover:bg-[#FBF8FF]'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>Printable PDF</span>
                  </button>
                </div>
              </div>

              {/* Filter Parameters */}
              <div className="p-3.5 bg-[#FBF8FF] rounded-xl border border-[#E3E1EA] space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1A1B22]">
                  <Filter className="w-3.5 h-3.5 text-[#24389C]" />
                  <span>Report Filter Parameters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Department Filter */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#57657A] mb-1">Department</label>
                    {isSuperAdmin ? (
                      <select
                        value={departmentCode}
                        onChange={(e) => setDepartmentCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E1EA] bg-white font-medium focus:ring-1 focus:ring-[#24389C]"
                      >
                        <option value="ALL">🏛️ All Departments (Consolidated)</option>
                        {departments.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.code} — {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-2.5 py-1.5 rounded-lg border border-[#E3E1EA] bg-slate-100 font-bold text-[#1A1B22]">
                        {userDept} Department (Locked)
                      </div>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#57657A] mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E1EA] bg-white font-mono focus:ring-1 focus:ring-[#24389C]"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#57657A] mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E1EA] bg-white font-mono focus:ring-1 focus:ring-[#24389C]"
                    />
                  </div>
                </div>
              </div>

              {/* Formula Injection Security Badge */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Enterprise Security Guard Active:</span> All CSV and Excel cells are sanitized against CWE-1236 formula injection attacks. Leading symbols (=, +, -, @, \t) are escaped safely.
                </div>
              </div>

              {/* Status & Error Alerts */}
              {exportError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              {exportSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{exportSuccess}</span>
                </div>
              )}
            </>
          ) : (
            /* Historical Export Logs Tab */
            <div className="space-y-2">
              {exportLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#57657A]">
                  No export activity recorded yet.
                </div>
              ) : (
                exportLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border border-[#E3E1EA] bg-[#FBF8FF] flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#1A1B22]">{log.fileName}</span>
                        <span className="px-2 py-0.5 bg-[#DEE0FF] text-[#00105C] font-bold rounded-full text-[10px] uppercase">
                          {log.format}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#57657A] mt-0.5">
                        Generated by {log.requestedByName} ({log.requestedByRole}) • {log.recordCount} rows • {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-[#57657A]">{log.departmentFilter || 'ALL'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E3E1EA] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#F3F2F8] transition"
          >
            Cancel
          </button>

          {activeTab === 'generate' && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="px-5 py-2 rounded-xl bg-[#24389C] text-white text-xs font-bold hover:bg-[#1E2E80] transition shadow-sm flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating Report...' : `Export ${format.toUpperCase()}`}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

