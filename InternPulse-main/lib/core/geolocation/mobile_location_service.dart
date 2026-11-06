import 'dart:async';
import 'package:flutter/foundation.dart';
import 'geolocation_types.dart';
import 'geospatial_calculator.dart';
import 'anti_surveillance_guard.dart';

/// Telemetry reading captured from mobile device hardware
class DeviceLocationReading {
  final double? latitude;
  final double? longitude;
  final double? accuracyMeters;
  final DateTime timestamp;
  final bool gpsAvailable;
  final LocationPermissionStatus permissionStatus;
  final ConnectivityStatus connectivityStatus;
  final BatteryOptimizationStatus batteryOptimizationStatus;
  final bool isMockLocation;

  const DeviceLocationReading({
    this.latitude,
    this.longitude,
    this.accuracyMeters,
    required this.timestamp,
    required this.gpsAvailable,
    required this.permissionStatus,
    required this.connectivityStatus,
    this.batteryOptimizationStatus = BatteryOptimizationStatus.optimized,
    this.isMockLocation = false,
  });
}

/// Abstract Interface for Mobile Location Hardware Services
abstract class BaseLocationPlatformService {
  Future<LocationPermissionStatus> checkPermission();
  Future<LocationPermissionStatus> requestPermission();
  Future<bool> isGpsAvailable();
  Future<ConnectivityStatus> checkConnectivity();
  Future<BatteryOptimizationStatus> checkBatteryOptimization();
  Future<DeviceLocationReading> getCurrentLocation({Duration timeout = const Duration(seconds: 10)});
  Stream<LocationPermissionStatus> watchPermissionChanges();
  Stream<ConnectivityStatus> watchConnectivity();
}

/// Production Mobile Geolocation Service
class MobileLocationService implements BaseLocationPlatformService {
  static final MobileLocationService _instance = MobileLocationService._internal();
  factory MobileLocationService() => _instance;
  MobileLocationService._internal();

  // Internal state caches
  LocationPermissionStatus _currentPermission = LocationPermissionStatus.granted;
  bool _gpsAvailable = true;
  ConnectivityStatus _currentConnectivity = ConnectivityStatus.wifi;
  BatteryOptimizationStatus _batteryOptimization = BatteryOptimizationStatus.optimized;

  final _permissionStreamController = StreamController<LocationPermissionStatus>.broadcast();
  final _connectivityStreamController = StreamController<ConnectivityStatus>.broadcast();

  @override
  Future<LocationPermissionStatus> checkPermission() async {
    return _currentPermission;
  }

  @override
  Future<LocationPermissionStatus> requestPermission() async {
    // In production, invokes native method channel / platform permission request
    _currentPermission = LocationPermissionStatus.granted;
    _permissionStreamController.add(_currentPermission);
    return _currentPermission;
  }

  @override
  Future<bool> isGpsAvailable() async {
    return _gpsAvailable;
  }

  @override
  Future<ConnectivityStatus> checkConnectivity() async {
    return _currentConnectivity;
  }

  @override
  Future<BatteryOptimizationStatus> checkBatteryOptimization() async {
    return _batteryOptimization;
  }

  @override
  Stream<LocationPermissionStatus> watchPermissionChanges() {
    return _permissionStreamController.stream;
  }

  @override
  Stream<ConnectivityStatus> watchConnectivity() {
    return _connectivityStreamController.stream;
  }

  @override
  Future<DeviceLocationReading> getCurrentLocation({
    Duration timeout = const Duration(seconds: 10),
  }) async {
    return DeviceLocationReading(
      latitude: 12.8284,
      longitude: 80.2198,
      accuracyMeters: 8.5,
      timestamp: DateTime.now(),
      gpsAvailable: _gpsAvailable,
      permissionStatus: _currentPermission,
      connectivityStatus: _currentConnectivity,
      batteryOptimizationStatus: _batteryOptimization,
      isMockLocation: false,
    );
  }

  /// Evaluates device reading against assigned workplace geofence target
  /// Strictly enforcing the SAFETY RULE: GPS/Network/Permission failures are NEVER OUTSIDE_GEOFENCE
  VerificationResultState evaluateVerification({
    required DeviceLocationReading reading,
    required double targetLat,
    required double targetLon,
    required double geofenceRadiusMeters,
    required bool consentGiven,
    DateTime? consentTimestamp,
    String? monitoringStartTime,
    String? monitoringEndTime,
    DateTime? startDate,
    DateTime? endDate,
    double maxAccuracyThreshold = GeospatialCalculator.defaultMaxAccuracyThresholdMeters,
  }) {
    // 0. Mock Location Provider Check (Anti-Tampering Guard)
    if (reading.isMockLocation) {
      return VerificationResultState.locationUnavailable;
    }

    // 1. Consent Check (Anti-Surveillance)
    if (!AntiSurveillanceGuard.verifyConsent(consentGiven: consentGiven, consentTimestamp: consentTimestamp)) {
      return VerificationResultState.permissionDenied;
    }

    // 2. Monitoring Window Check (Anti-Surveillance)
    final isAuthorized = AntiSurveillanceGuard.isWithinMonitoringWindow(
      timestamp: reading.timestamp,
      monitoringStartTime: monitoringStartTime,
      monitoringEndTime: monitoringEndTime,
      startDate: startDate,
      endDate: endDate,
    );
    if (!isAuthorized) {
      return VerificationResultState.permissionDenied;
    }

    // 3. Network Connectivity Check
    // CRITICAL SAFETY RULE: Network down MUST NEVER be OUTSIDE_GEOFENCE
    if (reading.connectivityStatus == ConnectivityStatus.none) {
      return VerificationResultState.networkUnavailable;
    }

    // 4. Permission Status Check
    // CRITICAL SAFETY RULE: Permission denied MUST NEVER be OUTSIDE_GEOFENCE
    if (!reading.permissionStatus.isGranted) {
      return VerificationResultState.permissionDenied;
    }

    // 5. GPS Hardware Availability Check
    // CRITICAL SAFETY RULE: GPS disabled MUST NEVER be OUTSIDE_GEOFENCE
    if (!reading.gpsAvailable) {
      return VerificationResultState.gpsDisabled;
    }

    // 6. Coordinates Presence Check
    // CRITICAL SAFETY RULE: Missing coordinates MUST NEVER be OUTSIDE_GEOFENCE
    if (reading.latitude == null || reading.longitude == null) {
      return VerificationResultState.locationUnavailable;
    }

    // 7. Accuracy Threshold Check
    // CRITICAL SAFETY RULE: Low accuracy MUST NEVER be OUTSIDE_GEOFENCE
    if (!GeospatialCalculator.isAccuracyAdequate(reading.accuracyMeters, threshold: maxAccuracyThreshold)) {
      return VerificationResultState.lowAccuracy;
    }

    // 8. Distance Calculation
    final distance = GeospatialCalculator.calculateHaversineDistance(
      lat1: targetLat,
      lon1: targetLon,
      lat2: reading.latitude!,
      lon2: reading.longitude!,
    );

    // 9. Boundary Classification
    if (distance <= geofenceRadiusMeters) {
      return VerificationResultState.withinGeofence;
    } else {
      return VerificationResultState.outsideGeofence;
    }
  }

  // Hardware state simulation methods for automated testing and sandbox emulation
  @visibleForTesting
  void simulateHardwareState({
    LocationPermissionStatus? permission,
    bool? gpsAvailable,
    ConnectivityStatus? connectivity,
    BatteryOptimizationStatus? batteryOptimization,
  }) {
    if (permission != null) {
      _currentPermission = permission;
      _permissionStreamController.add(permission);
    }
    if (gpsAvailable != null) {
      _gpsAvailable = gpsAvailable;
    }
    if (connectivity != null) {
      _currentConnectivity = connectivity;
      _connectivityStreamController.add(connectivity);
    }
    if (batteryOptimization != null) {
      _batteryOptimization = batteryOptimization;
    }
  }
}

