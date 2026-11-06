/**
 * Phase 7: InternPulse Geolocation Verification Engine Types
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 */

/**
 * 8 Canonical Verification Result States
 */
export type VerificationResultState =
  | 'WITHIN_GEOFENCE'
  | 'OUTSIDE_GEOFENCE'
  | 'LOCATION_UNAVAILABLE'
  | 'GPS_DISABLED'
  | 'PERMISSION_DENIED'
  | 'LOW_ACCURACY'
  | 'NETWORK_UNAVAILABLE'
  | 'VERIFICATION_PENDING';

export const VERIFICATION_RESULT_STATES: Record<VerificationResultState, VerificationResultState> = {
  WITHIN_GEOFENCE: 'WITHIN_GEOFENCE',
  OUTSIDE_GEOFENCE: 'OUTSIDE_GEOFENCE',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  GPS_DISABLED: 'GPS_DISABLED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  LOW_ACCURACY: 'LOW_ACCURACY',
  NETWORK_UNAVAILABLE: 'NETWORK_UNAVAILABLE',
  VERIFICATION_PENDING: 'VERIFICATION_PENDING',
};

/**
 * Connectivity Status
 */
export type ConnectivityStatus = 'WIFI' | 'CELLULAR' | 'ETHERNET' | 'NONE' | 'UNKNOWN';

/**
 * Permission States
 */
export type PermissionState = 'GRANTED' | 'DENIED' | 'PERMANENTLY_DENIED' | 'RESTRICTED' | 'NOT_DETERMINED';

/**
 * Battery Optimization Restrictiveness
 */
export type BatteryOptimizationState = 'OPTIMIZED' | 'UNRESTRICTED' | 'RESTRICTED' | 'UNKNOWN';

/**
 * Telemetry captured from device
 */
export interface DeviceLocationMeasurement {
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  timestamp: string | Date;
  gpsAvailable: boolean;
  permissionStatus: PermissionState;
  connectivityStatus: ConnectivityStatus;
  batteryOptimizationStatus?: BatteryOptimizationState;
  isMockLocation?: boolean;
}

/**
 * Assigned Workplace Location Target for Internship
 */
export interface AssignedGeofenceTarget {
  assignmentId: string;
  studentId: string;
  locationId: string;
  targetLatitude: number;
  targetLongitude: number;
  geofenceRadiusMeters: number;
  monitoringStartTime?: string; // e.g. "09:00:00"
  monitoringEndTime?: string; // e.g. "18:00:00"
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
  timezone?: string; // default 'Asia/Kolkata'
}

/**
 * Informed Consent Model for Anti-Surveillance Compliance
 */
export interface StudentConsent {
  studentId: string;
  consentGiven: boolean;
  consentTimestamp: string | Date;
  consentVersion: string;
}

/**
 * Complete Evaluation Result containing all 9 Required Fields and Metadata
 */
export interface VerificationEvaluationResult {
  id?: string;
  // 1. Student ID
  studentId: string;
  // 2. Assignment ID
  assignmentId: string;
  // 3. Latitude
  latitude: number | null;
  // 4. Longitude
  longitude: number | null;
  // 5. Accuracy
  accuracy: number | null;
  // 6. Timestamp
  timestamp: string;
  // 7. Distance from assigned location
  distanceFromAssignedLocation: number | null;
  // 8. Geofence radius
  geofenceRadius: number;
  // 9. Verification result
  verificationResult: VerificationResultState;

  // Additional Telemetric and Audit Context
  connectivityStatus: ConnectivityStatus;
  batteryOptimizationStatus?: BatteryOptimizationState;
  consentVerified: boolean;
  withinMonitoringWindow: boolean;
  isMockLocation?: boolean;
  remarks: string;
  createdAt: string;
}

