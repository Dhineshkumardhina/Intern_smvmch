export interface StudentRecord {
  id: string;
  studentId: string; // Register Number
  studentName: string;
  email?: string;
  phone?: string;
  academicYear: string; // '1st Year' | '2nd Year' | '3rd Year' | '4th Year'
  year: string;
  departmentCode: string; // e.g. 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BME', 'MECT', 'ICE', 'CSEBS'
  dept: string;
  company: string; // Host Organization
  mentorId: string; // 'MENTOR_CSEBS_01', etc.
  mentor: string; // Faculty Mentor Name
  mentorEmail?: string;
  role?: string; // Internship Role / Title
  status: 'onTrack' | 'inProgress' | 'delayed' | 'blocked' | 'inactive' | 'completed';
  accountStatus?: 'active' | 'inactive' | 'suspended' | 'pending_approval';
  progress: number; // 0 to 100
  hours: number;
  work: string;
  blocker?: string;
  time?: string;
  internshipLocationId?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
}

export interface MentorRecord {
  id: string;
  name: string;
  email: string;
  departmentCode: string;
  departmentCodes: string[];
  assignedStudentsCount: number;
  capacity: number;
  studentIds?: string[];
  averageProgress?: number;
  atRiskCount?: number;
  designation?: string;
}

export interface HodRecord {
  id: string;
  hodId: string;
  name: string;
  email: string;
  departmentCode: string;
  phone?: string;
  officeLocation?: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  domain: string;
  internCount: number;
  location?: string;
}

export interface AttendanceSessionRecord {
  id: string;
  studentId: string; // Register number
  studentName: string;
  departmentCode: string;
  sessionDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  totalHours: number;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'flagged' | 'holiday' | 'leave';
  isVerified: boolean;
  locationName?: string;
  locationId?: string;
  geofenceStatus?: 'verified' | 'out_of_bounds' | 'spoof_detected' | 'pending';
  accuracyMeters?: number;
  notes?: string;
}

export const MENTOR_ACCOUNTS_MAP: Record<string, string> = {
  'MENTOR_CSEBS_01': 'anitha.mentor@college.edu',
  'MENTOR_IT_01': 'kavitha.mentor@college.edu',
};

export const DEFAULT_HODS: HodRecord[] = [
  {
    id: 'hod-csebs-01',
    hodId: 'HOD_CSEBS',
    name: 'Dr. V. Gomathi',
    email: 'hod.csebs@smvec.ac.in',
    departmentCode: 'CSEBS',
    phone: '+91 94432 11001',
    officeLocation: 'Main Block, Floor 2, Room 204',
  },
  {
    id: 'hod-it-01',
    hodId: 'HOD_IT',
    name: 'Dr. M. Auxilia',
    email: 'hod.it@smvec.ac.in',
    departmentCode: 'IT',
    phone: '+91 94432 11002',
    officeLocation: 'Tech Tower, Floor 1, Room 102',
  },
];

export const DEFAULT_MENTORS: MentorRecord[] = [
  {
    id: 'MENTOR_CSEBS_01',
    name: 'Prof. Anitha Kumar',
    email: 'anitha.mentor@college.edu',
    departmentCode: 'CSEBS',
    departmentCodes: ['CSEBS'],
    assignedStudentsCount: 3,
    capacity: 10,
    designation: 'Assistant Professor',
    studentIds: ['23CSEBS001', '23CSEBS002', '23CSEBS003'],
    averageProgress: 55,
    atRiskCount: 0,
  },
  {
    id: 'MENTOR_IT_01',
    name: 'Dr. S. Kavitha',
    email: 'kavitha.mentor@college.edu',
    departmentCode: 'IT',
    departmentCodes: ['IT'],
    assignedStudentsCount: 2,
    capacity: 10,
    designation: 'Associate Professor',
    studentIds: ['23IT001', '23IT002'],
    averageProgress: 60,
    atRiskCount: 0,
  },
];

// Baseline SMVEC Students across departments
export const DEFAULT_STUDENTS: StudentRecord[] = [
  {
    id: 'st-csebs-001',
    studentId: '23CSEBS001',
    studentName: 'Harish V',
    email: '23csebs001@college.edu',
    phone: '+91 98401 23456',
    academicYear: '3rd Year',
    year: '3rd Year',
    departmentCode: 'CSEBS',
    dept: 'CSEBS',
    company: 'Tata Consultancy Services',
    mentorId: 'MENTOR_CSEBS_01',
    mentor: 'Prof. Anitha Kumar',
    mentorEmail: 'anitha.mentor@college.edu',
    role: 'Software Engineer Intern',
    status: 'onTrack',
    accountStatus: 'active',
    progress: 65,
    hours: 120,
    work: 'Engineered microservices auth modules with JWT verification.',
    time: '10:30 AM',
    internshipLocationId: 'c0000000-0000-0000-0000-000000000001',
    internshipStartDate: '2026-01-05',
    internshipEndDate: '2026-06-30',
  },
  {
    id: 'st-csebs-002',
    studentId: '23CSEBS002',
    studentName: 'Priya Dharshini',
    email: '23csebs002@college.edu',
    phone: '+91 98402 34567',
    academicYear: '3rd Year',
    year: '3rd Year',
    departmentCode: 'CSEBS',
    dept: 'CSEBS',
    company: 'Zoho Corporation',
    mentorId: 'MENTOR_CSEBS_01',
    mentor: 'Prof. Anitha Kumar',
    mentorEmail: 'anitha.mentor@college.edu',
    role: 'Product Development Intern',
    status: 'inProgress',
    accountStatus: 'active',
    progress: 50,
    hours: 95,
    work: 'Designed relational database schemas for high-concurrency CRM.',
    time: '11:15 AM',
    internshipLocationId: 'c0000000-0000-0000-0000-000000000002',
    internshipStartDate: '2026-01-05',
    internshipEndDate: '2026-06-30',
  },
  {
    id: 'st-csebs-003',
    studentId: '23CSEBS003',
    studentName: 'Rahul Sundaram',
    email: '23csebs003@college.edu',
    phone: '+91 98403 45678',
    academicYear: '3rd Year',
    year: '3rd Year',
    departmentCode: 'CSEBS',
    dept: 'CSEBS',
    company: 'Tata Consultancy Services',
    mentorId: 'MENTOR_CSEBS_01',
    mentor: 'Prof. Anitha Kumar',
    mentorEmail: 'anitha.mentor@college.edu',
    role: 'Cloud Operations Intern',
    status: 'delayed',
    accountStatus: 'active',
    progress: 35,
    hours: 70,
    work: 'Configured Kubernetes clusters; facing deployment timeout issues.',
    blocker: 'AWS VPC peering gateway permissions pending approval.',
    time: '09:45 AM',
    internshipLocationId: 'c0000000-0000-0000-0000-000000000001',
    internshipStartDate: '2026-01-05',
    internshipEndDate: '2026-06-30',
  },
  {
    id: 'st-csebs-004',
    studentId: '23CSEBS004',
    studentName: 'Karthik Raja',
    email: '23csebs004@college.edu',
    phone: '+91 98404 56789',
    academicYear: '4th Year',
    year: '4th Year',
    departmentCode: 'CSEBS',
    dept: 'CSEBS',
    company: 'Unassigned',
    mentorId: 'MENTOR_CSEBS_01',
    mentor: 'Prof. Anitha Kumar',
    mentorEmail: 'anitha.mentor@college.edu',
    role: 'Trainee',
    status: 'inactive',
    accountStatus: 'active',
    progress: 0,
    hours: 0,
    work: 'Student registered. Awaiting internship assignment.',
    time: 'Yesterday',
  },
  {
    id: 'st-it-001',
    studentId: '23IT001',
    studentName: 'Dinesh Karthik',
    email: '23it001@college.edu',
    phone: '+91 98405 67890',
    academicYear: '3rd Year',
    year: '3rd Year',
    departmentCode: 'IT',
    dept: 'IT',
    company: 'Zoho Corporation',
    mentorId: 'MENTOR_IT_01',
    mentor: 'Dr. S. Kavitha',
    mentorEmail: 'kavitha.mentor@college.edu',
    role: 'Frontend Engineering Intern',
    status: 'onTrack',
    accountStatus: 'active',
    progress: 70,
    hours: 130,
    work: 'Implemented UI state caching and accessibility components.',
    time: '12:00 PM',
    internshipLocationId: 'c0000000-0000-0000-0000-000000000002',
    internshipStartDate: '2026-01-05',
    internshipEndDate: '2026-06-30',
  },
  {
    id: 'st-it-002',
    studentId: '23IT002',
    studentName: 'Meenakshi Sundaram',
    email: '23it002@college.edu',
    phone: '+91 98406 78901',
    academicYear: '3rd Year',
    year: '3rd Year',
    departmentCode: 'IT',
    dept: 'IT',
    company: 'Zoho Corporation',
    mentorId: 'MENTOR_IT_01',
    mentor: 'Dr. S. Kavitha',
    mentorEmail: 'kavitha.mentor@college.edu',
    role: 'QA Automation Intern',
    status: 'completed',
    accountStatus: 'active',
    progress: 100,
    hours: 160,
    work: 'Delivered Cypress E2E regression test suite for checkout modules.',
    time: '02:30 PM',
    internshipLocationId: 'c0000000-0000-0000-0000-000000000002',
    internshipStartDate: '2026-01-05',
    internshipEndDate: '2026-06-30',
  },
  {
    id: 'st-ece-001',
    studentId: '23ECE001',
    studentName: 'Aravind Swaminathan',
    email: '23ece001@college.edu',
    phone: '+91 98407 89012',
    academicYear: '3rd Year',
    year: '3rd Year',
    departmentCode: 'ECE',
    dept: 'ECE',
    company: 'Lenovo India Pvt Ltd',
    mentorId: 'MENTOR_ECE_01',
    mentor: 'Dr. R. Senthamilselvan',
    role: 'Hardware Embedded Intern',
    status: 'onTrack',
    accountStatus: 'active',
    progress: 55,
    hours: 110,
    work: 'Firmware testing on ARM Cortex microcontrollers.',
    time: '01:15 PM',
    internshipLocationId: 'c0000000-0000-0000-0000-000000000003',
  },
];

export const DEFAULT_ATTENDANCE_SESSIONS: AttendanceSessionRecord[] = [
  {
    id: 'att-sess-001',
    studentId: '23CSEBS001',
    studentName: 'Harish V',
    departmentCode: 'CSEBS',
    sessionDate: '2026-03-01',
    checkInAt: '09:02:14',
    checkOutAt: '17:34:20',
    totalHours: 8.53,
    status: 'present',
    isVerified: true,
    locationName: 'TCS Siruseri Innovation Hub',
    geofenceStatus: 'verified',
    accuracyMeters: 12.4,
    notes: 'Geofence check-in verified within 15 meters of facility center.',
  },
  {
    id: 'att-sess-002',
    studentId: '23CSEBS002',
    studentName: 'Priya Dharshini',
    departmentCode: 'CSEBS',
    sessionDate: '2026-03-01',
    checkInAt: '08:58:30',
    checkOutAt: '17:15:10',
    totalHours: 8.28,
    status: 'present',
    isVerified: true,
    locationName: 'Zoho Estancia Global Technology Center',
    geofenceStatus: 'verified',
    accuracyMeters: 8.1,
    notes: 'Standard morning shift check-in.',
  },
  {
    id: 'att-sess-003',
    studentId: '23CSEBS003',
    studentName: 'Rahul Sundaram',
    departmentCode: 'CSEBS',
    sessionDate: '2026-03-01',
    checkInAt: '09:42:00',
    checkOutAt: '17:05:00',
    totalHours: 7.38,
    status: 'late',
    isVerified: true,
    locationName: 'TCS Siruseri Innovation Hub',
    geofenceStatus: 'verified',
    accuracyMeters: 18.0,
    notes: 'Late arrival due to transit delay. Approved by mentor.',
  },
  {
    id: 'att-sess-004',
    studentId: '23CSEBS001',
    studentName: 'Harish V',
    departmentCode: 'CSEBS',
    sessionDate: '2026-02-28',
    checkInAt: '09:05:00',
    checkOutAt: '17:30:00',
    totalHours: 8.42,
    status: 'present',
    isVerified: true,
    locationName: 'TCS Siruseri Innovation Hub',
    geofenceStatus: 'verified',
    accuracyMeters: 10.2,
  },
  {
    id: 'att-sess-005',
    studentId: '23CSEBS002',
    studentName: 'Priya Dharshini',
    departmentCode: 'CSEBS',
    sessionDate: '2026-02-28',
    checkInAt: '09:12:00',
    checkOutAt: '14:20:00',
    totalHours: 5.13,
    status: 'half_day',
    isVerified: true,
    locationName: 'Zoho Estancia Global Technology Center',
    geofenceStatus: 'verified',
    accuracyMeters: 15.0,
    notes: 'Half day approved for college symposium participation.',
  },
  {
    id: 'att-sess-006',
    studentId: '23IT001',
    studentName: 'Dinesh Karthik',
    departmentCode: 'IT',
    sessionDate: '2026-03-01',
    checkInAt: '08:50:00',
    checkOutAt: '17:20:00',
    totalHours: 8.5,
    status: 'present',
    isVerified: true,
    locationName: 'Zoho Estancia Global Technology Center',
    geofenceStatus: 'verified',
    accuracyMeters: 6.5,
  },
  {
    id: 'att-sess-007',
    studentId: '23IT002',
    studentName: 'Meenakshi Sundaram',
    departmentCode: 'IT',
    sessionDate: '2026-03-01',
    checkInAt: '09:00:00',
    checkOutAt: '17:00:00',
    totalHours: 8.0,
    status: 'present',
    isVerified: true,
    locationName: 'Zoho Estancia Global Technology Center',
    geofenceStatus: 'verified',
    accuracyMeters: 9.0,
  },
];

export interface InternshipAssignmentRecord {
  id: string;
  studentId: string; // Register Number or UUID
  studentName: string;
  departmentCode: string;
  mentorId: string;
  mentorName: string;
  mentorEmail?: string;
  locationId: string;
  locationName: string;
  companyName: string;
  locationAddress: string;
  geofenceRadiusMeters: number;
  latitude: number;
  longitude: number;
  roleTitle: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  monitoringSchedule: {
    startTime: string; // e.g. "09:00:00"
    endTime: string;   // e.g. "17:00:00"
    requiredDailyHours: number; // e.g. 8.0
  };
  assignmentStatus: 'active' | 'completed' | 'terminated' | 'cancelled' | 'on_hold';
  assignedTimestamp: string; // ISO 8601
  assignedBy: string; // Mentor / HOD ID
  notes?: string;
}

export const DEFAULT_ASSIGNMENTS: InternshipAssignmentRecord[] = [
  {
    id: 'asgn-001',
    studentId: '23CSEBS001',
    studentName: 'Harish V',
    departmentCode: 'CSEBS',
    mentorId: 'MENTOR_CSEBS_01',
    mentorName: 'Prof. Anitha Kumar',
    mentorEmail: 'anitha.mentor@college.edu',
    locationId: 'c0000000-0000-0000-0000-000000000001',
    locationName: 'TCS Siruseri Innovation Hub',
    companyName: 'Tata Consultancy Services',
    locationAddress: 'SIPCOT IT Park, Siruseri, Chennai, Tamil Nadu 603103',
    geofenceRadiusMeters: 200.0,
    latitude: 12.8284,
    longitude: 80.2198,
    roleTitle: 'Software Engineer Intern',
    startDate: '2026-01-05',
    endDate: '2026-06-30',
    monitoringSchedule: {
      startTime: '09:00:00',
      endTime: '18:00:00',
      requiredDailyHours: 8.0,
    },
    assignmentStatus: 'active',
    assignedTimestamp: '2026-01-02T10:00:00Z',
    assignedBy: 'MENTOR_CSEBS_01',
    notes: 'Placement confirmed under institutional MOU.',
  },
  {
    id: 'asgn-002',
    studentId: '23CSEBS002',
    studentName: 'Priya Dharshini',
    departmentCode: 'CSEBS',
    mentorId: 'MENTOR_CSEBS_01',
    mentorName: 'Prof. Anitha Kumar',
    mentorEmail: 'anitha.mentor@college.edu',
    locationId: 'c0000000-0000-0000-0000-000000000002',
    locationName: 'Zoho Estancia Global Technology Center',
    companyName: 'Zoho Corporation',
    locationAddress: 'Plot A1, Estancia IT Park, Vallancheri, GST Road, Chengalpattu, Tamil Nadu 603202',
    geofenceRadiusMeters: 250.0,
    latitude: 12.8338,
    longitude: 80.0435,
    roleTitle: 'Product Development Intern',
    startDate: '2026-01-05',
    endDate: '2026-06-30',
    monitoringSchedule: {
      startTime: '09:00:00',
      endTime: '17:30:00',
      requiredDailyHours: 8.0,
    },
    assignmentStatus: 'active',
    assignedTimestamp: '2026-01-02T11:00:00Z',
    assignedBy: 'MENTOR_CSEBS_01',
    notes: 'Zoho School of Technology partnership.',
  },
  {
    id: 'asgn-003',
    studentId: '23IT001',
    studentName: 'Dinesh Karthik',
    departmentCode: 'IT',
    mentorId: 'MENTOR_IT_01',
    mentorName: 'Dr. S. Kavitha',
    mentorEmail: 'kavitha.mentor@college.edu',
    locationId: 'c0000000-0000-0000-0000-000000000002',
    locationName: 'Zoho Estancia Global Technology Center',
    companyName: 'Zoho Corporation',
    locationAddress: 'Plot A1, Estancia IT Park, Vallancheri, GST Road, Chengalpattu, Tamil Nadu 603202',
    geofenceRadiusMeters: 250.0,
    latitude: 12.8338,
    longitude: 80.0435,
    roleTitle: 'Frontend Engineering Intern',
    startDate: '2026-01-05',
    endDate: '2026-06-30',
    monitoringSchedule: {
      startTime: '09:00:00',
      endTime: '17:30:00',
      requiredDailyHours: 8.0,
    },
    assignmentStatus: 'active',
    assignedTimestamp: '2026-01-03T09:30:00Z',
    assignedBy: 'MENTOR_IT_01',
  },
];
