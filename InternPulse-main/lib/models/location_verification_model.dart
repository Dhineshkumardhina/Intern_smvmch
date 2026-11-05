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
  final bool? isWithinGeofence;
  final bool isMockLocation;
  final String status;
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
    this.isWithinGeofence,
    this.isMockLocation = false,
    this.status = 'pending',
    this.remarks,
    required this.createdAt,
  });

  bool get isVerified => status == 'verified';
  bool get isViolation => status == 'out_of_bounds' || status == 'spoof_detected';

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
      'is_within_geofence': isWithinGeofence,
      'is_mock_location': isMockLocation,
      'status': status,
      'remarks': remarks,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory LocationVerificationModel.fromMap(Map<String, dynamic> map, String id) {
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
      accuracyMeters: (map['accuracy_meters'] as num?)?.toDouble(),
      distanceToCenterMeters: (map['distance_to_center_meters'] as num?)?.toDouble(),
      isWithinGeofence: map['is_within_geofence'] ?? map['within_geofence'],
      isMockLocation: map['is_mock_location'] ?? false,
      status: map['status'] ?? map['verification_status'] ?? 'pending',
      remarks: map['remarks'],
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

