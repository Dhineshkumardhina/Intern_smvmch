import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Users, 
  Power, 
  ShieldCheck, 
  Edit3, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { LocationRecord, locationRepository } from '../../core/repository/locationRepository';
import { StudentRecord } from '../../data/initialData';
import { AuthUser } from '../../core/auth/authUser';
import { LocationFormModal } from './LocationFormModal';
import { LocationDetailsModal } from './LocationDetailsModal';

interface HodLocationManagementViewProps {
  currentUser: AuthUser;
  departmentStudents: StudentRecord[];
}

export const HodLocationManagementView: React.FC<HodLocationManagementViewProps> = ({
  currentUser,
  departmentStudents,
}) => {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDept, setFilterDept] = useState<string>('All');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationRecord | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationRecord | null>(null);

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Sync locations from repository
  useEffect(() => {
    const update = () => {
      setLocations(locationRepository.getLocations());
    };
    update();
    const unsubscribe = locationRepository.subscribe(update);
    return () => unsubscribe();
  }, []);

  const departmentCode = currentUser.departmentCode || currentUser.dept?.split(' ')[0] || 'CSEBS';

  // Metrics
  const stats = useMemo(() => {
    const total = locations.length;
    const active = locations.filter((l) => l.status === 'active').length;
    const pending = locations.filter((l) => l.status === 'pending_approval').length;
    const inactive = locations.filter((l) => l.status === 'inactive').length;
    return { total, active, pending, inactive };
  }, [locations]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (filterStatus !== 'All' && loc.status !== filterStatus) {
        return false;
      }
      if (filterDept !== 'All' && loc.departmentCode !== 'ALL' && loc.departmentCode !== filterDept) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          loc.locationName.toLowerCase().includes(q) ||
          loc.companyName.toLowerCase().includes(q) ||
          loc.address.toLowerCase().includes(q) ||
          loc.departmentCode.toLowerCase().includes(q) ||
          loc.status.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [locations, filterStatus, filterDept, searchQuery]);

  // Actions
  const handleSaveLocation = async (data: any) => {
    if (editingLocation) {
      await locationRepository.editLocation(editingLocation.id, data, currentUser);
      showSuccessNotice(`Location '${data.locationName}' updated successfully.`);
    } else {
      await locationRepository.createLocation(data, currentUser);
      showSuccessNotice(`New location '${data.locationName}' created and geofence initialized.`);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const loc = await locationRepository.toggleLocationStatus(id, currentUser);
    showSuccessNotice(`Location '${loc.locationName}' is now ${loc.status.toUpperCase()}.`);
    if (selectedLocation?.id === id) {
      setSelectedLocation(loc);
    }
  };

  const handleApprove = async (id: string) => {
    const loc = await locationRepository.approveLocation(id, currentUser);
    showSuccessNotice(`Location '${loc.locationName}' approved and activated for student check-ins.`);
    if (selectedLocation?.id === id) {
      setSelectedLocation(loc);
    }
  };

  const showSuccessNotice = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Toast */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
              📍 Geospatial Governance
            </span>
            <span className="text-xs text-[#57657A]">PostGIS WGS 84 Ellipsoid Engine</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A1B22] mt-1">
            Host Organization Geofence Management
          </h2>
          <p className="text-xs text-[#57657A] mt-0.5">
            Configure circular geofence perimeters, monitor active check-in windows, and govern approved host facilities.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setEditingLocation(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#24389C] text-white text-xs font-bold rounded-xl hover:bg-[#1B2B7A] transition-all flex items-center space-x-1.5 shadow-md shadow-[#24389C]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Configure New Location</span>
          </button>
        </div>
      </div>

      {/* 4 Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
          <div className="text-[11px] font-semibold text-[#57657A]">Total Configured Sites</div>
          <div className="text-2xl font-bold text-[#1A1B22] mt-1">{stats.total}</div>
          <div className="text-[10px] text-[#57657A] mt-1">Institutional Host Directory</div>
        </div>

        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-800">Active Geofences</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.active}</div>
          <div className="text-[10px] text-emerald-700 mt-1">Accepting GPS Check-Ins</div>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-800">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</div>
          <div className="text-[10px] text-amber-700 font-bold mt-1">Requires HOD Sign-Off</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E3E1EA] shadow-sm">
          <div className="text-[11px] font-semibold text-[#57657A]">Inactive Sites</div>
          <div className="text-2xl font-bold text-[#1A1B22] mt-1">{stats.inactive}</div>
          <div className="text-[10px] text-slate-500 mt-1">Deactivated by HOD</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E1EA] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#757684] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search location, company, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white focus:outline-none focus:border-[#24389C]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#E3E1EA] bg-white font-medium"
          >
            <option value="All">All Departments</option>
            <option value="ALL">Institution-Wide (ALL)</option>
            <option value="CSEBS">CSEBS</option>
            <option value="IT">IT</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="MECH">MECH</option>
            <option value="BME">BME</option>
          </select>

          {(searchQuery || filterStatus !== 'All' || filterDept !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('All');
                setFilterDept('All');
              }}
              className="text-xs font-semibold px-3 py-2 text-[#24389C] border border-[#E3E1EA] rounded-xl hover:bg-[#EFEDF6]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLocations.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-[#57657A] bg-white rounded-2xl border border-[#E3E1EA]">
            <MapPin className="w-8 h-8 text-[#757684] mx-auto mb-2 opacity-50" />
            <p className="font-bold text-sm text-[#1A1B22]">No internship locations match your filter.</p>
            <p className="text-xs text-[#57657A] mt-1">Try resetting the search filters or create a new location.</p>
          </div>
        ) : (
          filteredLocations.map((loc) => {
            const assigned = locationRepository.getAssignedStudents(loc, departmentStudents);
            const isPending = loc.status === 'pending_approval';
            const isActive = loc.status === 'active';

            return (
              <div
                key={loc.id}
                className="bg-white rounded-2xl border border-[#E3E1EA] p-5 shadow-sm hover:border-[#24389C] hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Top Section */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-base text-[#1A1B22] leading-tight">{loc.locationName}</h4>
                      </div>
                      <span className="text-xs font-semibold text-indigo-900 bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100 inline-block mt-1">
                        🏢 {loc.companyName}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        loc.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : loc.status === 'pending_approval'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {loc.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-[#57657A] line-clamp-2 mb-3">{loc.address}</p>

                  {/* Geofence & Timing Metadata Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-[#FBF8FF] p-2.5 rounded-xl border border-[#E3E1EA]">
                      <span className="text-[10px] text-[#57657A] block font-semibold">Geofence Radius</span>
                      <span className="font-mono font-bold text-[#24389C]">{loc.geofenceRadiusMeters} meters</span>
                    </div>

                    <div className="bg-[#FBF8FF] p-2.5 rounded-xl border border-[#E3E1EA]">
                      <span className="text-[10px] text-[#57657A] block font-semibold">Monitoring Hours</span>
                      <span className="font-mono font-bold text-[#1A1B22]">
                        {loc.monitoringStartTime.slice(0, 5)} - {loc.monitoringEndTime.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Students Banner */}
                  <div 
                    onClick={() => {
                      setSelectedLocation(loc);
                      setIsDetailsModalOpen(true);
                    }}
                    className="p-2.5 bg-[#EFEDF6] rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#DEE0FF] transition-all text-xs"
                  >
                    <div className="flex items-center space-x-1.5 font-semibold text-[#1A1B22]">
                      <Users className="w-3.5 h-3.5 text-[#24389C]" />
                      <span>{assigned.length} Interns Assigned</span>
                    </div>
                    <span className="text-[11px] text-[#24389C] font-bold flex items-center space-x-0.5">
                      <span>View Students</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-[#E3E1EA] flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {isPending && (
                      <button
                        onClick={() => handleApprove(loc.id)}
                        className="text-xs font-bold text-white bg-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-all flex items-center space-x-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleStatus(loc.id)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex items-center space-x-1 ${
                        isActive
                          ? 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100'
                          : 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsDetailsModalOpen(true);
                      }}
                      className="text-xs font-semibold text-[#57657A] px-2.5 py-1.5 rounded-lg border border-[#E3E1EA] hover:bg-[#EFEDF6] transition-all"
                    >
                      Details & Map
                    </button>

                    <button
                      onClick={() => {
                        setEditingLocation(loc);
                        setIsFormModalOpen(true);
                      }}
                      className="text-xs font-bold text-[#24389C] px-3 py-1.5 rounded-lg border border-[#24389C] bg-[#DEE0FF]/40 hover:bg-[#DEE0FF] transition-all flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Location Create & Edit Modal */}
      <LocationFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingLocation(null);
        }}
        onSave={handleSaveLocation}
        initialData={editingLocation}
        currentUser={currentUser}
      />

      {/* Location Details & Assigned Students Modal */}
      <LocationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
        assignedStudents={
          selectedLocation ? locationRepository.getAssignedStudents(selectedLocation, departmentStudents) : []
        }
        onEdit={(loc) => {
          setEditingLocation(loc);
          setIsFormModalOpen(true);
        }}
        onApprove={handleApprove}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
};

