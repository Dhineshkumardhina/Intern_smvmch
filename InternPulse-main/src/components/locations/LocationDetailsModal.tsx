import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Power, 
  ExternalLink 
} from 'lucide-react';
import { LocationRecord } from '../../core/repository/locationRepository';
import { StudentRecord } from '../../data/initialData';
import { InteractiveGeofenceMap } from './InteractiveGeofenceMap';

interface LocationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationRecord | null;
  assignedStudents: StudentRecord[];
  onEdit: (loc: LocationRecord) => void;
  onApprove: (id: string) => Promise<void>;
  onToggleStatus: (id: string) => Promise<void>;
}

export const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  isOpen,
  onClose,
  location,
  assignedStudents,
  onEdit,
  onApprove,
  onToggleStatus,
}) => {
  if (!isOpen || !location) return null;

  const isPending = location.status === 'pending_approval';
  const isActive = location.status === 'active';

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-[#E3E1EA] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E3E1EA] flex items-center justify-between bg-[#FBF8FF]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#24389C] text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg text-[#1A1B22]">{location.locationName}</h3>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    location.status === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : location.status === 'pending_approval'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {location.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-[#57657A]">{location.companyName} • {location.departmentCode} Department</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onEdit(location);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E3E1EA] bg-white text-[#24389C] hover:bg-[#DEE0FF] transition-all flex items-center space-x-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-[#E3E1EA] bg-white text-[#57657A] hover:bg-[#EFEDF6] flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          {/* Quick HOD Actions Bar */}
          <div className="p-4 rounded-xl bg-[#FBF8FF] border border-[#E3E1EA] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#24389C]" />
              <span className="font-semibold text-[#1A1B22]">HOD Governance Actions:</span>
            </div>

            <div className="flex items-center space-x-2">
              {isPending && (
                <button
                  onClick={() => onApprove(location.id)}
                  className="px-3 py-1.5 font-bold text-xs bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all flex items-center space-x-1 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Activate Location</span>
                </button>
              )}

              <button
                onClick={() => onToggleStatus(location.id)}
                className={`px-3 py-1.5 font-semibold text-xs rounded-lg border transition-all flex items-center space-x-1 ${
                  isActive
                    ? 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                    : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isActive ? 'Deactivate Location' : 'Activate Location'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Map Display */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#1A1B22] flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-[#24389C]" />
              <span>Geofence Boundary Map</span>
            </h4>
            <InteractiveGeofenceMap
              latitude={location.latitude}
              longitude={location.longitude}
              radiusMeters={location.geofenceRadiusMeters}
              onCoordinatesChange={() => {}}
              isInteractive={false}
              locationName={location.locationName}
            />
          </div>

          {/* Location Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FBF8FF] p-4 rounded-xl border border-[#E3E1EA]">
            <div>
              <span className="text-[#57657A] block font-semibold mb-0.5">Physical Address</span>
              <p className="font-medium text-[#1A1B22]">{location.address}</p>
            </div>

            <div>
              <span className="text-[#57657A] block font-semibold mb-0.5">Geofence Radius & Area</span>
              <p className="font-medium text-[#24389C] font-mono">
                {location.geofenceRadiusMeters} meters circular perimeter
              </p>
            </div>

            <div>
              <span className="text-[#57657A] block font-semibold mb-0.5">Monitoring Active Window</span>
              <p className="font-mono font-medium text-[#1A1B22]">
                {location.monitoringStartTime} – {location.monitoringEndTime}
              </p>
            </div>

            <div>
              <span className="text-[#57657A] block font-semibold mb-0.5">Internship Term Period</span>
              <p className="font-medium text-[#1A1B22]">
                {location.internshipStartDate} to {location.internshipEndDate}
              </p>
            </div>

            <div>
              <span className="text-[#57657A] block font-semibold mb-0.5">Department Assignment</span>
              <p className="font-bold text-[#1A1B22]">{location.departmentCode}</p>
            </div>

            <div>
              <span className="text-[#57657A] block font-semibold mb-0.5">Approval Audit</span>
              <p className="font-medium text-[#57657A]">
                {location.approvedBy ? `Approved by ${location.approvedBy}` : 'Pending HOD sign-off'}
              </p>
            </div>
          </div>

          {/* Section 6: Assigned Students */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E3E1EA] pb-2">
              <h4 className="font-bold text-sm text-[#1A1B22] flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-[#24389C]" />
                <span>Students Assigned to this Host Facility</span>
              </h4>
              <span className="px-2 py-0.5 font-bold text-[#24389C] bg-[#EFEDF6] rounded-md">
                {assignedStudents.length} Assigned Interns
              </span>
            </div>

            {assignedStudents.length === 0 ? (
              <div className="p-6 text-center text-[#57657A] bg-[#FBF8FF] rounded-xl border border-dashed border-[#E3E1EA]">
                No students currently allocated to this location. Use the Assignment Hub to allocate interns.
              </div>
            ) : (
              <div className="divide-y divide-[#E3E1EA] border border-[#E3E1EA] rounded-xl overflow-hidden bg-white">
                {assignedStudents.map((s) => (
                  <div key={s.id} className="p-3.5 flex items-center justify-between hover:bg-[#FBF8FF]">
                    <div>
                      <div className="font-bold text-xs text-[#1A1B22] flex items-center space-x-2">
                        <span>{s.studentName}</span>
                        <span className="font-mono text-[10px] text-[#57657A] bg-[#EFEDF6] px-1.5 py-0.2 rounded">
                          {s.studentId}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#57657A] mt-0.5">
                        Year: {s.year} • Dept: <strong>{s.dept}</strong> • Faculty Mentor: <strong>{s.mentor}</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <div className="text-[11px] font-semibold text-[#1A1B22]">{s.hours} Hours Logged</div>
                        <div className="text-[10px] text-emerald-700 font-bold">{s.progress}% Progress</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E3E1EA] flex justify-end bg-[#FBF8FF]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#E3E1EA] text-[#57657A] hover:bg-[#EFEDF6]"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

