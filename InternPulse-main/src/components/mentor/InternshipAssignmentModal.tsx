import React, { useState } from 'react';
import { 
  X, 
  Briefcase, 
  Building2, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { StudentRecord } from '../../data/initialData';
import { AuthUser } from '../../core/auth/authUser';
import { locationRepository, LocationRecord } from '../../core/repository/locationRepository';

interface InternshipAssignmentModalProps {
  isOpen: boolean;
  student: StudentRecord | null;
  currentUser: AuthUser;
  onClose: () => void;
  onAssign: (assignment: {
    studentId: string;
    company: string;
    role: string;
    locationId?: string;
    startDate: string;
    endDate: string;
    mentorId?: string;
    mentorName?: string;
    dailyHours?: number;
    monitoringStartTime?: string;
    monitoringEndTime?: string;
  }) => Promise<void>;
}

export const InternshipAssignmentModal: React.FC<InternshipAssignmentModalProps> = ({
  isOpen,
  student,
  currentUser,
  onClose,
  onAssign,
}) => {
  if (!isOpen || !student) return null;

  const approvedLocations: LocationRecord[] = locationRepository.getApprovedLocations();

  const [company, setCompany] = useState(student.company !== 'Not Assigned' && student.company !== 'Unassigned' ? student.company : '');
  const [role, setRole] = useState(student.role || 'Software Intern');
  const [selectedLocationId, setSelectedLocationId] = useState(student.internshipLocationId || approvedLocations[0]?.id || '');
  const initialLoc = approvedLocations.find(l => l.id === (student.internshipLocationId || approvedLocations[0]?.id));
  const [startDate, setStartDate] = useState(student.internshipStartDate || '2026-01-05');
  const [endDate, setEndDate] = useState(student.internshipEndDate || '2026-06-30');
  const [dailyHours, setDailyHours] = useState('8.0');
  const [monitoringStartTime, setMonitoringStartTime] = useState(initialLoc?.monitoringStartTime || '09:00:00');
  const [monitoringEndTime, setMonitoringEndTime] = useState(initialLoc?.monitoringEndTime || '17:00:00');
  const [mentorName, setMentorName] = useState(student.mentor || currentUser.name);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // When location changes, auto-fill company name and schedule
  const handleLocationChange = (locId: string) => {
    setSelectedLocationId(locId);
    const found = approvedLocations.find(l => l.id === locId);
    if (found) {
      setCompany(found.companyName);
      if (found.monitoringStartTime) setMonitoringStartTime(found.monitoringStartTime);
      if (found.monitoringEndTime) setMonitoringEndTime(found.monitoringEndTime);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCompany = company.trim();
    const cleanRole = role.trim();

    if (!cleanCompany) {
      setError('Host company name is required.');
      return;
    }
    if (!cleanRole) {
      setError('Internship role / title is required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError(`End date (${endDate}) cannot precede start date (${startDate}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssign({
        studentId: student.studentId,
        company: cleanCompany,
        role: cleanRole,
        locationId: selectedLocationId || undefined,
        startDate,
        endDate,
        mentorId: currentUser.mentorId || currentUser.id,
        mentorName: mentorName.trim(),
        dailyHours: parseFloat(dailyHours) || 8.0,
        monitoringStartTime,
        monitoringEndTime,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to update internship assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLocation = approvedLocations.find(l => l.id === selectedLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E3E1EA] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-white border-b border-[#E3E1EA] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#DEE0FF] text-[#00105C] flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1B22]">Assign Internship Placement</h3>
              <p className="text-xs text-[#57657A]">
                Student: <strong>{student.studentName}</strong> ({student.studentId}) • {student.dept}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#757684] hover:text-[#1A1B22] hover:bg-[#EFEDF6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-[#1A1B22]">Internship Assigned Successfully!</h4>
            <p className="text-xs text-[#57657A]">
              Placement at <strong>{company}</strong> has been allocated to {student.studentName}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Approved Location Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                Approved Geofence Facility Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#E3E1EA] bg-white font-medium focus:outline-none focus:border-[#24389C]"
              >
                <option value="">-- Select from Approved Host Locations --</option>
                {approvedLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.locationName} ({loc.companyName}) - {loc.geofenceRadiusMeters}m Geofence
                  </option>
                ))}
              </select>
              {selectedLocation && (
                <div className="mt-1.5 p-2 bg-[#FBF8FF] rounded-lg border border-[#E3E1EA] flex items-center space-x-2 text-[11px] text-[#57657A]">
                  <MapPin className="w-3.5 h-3.5 text-[#24389C] shrink-0" />
                  <span className="truncate">{selectedLocation.address}</span>
                  <span className="font-bold text-[#24389C] ml-auto shrink-0">Radius: {selectedLocation.geofenceRadiusMeters}m</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Host Company <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Consultancy Services"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Role Title */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Internship Role / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Engineer Intern"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Monitoring Schedule Start Time */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Monitoring Start Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    step="1"
                    value={monitoringStartTime}
                    onChange={(e) => setMonitoringStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                  />
                </div>
              </div>

              {/* Monitoring Schedule End Time */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Monitoring End Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    step="1"
                    value={monitoringEndTime}
                    onChange={(e) => setMonitoringEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                  />
                </div>
              </div>

              {/* Required Daily Hours */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Required Daily Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>

              {/* Faculty Mentor */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1B22] mb-1">
                  Faculty Guide / Mentor
                </label>
                <input
                  type="text"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E1EA] focus:outline-none focus:border-[#24389C]"
                />
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center space-x-2 text-[11px] text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Assigning this location enables student daily check-in verification against the facility geofence coordinates.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#E3E1EA] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57657A] hover:bg-[#EFEDF6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#24389C] text-white hover:bg-[#1E2E80] disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSubmitting ? <span>Updating Assignment...</span> : <span>Confirm Assignment</span>}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

