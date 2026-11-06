import { describe, it, expect, beforeEach } from 'vitest';
import {
  GeolocationVerificationEngine,
  geolocationVerificationEngine,
} from '../../geolocation/geolocationVerificationEngine';
import {
  calculateHaversineDistance,
  calculateVincentyDistance,
  computeOffsetCoordinate,
  isAccuracyAdequate,
  DEFAULT_MAX_ACCURACY_THRESHOLD_METERS,
} from '../../geolocation/geospatialCalculator';
import {
  evaluateMonitoringSchedule,
  verifyStudentConsent,
} from '../../geolocation/antiSurveillanceGuard';
import {
  GeolocationVerificationRepository,
  geolocationVerificationRepository,
} from '../../geolocation/geolocationVerificationRepository';
import {
  AssignedGeofenceTarget,
  DeviceLocationMeasurement,
  StudentConsent,
  VerificationResultState,
  VERIFICATION_RESULT_STATES,
} from '../../geolocation/geolocationTypes';

/**
 * Phase 7: InternPulse Geolocation Verification Engine Comprehensive Test Suite
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Verifies:
 * 1. Boundary Distances (0m, edge -1m, exact radius, edge +1m, far exterior, directional bearings)
 * 2. Accuracy Thresholds (sub-meter, 8.5m, boundary 65m, low accuracy 120m/500m)
 * 3. Failure Conditions & The CRITICAL SAFETY RULE
 * 4. Anti-Surveillance & Informed Consent Controls
 * 5. Required Storage Attributes (all 9 fields)
 * 6. Historical Record Immutability & Audit Trail Preservation
 * 7. Geospatial Mathematical Precision (Haversine vs Vincenty)
 */
describe('Phase 7: Geolocation Verification Engine Test Suite', () => {
  // Test Workplace Target: TCS Siruseri Innovation Hub
  const tcsTarget: AssignedGeofenceTarget = {
    assignmentId: 'asg-tcs-001',
    studentId: '23CSEBS001',
    locationId: 'loc-tcs-001',
    targetLatitude: 12.8284,
    targetLongitude: 80.2198,
    geofenceRadiusMeters: 200.0, // 200m radius
    monitoringStartTime: '09:00:00',
    monitoringEndTime: '18:00:00',
    startDate: '2026-01-05',
    endDate: '2026-06-30',
  };

  // Valid student consent
  const validConsent: StudentConsent = {
    studentId: '23CSEBS001',
    consentGiven: true,
    consentTimestamp: '2026-01-05T08:00:00.000Z',
    consentVersion: 'v1.0-SMVEC-GEOFENCE',
  };

  // Standard valid daytime measurement timestamp (10:30 AM IST = 05:00 UTC)
  const validTimestamp = '2026-03-05T05:00:00.000Z';

  beforeEach(() => {
    geolocationVerificationRepository.resetToDefaults();
  });

  // =========================================================================
  // 1. Result States Completeness & Typing
  // =========================================================================
  describe('1. Result States Completeness & Typing', () => {
    it('defines all 8 canonical verification result states', () => {
      const expectedStates: VerificationResultState[] = [
        'WITHIN_GEOFENCE',
        'OUTSIDE_GEOFENCE',
        'LOCATION_UNAVAILABLE',
        'GPS_DISABLED',
        'PERMISSION_DENIED',
        'LOW_ACCURACY',
        'NETWORK_UNAVAILABLE',
        'VERIFICATION_PENDING',
      ];

      expectedStates.forEach((state) => {
        expect(VERIFICATION_RESULT_STATES[state]).toBe(state);
      });
      expect(Object.keys(VERIFICATION_RESULT_STATES)).toHaveLength(8);
    });
  });

  // =========================================================================
  // 2. Geospatial Mathematics & Boundary Distance Verification
  // =========================================================================
  describe('2. Boundary Distance & Geospatial Calculation', () => {
    it('verifies coordinate centroid (0m distance) is WITHIN_GEOFENCE', () => {
      const measurement: DeviceLocationMeasurement = {
        latitude: tcsTarget.targetLatitude,
        longitude: tcsTarget.targetLongitude,
        accuracyMeters: 5.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('WITHIN_GEOFENCE');
      expect(result.distanceFromAssignedLocation).toBe(0.0);
      expect(result.geofenceRadius).toBe(200.0);
    });

    it('verifies point well inside geofence (50m North) is WITHIN_GEOFENCE', () => {
      const offset = computeOffsetCoordinate(
        tcsTarget.targetLatitude,
        tcsTarget.targetLongitude,
        50.0,
        0.0 // North
      );

      const measurement: DeviceLocationMeasurement = {
        latitude: offset.latitude,
        longitude: offset.longitude,
        accuracyMeters: 8.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('WITHIN_GEOFENCE');
      expect(result.distanceFromAssignedLocation).toBeCloseTo(50.0, 0);
      expect(result.distanceFromAssignedLocation!).toBeLessThanOrEqual(tcsTarget.geofenceRadiusMeters);
    });

    it('verifies boundary edge interior (199m distance, 1m inside radius) is WITHIN_GEOFENCE', () => {
      const offset = computeOffsetCoordinate(
        tcsTarget.targetLatitude,
        tcsTarget.targetLongitude,
        199.0,
        90.0 // East
      );

      const measurement: DeviceLocationMeasurement = {
        latitude: offset.latitude,
        longitude: offset.longitude,
        accuracyMeters: 10.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('WITHIN_GEOFENCE');
      expect(result.distanceFromAssignedLocation!).toBeLessThanOrEqual(200.0);
    });

    it('verifies exact boundary circumference (200.0m) is WITHIN_GEOFENCE', () => {
      const offset = computeOffsetCoordinate(
        tcsTarget.targetLatitude,
        tcsTarget.targetLongitude,
        200.0,
        180.0 // South
      );

      const measurement: DeviceLocationMeasurement = {
        latitude: offset.latitude,
        longitude: offset.longitude,
        accuracyMeters: 6.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('WITHIN_GEOFENCE');
      expect(result.distanceFromAssignedLocation).toBeCloseTo(200.0, 0);
    });

    it('verifies boundary edge exterior (201.0m, 1m outside radius) is OUTSIDE_GEOFENCE', () => {
      const offset = computeOffsetCoordinate(
        tcsTarget.targetLatitude,
        tcsTarget.targetLongitude,
        201.0,
        270.0 // West
      );

      const measurement: DeviceLocationMeasurement = {
        latitude: offset.latitude,
        longitude: offset.longitude,
        accuracyMeters: 5.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('OUTSIDE_GEOFENCE');
      expect(result.distanceFromAssignedLocation!).toBeGreaterThan(tcsTarget.geofenceRadiusMeters);
    });

    it('verifies distant outside location (1500m distance) is OUTSIDE_GEOFENCE', () => {
      const offset = computeOffsetCoordinate(
        tcsTarget.targetLatitude,
        tcsTarget.targetLongitude,
        1500.0,
        45.0 // Northeast
      );

      const measurement: DeviceLocationMeasurement = {
        latitude: offset.latitude,
        longitude: offset.longitude,
        accuracyMeters: 12.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('OUTSIDE_GEOFENCE');
      expect(result.distanceFromAssignedLocation).toBeCloseTo(1500.0, 0);
    });

    it('verifies omni-directional consistency across 8 cardinal & intercardinal bearings', () => {
      const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
      const testDistance = 150.0; // 150m (inside 200m)

      bearings.forEach((bearing) => {
        const offset = computeOffsetCoordinate(
          tcsTarget.targetLatitude,
          tcsTarget.targetLongitude,
          testDistance,
          bearing
        );

        const dist = calculateHaversineDistance(
          tcsTarget.targetLatitude,
          tcsTarget.targetLongitude,
          offset.latitude,
          offset.longitude
        );

        expect(dist).toBeCloseTo(testDistance, 0);
      });
    });

    it('compares Haversine distance against Vincenty ellipsoidal geodesic formula', () => {
      // TCS Siruseri to Zoho Estancia (~19.1 km)
      const lat1 = 12.8284;
      const lon1 = 80.2198;
      const lat2 = 12.8338;
      const lon2 = 80.0435;

      const haversineDist = calculateHaversineDistance(lat1, lon1, lat2, lon2);
      const vincentyDist = calculateVincentyDistance(lat1, lon1, lat2, lon2);

      // Both should calculate distance within 0.5% agreement over ~19 km
      const percentDiff = Math.abs(haversineDist - vincentyDist) / vincentyDist;
      expect(percentDiff).toBeLessThan(0.005);
      expect(haversineDist).toBeGreaterThan(19000);
      expect(haversineDist).toBeLessThan(19300);
    });
  });

  // =========================================================================
  // 3. Accuracy Threshold Evaluation
  // =========================================================================
  describe('3. Accuracy Threshold Evaluation', () => {
    it('accepts high-precision GPS fixes (sub-meter and typical 5-15m)', () => {
      expect(isAccuracyAdequate(0.8)).toBe(true);
      expect(isAccuracyAdequate(5.4)).toBe(true);
      expect(isAccuracyAdequate(15.0)).toBe(true);
    });

    it('accepts accuracy up to maximum institutional threshold (65.0m)', () => {
      expect(isAccuracyAdequate(DEFAULT_MAX_ACCURACY_THRESHOLD_METERS)).toBe(true);
      expect(isAccuracyAdequate(64.9)).toBe(true);
    });

    it('rejects low accuracy fixes exceeding threshold (e.g. 70m, 150m, 500m) as LOW_ACCURACY', () => {
      expect(isAccuracyAdequate(65.1)).toBe(false);
      expect(isAccuracyAdequate(150.0)).toBe(false);
      expect(isAccuracyAdequate(500.0)).toBe(false);

      const lowAccuracyMeasurement: DeviceLocationMeasurement = {
        latitude: tcsTarget.targetLatitude,
        longitude: tcsTarget.targetLongitude,
        accuracyMeters: 120.0, // Exceeds 65m threshold
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        lowAccuracyMeasurement,
        validConsent
      );

      expect(result.verificationResult).toBe('LOW_ACCURACY');
      expect(result.distanceFromAssignedLocation).toBeNull();
      expect(result.accuracy).toBe(120.0);
    });

    it('rejects null or negative accuracy as LOW_ACCURACY', () => {
      expect(isAccuracyAdequate(null)).toBe(false);
      expect(isAccuracyAdequate(undefined)).toBe(false);
      expect(isAccuracyAdequate(-5)).toBe(false);

      const nullAccuracyMeasurement: DeviceLocationMeasurement = {
        latitude: tcsTarget.targetLatitude,
        longitude: tcsTarget.targetLongitude,
        accuracyMeters: null,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        nullAccuracyMeasurement,
        validConsent
      );

      expect(result.verificationResult).toBe('LOW_ACCURACY');
    });

    it('supports custom engine accuracy threshold configurations', () => {
      const strictEngine = new GeolocationVerificationEngine({ maxAccuracyThresholdMeters: 25.0 });

      const measurement: DeviceLocationMeasurement = {
        latitude: tcsTarget.targetLatitude,
        longitude: tcsTarget.targetLongitude,
        accuracyMeters: 30.0, // > 25m threshold
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = strictEngine.evaluateLocationVerification(tcsTarget, measurement, validConsent);
      expect(result.verificationResult).toBe('LOW_ACCURACY');
    });
  });

  // =========================================================================
  // 4. CRITICAL SAFETY RULE & Failure Condition Tests
  // =========================================================================
  describe('4. CRITICAL SAFETY RULE & Failure Conditions', () => {
    it('SAFETY RULE: GPS disabled sensor NEVER produces OUTSIDE_GEOFENCE', () => {
      const measurement: DeviceLocationMeasurement = {
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        timestamp: validTimestamp,
        gpsAvailable: false, // GPS turned off in Android/iOS settings
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('GPS_DISABLED');
      expect(result.verificationResult).not.toBe('OUTSIDE_GEOFENCE');
      expect(result.distanceFromAssignedLocation).toBeNull();
    });

    it('SAFETY RULE: Network failure NEVER produces OUTSIDE_GEOFENCE', () => {
      const measurement: DeviceLocationMeasurement = {
        latitude: 12.8284,
        longitude: 80.2198,
        accuracyMeters: 5.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'NONE', // Device is offline / no cellular or wifi
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('NETWORK_UNAVAILABLE');
      expect(result.verificationResult).not.toBe('OUTSIDE_GEOFENCE');
      expect(result.distanceFromAssignedLocation).toBeNull();
    });

    it('SAFETY RULE: Permission denial NEVER produces OUTSIDE_GEOFENCE', () => {
      const deniedStates: Array<DeviceLocationMeasurement['permissionStatus']> = [
        'DENIED',
        'PERMANENTLY_DENIED',
        'RESTRICTED',
      ];

      deniedStates.forEach((permState) => {
        const measurement: DeviceLocationMeasurement = {
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          timestamp: validTimestamp,
          gpsAvailable: true,
          permissionStatus: permState,
          connectivityStatus: 'WIFI',
        };

        const result = geolocationVerificationEngine.evaluateLocationVerification(
          tcsTarget,
          measurement,
          validConsent
        );

        expect(result.verificationResult).toBe('PERMISSION_DENIED');
        expect(result.verificationResult).not.toBe('OUTSIDE_GEOFENCE');
        expect(result.distanceFromAssignedLocation).toBeNull();
      });
    });

    it('SAFETY RULE: Unavailable or timed-out location coordinates NEVER produce OUTSIDE_GEOFENCE', () => {
      const measurement: DeviceLocationMeasurement = {
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('LOCATION_UNAVAILABLE');
      expect(result.verificationResult).not.toBe('OUTSIDE_GEOFENCE');
      expect(result.distanceFromAssignedLocation).toBeNull();
    });

    it('SAFETY RULE: A distant position with LOW ACCURACY must yield LOW_ACCURACY, NEVER OUTSIDE_GEOFENCE', () => {
      // 5 km away from assigned site, but accuracy error is 300m (> 65m threshold)
      const distantOffset = computeOffsetCoordinate(
        tcsTarget.targetLatitude,
        tcsTarget.targetLongitude,
        5000.0,
        90.0
      );

      const measurement: DeviceLocationMeasurement = {
        latitude: distantOffset.latitude,
        longitude: distantOffset.longitude,
        accuracyMeters: 300.0, // High uncertainty / cell tower triangulation
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      // Even though coordinates are 5km away, uncertainty is too high to confirm a violation!
      expect(result.verificationResult).toBe('LOW_ACCURACY');
      expect(result.verificationResult).not.toBe('OUTSIDE_GEOFENCE');
    });

    it('creates VERIFICATION_PENDING placeholder state during asynchronous verification', () => {
      const pendingResult = geolocationVerificationEngine.createPendingVerification(tcsTarget);

      expect(pendingResult.verificationResult).toBe('VERIFICATION_PENDING');
      expect(pendingResult.distanceFromAssignedLocation).toBeNull();
      expect(pendingResult.latitude).toBeNull();
      expect(pendingResult.longitude).toBeNull();
    });
  });

  // =========================================================================
  // 5. Anti-Surveillance & Informed Consent Controls
  // =========================================================================
  describe('5. Anti-Surveillance & Informed Consent Controls', () => {
    it('blocks location verification if student has not given informed consent', () => {
      const noConsent: StudentConsent = {
        studentId: '23CSEBS001',
        consentGiven: false,
        consentTimestamp: '',
        consentVersion: '',
      };

      const measurement: DeviceLocationMeasurement = {
        latitude: tcsTarget.targetLatitude,
        longitude: tcsTarget.targetLongitude,
        accuracyMeters: 5.0,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        noConsent
      );

      expect(result.verificationResult).toBe('PERMISSION_DENIED');
      expect(result.consentVerified).toBe(false);
      expect(result.remarks).toContain('Informed user consent not granted');
    });

    it('prohibits location tracking outside authorized daily monitoring schedule (Anti-Surveillance)', () => {
      // 11:30 PM IST (18:00 UTC) is outside 09:00 - 18:00 IST work hours
      const nightTimestamp = '2026-03-05T18:00:00.000Z';

      const scheduleCheck = evaluateMonitoringSchedule(tcsTarget, nightTimestamp);
      expect(scheduleCheck.isAuthorized).toBe(false);
      expect(scheduleCheck.reason).toContain('Continuous surveillance prohibited');

      const measurement: DeviceLocationMeasurement = {
        latitude: tcsTarget.targetLatitude,
        longitude: tcsTarget.targetLongitude,
        accuracyMeters: 5.0,
        timestamp: nightTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };

      const result = geolocationVerificationEngine.evaluateLocationVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      expect(result.verificationResult).toBe('PERMISSION_DENIED');
      expect(result.withinMonitoringWindow).toBe(false);
      expect(result.remarks).toContain('Continuous surveillance prohibited');
    });

    it('prohibits location tracking outside active internship date range', () => {
      // Internship ended on 2026-06-30; test date in August 2026
      const futureTimestamp = '2026-08-15T05:00:00.000Z';

      const scheduleCheck = evaluateMonitoringSchedule(tcsTarget, futureTimestamp);
      expect(scheduleCheck.isAuthorized).toBe(false);
      expect(scheduleCheck.reason).toContain('Outside active internship date range');
    });
  });

  // =========================================================================
  // 6. Mandatory Storage Attributes (9 Required Fields)
  // =========================================================================
  describe('6. Mandatory Storage Attributes (9 Required Fields)', () => {
    it('stores all 9 required attributes in verification evaluation record', async () => {
      const measurement: DeviceLocationMeasurement = {
        latitude: 12.8284,
        longitude: 80.2198,
        accuracyMeters: 7.2,
        timestamp: validTimestamp,
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
        batteryOptimizationStatus: 'OPTIMIZED',
      };

      const record = await geolocationVerificationRepository.recordVerification(
        tcsTarget,
        measurement,
        validConsent
      );

      // Verify each of the 9 required fields
      expect(record.studentId).toBe('23CSEBS001'); // 1. Student ID
      expect(record.assignmentId).toBe('asg-tcs-001'); // 2. Assignment ID
      expect(record.latitude).toBe(12.8284); // 3. Latitude
      expect(record.longitude).toBe(80.2198); // 4. Longitude
      expect(record.accuracy).toBe(7.2); // 5. Accuracy
      expect(record.timestamp).toBe(new Date(validTimestamp).toISOString()); // 6. Timestamp
      expect(record.distanceFromAssignedLocation).toBeDefined(); // 7. Distance
      expect(record.geofenceRadius).toBe(200.0); // 8. Geofence radius
      expect(record.verificationResult).toBe('WITHIN_GEOFENCE'); // 9. Verification result

      // Contextual fields
      expect(record.connectivityStatus).toBe('WIFI');
      expect(record.consentVerified).toBe(true);
      expect(record.withinMonitoringWindow).toBe(true);
    });
  });

  // =========================================================================
  // 7. Historical Record Preservation & Immutability
  // =========================================================================
  describe('7. Historical Record Preservation & Immutability', () => {
    it('preserves historical verification records across multiple evaluations', async () => {
      const initialHistory = await geolocationVerificationRepository.getVerificationHistory();
      const initialCount = initialHistory.length;

      // Record check-in verification
      const measurement1: DeviceLocationMeasurement = {
        latitude: 12.8284,
        longitude: 80.2198,
        accuracyMeters: 6.0,
        timestamp: '2026-03-05T04:30:00.000Z',
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'WIFI',
      };
      await geolocationVerificationRepository.recordVerification(tcsTarget, measurement1, validConsent);

      // Record subsequent random verification
      const measurement2: DeviceLocationMeasurement = {
        latitude: 12.8285,
        longitude: 80.2199,
        accuracyMeters: 8.0,
        timestamp: '2026-03-05T07:00:00.000Z',
        gpsAvailable: true,
        permissionStatus: 'GRANTED',
        connectivityStatus: 'CELLULAR',
      };
      await geolocationVerificationRepository.recordVerification(tcsTarget, measurement2, validConsent);

      const updatedHistory = await geolocationVerificationRepository.getVerificationHistory();
      expect(updatedHistory.length).toBe(initialCount + 2);

      // Verify records are retrieved in reverse chronological order
      expect(new Date(updatedHistory[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(updatedHistory[1].timestamp).getTime()
      );
    });

    it('enforces immutability: Rejects modification of historical verification records', () => {
      expect(() => {
        geolocationVerificationRepository.updateRecordResult(
          'ver-00000000-0000-0000-0000-000000000001',
          'OUTSIDE_GEOFENCE'
        );
      }).toThrow('Security Exception: Verification record');
    });

    it('filters historical verification records by student ID and result state', async () => {
      const withinGeofenceRecords = await geolocationVerificationRepository.getVerificationHistory({
        resultState: 'WITHIN_GEOFENCE',
      });
      expect(withinGeofenceRecords.every((r) => r.verificationResult === 'WITHIN_GEOFENCE')).toBe(true);

      const gpsDisabledRecords = await geolocationVerificationRepository.getVerificationHistory({
        resultState: 'GPS_DISABLED',
      });
      expect(gpsDisabledRecords.every((r) => r.verificationResult === 'GPS_DISABLED')).toBe(true);
    });
  });
});

