class AttendanceModel {
  final String id;
  final String assignmentId;
  final String studentId;
  final DateTime sessionDate;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;
  final String? scheduledStartTime;
  final String? scheduledEndTime;
  final double totalHours;
  final double requiredHours;
  final String status;
  final bool isVerified;
  final String? notes;
  final String? checkInLocationId;
  final String? checkOutLocationId;
  final double? checkInDistanceMeters;
  final double? checkOutDistanceMeters;
  final double complianceRate;
  final bool offlineQueued;
  final DateTime? clientTimestamp;
  final String? exceptionReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  const AttendanceModel({
    required this.id,
    required this.assignmentId,
    required this.studentId,
    required this.sessionDate,
    this.checkInAt,
    this.checkOutAt,
    this.scheduledStartTime,
    this.scheduledEndTime,
    this.totalHours = 0.0,
    this.requiredHours = 8.0,
    this.status = 'present',
    this.isVerified = false,
    this.notes,
    this.checkInLocationId,
    this.checkOutLocationId,
    this.checkInDistanceMeters,
    this.checkOutDistanceMeters,
    this.complianceRate = 100.0,
    this.offlineQueued = false,
    this.clientTimestamp,
    this.exceptionReason,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isPresent => status == 'present' || status == 'late' || status == 'half_day';
  bool get isHalfDay => status == 'half_day';
  bool get isLate => status == 'late';
  bool get isFlagged => status == 'flagged';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'assignment_id': assignmentId,
      'student_id': studentId,
      'session_date': sessionDate.toIso8601String().split('T').first,
      'check_in_at': checkInAt?.toIso8601String(),
      'check_out_at': checkOutAt?.toIso8601String(),
      'scheduled_start_time': scheduledStartTime,
      'scheduled_end_time': scheduledEndTime,
      'total_hours': totalHours,
      'required_hours': requiredHours,
      'status': status,
      'is_verified': isVerified,
      'notes': notes,
      'check_in_location_id': checkInLocationId,
      'check_out_location_id': checkOutLocationId,
      'check_in_distance_meters': checkInDistanceMeters,
      'check_out_distance_meters': checkOutDistanceMeters,
      'compliance_rate': complianceRate,
      'offline_queued': offlineQueued,
      'client_timestamp': clientTimestamp?.toIso8601String(),
      'exception_reason': exceptionReason,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory AttendanceModel.fromMap(Map<String, dynamic> map, String id) {
    return AttendanceModel(
      id: id,
      assignmentId: map['assignment_id'] ?? map['assignmentId'] ?? '',
      studentId: map['student_id'] ?? map['studentId'] ?? '',
      sessionDate: DateTime.tryParse(map['session_date']?.toString() ?? map['date']?.toString() ?? '') ?? DateTime.now(),
      checkInAt: map['check_in_at'] != null ? DateTime.tryParse(map['check_in_at'].toString()) : null,
      checkOutAt: map['check_out_at'] != null ? DateTime.tryParse(map['check_out_at'].toString()) : null,
      scheduledStartTime: map['scheduled_start_time']?.toString(),
      scheduledEndTime: map['scheduled_end_time']?.toString(),
      totalHours: (map['total_hours'] as num?)?.toDouble() ?? 0.0,
      requiredHours: (map['required_hours'] as num?)?.toDouble() ?? 8.0,
      status: map['status'] ?? 'present',
      isVerified: map['is_verified'] ?? false,
      notes: map['notes'],
      checkInLocationId: map['check_in_location_id'],
      checkOutLocationId: map['check_out_location_id'],
      checkInDistanceMeters: (map['check_in_distance_meters'] as num?)?.toDouble(),
      checkOutDistanceMeters: (map['check_out_distance_meters'] as num?)?.toDouble(),
      complianceRate: (map['compliance_rate'] as num?)?.toDouble() ?? 100.0,
      offlineQueued: map['offline_queued'] ?? false,
      clientTimestamp: map['client_timestamp'] != null ? DateTime.tryParse(map['client_timestamp'].toString()) : null,
      exceptionReason: map['exception_reason'],
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updated_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
