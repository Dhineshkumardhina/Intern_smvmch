import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/core/geolocation/anti_surveillance_guard.dart';
import 'package:internpulse/core/geolocation/geolocation_types.dart';
import 'package:internpulse/core/geolocation/geospatial_calculator.dart';
import 'package:internpulse/core/geolocation/mobile_location_service.dart';

void main() {
  group('GeospatialCalculator Tests', () {
    test('calculateHaversineDistance returns 0.0 for identical coordinates', () {
      final distance = GeospatialCalculator.calculateHaversineDistance(
        lat1: 12.8284,
        lon1: 80.2198,
        lat2: 12.8284,
        lon2: 80.2198,
      );
      expect(distance, 0.0);
    });

    test('calculateHaversineDistance accurately computes geodesic distance', () {
      // Siruseri IT Park (12.8284, 80.2198) to SMVEC Madagadipet (11.9139, 79.6334)
      // Known geodesic distance is approximately 119.5 km (~119,500 meters)
      final distance = GeospatialCalculator.calculateHaversineDistance(
        lat1: 12.8284,
        lon1: 80.2198,
        lat2: 11.9139,
        lon2: 79.6334,
      );
      expect(distance, greaterThan(115000.0));
      expect(distance, lessThan(125000.0));
    });

    test('isAccuracyAdequate enforces horizontal accuracy limits', () {
      expect(GeospatialCalculator.isAccuracyAdequate(10.0), true);
      expect(GeospatialCalculator.isAccuracyAdequate(65.0), true);
      expect(GeospatialCalculator.isAccuracyAdequate(65.1), false);
      expect(GeospatialCalculator.isAccuracyAdequate(150.0), false);
      expect(GeospatialCalculator.isAccuracyAdequate(null), false);
      expect(GeospatialCalculator.isAccuracyAdequate(-5.0), false);
      expect(GeospatialCalculator.isAccuracyAdequate(double.nan), false);
    });

    test('computeOffsetCoordinate generates coordinate with specified offset', () {
      final offset = GeospatialCalculator.computeOffsetCoordinate(
        originLat: 12.8284,
        originLon: 80.2198,
        distanceMeters: 50.0,
        bearingDegrees: 90.0, // Due East
      );
      expect(offset['latitude'], isNotNull);
      expect(offset['longitude'], isNotNull);
      // Bearing East should increase longitude slightly
      expect(offset['longitude']!, greaterThan(80.2198));
    });
  });

  group('AntiSurveillanceGuard Tests', () {
    test('verifyConsent validates consent and affirmative timestamp', () {
      expect(
        AntiSurveillanceGuard.verifyConsent(
          consentGiven: true,
          consentTimestamp: DateTime.now(),
        ),
        true,
      );
      // Missing timestamp fails
      expect(
        AntiSurveillanceGuard.verifyConsent(
          consentGiven: true,
          consentTimestamp: null,
        ),
        false,
      );
      // Explicit false fails
      expect(
        AntiSurveillanceGuard.verifyConsent(
          consentGiven: false,
          consentTimestamp: DateTime.now(),
        ),
        false,
      );
    });

    test('parseTimeToMinutes parses HH:MM and HH:MM:SS formats', () {
      expect(AntiSurveillanceGuard.parseTimeToMinutes('09:00'), 540);
      expect(AntiSurveillanceGuard.parseTimeToMinutes('18:00'), 1080);
      expect(AntiSurveillanceGuard.parseTimeToMinutes('17:30:00'), 1050);
      expect(AntiSurveillanceGuard.parseTimeToMinutes('00:00'), 0);
      expect(AntiSurveillanceGuard.parseTimeToMinutes(null), isNull);
      expect(AntiSurveillanceGuard.parseTimeToMinutes('invalid'), isNull);
      expect(AntiSurveillanceGuard.parseTimeToMinutes('25:00'), isNull);
    });

    test('isWithinMonitoringWindow enforces calendar and daily limits', () {
      final now = DateTime(2026, 3, 15, 11, 30); // 11:30 AM
      final startDate = DateTime(2026, 1, 1);
      final endDate = DateTime(2026, 6, 30);

      // Normal working hours: 09:00 to 18:00
      expect(
        AntiSurveillanceGuard.isWithinMonitoringWindow(
          timestamp: now,
          monitoringStartTime: '09:00',
          monitoringEndTime: '18:00',
          startDate: startDate,
          endDate: endDate,
        ),
        true,
      );

      // Outside daily monitoring hours (nighttime: 21:00)
      final nightTime = DateTime(2026, 3, 15, 21, 00);
      expect(
        AntiSurveillanceGuard.isWithinMonitoringWindow(
          timestamp: nightTime,
          monitoringStartTime: '09:00',
          monitoringEndTime: '18:00',
          startDate: startDate,
          endDate: endDate,
        ),
        false,
      );

      // Prior to internship start date
      final beforeStart = DateTime(2025, 12, 1, 11, 30);
      expect(
        AntiSurveillanceGuard.isWithinMonitoringWindow(
          timestamp: beforeStart,
          monitoringStartTime: '09:00',
          monitoringEndTime: '18:00',
          startDate: startDate,
          endDate: endDate,
        ),
        false,
      );
    });
  });

  group('MobileLocationService Geofence & Safety Rules Tests', () {
    final service = MobileLocationService();
    final validConsentTimestamp = DateTime(2026, 1, 1);
    final workHourTimestamp = DateTime(2026, 3, 15, 11, 0); // 11:00 AM

    const double targetLat = 12.8284;
    const double targetLon = 80.2198;
    const double radiusMeters = 200.0;

    test('RULE 1: Missing consent evaluates to PERMISSION_DENIED', () {
      final reading = DeviceLocationReading(
        latitude: targetLat,
        longitude: targetLon,
        accuracyMeters: 10.0,
        timestamp: workHourTimestamp,
        gpsAvailable: true,
        permissionStatus: LocationPermissionStatus.granted,
        connectivityStatus: ConnectivityStatus.wifi,
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: false,
        consentTimestamp: null,
      );

      expect(result, VerificationResultState.permissionDenied);
    });

    test('RULE 2: Network unavailable evaluates to NETWORK_UNAVAILABLE (NEVER outsideGeofence)', () {
      final reading = DeviceLocationReading(
        latitude: targetLat,
        longitude: targetLon,
        accuracyMeters: 10.0,
        timestamp: workHourTimestamp,
        gpsAvailable: true,
        permissionStatus: LocationPermissionStatus.granted,
        connectivityStatus: ConnectivityStatus.none, // OFFLINE
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: true,
        consentTimestamp: validConsentTimestamp,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
      );

      expect(result, VerificationResultState.networkUnavailable);
      expect(result != VerificationResultState.outsideGeofence, true);
    });

    test('RULE 3: Location permission denied evaluates to PERMISSION_DENIED (NEVER outsideGeofence)', () {
      final reading = DeviceLocationReading(
        latitude: targetLat,
        longitude: targetLon,
        accuracyMeters: 10.0,
        timestamp: workHourTimestamp,
        gpsAvailable: true,
        permissionStatus: LocationPermissionStatus.denied, // DENIED
        connectivityStatus: ConnectivityStatus.cellular,
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: true,
        consentTimestamp: validConsentTimestamp,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
      );

      expect(result, VerificationResultState.permissionDenied);
    });

    test('RULE 4: GPS disabled evaluates to GPS_DISABLED (NEVER outsideGeofence)', () {
      final reading = DeviceLocationReading(
        latitude: targetLat,
        longitude: targetLon,
        accuracyMeters: 10.0,
        timestamp: workHourTimestamp,
        gpsAvailable: false, // GPS OFF
        permissionStatus: LocationPermissionStatus.granted,
        connectivityStatus: ConnectivityStatus.wifi,
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: true,
        consentTimestamp: validConsentTimestamp,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
      );

      expect(result, VerificationResultState.gpsDisabled);
    });

    test('RULE 5: Missing coordinates evaluate to LOCATION_UNAVAILABLE', () {
      final reading = DeviceLocationReading(
        latitude: null, // NO FIX
        longitude: null,
        accuracyMeters: null,
        timestamp: workHourTimestamp,
        gpsAvailable: true,
        permissionStatus: LocationPermissionStatus.granted,
        connectivityStatus: ConnectivityStatus.wifi,
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: true,
        consentTimestamp: validConsentTimestamp,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
      );

      expect(result, VerificationResultState.locationUnavailable);
    });

    test('RULE 6: Low accuracy (inadequate precision) evaluates to LOW_ACCURACY (NEVER outsideGeofence)', () {
      final reading = DeviceLocationReading(
        latitude: targetLat,
        longitude: targetLon,
        accuracyMeters: 180.0, // 180m exceeds 65m threshold
        timestamp: workHourTimestamp,
        gpsAvailable: true,
        permissionStatus: LocationPermissionStatus.granted,
        connectivityStatus: ConnectivityStatus.wifi,
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: true,
        consentTimestamp: validConsentTimestamp,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
      );

      expect(result, VerificationResultState.lowAccuracy);
    });

    test('RULE 7: Student inside workplace boundary evaluates to WITHIN_GEOFENCE', () {
      // 25 meters from workplace center
      final reading = DeviceLocationReading(
        latitude: targetLat + 0.0001,
        longitude: targetLon + 0.0001,
        accuracyMeters: 10.0,
        timestamp: workHourTimestamp,
        gpsAvailable: true,
        permissionStatus: LocationPermissionStatus.granted,
        connectivityStatus: ConnectivityStatus.wifi,
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: true,
        consentTimestamp: validConsentTimestamp,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
      );

      expect(result, VerificationResultState.withinGeofence);
    });

    test('RULE 8: Confirmed position outside radius evaluates to OUTSIDE_GEOFENCE', () {
      // Offset by 10km away from TCS Siruseri
      final reading = DeviceLocationReading(
        latitude: targetLat + 0.1,
        longitude: targetLon + 0.1,
        accuracyMeters: 12.0,
        timestamp: workHourTimestamp,
        gpsAvailable: true,
        permissionStatus: LocationPermissionStatus.granted,
        connectivityStatus: ConnectivityStatus.cellular,
      );

      final result = service.evaluateVerification(
        reading: reading,
        targetLat: targetLat,
        targetLon: targetLon,
        geofenceRadiusMeters: radiusMeters,
        consentGiven: true,
        consentTimestamp: validConsentTimestamp,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
      );

      expect(result, VerificationResultState.outsideGeofence);
    });
  });

  group('VerificationResultState Enum & DB String Mapping', () {
    test('DB string serialization and parsing matches Postgres ENUM', () {
      for (final state in VerificationResultState.values) {
        final dbString = state.toDbString();
        final parsed = VerificationResultState.fromDbString(dbString);
        expect(parsed, state, reason: 'Failed for $state with DB string $dbString');
      }
    });

    test('Fallback handling for legacy and pending strings', () {
      expect(VerificationResultState.fromDbString('VERIFIED'), VerificationResultState.withinGeofence);
      expect(VerificationResultState.fromDbString('OUT_OF_BOUNDS'), VerificationResultState.outsideGeofence);
      expect(VerificationResultState.fromDbString('TIMEOUT'), VerificationResultState.locationUnavailable);
      expect(VerificationResultState.fromDbString(null), VerificationResultState.verificationPending);
    });
  });
}

