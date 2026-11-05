import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Users, 
  FileText,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { StudentRecord } from '../../data/initialData';
import { AuthUser } from '../../core/auth/authUser';
import { CsvImportValidator, CsvValidationResult } from '../../core/utils/csvImportValidator';

interface BulkStudentImportModalProps {
  isOpen: boolean;
  currentUser: AuthUser;
  existingStudents: StudentRecord[];
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  onCommitImport: (validStudents: Array<Omit<StudentRecord, 'id'>>) => Promise<{ imported: StudentRecord[]; count: number }>;
}

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  isOpen,
  currentUser,
  existingStudents,
  onClose,
  onImportSuccess,
  onCommitImport,
}) => {
  const mentorDept = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle file select
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      runValidation(text);
    };
    reader.readAsText(file);
  };

  // Run live validation using CsvImportValidator
  const runValidation = (text: string) => {
    if (!text.trim()) {
      setValidationResult(null);
      return;
    }
    const result = CsvImportValidator.validate(
      text,
      mentorDept,
      existingStudents,
      currentUser.name,
      currentUser.mentorId || currentUser.id
    );
    setValidationResult(result);
  };

  // Handle manual paste change
  const handlePasteChange = (val: string) => {
    setCsvContent(val);
    runValidation(val);
  };

  // Download sample CSV template
  const handleDownloadSample = () => {
    const sample = CsvImportValidator.generateSampleCsv(mentorDept);
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SMVEC_${mentorDept}_Students_Import_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Commit valid rows
  const handleCommit = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    setIsImporting(true);
    try {
      const payload: Array<Omit<StudentRecord, 'id'>> = validationResult.validRows.map(vr => ({
        studentId: vr.studentId,
        studentName: vr.studentName,
        email: vr.email,
        phone: vr.phone,
        departmentCode: vr.departmentCode,
        dept: vr.departmentCode,
        academicYear: vr.academicYear,
        year: vr.academicYear,
        company: vr.company || 'Unassigned',
        role: vr.role || 'Intern',
        mentorId: currentUser.mentorId || currentUser.id,
        mentor: currentUser.name,
        mentorEmail: currentUser.email,
        status: 'onTrack',
        accountStatus: vr.accountStatus,
        progress: 0,
        hours: 0,
        work: 'Imported via CSV. Ready for placement monitoring.',
      }));

      const res = await onCommitImport(payload);
      setImportSummary(`Successfully imported ${res.count} verified student records for ${mentorDept}!`);
      setTimeout(() => {
        onImportSuccess(res.count);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(`Import error: ${err?.message || 'Failed to complete import.'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-[#E3E1EA] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-white border-b border-[#E3E1EA] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-[#24389C] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1B22]">Bulk Student Import (CSV)</h3>
              <p className="text-xs text-[#57657A]">
                Strict Mentor Scope: <strong className="text-[#24389C]">{mentorDept} Department Only</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadSample}
              className="px-3 py-1.5 rounded-xl border border-[#E3E1EA] text-xs font-semibold text-[#24389C] hover:bg-[#EFEDF6] flex items-center space-x-1.5"
              title="Download pre-formatted CSV template"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#757684] hover:text-[#1A1B22] hover:bg-[#EFEDF6] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {importSummary ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-[#1A1B22]">{importSummary}</h4>
              <p className="text-xs text-[#57657A]">Records persisted and synced across InternPulse.</p>
            </div>
          ) : (
            <>
              {/* Input mode switcher */}
              <div className="flex items-center space-x-2 border-b border-[#E3E1EA] pb-3">
                <button
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    inputMode === 'upload' ? 'bg-[#24389C] text-white' : 'bg-[#EFEDF6] text-[#57657A]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .CSV File</span>
                </button>
                <button
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    inputMode === 'paste' ? 'bg-[#24389C] text-white' : 'bg-[#EFEDF6] text-[#57657A]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste CSV Raw Text</span>
                </button>
              </div>

              {/* Mode 1: File Upload */}
              {inputMode === 'upload' && (
                <div className="border-2 border-dashed border-[#E3E1EA] hover:border-[#24389C] rounded-2xl p-6 text-center transition-all bg-[#FBF8FF]">
                  <Upload className="w-8 h-8 text-[#757684] mx-auto mb-2" />
                  <div className="font-semibold text-sm text-[#1A1B22]">
                    {fileName ? (
                      <span className="text-[#24389C]">{fileName}</span>
                    ) : (
                      'Choose a .csv file to import students'
                    )}
                  </div>
                  <p className="text-xs text-[#57657A] mt-1">
                    Columns required: Register Number, Name, Email, Phone, Department, Academic Year
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="mt-3 text-xs text-[#57657A] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#24389C] file:text-white hover:file:bg-[#1E2E80] cursor-pointer"
                  />
                </div>
              )}

              {/* Mode 2: Paste Raw CSV */}
              {inputMode === 'paste' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#1A1B22]">
                    Paste CSV Data (Include Header Row):
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Register Number,Student Name,Email,Phone,Department,Academic Year&#10;23CSEBS005,Kavitha S,23csebs005@college.edu,+91 98401 22334,CSEBS,3rd Year"
                    value={csvContent}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                  />
                </div>
              )}

              {/* Validation Feedback & Preview Section */}
              {validationResult && (
                <div className="space-y-4 pt-2">
                  
                  {/* Validation Summary Card */}
                  <div className={`p-4 rounded-2xl border ${
                    validationResult.isValid 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : validationResult.validRows.length > 0 
                        ? 'bg-amber-50 border-amber-200 text-amber-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center justify-between font-bold text-xs">
                      <div className="flex items-center space-x-2">
                        {validationResult.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                        <span>
                          Validation Summary: {validationResult.validRows.length} Valid Row(s) • {validationResult.invalidRows.length} Invalid Row(s)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono">Total Rows: {validationResult.totalRows}</span>
                    </div>

                    {validationResult.invalidRows.length > 0 && (
                      <p className="text-[11px] mt-1.5 leading-relaxed text-rose-800">
                        <strong>Important:</strong> Invalid rows will NOT be imported. Review the errors below before proceeding.
                      </p>
                    )}
                  </div>

                  {/* Header Errors if any */}
                  {validationResult.headerErrors.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                      <div className="font-bold flex items-center space-x-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>Column Format Header Error:</span>
                      </div>
                      {validationResult.headerErrors.map((he, i) => (
                        <p key={i} className="text-xs">{he}</p>
                      ))}
                    </div>
                  )}

                  {/* Invalid Rows Detailed Breakdown */}
                  {validationResult.invalidRows.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-rose-700 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Row-Level Errors ({validationResult.invalidRows.length} rows flagged)</span>
                      </h4>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                        {validationResult.invalidRows.map((inv, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900">
                            <div className="font-bold text-xs flex items-center justify-between">
                              <span>Row {inv.rowNumber}:</span>
                              <span className="text-[10px] font-mono opacity-70 truncate max-w-xs">{inv.rawLine}</span>
                            </div>
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-800">
                              {inv.errors.map((err, ei) => (
                                <li key={ei}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valid Rows Preview Table */}
                  {validationResult.validRows.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified Rows Ready to Import ({validationResult.validRows.length})</span>
                      </h4>
                      
                      <div className="border border-[#E3E1EA] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-[#EFEDF6] text-[#57657A] font-semibold sticky top-0">
                            <tr>
                              <th className="p-2">Reg No</th>
                              <th className="p-2">Student Name</th>
                              <th className="p-2">Email</th>
                              <th className="p-2">Phone</th>
                              <th className="p-2">Dept</th>
                              <th className="p-2">Year</th>
                              <th className="p-2">Host Org</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E3E1EA]">
                            {validationResult.validRows.map((v, vi) => (
                              <tr key={vi} className="hover:bg-[#FBF8FF]">
                                <td className="p-2 font-mono font-bold text-[#24389C]">{v.studentId}</td>
                                <td className="p-2 font-medium">{v.studentName}</td>
                                <td className="p-2 font-mono text-[#57657A]">{v.email}</td>
                                <td className="p-2 text-[#57657A]">{v.phone}</td>
                                <td className="p-2 font-bold">{v.departmentCode}</td>
                                <td className="p-2">{v.academicYear}</td>
                                <td className="p-2 text-[#57657A]">{v.company || 'Unassigned'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        {!importSummary && (
          <div className="p-4 bg-[#F4F2FA] border-t border-[#E3E1EA] flex items-center justify-between">
            <div className="text-xs text-[#57657A]">
              {validationResult?.validRows ? (
                <span>
                  <strong>{validationResult.validRows.length}</strong> valid student(s) will be added to <strong>{mentorDept}</strong>.
                </span>
              ) : (
                <span>Upload or paste CSV data to preview.</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#E3E1EA]"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={!validationResult || validationResult.validRows.length === 0 || isImporting}
                onClick={handleCommit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#24389C] text-white hover:bg-[#1E2E80] disabled:opacity-40 flex items-center space-x-1.5"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      Import {validationResult?.validRows.length || 0} Verified Students
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

