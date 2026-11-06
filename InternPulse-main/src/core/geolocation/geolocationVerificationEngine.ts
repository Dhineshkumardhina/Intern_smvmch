/**
 * InternPulse Geolocation Verification Engine
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Implements the core geofencing, verification, telemetry evaluation,
 * and safety discrimination logic.
 */

import {
  VerificationResultState,
  DeviceLocationMeasurement,
  AssignedGeofenceTarget,
  StudentConsent,
  VerificationEvaluationResult,
} from './geolocationTypes';
import {
  calculateHaversineDistance,
  isAccuracyAdequate,
  DEFAULT_MAX_ACCURACY_THRESHOLD_METERS,
} from './geospatialCalculator';
import {
  verifyStudentConsent,
  evaluateMonitoringSchedule,
} from './antiSurveillanceGuard';

export interface VerificationEngineOptions {
  maxAccuracyThresholdMeters?: number;
  enforceScheduleBounds?: boolean;
}

export class GeolocationVerificationEngine {
  private maxAccuracyThresholdMeters: number;
  private enforceScheduleBounds: boolean;

  constructor(options: VerificationEngineOptions = {}) {
    this.maxAccuracyThresholdMeters =
      options.maxAccuracyThresholdMeters ?? DEFAULT_MAX_ACCURACY_THRESHOLD_METERS;
    this.enforceScheduleBounds = options.enforceScheduleBounds ?? true;
  }

  /**
   * Main entry point to evaluate a location submission
   */
  public evaluateLocationVerification(
    target: AssignedGeofenceTarget,
    measurement: DeviceLocationMeasurement,
    consent?: StudentConsent | null
  ): VerificationEvaluationResult {
    const timestampStr =
      measurement.timestamp instanceof Date
        ? measurement.timestamp.toISOString()
        : new Date(measurement.timestamp).toISOString();

    const baseResult: Omit<VerificationEvaluationResult, 'verificationResult' | 'distanceFromAssignedLocation' | 'remarks'> = {
      studentId: target.studentId,
      assignmentId: target.assignmentId,
      latitude: measurement.latitude ?? null,
      longitude: measurement.longitude ?? null,
      accuracy: measurement.accuracyMeters ?? null,
      timestamp: timestampStr,
      geofenceRadius: target.geofenceRadiusMeters,
      connectivityStatus: measurement.connectivityStatus,
      batteryOptimizationStatus: measurement.batteryOptimizationStatus,
      consentVerified: verifyStudentConsent(consent),
      withinMonitoringWindow: true,
      isMockLocation: measurement.isMockLocation ?? false,
      createdAt: new Date().toISOString(),
    };

    // 0. Mock Location / GPS Spoofing Check (Anti-Tampering Guard)
    if (measurement.isMockLocation) {
      return {
        ...baseResult,
        distanceFromAssignedLocation: null,
        verificationResult: 'LOCATION_UNAVAILABLE',
        remarks: 'Verification rejected: Mock location provider detected. Physical GPS sensor telemetry is required.',
      };
    }

    // 1. Consent Check (Anti-Surveillance & Privacy Protection)
    if (!baseResult.consentVerified) {
      return {
        ...baseResult,
        distanceFromAssignedLocation: null,
        verificationResult: 'PERMISSION_DENIED',
        remarks: 'Verification blocked: Informed user consent not granted. Continuous surveillance is prohibited.',
      };
    }

    // 2. Monitoring Period Check (Anti-Surveillance)
    if (this.enforceScheduleBounds) {
      const scheduleValidation = evaluateMonitoringSchedule(target, measurement.timestamp);
      baseResult.withinMonitoringWindow = scheduleValidation.isAuthorized;

      if (!scheduleValidation.isAuthorized) {
        return {
          ...baseResult,
          distanceFromAssignedLocation: null,
          verificationResult: 'PERMISSION_DENIED',
          remarks: `Collection rejected: ${scheduleValidation.reason}`,
        };
      }
    }

    // 3. Network Connectivity Check
    // CRITICAL SAFETY RULE: Network failure MUST NEVER produce OUTSIDE_GEOFENCE
    if (measurement.connectivityStatus === 'NONE') {
      return {
        ...baseResult,
        distanceFromAssignedLocation: null,
        verificationResult: 'NETWORK_UNAVAILABLE',
        remarks: 'Network connectivity unavailable; device could not transmit verifiable telemetry.',
      };
    }

    // 4. Permission Status Check
    // CRITICAL SAFETY RULE: Permission denial MUST NEVER produce OUTSIDE_GEOFENCE
    if (measurement.permissionStatus !== 'GRANTED') {
      return {
        ...baseResult,
        distanceFromAssignedLocation: null,
        verificationResult: 'PERMISSION_DENIED',
        remarks: `Location permission not granted by device (Status: ${measurement.permissionStatus}).`,
      };
    }

    // 5. GPS Hardware Availability Check
    // CRITICAL SAFETY RULE: GPS failure MUST NEVER produce OUTSIDE_GEOFENCE
    if (!measurement.gpsAvailable) {
      return {
        ...baseResult,
        distanceFromAssignedLocation: null,
        verificationResult: 'GPS_DISABLED',
        remarks: 'Device location sensor / GPS service is disabled.',
      };
    }

    // 6. Coordinates Presence & Validity Check
    // CRITICAL SAFETY RULE: Unavailable coordinates MUST NEVER produce OUTSIDE_GEOFENCE
    if (
      measurement.latitude === null ||
      measurement.latitude === undefined ||
      measurement.longitude === null ||
      measurement.longitude === undefined ||
      isNaN(measurement.latitude) ||
      isNaN(measurement.longitude)
    ) {
      return {
        ...baseResult,
        distanceFromAssignedLocation: null,
        verificationResult: 'LOCATION_UNAVAILABLE',
        remarks: 'Location coordinates unavailable or timed out.',
      };
    }

    // 7. Accuracy Threshold Check
    // CRITICAL SAFETY RULE: Inadequate accuracy MUST NEVER produce OUTSIDE_GEOFENCE
    if (!isAccuracyAdequate(measurement.accuracyMeters, this.maxAccuracyThresholdMeters)) {
      return {
        ...baseResult,
        distanceFromAssignedLocation: null,
        verificationResult: 'LOW_ACCURACY',
        remarks: `Measurement discarded due to low GPS accuracy (Accuracy: ${measurement.accuracyMeters ?? 'unknown'}m > Threshold: ${this.maxAccuracyThresholdMeters}m).`,
      };
    }

    // 8. Geospatial Distance Calculation
    const distanceMeters = calculateHaversineDistance(
      target.targetLatitude,
      target.targetLongitude,
      measurement.latitude,
      measurement.longitude
    );

    // 9. Boundary Determination
    const isWithin = distanceMeters <= target.geofenceRadiusMeters;
    const verificationResult: VerificationResultState = isWithin
      ? 'WITHIN_GEOFENCE'
      : 'OUTSIDE_GEOFENCE';

    const remarks = isWithin
      ? `Student device verified within assigned workplace geofence (Distance: ${distanceMeters}m <= Radius: ${target.geofenceRadiusMeters}m).`
      : `Student device confirmed outside assigned workplace geofence (Distance: ${distanceMeters}m > Radius: ${target.geofenceRadiusMeters}m).`;

    return {
      ...baseResult,
      distanceFromAssignedLocation: distanceMeters,
      verificationResult,
      remarks,
    };
  }

  /**
   * Helper to instantiate a pending verification
   */
  public createPendingVerification(
    target: AssignedGeofenceTarget,
    timestamp: string | Date = new Date()
  ): VerificationEvaluationResult {
    const timestampStr = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
    return {
      studentId: target.studentId,
      assignmentId: target.assignmentId,
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: timestampStr,
      distanceFromAssignedLocation: null,
      geofenceRadius: target.geofenceRadiusMeters,
      verificationResult: 'VERIFICATION_PENDING',
      connectivityStatus: 'UNKNOWN',
      consentVerified: true,
      withinMonitoringWindow: true,
      remarks: 'Verification request scheduled; awaiting student device telemetry response.',
      createdAt: new Date().toISOString(),
    };
  }
}

export const geolocationVerificationEngine = new GeolocationVerificationEngine();

