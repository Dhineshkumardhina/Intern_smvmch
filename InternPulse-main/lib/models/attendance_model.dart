class AttendanceModel {
  final String id;
  final String assignmentId;
  final String studentId;
  final DateTime sessionDate;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;
  final double totalHours;
  final String status;
  final bool isVerified;
  final String? notes;
  final String? checkInLocationId;
  final String? checkOutLocationId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const AttendanceModel({
    required this.id,
    required this.assignmentId,
    required this.studentId,
    required this.sessionDate,
    this.checkInAt,
    this.checkOutAt,
    this.totalHours = 0.0,
    this.status = 'present',
    this.isVerified = false,
    this.notes,
    this.checkInLocationId,
    this.checkOutLocationId,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isPresent => status == 'present' || status == 'late' || status == 'half_day';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'assignment_id': assignmentId,
      'student_id': studentId,
      'session_date': sessionDate.toIso8601String().split('T').first,
      'check_in_at': checkInAt?.toIso8601String(),
      'check_out_at': checkOutAt?.toIso8601String(),
      'total_hours': totalHours,
      'status': status,
      'is_verified': isVerified,
      'notes': notes,
      'check_in_location_id': checkInLocationId,
      'check_out_location_id': checkOutLocationId,
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
      totalHours: (map['total_hours'] as num?)?.toDouble() ?? 0.0,
      status: map['status'] ?? 'present',
      isVerified: map['is_verified'] ?? map['isVerified'] ?? false,
      notes: map['notes'],
      checkInLocationId: map['check_in_location_id'],
      checkOutLocationId: map['check_out_location_id'],
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updated_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

