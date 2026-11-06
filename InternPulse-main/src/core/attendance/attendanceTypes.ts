/**
 * Phase 10: InternPulse Attendance Management & Advanced Reporting Types
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 */

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'late'
  | 'flagged'
  | 'holiday'
  | 'leave';

export type GeofenceStatus = 'verified' | 'out_of_bounds' | 'spoof_detected' | 'pending';

/**
 * Attendance Session Record
 */
export interface AttendanceSession {
  id: string;
  institutionId?: string;
  assignmentId: string;
  studentId: string; // Register number or UUID
  studentName: string;
  departmentCode: string;
  sessionDate: string; // YYYY-MM-DD
  checkInAt?: string | null; // ISO UTC
  checkOutAt?: string | null; // ISO UTC
  scheduledStartTime?: string | null; // "09:00:00"
  scheduledEndTime?: string | null; // "18:00:00"
  totalHours: number;
  requiredHours: number;
  status: AttendanceStatus;
  isVerified: boolean;
  locationId?: string | null;
  locationName?: string | null;
  geofenceStatus?: GeofenceStatus;
  checkInDistanceMeters?: number | null;
  checkOutDistanceMeters?: number | null;
  complianceRate: number; // Percentage (0 - 100)
  offlineQueued: boolean;
  clientTimestamp?: string | null;
  exceptionReason?: string | null;
  notes?: string | null;
  mentorReviewedAt?: string | null;
  mentorReviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Student Daily Internship Summary
 */
export interface DailyInternshipSummary {
  studentId: string;
  studentName: string;
  date: string;
  hasActiveSession: boolean;
  session: AttendanceSession | null;
  status: AttendanceStatus | 'not_checked_in';
  hoursWorked: number;
  requiredHours: number;
  punctuality: 'on_time' | 'late' | 'not_checked_in';
  locationName: string;
  geofenceRadiusMeters: number;
  verificationWindowsCount: number;
  verifiedPings: number;
  missedPings: number;
  outOfBoundsPings: number;
  compliancePercentage: number;
}

/**
 * Department-Level Attendance Analytics
 */
export interface DepartmentAttendanceAnalytics {
  departmentCode: string;
  period: string; // e.g. "2026-03" or "2026-03-05"
  totalInterns: number;
  presentCount: number;
  absentCount: number;
  halfDayCount: number;
  lateCount: number;
  flaggedCount: number;
  averageAttendanceRate: number; // %
  averageDailyHours: number;
  complianceRate: number; // %
  exceptionCount: number;
}

/**
 * Internship Location Attendance Analytics
 */
export interface LocationAttendanceAnalytics {
  locationId: string;
  companyName: string;
  locationName: string;
  geofenceRadiusMeters: number;
  activeInternsCount: number;
  totalHoursLogged: number;
  attendanceRate: number; // %
  geofenceComplianceRate: number; // %
  violationCount: number;
  missedCheckCount: number;
}

/**
 * Attendance Exception Record for Mentor & HOD Review
 */
export interface AttendanceExceptionRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  departmentCode: string;
  sessionDate: string;
  status: AttendanceStatus;
  hoursLogged: number;
  requiredHours: number;
  exceptionType:
    | 'OUT_OF_BOUNDS'
    | 'INCOMPLETE_HOURS'
    | 'LATE_CHECKIN'
    | 'MISSED_VERIFICATIONS'
    | 'UNVERIFIED';
  description: string;
  isReviewed: boolean;
  mentorId?: string;
}

/**
 * Export Formats & Results
 */
export type ExportFormat = 'csv' | 'pdf';

export interface AttendanceExportResult {
  filename: string;
  format: ExportFormat;
  content: string; // Raw CSV string or formatted PDF representation
  mimeType: string;
  recordCount: number;
  generatedAt: string;
}

