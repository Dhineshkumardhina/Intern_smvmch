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
    };
  }

  factory InternshipModel.fromMap(Map<String, dynamic> map, String id) {
    return InternshipModel(
      id: id,
      studentId: map['studentId'] ?? '',
      companyName: map['companyName'] ?? '',
      role: map['role'] ?? '',
      description: map['description'] ?? '',
      startDate: DateTime.tryParse(map['startDate'].toString()) ?? DateTime.now(),
      endDate: DateTime.tryParse(map['endDate'].toString()) ?? DateTime.now().add(const Duration(days: 180)),
      mentorId: map['mentorId'],
      status: InternshipStatus.fromString(map['status']),
      overallProgress: (map['overallProgress'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now(),
    );
  }
}
