import '../core/constants/status_constants.dart';

import '../core/constants/status_constants.dart';

class InternshipModel {
  final String id;
  final String studentId;
  final String companyName;
  final String role;
  final String description;
  final DateTime startDate;
  final DateTime endDate;
  final String? mentorId;
  final InternshipStatus status;
  final double overallProgress;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Phase 5 Internship Assignment Workflow & Geofence Fields
  final String? locationId;
  final String? locationName;
  final String? locationAddress;
  final double? geofenceRadiusMeters;
  final double? latitude;
  final double? longitude;
  final String? monitoringStartTime;
  final String? monitoringEndTime;
  final double? requiredDailyHours;
  final DateTime? assignedAt;
  final String? assignedBy;
  final String? assignmentStatus;

  const InternshipModel({
    required this.id,
    required this.studentId,
    required this.companyName,
    required this.role,
    required this.description,
    required this.startDate,
    required this.endDate,
    this.mentorId,
    this.status = InternshipStatus.onTrack,
    this.overallProgress = 0.0,
    required this.createdAt,
    required this.updatedAt,
    this.locationId,
    this.locationName,
    this.locationAddress,
    this.geofenceRadiusMeters,
    this.latitude,
    this.longitude,
    this.monitoringStartTime,
    this.monitoringEndTime,
    this.requiredDailyHours,
    this.assignedAt,
    this.assignedBy,
    this.assignmentStatus,
  });

  int get totalDays => endDate.difference(startDate).inDays;
  int get daysCompleted => DateTime.now().difference(startDate).inDays.clamp(0, totalDays);
  int get daysRemaining => (totalDays - daysCompleted).clamp(0, totalDays);

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'studentId': studentId,
      'companyName': companyName,
      'role': role,
      'description': description,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'mentorId': mentorId,
      'status': status.name,
      'overallProgress': overallProgress,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'locationId': locationId,
      'locationName': locationName,
      'locationAddress': locationAddress,
      'geofenceRadiusMeters': geofenceRadiusMeters,
      'latitude': latitude,
      'longitude': longitude,
      'monitoringStartTime': monitoringStartTime,
      'monitoringEndTime': monitoringEndTime,
      'requiredDailyHours': requiredDailyHours,
      'assignedAt': assignedAt?.toIso8601String(),
      'assignedBy': assignedBy,
      'assignmentStatus': assignmentStatus,
    };
  }

  factory InternshipModel.fromMap(Map<String, dynamic> map, String id) {
    return InternshipModel(
      id: id,
      studentId: map['studentId'] ?? map['student_id'] ?? '',
      companyName: map['companyName'] ?? map['company_name'] ?? map['company'] ?? '',
      role: map['role'] ?? map['role_title'] ?? '',
      description: map['description'] ?? '',
      startDate: DateTime.tryParse(map['startDate']?.toString() ?? map['start_date']?.toString() ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(map['endDate']?.toString() ?? map['end_date']?.toString() ?? '') ?? DateTime.now().add(const Duration(days: 180)),
      mentorId: map['mentorId'] ?? map['mentor_id'],
      status: InternshipStatus.fromString(map['status']),
      overallProgress: (map['overallProgress'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.tryParse(map['createdAt']?.toString() ?? map['created_at']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt']?.toString() ?? map['updated_at']?.toString() ?? '') ?? DateTime.now(),
      locationId: map['locationId'] ?? map['location_id'],
      locationName: map['locationName'] ?? map['location_name'],
      locationAddress: map['locationAddress'] ?? map['location_address'] ?? map['address'],
      geofenceRadiusMeters: (map['geofenceRadiusMeters'] as num?)?.toDouble() ?? (map['geofence_radius_meters'] as num?)?.toDouble(),
      latitude: (map['latitude'] as num?)?.toDouble(),
      longitude: (map['longitude'] as num?)?.toDouble(),
      monitoringStartTime: map['monitoringStartTime'] ?? map['monitoring_start_time'],
      monitoringEndTime: map['monitoringEndTime'] ?? map['monitoring_end_time'],
      requiredDailyHours: (map['requiredDailyHours'] as num?)?.toDouble() ?? (map['required_daily_hours'] as num?)?.toDouble(),
      assignedAt: map['assignedAt'] != null || map['assigned_at'] != null 
          ? DateTime.tryParse((map['assignedAt'] ?? map['assigned_at']).toString()) 
          : null,
      assignedBy: map['assignedBy'] ?? map['assigned_by'],
      assignmentStatus: map['assignmentStatus'] ?? map['assignment_status'] ?? map['status'],
    );
  }
}
