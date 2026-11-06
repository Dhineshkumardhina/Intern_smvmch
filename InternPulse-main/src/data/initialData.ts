export interface StudentRecord {
  id: string;
  studentId: string; // Register Number
  studentName: string;
  institutionId?: string;
  institutionCode?: string;
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
  batchId?: string;
  batchName?: string;
  isFirstLogin?: boolean;
  onboardingStatus?: 'pending_verification' | 'activated' | 'suspended';
  activatedAt?: string;
  importBatchId?: string;
}

export interface MentorRecord {
  id: string;
  name: string;
  email: string;
  institutionId?: string;
  institutionCode?: string;
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
  institutionId?: string;
  institutionCode?: string;
  departmentCode: string;
  phone?: string;
  officeLocation?: string;
}

export interface DepartmentRecord {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  hodId?: string;
  hodName?: string;
  status: 'active' | 'inactive';
  isPilotAuthorized: boolean;
  maxStudentCapacity: number;
  academicHeadName?: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  defaultMonitoringStartTime?: string;
  defaultMonitoringEndTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type InstitutionType = 
  | 'engineering' 
  | 'medical' 
  | 'arts_science' 
  | 'polytechnic' 
  | 'university' 
  | 'standalone_institute';

export type RegistrationRequestStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'suspended' 
  | 'cancelled';

export type ProvisioningStatus = 
  | 'unprovisioned' 
  | 'provisioning' 
  | 'provisioned' 
  | 'failed';

export interface InstitutionRegistrationRequestRecord {
  id: string;
  institutionName: string;
  institutionCode: string;
  institutionType: InstitutionType;
  domain: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  adminDesignation: string;
  status: RegistrationRequestStatus;
  rejectionReason?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  provisioningStatus: ProvisioningStatus;
  provisioningError?: string;
  provisionedInstitutionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAuditLogRecord {
  id: string;
  action: string;
  performedById: string;
  performedByName: string;
  performedByRole: string;
  targetInstitutionId?: string;
  targetInstitutionCode?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PlatformOperationalMetrics {
  totalInstitutions: number;
  activeInstitutions: number;
  suspendedInstitutions: number;
  pendingRegistrationRequests: number;
  approvedRegistrationRequests: number;
  rejectedRegistrationRequests: number;
  totalDepartments: number;
  totalMentors: number;
  totalStudents: number;
  totalActiveAssignments: number;
  totalAttendanceSessions: number;
  totalVerificationsEvaluated: number;
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE';
  calculatedAt: string;
}

export interface InternshipBatchRecord {
  id: string;
  institutionId?: string;
  institutionCode?: string;
  departmentCode: string;
  batchName: string;
  academicYear: string;
  termCode: 'ODD' | 'EVEN' | 'SUMMER';
  semester: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  maxCapacity: number;
  enrolledStudentCount: number;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstitutionRecord {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  domain: string;
  subdomain?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  status: 'provisioning' | 'pilot' | 'active' | 'suspended' | 'inactive' | 'archived';
  brandingConfig?: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    portalTitle: string;
  };
  institutionalSettings?: {
    defaultShiftStart: string;
    defaultShiftEnd: string;
    requiredDailyHours: number;
    verificationWindowsPerDay: number;
    windowDurationMinutes: number;
    complianceThresholdPercentage: number;
    geofenceDefaultRadiusMeters: number;
  };
  dpdpComplianceConfig?: {
    dpoName: string;
    dpoDesignation: string;
    dpoEmail: string;
    dpoAddress: string;
    noticeVersion: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentTransferRecord {
  id: string;
  studentId: string;
  studentName: string;
  fromDepartmentCode: string;
  toDepartmentCode: string;
  authorizedById: string;
  authorizedByName: string;
  reason: string;
  previousBatchId?: string;
  newBatchId?: string;
  academicYear: string;
  transferredAt: string;
}

export interface LocationChangeHistoryRecord {
  id: string;
  locationId: string;
  locationName: string;
  changedById: string;
  changedByName: string;
  changeType: 'created' | 'status_changed' | 'geofence_updated' | 'coordinates_updated' | 'schedule_updated' | 'approved' | 'metadata_updated';
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  remarks?: string;
  changedAt: string;
}

export interface InternshipProviderRecord {
  companyName: string;
  totalLocations: number;
  departmentCount: number;
  participatingDepartments: string[];
  providerStatus: 'active' | 'pending_approval' | 'inactive';
  earliestStartDate: string;
  latestEndDate: string;
  activeInternsCount: number;
  contactEmail?: string;
  contactPhone?: string;
}

export interface StudentImportBatchRecord {
  id: string;
  fileName: string;
  fileFormat: 'csv' | 'xlsx' | 'json';
  fileHash: string;
  uploadedById: string;
  uploadedByName: string;
  targetDepartmentCode: string;
  totalRows: number;
  validRows: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  isDryRun: boolean;
  status: 'pending' | 'dry_run' | 'completed' | 'failed' | 'rolled_back';
  importedStudentIds: string[];
  errorLogJson: Array<{
    rowNumber: number;
    registerNumber?: string;
    columnName?: string;
    invalidValue?: any;
    errorMessage: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

export interface StudentOnboardingTokenRecord {
  id: string;
  studentId: string;
  registerNumber: string;
  email: string;
  tokenHash: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}

export interface ImportValidationError {
  rowNumber: number;
  registerNumber?: string;
  columnName?: string;
  invalidValue?: any;
  errorMessage: string;
}

export interface ImportPreviewResult {
  fileName: string;
  fileFormat: 'csv' | 'xlsx' | 'json';
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  departmentBreakdown: Record<string, number>;
  validSampleRows: Array<{
    registerNumber: string;
    name: string;
    email: string;
    departmentCode: string;
    academicYear: string;
    phone?: string;
    mentorId?: string;
    batchId?: string;
  }>;
  validationErrors: ImportValidationError[];
}

export interface ImportExecutionResult {
  batchId: string;
  status: 'completed' | 'dry_run' | 'failed';
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  isDryRun: boolean;
  generatedTokensCount: number;
  importedStudents: StudentRecord[];
  errors: ImportValidationError[];
  executionTimeMs: number;
}

export interface BulkStudentImportOptions {
  fileName: string;
  fileFormat: 'csv' | 'xlsx' | 'json';
  targetDepartmentCode?: string; // Optional default / override
  dryRun?: boolean;
  duplicateStrategy?: 'skip' | 'update' | 'reject';
  defaultAcademicYear?: string;
  autoAssignMentor?: boolean;
  autoAssignBatch?: boolean;
}

export interface ReportExportLogRecord {
  id: string;
  institutionId?: string;
  institutionCode?: string;
  reportType: 'institution_summary' | 'department_performance' | 'attendance_master' | 'verification_audit' | 'mentor_workload' | 'student_dossier';
  format: 'pdf' | 'csv' | 'xlsx';
  requestedById: string;
  requestedByName: string;
  requestedByRole: string;
  departmentFilter?: string;
  batchFilter?: string;
  startDate?: string;
  endDate?: string;
  recordCount: number;
  fileName: string;
  fileHash?: string;
  createdAt: string;
}

export interface InstitutionAnalyticsSummary {
  totalDepartments: number;
  activeDepartments: number;
  totalStudents: number;
  activeInternships: number;
  completedInternships: number;
  delayedInternships: number;
  atRiskInternships: number;
  completionRate: number;
  totalMentors: number;
  averageMentorRatio: number;
  totalAttendanceSessions: number;
  overallAttendanceRate: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  verificationOutcomes: {
    withinGeofence: number;
    outsideGeofence: number; // Confirmed outside geofence
    missed: number;          // Missed scheduled window
    gpsUnavailable: number;  // Location / GPS sensor disabled
    networkUnavailable: number; // Cellular / Wifi lost
    permissionDenied: number;   // Location permission revoked
    lowAccuracy: number;        // Rejected due to poor satellite lock
    pending: number;            // Awaiting verification submission
    complianceRate: number;
  };
  notificationDelivery: {
    totalDispatched: number;
    deliveredCount: number;
    failedCount: number;
    deliveryRate: number;
    urgentCount: number;
    violationCount: number;
  };
  departmentBreakdown: Array<{
    code: string;
    name: string;
    studentCount: number;
    mentorCount: number;
    activeBatches: number;
    completionRate: number;
    attendanceRate: number;
  }>;
}

export interface DepartmentAnalyticsSummary {
  departmentCode: string;
  departmentName: string;
  totalStudents: number;
  activeBatchesCount: number;
  batches: Array<{
    id: string;
    name: string;
    term: string;
    capacity: number;
    enrolled: number;
    completionRate: number;
  }>;
  mentorWorkload: Array<{
    mentorId: string;
    mentorName: string;
    assignedCount: number;
    capacityStatus: 'optimal' | 'high' | 'available';
  }>;
  attendanceRate: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  pendingApprovals: {
    locationsPending: number;
    studentsPendingVerification: number;
    totalPending: number;
  };
  completionRate: number;
  verificationOutcomes: {
    withinGeofence: number;
    outsideGeofence: number;
    missed: number;
    gpsUnavailable: number;
    networkUnavailable: number;
    permissionDenied: number;
    pending: number;
  };
}

export interface MentorAnalyticsSummary {
  mentorId: string;
  mentorName: string;
  assignedStudentsCount: number;
  assignedStudents: StudentRecord[];
  averageProgress: number;
  attendanceRate: number;
  pendingReviewsCount: number;
  verificationAlerts: Array<{
    id: string;
    studentId: string;
    studentName: string;
    type: string;
    timestamp: string;
    message: string;
  }>;
}

export interface StudentAnalyticsSummary {
  studentId: string;
  studentName: string;
  departmentCode: string;
  company: string;
  mentorName: string;
  progress: number;
  loggedHours: number;
  attendanceRate: number;
  attendanceSessions: Array<any>;
  verificationHistory: Array<any>;
  consentStatus: {
    consentGiven: boolean;
    consentedAt?: string;
    canWithdraw: boolean;
  };
}

export interface AnalyticsExportOptions {
  reportType: 'institution_summary' | 'department_performance' | 'attendance_master' | 'verification_audit' | 'mentor_workload' | 'student_dossier';
  format: 'pdf' | 'csv' | 'xlsx';
  startDate?: string;
  endDate?: string;
  departmentCode?: string;
  batchId?: string;
  studentId?: string;
}

export interface AnalyticsExportResult {
  fileName: string;
  format: 'pdf' | 'csv' | 'xlsx';
  mimeType: string;
  content: string | Uint8Array;
  recordCount: number;
  generatedAt: string;
  fileHash?: string;
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
  institutionId?: string;
  institutionCode?: string;
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

export const DEFAULT_INSTITUTIONS: InstitutionRecord[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    code: 'SMVEC',
    name: 'Sri Manakula Vinayagar Engineering College (Autonomous)',
    shortName: 'SMVEC',
    domain: 'smvec.ac.in',
    subdomain: 'smvec',
    address: 'Madagadipet, Puducherry - 605 107',
    city: 'Puducherry',
    state: 'Puducherry',
    country: 'India',
    contactEmail: 'principal@smvec.ac.in',
    contactPhone: '+91 413 264 3007',
    website: 'https://smvec.ac.in',
    status: 'active',
    brandingConfig: {
      primaryColor: '#1E3A8A',
      secondaryColor: '#0D9488',
      logoUrl: '/assets/smvec-logo.png',
      portalTitle: 'InternPulse SMVEC',
    },
    institutionalSettings: {
      defaultShiftStart: '09:00:00',
      defaultShiftEnd: '17:00:00',
      requiredDailyHours: 8.0,
      verificationWindowsPerDay: 5,
      windowDurationMinutes: 15,
      complianceThresholdPercentage: 75.0,
      geofenceDefaultRadiusMeters: 150.0,
    },
    dpdpComplianceConfig: {
      dpoName: 'Dr. S. Radhakrishnan',
      dpoDesignation: 'Institutional Data Protection Officer',
      dpoEmail: 'grievance.dpo@smvec.ac.in',
      dpoAddress: 'Sri Manakula Vinayagar Engineering College, Madagadipet, Puducherry - 605 107',
      noticeVersion: '2026.1-DPDP',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-11-06T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    code: 'SMVMCH',
    name: 'Sri Manakula Vinayagar Medical College and Hospital',
    shortName: 'SMVMCH',
    domain: 'smvmch.ac.in',
    subdomain: 'smvmch',
    address: 'Kalitheerthalkuppam, Madagadipet, Puducherry - 605 107',
    city: 'Puducherry',
    state: 'Puducherry',
    country: 'India',
    contactEmail: 'dean@smvmch.ac.in',
    contactPhone: '+91 413 264 3000',
    website: 'https://smvmch.ac.in',
    status: 'active',
    brandingConfig: {
      primaryColor: '#065F46',
      secondaryColor: '#0284C7',
      logoUrl: '/assets/smvmch-logo.png',
      portalTitle: 'InternPulse SMVMCH',
    },
    institutionalSettings: {
      defaultShiftStart: '08:00:00',
      defaultShiftEnd: '16:00:00',
      requiredDailyHours: 8.0,
      verificationWindowsPerDay: 4,
      windowDurationMinutes: 15,
      complianceThresholdPercentage: 85.0,
      geofenceDefaultRadiusMeters: 200.0,
    },
    dpdpComplianceConfig: {
      dpoName: 'Dr. K. Rajagopal',
      dpoDesignation: 'Hospital Medical Superintendent & DPO',
      dpoEmail: 'dpo.medical@smvmch.ac.in',
      dpoAddress: 'SMVMCH Campus, Kalitheerthalkuppam, Puducherry - 605 107',
      noticeVersion: '2026.1-MED-DPDP',
    },
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-06T00:00:00Z',
  },
];

export const INITIAL_REGISTRATION_REQUESTS: InstitutionRegistrationRequestRecord[] = [
  {
    id: 'req-00000000-0000-0000-0000-000000000001',
    institutionName: 'Sri Manakula Vinayagar Medical College and Hospital',
    institutionCode: 'SMVMCH',
    institutionType: 'medical',
    domain: 'smvmch.ac.in',
    address: 'Kalitheerthalkuppam, Madagadipet',
    city: 'Puducherry',
    state: 'Puducherry',
    country: 'India',
    postalCode: '605107',
    contactEmail: 'dean@smvmch.ac.in',
    contactPhone: '+91 413 264 3000',
    website: 'https://smvmch.ac.in',
    adminName: 'Dr. SMVMCH Dean',
    adminEmail: 'dean@smvmch.ac.in',
    adminPhone: '+91 413 264 3001',
    adminDesignation: 'Dean & Medical Superintendent',
    status: 'approved',
    reviewedById: 'sysops-root-01',
    reviewedByName: 'Platform Operator Root',
    reviewedAt: '2026-11-01T10:00:00Z',
    provisioningStatus: 'provisioned',
    provisionedInstitutionId: 'a0000000-0000-0000-0000-000000000002',
    createdAt: '2026-11-01T09:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'req-00000000-0000-0000-0000-000000000002',
    institutionName: 'Pondicherry Engineering College',
    institutionCode: 'PEC',
    institutionType: 'engineering',
    domain: 'pec.edu',
    address: 'Pillaichavady, East Coast Road',
    city: 'Puducherry',
    state: 'Puducherry',
    country: 'India',
    postalCode: '605014',
    contactEmail: 'principal@pec.edu',
    contactPhone: '+91 413 265 5281',
    website: 'https://pec.edu',
    adminName: 'Dr. R. Elansezhian',
    adminEmail: 'principal@pec.edu',
    adminPhone: '+91 413 265 5282',
    adminDesignation: 'Principal & Head of Institution',
    status: 'pending',
    provisioningStatus: 'unprovisioned',
    createdAt: '2026-11-06T08:00:00Z',
    updatedAt: '2026-11-06T08:00:00Z',
  },
];

export const INITIAL_PLATFORM_AUDIT_LOGS: PlatformAuditLogRecord[] = [
  {
    id: 'p-audit-001',
    action: 'REGISTRATION_REQUEST_APPROVED',
    performedById: 'sysops-root-01',
    performedByName: 'Platform Operator Root',
    performedByRole: 'platform_super_admin',
    targetInstitutionId: 'a0000000-0000-0000-0000-000000000002',
    targetInstitutionCode: 'SMVMCH',
    details: {
      institutionName: 'Sri Manakula Vinayagar Medical College and Hospital',
      domain: 'smvmch.ac.in',
      adminEmail: 'dean@smvmch.ac.in',
    },
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'p-audit-002',
    action: 'INSTITUTION_PROVISIONED',
    performedById: 'sysops-root-01',
    performedByName: 'Platform Operator Root',
    performedByRole: 'platform_super_admin',
    targetInstitutionId: 'a0000000-0000-0000-0000-000000000002',
    targetInstitutionCode: 'SMVMCH',
    details: {
      departmentsInitialized: ['COMM_MED', 'GEN_MED'],
      status: 'active',
    },
    createdAt: '2026-11-01T10:05:00Z',
  },
];

export function canonicalizeInstitutionId(id?: string): string {
  if (!id) return 'a0000000-0000-0000-0000-000000000001';
  const clean = id.trim().toLowerCase();
  if (clean === 'inst-smvec-001' || clean === 'smvec' || clean === 'a0000000-0000-0000-0000-000000000001') {
    return 'a0000000-0000-0000-0000-000000000001';
  }
  if (clean === 'inst-smvmch-002' || clean === 'smvmch' || clean === 'a0000000-0000-0000-0000-000000000002') {
    return 'a0000000-0000-0000-0000-000000000002';
  }
  return clean;
}

export const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'CSEBS',
    name: 'Computer Science & Business Systems',
    hodId: 'hod-csebs-01',
    hodName: 'Dr. V. Gomathi',
    academicHeadName: 'Dr. V. Gomathi',
    status: 'active',
    isPilotAuthorized: true,
    maxStudentCapacity: 60,
    contactEmail: 'hod.csebs@smvec.ac.in',
    contactPhone: '+91 413 264 3007',
    description: 'Department of Computer Science & Business Systems (AICTE-TCS Joint Program)',
    defaultMonitoringStartTime: '09:00:00',
    defaultMonitoringEndTime: '17:00:00',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'IT',
    name: 'Information Technology',
    hodId: 'hod-it-01',
    hodName: 'Dr. M. Auxilia',
    academicHeadName: 'Dr. M. Auxilia',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 120,
    contactEmail: 'hod.it@smvec.ac.in',
    contactPhone: '+91 413 264 3008',
    description: 'Department of Information Technology',
    defaultMonitoringStartTime: '09:00:00',
    defaultMonitoringEndTime: '17:30:00',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 180,
    contactEmail: 'hod.cse@smvec.ac.in',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 180,
    contactEmail: 'hod.ece@smvec.ac.in',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000005',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'EEE',
    name: 'Electrical & Electronics Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 120,
    contactEmail: 'hod.eee@smvec.ac.in',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000006',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'MECH',
    name: 'Mechanical Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 120,
    contactEmail: 'hod.mech@smvec.ac.in',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000007',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'CIVIL',
    name: 'Civil Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 60,
    contactEmail: 'hod.civil@smvec.ac.in',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000008',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'BME',
    name: 'Biomedical Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 60,
    contactEmail: 'hod.bme@smvec.ac.in',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000009',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'MECT',
    name: 'Mechatronics Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 60,
    contactEmail: 'hod.mect@smvec.ac.in',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000010',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    code: 'ICE',
    name: 'Instrumentation & Control Engineering',
    status: 'active',
    isPilotAuthorized: false,
    maxStudentCapacity: 60,
    contactEmail: 'hod.ice@smvec.ac.in',
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
  institutionId?: string;
  institutionCode?: string;
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
  batchId?: string;
  batchName?: string;
}

export const DEFAULT_INTERNSHIP_BATCHES: InternshipBatchRecord[] = [
  {
    id: 'batch-csebs-2026-even',
    departmentCode: 'CSEBS',
    batchName: '2026 Even Semester Internship Batch A',
    academicYear: '3rd Year',
    termCode: 'EVEN',
    semester: 6,
    startDate: '2026-01-05',
    endDate: '2026-06-30',
    status: 'active',
    maxCapacity: 60,
    enrolledStudentCount: 3,
    createdById: 'HOD_CSEBS',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'batch-it-2026-even',
    departmentCode: 'IT',
    batchName: '2026 Even Semester Internship Cohort 1',
    academicYear: '3rd Year',
    termCode: 'EVEN',
    semester: 6,
    startDate: '2026-01-05',
    endDate: '2026-06-30',
    status: 'active',
    maxCapacity: 60,
    enrolledStudentCount: 2,
    createdById: 'HOD_IT',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'batch-ece-2026-even',
    departmentCode: 'ECE',
    batchName: '2026 Core Embedded Systems Batch',
    academicYear: '3rd Year',
    termCode: 'EVEN',
    semester: 6,
    startDate: '2026-01-10',
    endDate: '2026-06-30',
    status: 'active',
    maxCapacity: 60,
    enrolledStudentCount: 1,
    createdById: 'HOD_ECE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

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
