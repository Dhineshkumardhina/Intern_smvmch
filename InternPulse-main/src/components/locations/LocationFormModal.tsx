import React, { useState } from 'react';
import { X, Building2, MapPin, Clock, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { LocationRecord } from '../../core/repository/locationRepository';
import { InteractiveGeofenceMap } from './InteractiveGeofenceMap';
import { AuthUser } from '../../core/auth/authUser';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: LocationRecord | null;
  currentUser: AuthUser;
}

const DEPARTMENTS = ['ALL', 'CSEBS', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BME', 'MECT', 'ICE'];

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  currentUser,
}) => {
  const isEditing = Boolean(initialData);

  const [locationName, setLocationName] = useState(initialData?.locationName || '');
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [latitude, setLatitude] = useState(initialData?.latitude || 11.9416);
  const [longitude, setLongitude] = useState(initialData?.longitude || 79.8083);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState(initialData?.geofenceRadiusMeters || 150);
  const [internshipStartDate, setInternshipStartDate] = useState(initialData?.internshipStartDate || '2026-01-05');
  const [internshipEndDate, setInternshipEndDate] = useState(initialData?.internshipEndDate || '2026-06-30');
  const [monitoringStartTime, setMonitoringStartTime] = useState(initialData?.monitoringStartTime || '09:00:00');
  const [monitoringEndTime, setMonitoringEndTime] = useState(initialData?.monitoringEndTime || '17:30:00');
  const [departmentCode, setDepartmentCode] = useState(initialData?.departmentCode || currentUser.departmentCode || 'CSEBS');
  const [status, setStatus] = useState<LocationRecord['status']>(initialData?.status || 'active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!locationName.trim()) {
      setErrorMessage('Location Name is required.');
      return;
    }
    if (!companyName.trim()) {
      setErrorMessage('Company / Host Organization Name is required.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Physical street address is required.');
      return;
    }
    if (latitude < -90 || latitude > 90) {
      setErrorMessage('Latitude must be between -90 and 90 degrees.');
      return;
    }
    if (longitude < -180 || longitude > 180) {
      setErrorMessage('Longitude must be between -180 and 180 degrees.');
      return;
    }
    if (geofenceRadiusMeters < 20 || geofenceRadiusMeters > 5000) {
      setErrorMessage('Geofence Radius must be between 20 meters and 5000 meters.');
      return;
    }
    if (monitoringEndTime <= monitoringStartTime) {
      setErrorMessage('Monitoring End Time must be later than Monitoring Start Time.');
      return;
    }
    if (internshipEndDate < internshipStartDate) {
      setErrorMessage('Internship End Date must be on or after Start Date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        locationName: locationName.trim(),
        companyName: companyName.trim(),
        address: address.trim(),
        latitude,
        longitude,
        geofenceRadiusMeters,
        internshipStartDate,
        internshipEndDate,
        monitoringStartTime,
        monitoringEndTime,
        departmentCode,
        status,
        isActive: status === 'active',
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save internship location.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-[#E3E1EA] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E3E1EA] flex items-center justify-between bg-[#FBF8FF]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#24389C] text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1A1B22]">
                {isEditing ? 'Edit Internship Location & Geofence' : 'Configure New Internship Host Location'}
              </h3>
              <p className="text-xs text-[#57657A]">
                HOD Governance • PostGIS Ellipsoidal Geofencing • Scoped to SMVEC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#E3E1EA] bg-white text-[#57657A] hover:bg-[#EFEDF6] flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Section 1: Basic Identifiers */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#24389C] flex items-center space-x-1.5 border-b border-[#E3E1EA] pb-1.5">
              <Building2 className="w-4 h-4" />
              <span>1. Host Facility & Company Identification</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1">
                  Location / Facility Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TCS Siruseri Innovation Hub"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1">
                  Company / Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Consultancy Services"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1B22] mb-1">
                Full Physical Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="Street address, Tech Park name, City, State, Postal Code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
              />
            </div>
          </div>

          {/* Section 2: Interactive Geofence Map */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#24389C] flex items-center space-x-1.5 border-b border-[#E3E1EA] pb-1.5">
              <MapPin className="w-4 h-4" />
              <span>2. Interactive GPS Coordinates & Geofence Boundary</span>
            </h4>

            <InteractiveGeofenceMap
              latitude={latitude}
              longitude={longitude}
              radiusMeters={geofenceRadiusMeters}
              onCoordinatesChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onRadiusChange={(r) => setGeofenceRadiusMeters(r)}
              isInteractive={true}
              locationName={locationName || companyName}
            />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#57657A] mb-1">
                  Latitude (-90° to +90°)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#57657A] mb-1">
                  Longitude (-180° to +180°)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Monitoring Hours & Internship Duration */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#24389C] flex items-center space-x-1.5 border-b border-[#E3E1EA] pb-1.5">
              <Clock className="w-4 h-4" />
              <span>3. Monitoring Schedule & Academic Term</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-[#24389C]" />
                  <span>Monitoring Start Time (Daily)</span>
                </label>
                <input
                  type="time"
                  required
                  value={monitoringStartTime}
                  onChange={(e) => setMonitoringStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-mono font-semibold focus:outline-none focus:border-[#24389C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-[#24389C]" />
                  <span>Monitoring End Time (Daily)</span>
                </label>
                <input
                  type="time"
                  required
                  value={monitoringEndTime}
                  onChange={(e) => setMonitoringEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-mono font-semibold focus:outline-none focus:border-[#24389C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#24389C]" />
                  <span>Internship Start Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={internshipStartDate}
                  onChange={(e) => setInternshipStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-medium focus:outline-none focus:border-[#24389C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-[#24389C]" />
                  <span>Internship End Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={internshipEndDate}
                  onChange={(e) => setInternshipEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-medium focus:outline-none focus:border-[#24389C]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Department & Status Governance */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#24389C] flex items-center space-x-1.5 border-b border-[#E3E1EA] pb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>4. Department Assignment & Governance Status</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1">
                  Target Engineering Department
                </label>
                <select
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-semibold focus:outline-none focus:border-[#24389C]"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === 'ALL' ? '🏛️ All Departments (Institution-Wide)' : `${dept} Department`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1B22] mb-1">
                  Location Operational Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-semibold focus:outline-none focus:border-[#24389C]"
                >
                  <option value="active">Active (Permits Check-Ins)</option>
                  <option value="pending_approval">Pending HOD Approval</option>
                  <option value="inactive">Inactive (Temporarily Deactivated)</option>
                  <option value="archived">Archived (Historical Record)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-[#EFEDF6] rounded-xl text-xs text-[#57657A] flex items-center justify-between">
              <span>Configured By: <strong>{currentUser.name} (HOD)</strong></span>
              <span className="font-mono text-[10px]">ID: {currentUser.id}</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#E3E1EA] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#E3E1EA] bg-white text-[#57657A] hover:bg-[#EFEDF6] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#24389C] text-white hover:bg-[#1B2B7A] transition-all flex items-center space-x-1.5 shadow-md shadow-[#24389C]/20"
            >
              {isSubmitting ? (
                <span>Saving Location...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save Location Changes' : 'Create & Activate Location'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

