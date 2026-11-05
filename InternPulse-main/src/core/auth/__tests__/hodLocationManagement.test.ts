import { describe, it, expect, beforeEach } from 'vitest';
import { locationRepository, LocationRecord } from '../../repository/locationRepository';
import { AuthUser } from '../authUser';
import { StudentRecord } from '../../../data/initialData';

describe('Phase 3: HOD Internship Location Management Tests', () => {
  // Test User Personas
  const hodUser: AuthUser = {
    id: 'user-hod-smvec',
    name: 'Dr. K. Saravanan',
    email: 'saravanan.hod@smvec.ac.in',
    role: 'hod',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const mentorUser: AuthUser = {
    id: 'user-mentor-smvec',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@smvec.ac.in',
    role: 'mentor',
    mentorId: 'MENTOR_CSEBS_01',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const studentUser: AuthUser = {
    id: 'user-student-smvec',
    studentId: '23CSEBS001',
    name: 'Harish V',
    email: '23csebs001@smvec.ac.in',
    role: 'student',
    dept: 'CSEBS Department',
    departmentCode: 'CSEBS',
    college: 'SMVEC',
    isActive: true,
  };

  const sampleStudents: StudentRecord[] = [
    {
      id: 'st-1',
      studentId: '23CSEBS001',
      studentName: 'Harish V',
      email: '23csebs001@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'Tata Consultancy Services',
      mentorId: 'MENTOR_CSEBS_01',
      mentor: 'Prof. Anitha Kumar',
      role: 'Software Intern',
      status: 'onTrack',
      progress: 45,
      hours: 80,
      work: 'Developed OAuth authentication modules.',
    },
    {
      id: 'st-2',
      studentId: '23CSEBS002',
      studentName: 'Priya R',
      email: '23csebs002@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'CSEBS',
      dept: 'CSEBS',
      company: 'Zoho Corporation',
      mentorId: 'MENTOR_CSEBS_01',
      mentor: 'Prof. Anitha Kumar',
      role: 'Cloud Engineering Intern',
      status: 'onTrack',
      progress: 50,
      hours: 90,
      work: 'Worked on microservices telemetry.',
    },
    {
      id: 'st-3',
      studentId: '23IT001',
      studentName: 'Kavitha S',
      email: '23it001@smvec.ac.in',
      academicYear: '3rd Year',
      year: '3rd Year',
      departmentCode: 'IT',
      dept: 'IT',
      company: 'Tata Consultancy Services',
      mentorId: 'MENTOR_IT_01',
      mentor: 'Prof. Balaji S',
      role: 'QA Intern',
      status: 'inProgress',
      progress: 30,
      hours: 50,
      work: 'Automated test suite maintenance.',
    },
  ];

  beforeEach(() => {
    // Reset local store before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // ============================================================================
  // 1. CREATE INTERNSHIP LOCATION
  // ============================================================================
  describe('1. Create Internship Location', () => {
    it('allows authorized HOD to create a valid internship location with all required fields', async () => {
      const newLoc = await locationRepository.createLocation(
        {
          locationName: 'Cognizant Technology Park',
          companyName: 'Cognizant Technology Solutions',
          address: 'Thoraipakkam, OMR, Chennai, Tamil Nadu 600097',
          latitude: 12.9372,
          longitude: 80.2335,
          geofenceRadiusMeters: 250.0,
          internshipStartDate: '2026-02-01',
          internshipEndDate: '2026-07-31',
          monitoringStartTime: '09:00:00',
          monitoringEndTime: '18:00:00',
          departmentCode: 'CSEBS',
          status: 'active',
        },
        hodUser
      );

      expect(newLoc.id).toBeDefined();
      expect(newLoc.locationName).toBe('Cognizant Technology Park');
      expect(newLoc.companyName).toBe('Cognizant Technology Solutions');
      expect(newLoc.geofenceRadiusMeters).toBe(250.0);
      expect(newLoc.status).toBe('active');
      expect(newLoc.isActive).toBe(true);
      expect(newLoc.createdBy).toBe(hodUser.id);
    });

    it('validates coordinate range: rejects latitude outside [-90, +90] (Negative Test)', async () => {
      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Invalid North Pole Site',
            companyName: 'Test Corp',
            address: 'Extreme Latitude',
            latitude: 105.5, // Invalid!
            longitude: 80.0,
            geofenceRadiusMeters: 150.0,
            internshipStartDate: '2026-01-01',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '09:00:00',
            monitoringEndTime: '17:00:00',
            departmentCode: 'CSEBS',
            status: 'active',
          },
          hodUser
        )
      ).rejects.toThrow('Latitude must be between -90 and 90 degrees.');
    });

    it('validates coordinate range: rejects longitude outside [-180, +180] (Negative Test)', async () => {
      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Invalid Longitude Site',
            companyName: 'Test Corp',
            address: 'Extreme Longitude',
            latitude: 12.0,
            longitude: 210.0, // Invalid!
            geofenceRadiusMeters: 150.0,
            internshipStartDate: '2026-01-01',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '09:00:00',
            monitoringEndTime: '17:00:00',
            departmentCode: 'CSEBS',
            status: 'active',
          },
          hodUser
        )
      ).rejects.toThrow('Longitude must be between -180 and 180 degrees.');
    });

    it('validates geofence radius: rejects radius less than 20 meters (Negative Test)', async () => {
      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Micro Geofence Site',
            companyName: 'Test Corp',
            address: 'Test Address',
            latitude: 12.0,
            longitude: 80.0,
            geofenceRadiusMeters: 5.0, // Invalid: < 20m
            internshipStartDate: '2026-01-01',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '09:00:00',
            monitoringEndTime: '17:00:00',
            departmentCode: 'CSEBS',
            status: 'active',
          },
          hodUser
        )
      ).rejects.toThrow('Geofence radius must be between 20 meters and 5000 meters.');
    });

    it('validates monitoring schedule: rejects end time prior to start time (Negative Test)', async () => {
      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Negative Time Site',
            companyName: 'Test Corp',
            address: 'Test Address',
            latitude: 12.0,
            longitude: 80.0,
            geofenceRadiusMeters: 150.0,
            internshipStartDate: '2026-01-01',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '18:00:00',
            monitoringEndTime: '09:00:00', // Invalid: end < start
            departmentCode: 'CSEBS',
            status: 'active',
          },
          hodUser
        )
      ).rejects.toThrow('Monitoring end time must be after monitoring start time.');
    });
  });

  // ============================================================================
  // 2. EDIT INTERNSHIP LOCATION
  // ============================================================================
  describe('2. Edit Internship Location', () => {
    it('allows authorized HOD to update location coordinates, radius, and hours', async () => {
      const locations = locationRepository.getLocations();
      const target = locations[0];

      const updated = await locationRepository.editLocation(
        target.id,
        {
          locationName: `${target.locationName} (Main Campus)`,
          geofenceRadiusMeters: 300.0,
          monitoringEndTime: '18:30:00',
        },
        hodUser
      );

      expect(updated.locationName).toContain('(Main Campus)');
      expect(updated.geofenceRadiusMeters).toBe(300.0);
      expect(updated.monitoringEndTime).toBe('18:30:00');
      expect(updated.updatedBy).toBe(hodUser.id);
    });
  });

  // ============================================================================
  // 3. ACTIVATE AND DEACTIVATE LOCATIONS
  // ============================================================================
  describe('3. Activate and Deactivate Locations', () => {
    it('allows HOD to toggle location between active and inactive states', async () => {
      const locations = locationRepository.getLocations();
      const activeLoc = locations.find((l) => l.status === 'active')!;

      // Deactivate
      const deactivated = await locationRepository.toggleLocationStatus(activeLoc.id, hodUser);
      expect(deactivated.status).toBe('inactive');
      expect(deactivated.isActive).toBe(false);

      // Re-activate
      const reactivated = await locationRepository.toggleLocationStatus(activeLoc.id, hodUser);
      expect(reactivated.status).toBe('active');
      expect(reactivated.isActive).toBe(true);
    });
  });

  // ============================================================================
  // 4. SEARCH LOCATIONS
  // ============================================================================
  describe('4. Search Locations', () => {
    it('retrieves locations filtered by department or institution-wide', () => {
      const csebsLocations = locationRepository.getLocations('CSEBS');
      expect(csebsLocations.length).toBeGreaterThan(0);
      expect(csebsLocations.every((l) => l.departmentCode === 'CSEBS' || l.departmentCode === 'ALL')).toBe(true);
    });

    it('retrieves location by specific ID', () => {
      const all = locationRepository.getLocations();
      const first = all[0];
      const found = locationRepository.getLocationById(first.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(first.id);
    });
  });

  // ============================================================================
  // 5 & 6. VIEW LOCATION DETAILS & ASSIGNED STUDENTS
  // ============================================================================
  describe('5 & 6. View Location Details & Assigned Students', () => {
    it('correctly maps assigned students to their corresponding host location', () => {
      const locations = locationRepository.getLocations();
      const tcsLocation = locations.find((l) => l.companyName.includes('Tata Consultancy'))!;

      const assigned = locationRepository.getAssignedStudents(tcsLocation, sampleStudents);
      expect(assigned).toHaveLength(2); // Harish V and Kavitha S both at TCS
      expect(assigned.some((s) => s.studentName === 'Harish V')).toBe(true);
      expect(assigned.some((s) => s.studentName === 'Kavitha S')).toBe(true);
    });

    it('returns empty array when no students are assigned to host facility', () => {
      const dummyLoc: LocationRecord = {
        id: 'dummy-loc',
        locationName: 'Unassigned Company Labs',
        companyName: 'NonExistent Company',
        address: 'Nowhere',
        latitude: 11.9,
        longitude: 79.8,
        geofenceRadiusMeters: 100,
        internshipStartDate: '2026-01-01',
        internshipEndDate: '2026-06-30',
        monitoringStartTime: '09:00:00',
        monitoringEndTime: '17:00:00',
        departmentCode: 'CSEBS',
        status: 'active',
        isActive: true,
      };

      const assigned = locationRepository.getAssignedStudents(dummyLoc, sampleStudents);
      expect(assigned).toHaveLength(0);
    });
  });

  // ============================================================================
  // 9. APPROVE INTERNSHIP LOCATIONS
  // ============================================================================
  describe('9. Approve Internship Locations', () => {
    it('allows HOD to approve and activate pending internship location', async () => {
      const locations = locationRepository.getLocations();
      const pendingLoc = locations.find((l) => l.status === 'pending_approval')!;

      const approved = await locationRepository.approveLocation(pendingLoc.id, hodUser);
      expect(approved.status).toBe('active');
      expect(approved.isActive).toBe(true);
      expect(approved.approvedBy).toBe(hodUser.name);
      expect(approved.approvedAt).toBeDefined();
    });
  });

  // ============================================================================
  // SECURITY & AUTHORIZATION RESTRICTIONS (HOD EXCLUSIVITY)
  // ============================================================================
  describe('Security & Authorization Restrictions', () => {
    it('strictly forbids mentors from creating internship locations (Negative Test)', async () => {
      await expect(
        locationRepository.createLocation(
          {
            locationName: 'Mentor Created Facility',
            companyName: 'Unauthorized Corp',
            address: 'Puducherry',
            latitude: 11.9,
            longitude: 79.8,
            geofenceRadiusMeters: 150,
            internshipStartDate: '2026-01-01',
            internshipEndDate: '2026-06-30',
            monitoringStartTime: '09:00:00',
            monitoringEndTime: '17:00:00',
            departmentCode: 'CSEBS',
            status: 'active',
          },
          mentorUser
        )
      ).rejects.toThrow('Only authorized HOD users can manage internship locations');
    });

    it('strictly forbids mentors from editing geofence settings (Negative Test)', async () => {
      const locations = locationRepository.getLocations();
      const first = locations[0];

      await expect(
        locationRepository.editLocation(first.id, { geofenceRadiusMeters: 500 }, mentorUser)
      ).rejects.toThrow('Only authorized HOD users can manage internship locations');
    });

    it('strictly forbids mentors from toggling location activation status (Negative Test)', async () => {
      const locations = locationRepository.getLocations();
      const first = locations[0];

      await expect(
        locationRepository.toggleLocationStatus(first.id, mentorUser)
      ).rejects.toThrow('Only authorized HOD users can manage internship locations');
    });

    it('strictly forbids mentors from approving internship locations (Negative Test)', async () => {
      const locations = locationRepository.getLocations();
      const first = locations[0];

      await expect(
        locationRepository.approveLocation(first.id, mentorUser)
      ).rejects.toThrow('Only authorized HOD users can manage internship locations');
    });

    it('strictly forbids students from managing internship locations (Negative Test)', async () => {
      const locations = locationRepository.getLocations();
      const first = locations[0];

      await expect(
        locationRepository.editLocation(first.id, { geofenceRadiusMeters: 1000 }, studentUser)
      ).rejects.toThrow('Only authorized HOD users can manage internship locations');
    });
  });
});

