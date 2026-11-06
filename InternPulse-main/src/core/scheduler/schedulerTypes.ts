/**
 * Phase 8: InternPulse Server-Side Randomized Verification Scheduler Types
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 */

import {
  VerificationResultState,
  DeviceLocationMeasurement,
} from '../geolocation/geolocationTypes';

/**
 * 8 Canonical Verification Schedule States
 */
export type ScheduleVerificationState =
  | 'SCHEDULED'
  | 'OPEN'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'MISSED'
  | 'LOCATION_UNAVAILABLE'
  | 'EXPIRED'
  | 'CANCELLED';

export const SCHEDULE_VERIFICATION_STATES: Record<ScheduleVerificationState, ScheduleVerificationState> = {
  SCHEDULED: 'SCHEDULED',
  OPEN: 'OPEN',
  SUBMITTED: 'SUBMITTED',
  VERIFIED: 'VERIFIED',
  MISSED: 'MISSED',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

/**
 * Verification Schedule Window Model
 */
export interface VerificationScheduleWindow {
  id: string;
  institutionId?: string;
  assignmentId: string;
  studentId: string;
  targetDate: string; // YYYY-MM-DD
  windowStart: string; // ISO 8601 UTC
  windowEnd: string; // ISO 8601 UTC
  status: ScheduleVerificationState;
  verificationId?: string | null;
  submissionTimestamp?: string | null;
  notificationDispatchedAt?: string | null;
  retryCount: number;
  maxRetries: number;
  missedReason?: string | null;
  timezone: string;
  windowIndex: number; // 1 to 5
  createdAt: string;
  updatedAt: string;
}

/**
 * Eligible Assignment Model for Scheduling
 */
export interface EligibleAssignment {
  assignmentId: string;
  institutionId?: string;
  studentId: string;
  locationId: string;
  monitoringStartTime: string; // e.g. "09:00:00"
  monitoringEndTime: string; // e.g. "18:00:00"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  assignmentStatus: 'active' | 'pending' | 'completed' | 'suspended' | 'terminated';
  timezone?: string; // Default: 'Asia/Kolkata'
  requiredDailyHours?: number;
}

/**
 * Scheduler Generation Options
 */
export interface ScheduleGenerationOptions {
  windowsPerDay?: number; // Default 5
  windowDurationMinutes?: number; // Default 15
  minBufferBetweenWindowsMinutes?: number; // Default 30
  randomSeed?: number; // Optional seed for determinism in testing
}

/**
 * Notification Record
 */
export interface PushNotificationRecord {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  notificationType: string;
  actionUrl: string;
  payload: Record<string, any>;
  dispatchedAt: string;
}

/**
 * Submission Payload from Student Client
 */
export interface ScheduleSubmissionPayload {
  scheduleId: string;
  studentId: string;
  measurement: DeviceLocationMeasurement;
}

/**
 * Result of a Schedule Submission Attempt
 */
export interface ScheduleSubmissionResponse {
  success: boolean;
  scheduleStatus: ScheduleVerificationState;
  verificationResult?: VerificationResultState;
  retryAllowed: boolean;
  remainingRetries: number;
  message: string;
  scheduleWindow: VerificationScheduleWindow;
}

