import '../core/geolocation/geolocation_types.dart';

class LocationVerificationModel {
  final String id;
  final String? sessionId;
  final String assignmentId;
  final String studentId;
  final String? locationId;
  final String eventType;
  final DateTime requestedAt;
  final DateTime? respondedAt;
  final double? capturedLatitude;
  final double? capturedLongitude;
  final double? accuracyMeters;
  final double? distanceToCenterMeters;
  final double? geofenceRadiusMeters;
  final bool? isWithinGeofence;
  final bool isMockLocation;
  final String status;
  final VerificationResultState verificationResult;
  final ConnectivityStatus connectivityStatus;
  final BatteryOptimizationStatus batteryOptimizationStatus;
  final bool consentVerified;
  final bool withinMonitoringWindow;
  final String? remarks;
  final DateTime createdAt;

  const LocationVerificationModel({
    required this.id,
    this.sessionId,
    required this.assignmentId,
    required this.studentId,
    this.locationId,
    required this.eventType,
    required this.requestedAt,
    this.respondedAt,
    this.capturedLatitude,
    this.capturedLongitude,
    this.accuracyMeters,
    this.distanceToCenterMeters,
    this.geofenceRadiusMeters,
    this.isWithinGeofence,
    this.isMockLocation = false,
    this.status = 'pending',
    this.verificationResult = VerificationResultState.verificationPending,
    this.connectivityStatus = ConnectivityStatus.wifi,
    this.batteryOptimizationStatus = BatteryOptimizationStatus.optimized,
    this.consentVerified = true,
    this.withinMonitoringWindow = true,
    this.remarks,
    required this.createdAt,
  });

  bool get isVerified =>
      verificationResult == VerificationResultState.withinGeofence || status == 'verified';

  bool get isViolation =>
      verificationResult == VerificationResultState.outsideGeofence ||
      status == 'out_of_bounds' ||
      status == 'spoof_detected';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'session_id': sessionId,
      'assignment_id': assignmentId,
      'student_id': studentId,
      'location_id': locationId,
      'event_type': eventType,
      'requested_at': requestedAt.toIso8601String(),
      'responded_at': respondedAt?.toIso8601String(),
      'captured_latitude': capturedLatitude,
      'captured_longitude': capturedLongitude,
      'accuracy_meters': accuracyMeters,
      'distance_to_center_meters': distanceToCenterMeters,
      'geofence_radius_meters': geofenceRadiusMeters,
      'is_within_geofence': isWithinGeofence,
      'is_mock_location': isMockLocation,
      'status': status,
      'verification_result': verificationResult.toDbString(),
      'connectivity_status': connectivityStatus.toDbString(),
      'battery_optimization_status': batteryOptimizationStatus.toDbString(),
      'consent_verified': consentVerified,
      'within_monitoring_window': withinMonitoringWindow,
      'remarks': remarks,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory LocationVerificationModel.fromMap(Map<String, dynamic> map, String id) {
    final rawResult = map['verification_result']?.toString();
    final parsedResult = rawResult != null
        ? VerificationResultState.fromDbString(rawResult)
        : (map['status'] == 'verified'
            ? VerificationResultState.withinGeofence
            : map['status'] == 'out_of_bounds'
                ? VerificationResultState.outsideGeofence
                : map['status'] == 'low_accuracy_rejected'
                    ? VerificationResultState.lowAccuracy
                    : VerificationResultState.verificationPending);

    return LocationVerificationModel(
      id: id,
      sessionId: map['session_id'] ?? map['sessionId'],
      assignmentId: map['assignment_id'] ?? map['assignmentId'] ?? '',
      studentId: map['student_id'] ?? map['studentId'] ?? '',
      locationId: map['location_id'] ?? map['locationId'],
      eventType: map['event_type'] ?? map['eventType'] ?? 'check_in',
      requestedAt: DateTime.tryParse(map['requested_at']?.toString() ?? '') ?? DateTime.now(),
      respondedAt: map['responded_at'] != null ? DateTime.tryParse(map['responded_at'].toString()) : null,
      capturedLatitude: (map['captured_latitude'] as num?)?.toDouble() ?? (map['latitude'] as num?)?.toDouble(),
      capturedLongitude: (map['captured_longitude'] as num?)?.toDouble() ?? (map['longitude'] as num?)?.toDouble(),
      accuracyMeters: (map['accuracy_meters'] as num?)?.toDouble() ?? (map['accuracy'] as num?)?.toDouble(),
      distanceToCenterMeters: (map['distance_to_center_meters'] as num?)?.toDouble() ??
          (map['distance_from_assigned_location'] as num?)?.toDouble(),
      geofenceRadiusMeters: (map['geofence_radius_meters'] as num?)?.toDouble() ??
          (map['geofence_radius'] as num?)?.toDouble(),
      isWithinGeofence: map['is_within_geofence'] ?? (parsedResult == VerificationResultState.withinGeofence),
      isMockLocation: map['is_mock_location'] ?? false,
      status: map['status'] ?? (parsedResult == VerificationResultState.withinGeofence ? 'verified' : 'pending'),
      verificationResult: parsedResult,
      connectivityStatus: ConnectivityStatus.fromDbString(map['connectivity_status']?.toString()),
      batteryOptimizationStatus:
          BatteryOptimizationStatus.fromDbString(map['battery_optimization_status']?.toString()),
      consentVerified: map['consent_verified'] ?? true,
      withinMonitoringWindow: map['within_monitoring_window'] ?? true,
      remarks: map['remarks'],
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
