import React, { useState } from 'react';
import { 
  Building2, 
  Briefcase, 
  Calendar, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import { AuthUser, InternshipSetupParams } from '../core/auth/authUser';
import { AppLogo } from './AppLogo';

interface InternshipSetupPageProps {
  currentUser: AuthUser;
  onSubmit: (details: InternshipSetupParams) => Promise<void>;
  isLoading: boolean;
}

export const InternshipSetupPage: React.FC<InternshipSetupPageProps> = ({
  currentUser,
  onSubmit,
  isLoading,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [internshipRole, setInternshipRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }

    if (!internshipRole.trim()) {
      setError('Internship Role is required.');
      return;
    }

    if (!startDate) {
      setError('Start Date is required.');
      return;
    }

    if (!endDate) {
      setError('End Date is required.');
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError('End Date must be chronologically after the Start Date.');
      return;
    }

    try {
      await onSubmit({
        companyName,
        internshipRole,
        startDate,
        endDate,
        description,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to complete internship setup.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8FF] flex flex-col justify-center items-center px-4 py-10 selection:bg-[#DEE0FF]">
      <div className="max-w-xl w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <AppLogo 
              size="lg" 
              showText={true}
              showTagline={true}
              layout="vertical"
              className="mx-auto" 
            />
          </div>
          <p className="text-xs text-[#57657A] font-medium mt-1">Sri Manakula Vinayagar Engineering College (SMVEC)</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#57657A]">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              ✓
            </span>
            <span>Account Registered</span>
          </div>
          <div className="w-12 h-0.5 bg-[#24389C]"></div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#24389C]">
            <span className="w-6 h-6 rounded-full bg-[#24389C] text-white flex items-center justify-center font-bold">
              2
            </span>
            <span>Internship Setup</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 border border-[#E3E1EA] shadow-xl">
          <div className="flex items-start justify-between border-b border-[#E3E1EA] pb-5 mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#24389C] bg-[#DEE0FF] px-2.5 py-0.5 rounded-full">
                Step 2 of 2
              </span>
              <h2 className="text-xl font-bold text-[#1A1B22] mt-2">Internship Placement Details</h2>
              <p className="text-xs text-[#57657A] mt-1">
                Welcome, <strong>{currentUser.name}</strong> ({currentUser.id})! Configure your host organization to activate your workspace.
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#DEE0FF] text-[#00105C] flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Company Name (Manual Text Input - No predefined list) */}
            <div>
              <label className="block font-semibold text-[#1A1B22] mb-1.5">
                Host Company / Organization Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Amazon Web Services, Qualcomm, Zoho, L&T..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                  required
                />
              </div>
              <p className="text-[11px] text-[#757684] mt-1">
                Enter the exact legal or trade name of your host company.
              </p>
            </div>

            {/* Internship Role (Manual Text Input - No predefined list) */}
            <div>
              <label className="block font-semibold text-[#1A1B22] mb-1.5">
                Internship Role / Designation <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={internshipRole}
                  onChange={(e) => setInternshipRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer Intern, RF Design Trainee..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                  required
                />
              </div>
            </div>

            {/* Timeline: Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1B22] mb-1.5">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#757684] absolute left-3.5 top-3" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Internship Description */}
            <div>
              <label className="block font-semibold text-[#1A1B22] mb-1.5">
                Internship Scope & Project Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly outline your primary project objectives, tools/tech stack, and mentor guidelines..."
                rows={3}
                className="w-full p-3 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C] text-xs bg-[#FBF8FF]"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#24389C] hover:bg-[#1E2E80] text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-60"
              >
                {isLoading ? (
                  <span>Saving details...</span>
                ) : (
                  <>
                    <span>Complete Setup & Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
