import '../core/constants/status_constants.dart';

class ProgressUpdateModel {
  final String id;
  final String studentId;
  final String internshipId;
  final String? taskId;
  final double progress; // 0 - 100
  final InternshipStatus status;
  final String workCompleted;
  final String? blockers;
  final String? tomorrowPlan;
  final double timeSpent; // in hours
  final List<String> attachments;
  final DateTime createdAt;

  const ProgressUpdateModel({
    required this.id,
    required this.studentId,
    required this.internshipId,
    this.taskId,
    required this.progress,
    required this.status,
    required this.workCompleted,
    this.blockers,
    this.tomorrowPlan,
    required this.timeSpent,
    this.attachments = const [],
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'studentId': studentId,
      'internshipId': internshipId,
      'taskId': taskId,
      'progress': progress,
      'status': status.name,
      'workCompleted': workCompleted,
      'blockers': blockers,
      'tomorrowPlan': tomorrowPlan,
      'timeSpent': timeSpent,
      'attachments': attachments,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory ProgressUpdateModel.fromMap(Map<String, dynamic> map, String id) {
    return ProgressUpdateModel(
      id: id,
      studentId: map['studentId'] ?? '',
      internshipId: map['internshipId'] ?? '',
      taskId: map['taskId'],
      progress: (map['progress'] as num?)?.toDouble() ?? 0.0,
      status: InternshipStatus.fromString(map['status']),
      workCompleted: map['workCompleted'] ?? '',
      blockers: map['blockers'],
      tomorrowPlan: map['tomorrowPlan'],
      timeSpent: (map['timeSpent'] as num?)?.toDouble() ?? 0.0,
      attachments: List<String>.from(map['attachments'] ?? []),
      createdAt: DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now(),
    );
  }
}
