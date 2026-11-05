import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy, ForbiddenException } from '../auth/rbac/authorizationPolicy';
import { getSupabaseClient } from '../../lib/supabase';
import { StudentRecord } from '../../data/initialData';

export interface LocationRecord {
  id: string;
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
    departmentCode: 'MECH',
    status: 'pending_approval',
    isActive: false,
    createdBy: 'HOD_MECH',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const LOCATIONS_STORAGE_KEY = 'internpulse_locations_v1';

class LocationRepository {
  private locations: LocationRecord[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        this.locations = [...DEFAULT_LOCATIONS];
        return;
      }
      const raw = localStorage.getItem(LOCATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.locations = parsed;
          return;
        }
      }
      this.locations = [...DEFAULT_LOCATIONS];
    } catch {
      this.locations = [...DEFAULT_LOCATIONS];
    }
  }

  private persistToStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
      localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(this.locations));
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

  public getLocations(departmentCode?: string): LocationRecord[] {
    if (!departmentCode || departmentCode === 'ALL') {
      return [...this.locations];
    }
    const cleanDept = departmentCode.trim().toUpperCase();
    return this.locations.filter((l) => (l.departmentCode || '').toUpperCase() === cleanDept);
  }

  public getApprovedLocations(departmentCode?: string): LocationRecord[] {
    return this.getLocations(departmentCode).filter(
      (l) => l.status === 'active' && l.isActive
    );
  }

  public getLocationById(id: string): LocationRecord | null {
    return this.locations.find((l) => l.id === id) || null;
  }

  /**
   * Helper: Validate HOD authority for location governance
   */
  private assertHodAuthority(caller: AuthUser): void {
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role !== 'hod' && caller.role !== 'admin') {
      throw new ForbiddenException(
        `Security Violation: Only authorized HOD users can manage internship locations. Current role: '${caller.role}'`
      );
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
    this.assertHodAuthority(caller);

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
    const dept = locationData.departmentCode || caller.departmentCode || 'CSEBS';

    const newRecord: LocationRecord = {
      ...locationData,
      id: newId,
      departmentCode: dept,
      status: status,
      isActive: isActive,
      createdBy: caller.id,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic local update
    this.locations.unshift(newRecord);
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
    caller: AuthUser
  ): Promise<LocationRecord> {
    this.assertHodAuthority(caller);

    const index = this.locations.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Location with id ${id} not found.`);
    }

    if (updates.latitude !== undefined && (updates.latitude < -90 || updates.latitude > 90)) {
      throw new Error('Latitude must be between -90 and 90 degrees.');
    }
    if (updates.longitude !== undefined && (updates.longitude < -180 || updates.longitude > 180)) {
      throw new Error('Longitude must be between -180 and 180 degrees.');
    }
    if (updates.geofenceRadiusMeters !== undefined && (updates.geofenceRadiusMeters < 20 || updates.geofenceRadiusMeters > 5000)) {
      throw new Error('Geofence radius must be between 20 meters and 5000 meters.');
    }

    const current = this.locations[index];
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
    this.assertHodAuthority(caller);
    const loc = this.getLocationById(id);
    if (!loc) throw new Error(`Location with id ${id} not found.`);

    const nextStatus = loc.status === 'active' ? 'inactive' : 'active';
    return this.editLocation(id, { status: nextStatus, isActive: nextStatus === 'active' }, caller);
  }

  /**
   * 4. Approve internship location
   */
  public async approveLocation(id: string, caller: AuthUser): Promise<LocationRecord> {
    this.assertHodAuthority(caller);

    const now = new Date().toISOString();
    return this.editLocation(
      id,
      {
        status: 'active',
        isActive: true,
        approvedBy: caller.name || caller.id,
        approvedAt: now,
      },
      caller
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

  public resetToDefaults(): void {
    this.locations = [...DEFAULT_LOCATIONS];
    this.persistToStorage();
    this.notify();
  }
}

export const locationRepository = new LocationRepository();
