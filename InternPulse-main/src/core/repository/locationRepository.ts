import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy, ForbiddenException } from '../auth/rbac/authorizationPolicy';
import { getSupabaseClient } from '../../lib/supabase';
import { StudentRecord, LocationChangeHistoryRecord, canonicalizeInstitutionId } from '../../data/initialData';

export interface LocationRecord {
  id: string;
  institutionId?: string;
  locationName: string;
  companyName: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  internshipStartDate: string;
  internshipEndDate: string;
  monitoringStartTime: string;
  monitoringEndTime: string;
  departmentCode: string;
  status: 'active' | 'inactive' | 'pending_approval';
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_LOCATIONS: LocationRecord[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    locationName: 'TCS Siruseri Innovation Hub',
    companyName: 'Tata Consultancy Services',
    address: 'SIPCOT IT Park, Siruseri, Chennai, Tamil Nadu 603103',
    latitude: 12.8284,
    longitude: 80.2198,
    geofenceRadiusMeters: 200.0,
    internshipStartDate: '2026-01-05',
    internshipEndDate: '2026-06-30',
    monitoringStartTime: '09:00:00',
    monitoringEndTime: '18:00:00',
    departmentCode: 'CSEBS',
    status: 'active',
    isActive: true,
    createdBy: 'HOD_CSEBS',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    approvedBy: 'Dr. R. Senthamilselvan',
    approvedAt: '2026-01-02T10:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    locationName: 'Zoho Estancia Global Technology Center',
    companyName: 'Zoho Corporation',
    address: 'Plot A1, Estancia IT Park, Vallancheri, GST Road, Chengalpattu, Tamil Nadu 603202',
    latitude: 12.8338,
    longitude: 80.0435,
    geofenceRadiusMeters: 250.0,
    internshipStartDate: '2026-01-05',
    internshipEndDate: '2026-06-30',
    monitoringStartTime: '09:00:00',
    monitoringEndTime: '17:30:00',
    departmentCode: 'IT',
    status: 'active',
    isActive: true,
    createdBy: 'HOD_IT',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    approvedBy: 'Dr. M. Sangeetha',
    approvedAt: '2026-01-02T10:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    locationName: 'L&T Technology Services Engineering Hub',
    companyName: 'L&T Technology Services',
    address: 'DLF Cybercity, Mount Poonamallee Road, Manapakkam, Chennai, Tamil Nadu 600089',
    latitude: 13.0163,
    longitude: 80.1772,
    geofenceRadiusMeters: 150.0,
    internshipStartDate: '2026-01-10',
    internshipEndDate: '2026-06-30',
    monitoringStartTime: '08:30:00',
    monitoringEndTime: '17:00:00',
    departmentCode: 'ECE',
    status: 'active',
    isActive: true,
    createdBy: 'HOD_ECE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    approvedBy: 'Dr. S. Jayakumar',
    approvedAt: '2026-01-03T11:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    locationName: 'Renault Nissan Technology R&D Campus',
    companyName: 'Renault Nissan Technology Business Centre',
    address: 'Mahindra World City, Chengalpattu, Tamil Nadu 603004',
    latitude: 12.7215,
    longitude: 79.9926,
    geofenceRadiusMeters: 300.0,
    internshipStartDate: '2026-01-15',
    internshipEndDate: '2026-07-15',
    monitoringStartTime: '08:00:00',
    monitoringEndTime: '16:30:00',
    departmentCode: 'CSEBS',
    status: 'pending_approval',
    isActive: false,
    createdBy: 'HOD_CSEBS',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const LOCATIONS_STORAGE_KEY = 'internpulse_locations_v1';
const LOCATIONS_HISTORY_STORAGE_KEY = 'internpulse_location_history_v1';

export const DEFAULT_LOCATION_HISTORY: LocationChangeHistoryRecord[] = [
  {
    id: 'lch-init-001',
    locationId: 'c0000000-0000-0000-0000-000000000001',
    locationName: 'TCS Siruseri Innovation Hub',
    changedById: 'HOD_CSEBS',
    changedByName: 'Dr. V. Gomathi',
    changeType: 'approved',
    previousState: { status: 'pending_approval' },
    newState: { status: 'active', geofenceRadiusMeters: 200 },
    remarks: 'Approved institutional geofence boundary after site audit.',
    changedAt: '2026-01-02T10:00:00Z',
  },
  {
    id: 'lch-init-002',
    locationId: 'c0000000-0000-0000-0000-000000000002',
    locationName: 'Zoho Estancia Global Technology Center',
    changedById: 'HOD_IT',
    changedByName: 'Dr. M. Auxilia',
    changeType: 'approved',
    previousState: { status: 'pending_approval' },
    newState: { status: 'active', geofenceRadiusMeters: 250 },
    remarks: 'Zoho technology center approved for IT cohort.',
    changedAt: '2026-01-02T10:00:00Z',
  },
];

class LocationRepository {
  private locations: LocationRecord[] = [];
  private changeHistory: LocationChangeHistoryRecord[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        this.locations = [...DEFAULT_LOCATIONS];
        this.changeHistory = [...DEFAULT_LOCATION_HISTORY];
        return;
      }
      const raw = localStorage.getItem(LOCATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.locations = parsed;
        } else {
          this.locations = [...DEFAULT_LOCATIONS];
        }
      } else {
        this.locations = [...DEFAULT_LOCATIONS];
      }

      const rawHistory = localStorage.getItem(LOCATIONS_HISTORY_STORAGE_KEY);
      if (rawHistory) {
        const parsedHistory = JSON.parse(rawHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          this.changeHistory = parsedHistory;
        } else {
          this.changeHistory = [...DEFAULT_LOCATION_HISTORY];
        }
      } else {
        this.changeHistory = [...DEFAULT_LOCATION_HISTORY];
      }
    } catch {
      this.locations = [...DEFAULT_LOCATIONS];
      this.changeHistory = [...DEFAULT_LOCATION_HISTORY];
    }
  }

  private persistToStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
      localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(this.locations));
      localStorage.setItem(LOCATIONS_HISTORY_STORAGE_KEY, JSON.stringify(this.changeHistory));
    } catch (err) {
      console.warn('Failed to persist locations to localStorage', err);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error in location repository listener:', err);
      }
    });
  }

  public getLocations(departmentCode?: string, caller?: AuthUser): LocationRecord[] {
    let list = this.locations;
    if (caller && caller.role !== 'platform_super_admin') {
      const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
      list = list.filter(l => !l.institutionId || canonicalizeInstitutionId(l.institutionId) === callerInst);
    }

    if (!departmentCode || departmentCode === 'ALL') {
      return [...list];
    }
    const cleanDept = departmentCode.trim().toUpperCase();
    return list.filter((l) => (l.departmentCode || '').toUpperCase() === cleanDept);
  }

  public getApprovedLocations(departmentCode?: string, caller?: AuthUser): LocationRecord[] {
    return this.getLocations(departmentCode, caller).filter(
      (l) => l.status === 'active' && l.isActive
    );
  }

  public getLocationById(id: string, caller?: AuthUser): LocationRecord | null {
    const loc = this.locations.find((l) => l.id === id) || null;
    if (loc && caller && caller.role !== 'platform_super_admin') {
      const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
      const locInst = canonicalizeInstitutionId(loc.institutionId);
      if (locInst && callerInst && locInst !== callerInst) {
        throw new ForbiddenException(`Tenant Isolation Violation: Access denied to location '${loc.locationName}' belonging to another institution.`);
      }
    }
    return loc;
  }

  /**
   * Helper: Validate HOD authority for location governance
   */
  private assertHodAuthority(caller: AuthUser, departmentCode?: string): void {
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role !== 'hod' && caller.role !== 'admin' && caller.role !== 'super_admin' && caller.role !== 'platform_super_admin') {
      throw new ForbiddenException(
        `Security Violation: Only authorized HOD users can manage internship locations. Current role: '${caller.role}'`
      );
    }
    if (departmentCode && caller.role === 'hod') {
      const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
      const targetDept = departmentCode.trim().toUpperCase();
      if (callerDept && callerDept !== targetDept) {
        throw new ForbiddenException(
          `Access denied. HOD of '${callerDept}' cannot manage internship locations for department '${targetDept}'.`
        );
      }
    }
  }

  /**
   * 1. Create a new internship location
   */
  public async createLocation(
    locationData: Omit<LocationRecord, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'status' | 'departmentCode'> & { 
      isActive?: boolean; 
      status?: LocationRecord['status']; 
      departmentCode?: string;
    },
    caller: AuthUser
  ): Promise<LocationRecord> {
    const dept = (locationData.departmentCode || caller.departmentCode || 'CSEBS').trim().toUpperCase();
    this.assertHodAuthority(caller, dept);

    // Validate coordinate ranges
    if (locationData.latitude < -90 || locationData.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees.');
    }
    if (locationData.longitude < -180 || locationData.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees.');
    }
    if (locationData.geofenceRadiusMeters < 20 || locationData.geofenceRadiusMeters > 5000) {
      throw new Error('Geofence radius must be between 20 meters and 5000 meters.');
    }
    if (locationData.monitoringEndTime <= locationData.monitoringStartTime) {
      throw new Error('Monitoring end time must be after monitoring start time.');
    }

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `loc_${Date.now()}`;
    const now = new Date().toISOString();
    const status: LocationRecord['status'] = locationData.status || 'pending_approval';
    const isActive = status === 'active';
    // Server-side authoritative institution resolution: Non-platform admins cannot spoof institutionId in payload
    const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college || 'inst-smvec-001');
    const instId = caller.role === 'platform_super_admin'
      ? canonicalizeInstitutionId(locationData.institutionId || callerInst)
      : callerInst;

    const newRecord: LocationRecord = {
      ...locationData,
      id: newId,
      institutionId: instId,
      departmentCode: dept,
      status: status,
      isActive: isActive,
      createdBy: caller.id,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local update
    this.locations.unshift(newRecord);

    // Record creation history
    const historyEntry: LocationChangeHistoryRecord = {
      id: `lch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      locationId: newId,
      locationName: newRecord.locationName,
      changedById: caller.id,
      changedByName: caller.name,
      changeType: 'created',
      previousState: undefined,
      newState: {
        status: newRecord.status,
        latitude: newRecord.latitude,
        longitude: newRecord.longitude,
        geofenceRadiusMeters: newRecord.geofenceRadiusMeters,
        departmentCode: newRecord.departmentCode,
      },
      remarks: `Location created for department ${dept} by ${caller.name}`,
      changedAt: now,
    };
    this.changeHistory.unshift(historyEntry);

    this.persistToStorage();
    this.notify();

    // Supabase persistence
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('internship_locations').insert({
          id: newId,
          location_name: newRecord.locationName,
          company_name: newRecord.companyName,
          address: newRecord.address,
          latitude: newRecord.latitude,
          longitude: newRecord.longitude,
          geofence_radius_meters: newRecord.geofenceRadiusMeters,
          internship_start_date: newRecord.internshipStartDate,
          internship_end_date: newRecord.internshipEndDate,
          monitoring_start_time: newRecord.monitoringStartTime,
          monitoring_end_time: newRecord.monitoringEndTime,
          department_code: newRecord.departmentCode,
          status: newRecord.status,
          is_active: newRecord.isActive,
          created_by: caller.id,
        });

        await client.from('location_change_history').insert({
          id: historyEntry.id,
          location_id: newId,
          changed_by: caller.id,
          change_type: historyEntry.changeType,
          new_state: historyEntry.newState,
          remarks: historyEntry.remarks,
        });
      } catch (err) {
        console.warn('Supabase createLocation insert warning:', err);
      }
    }

    return newRecord;
  }

  /**
   * 2. Edit an existing internship location
   */
  public async editLocation(
    id: string,
    updates: Partial<Omit<LocationRecord, 'id' | 'createdAt'>>,
    caller: AuthUser,
    changeRemarks?: string
  ): Promise<LocationRecord> {
    const index = this.locations.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Location with id ${id} not found.`);
    }

    const current = this.locations[index];
    this.assertHodAuthority(caller, current.departmentCode);

    if (updates.latitude !== undefined && (updates.latitude < -90 || updates.latitude > 90)) {
      throw new Error('Latitude must be between -90 and 90 degrees.');
    }
    if (updates.longitude !== undefined && (updates.longitude < -180 || updates.longitude > 180)) {
      throw new Error('Longitude must be between -180 and 180 degrees.');
    }
    if (updates.geofenceRadiusMeters !== undefined && (updates.geofenceRadiusMeters < 20 || updates.geofenceRadiusMeters > 5000)) {
      throw new Error('Geofence radius must be between 20 meters and 5000 meters.');
    }

    const now = new Date().toISOString();
    const newStatus = updates.status || current.status;
    const newIsActive = updates.isActive !== undefined ? updates.isActive : (updates.status ? updates.status === 'active' : current.isActive);

    const updatedRecord: LocationRecord = {
      ...current,
      ...updates,
      status: newStatus,
      isActive: newIsActive,
      updatedBy: caller.id,
      updatedAt: now,
    };

    this.locations[index] = updatedRecord;

    // Determine changeType
    let cType: LocationChangeHistoryRecord['changeType'] = 'metadata_updated';
    if (updates.status === 'active' && current.status !== 'active') {
      cType = 'approved';
    } else if (updates.status && updates.status !== current.status) {
      cType = 'status_changed';
    } else if (updates.geofenceRadiusMeters && updates.geofenceRadiusMeters !== current.geofenceRadiusMeters) {
      cType = 'geofence_updated';
    } else if ((updates.latitude && updates.latitude !== current.latitude) || (updates.longitude && updates.longitude !== current.longitude)) {
      cType = 'coordinates_updated';
    }

    const historyEntry: LocationChangeHistoryRecord = {
      id: `lch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      locationId: id,
      locationName: updatedRecord.locationName,
      changedById: caller.id,
      changedByName: caller.name,
      changeType: cType,
      previousState: {
        status: current.status,
        latitude: current.latitude,
        longitude: current.longitude,
        geofenceRadiusMeters: current.geofenceRadiusMeters,
      },
      newState: {
        status: updatedRecord.status,
        latitude: updatedRecord.latitude,
        longitude: updatedRecord.longitude,
        geofenceRadiusMeters: updatedRecord.geofenceRadiusMeters,
      },
      remarks: changeRemarks || `Location updated by ${caller.name}`,
      changedAt: now,
    };
    this.changeHistory.unshift(historyEntry);

    this.persistToStorage();
    this.notify();

    // Supabase persistence
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('internship_locations')
          .update({
            location_name: updatedRecord.locationName,
            company_name: updatedRecord.companyName,
            address: updatedRecord.address,
            latitude: updatedRecord.latitude,
            longitude: updatedRecord.longitude,
            geofence_radius_meters: updatedRecord.geofenceRadiusMeters,
            internship_start_date: updatedRecord.internshipStartDate,
            internship_end_date: updatedRecord.internshipEndDate,
            monitoring_start_time: updatedRecord.monitoringStartTime,
            monitoring_end_time: updatedRecord.monitoringEndTime,
            department_code: updatedRecord.departmentCode,
            status: updatedRecord.status,
            is_active: updatedRecord.isActive,
            approved_by: updatedRecord.approvedBy,
            approved_at: updatedRecord.approvedAt,
            updated_at: now,
          })
          .eq('id', id);

        await client.from('location_change_history').insert({
          id: historyEntry.id,
          location_id: id,
          changed_by: caller.id,
          change_type: historyEntry.changeType,
          previous_state: historyEntry.previousState,
          new_state: historyEntry.newState,
          remarks: historyEntry.remarks,
        });
      } catch (err) {
        console.warn('Supabase editLocation update warning:', err);
      }
    }

    return updatedRecord;
  }

  /**
   * 3. Activate and deactivate locations
   */
  public async toggleLocationStatus(id: string, caller: AuthUser): Promise<LocationRecord> {
    const loc = this.getLocationById(id);
    if (!loc) throw new Error(`Location with id ${id} not found.`);
    this.assertHodAuthority(caller, loc.departmentCode);

    const nextStatus = loc.status === 'active' ? 'inactive' : 'active';
    return this.editLocation(id, { status: nextStatus, isActive: nextStatus === 'active' }, caller, `Status toggled to ${nextStatus}`);
  }

  /**
   * 4. Approve internship location
   */
  public async approveLocation(id: string, caller: AuthUser): Promise<LocationRecord> {
    const loc = this.getLocationById(id);
    if (!loc) throw new Error(`Location with id ${id} not found.`);
    this.assertHodAuthority(caller, loc.departmentCode);

    const now = new Date().toISOString();
    return this.editLocation(
      id,
      {
        status: 'active',
        isActive: true,
        approvedBy: caller.name || caller.id,
        approvedAt: now,
      },
      caller,
      `Location approved and activated by ${caller.name}`
    );
  }

  /**
   * 5. View assigned students for a location
   */
  public getAssignedStudents(location: LocationRecord, allStudents: StudentRecord[]): StudentRecord[] {
    const locName = (location.locationName || '').toLowerCase();
    const compName = (location.companyName || '').toLowerCase();

    return allStudents.filter((s) => {
      const studentComp = (s.company || '').toLowerCase();
      return (
        studentComp === compName ||
        studentComp === locName ||
        (locName && studentComp.includes(locName)) ||
        (compName && studentComp.includes(compName))
      );
    });
  }

  /**
   * 6. Query location change history audit log
   */
  public getLocationChangeHistory(locationId?: string, caller?: AuthUser): LocationChangeHistoryRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot inspect location change audit history.');
      }
    }

    if (locationId) {
      const loc = this.getLocationById(locationId);
      if (loc && caller && caller.role === 'hod') {
        const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        if (callerDept && callerDept !== loc.departmentCode.toUpperCase()) {
          throw new ForbiddenException(`Access denied. HOD of '${callerDept}' cannot view history for location in '${loc.departmentCode}'.`);
        }
      }
      return this.changeHistory.filter((h) => h.locationId === locationId);
    }

    if (caller && caller.role === 'hod') {
      const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
      const deptLocIds = new Set(this.locations.filter((l) => l.departmentCode.toUpperCase() === callerDept).map((l) => l.id));
      return this.changeHistory.filter((h) => deptLocIds.has(h.locationId));
    }

    return [...this.changeHistory];
  }

  public resetToDefaults(): void {
    this.locations = DEFAULT_LOCATIONS.map(l => ({ ...l }));
    this.changeHistory = DEFAULT_LOCATION_HISTORY.map(h => ({ ...h }));
    this.persistToStorage();
    this.notify();
  }
}

export const locationRepository = new LocationRepository();
