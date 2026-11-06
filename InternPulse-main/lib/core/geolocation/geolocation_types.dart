import 'package:flutter/material.dart';

/// 8 Canonical Result States for InternPulse Geolocation Engine
enum VerificationResultState {
  withinGeofence,
  outsideGeofence,
  locationUnavailable,
  gpsDisabled,
  permissionDenied,
  lowAccuracy,
  networkUnavailable,
  verificationPending;

  String toDbString() {
    switch (this) {
      case VerificationResultState.withinGeofence:
        return 'WITHIN_GEOFENCE';
      case VerificationResultState.outsideGeofence:
        return 'OUTSIDE_GEOFENCE';
      case VerificationResultState.locationUnavailable:
        return 'LOCATION_UNAVAILABLE';
      case VerificationResultState.gpsDisabled:
        return 'GPS_DISABLED';
      case VerificationResultState.permissionDenied:
        return 'PERMISSION_DENIED';
      case VerificationResultState.lowAccuracy:
        return 'LOW_ACCURACY';
      case VerificationResultState.networkUnavailable:
        return 'NETWORK_UNAVAILABLE';
      case VerificationResultState.verificationPending:
        return 'VERIFICATION_PENDING';
    }
  }

  static VerificationResultState fromDbString(String? val) {
    switch (val?.toUpperCase()) {
      case 'WITHIN_GEOFENCE':
      case 'VERIFIED':
        return VerificationResultState.withinGeofence;
      case 'OUTSIDE_GEOFENCE':
      case 'OUT_OF_BOUNDS':
        return VerificationResultState.outsideGeofence;
      case 'LOCATION_UNAVAILABLE':
      case 'TIMEOUT':
        return VerificationResultState.locationUnavailable;
      case 'GPS_DISABLED':
        return VerificationResultState.gpsDisabled;
      case 'PERMISSION_DENIED':
        return VerificationResultState.permissionDenied;
      case 'LOW_ACCURACY':
      case 'LOW_ACCURACY_REJECTED':
        return VerificationResultState.lowAccuracy;
      case 'NETWORK_UNAVAILABLE':
        return VerificationResultState.networkUnavailable;
      case 'VERIFICATION_PENDING':
      case 'PENDING':
      default:
        return VerificationResultState.verificationPending;
    }
  }

  String get displayName {
    switch (this) {
      case VerificationResultState.withinGeofence:
        return 'Within Geofence';
      case VerificationResultState.outsideGeofence:
        return 'Outside Geofence';
      case VerificationResultState.locationUnavailable:
        return 'Location Unavailable';
      case VerificationResultState.gpsDisabled:
        return 'GPS Disabled';
      case VerificationResultState.permissionDenied:
        return 'Permission Denied';
      case VerificationResultState.lowAccuracy:
        return 'Low Accuracy';
      case VerificationResultState.networkUnavailable:
        return 'Network Unavailable';
      case VerificationResultState.verificationPending:
        return 'Verification Pending';
    }
  }

  Color get color {
    switch (this) {
      case VerificationResultState.withinGeofence:
        return const Color(0xFF10B981); // Emerald / Success
      case VerificationResultState.outsideGeofence:
        return const Color(0xFFEF4444); // Red / Violation
      case VerificationResultState.locationUnavailable:
      case VerificationResultState.lowAccuracy:
        return const Color(0xFFF59E0B); // Amber / Warning
      case VerificationResultState.gpsDisabled:
      case VerificationResultState.permissionDenied:
      case VerificationResultState.networkUnavailable:
        return const Color(0xFF6B7280); // Gray / Hardware Failure
      case VerificationResultState.verificationPending:
        return const Color(0xFF3B82F6); // Blue / Info
    }
  }

  IconData get icon {
    switch (this) {
      case VerificationResultState.withinGeofence:
        return Icons.verified_user_rounded;
      case VerificationResultState.outsideGeofence:
        return Icons.wrong_location_rounded;
      case VerificationResultState.locationUnavailable:
        return Icons.location_searching_rounded;
      case VerificationResultState.gpsDisabled:
        return Icons.location_disabled_rounded;
      case VerificationResultState.permissionDenied:
        return Icons.lock_outline_rounded;
      case VerificationResultState.lowAccuracy:
        return Icons.gps_not_fixed_rounded;
      case VerificationResultState.networkUnavailable:
        return Icons.wifi_off_rounded;
      case VerificationResultState.verificationPending:
        return Icons.hourglass_top_rounded;
    }
  }
}

/// Device Connectivity Status
enum ConnectivityStatus {
  wifi,
  cellular,
  ethernet,
  none,
  unknown;

  String toDbString() {
    switch (this) {
      case ConnectivityStatus.wifi:
        return 'WIFI';
      case ConnectivityStatus.cellular:
        return 'CELLULAR';
      case ConnectivityStatus.ethernet:
        return 'ETHERNET';
      case ConnectivityStatus.none:
        return 'NONE';
      case ConnectivityStatus.unknown:
        return 'UNKNOWN';
    }
  }

  static ConnectivityStatus fromDbString(String? val) {
    switch (val?.toUpperCase()) {
      case 'WIFI':
        return ConnectivityStatus.wifi;
      case 'CELLULAR':
        return ConnectivityStatus.cellular;
      case 'ETHERNET':
        return ConnectivityStatus.ethernet;
      case 'NONE':
        return ConnectivityStatus.none;
      default:
        return ConnectivityStatus.unknown;
    }
  }
}

/// Location Permission Status
enum LocationPermissionStatus {
  granted,
  denied,
  permanentlyDenied,
  restricted,
  notDetermined;

  bool get isGranted => this == LocationPermissionStatus.granted;
}

/// Battery Optimization State
enum BatteryOptimizationStatus {
  optimized,
  unrestricted,
  restricted,
  unknown;

  String toDbString() {
    switch (this) {
      case BatteryOptimizationStatus.optimized:
        return 'OPTIMIZED';
      case BatteryOptimizationStatus.unrestricted:
        return 'UNRESTRICTED';
      case BatteryOptimizationStatus.restricted:
        return 'RESTRICTED';
      case BatteryOptimizationStatus.unknown:
        return 'UNKNOWN';
    }
  }

  static BatteryOptimizationStatus fromDbString(String? val) {
    switch (val?.toUpperCase()) {
      case 'UNRESTRICTED':
        return BatteryOptimizationStatus.unrestricted;
      case 'RESTRICTED':
        return BatteryOptimizationStatus.restricted;
      case 'OPTIMIZED':
        return BatteryOptimizationStatus.optimized;
      default:
        return BatteryOptimizationStatus.unknown;
    }
  }
}

