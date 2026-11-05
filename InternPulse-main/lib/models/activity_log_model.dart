enum ActivityType {
  progressSubmitted,
  taskStarted,
  taskCompleted,
  blockerReported,
  mentorFeedback,
  taskAssigned;

  String get label {
    switch (this) {
      case ActivityType.progressSubmitted:
        return 'Progress Update';
      case ActivityType.taskStarted:
        return 'Task Started';
      case ActivityType.taskCompleted:
        return 'Task Completed';
      case ActivityType.blockerReported:
        return 'Blocker Reported';
      case ActivityType.mentorFeedback:
        return 'Mentor Feedback';
      case ActivityType.taskAssigned:
        return 'New Task Assigned';
    }
  }
}

class ActivityLogModel {
  final String id;
  final String studentId;
  final String studentName;
  final String? studentPhoto;
  final ActivityType type;
  final String title;
  final String description;
  final double? progressFrom;
  final double? progressTo;
  final double? timeSpent;
  final String? attachmentUrl;
  final DateTime createdAt;

  const ActivityLogModel({
    required this.id,
    required this.studentId,
    required this.studentName,
    this.studentPhoto,
    required this.type,
    required this.title,
    required this.description,
    this.progressFrom,
    this.progressTo,
    this.timeSpent,
    this.attachmentUrl,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'studentId': studentId,
      'studentName': studentName,
      'studentPhoto': studentPhoto,
      'type': type.name,
      'title': title,
      'description': description,
      'progressFrom': progressFrom,
      'progressTo': progressTo,
      'timeSpent': timeSpent,
      'attachmentUrl': attachmentUrl,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory ActivityLogModel.fromMap(Map<String, dynamic> map, String id) {
    return ActivityLogModel(
      id: id,
      studentId: map['studentId'] ?? '',
      studentName: map['studentName'] ?? '',
      studentPhoto: map['studentPhoto'],
      type: ActivityType.values.firstWhere(
        (t) => t.name == map['type'],
        orElse: () => ActivityType.progressSubmitted,
      ),
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      progressFrom: (map['progressFrom'] as num?)?.toDouble(),
      progressTo: (map['progressTo'] as num?)?.toDouble(),
      timeSpent: (map['timeSpent'] as num?)?.toDouble(),
      attachmentUrl: map['attachmentUrl'],
      createdAt: DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now(),
    );
  }
}

class MentorAssignmentModel {
  final String id;
  final String mentorId;
  final String mentorName;
  final String departmentCode;
  final String academicYear;
  final List<String> studentIds;
  final int capacity;
  final DateTime createdAt;
  final DateTime updatedAt;

  const MentorAssignmentModel({
    required this.id,
    required this.mentorId,
    required this.mentorName,
    required this.departmentCode,
    required this.academicYear,
    required this.studentIds,
    this.capacity = 5,
    required this.createdAt,
    required this.updatedAt,
  });

  int get assignedCount => studentIds.length;
  bool get isFull => assignedCount >= capacity;
}
