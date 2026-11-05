enum TaskPriority {
  low,
  medium,
  high;

  String get label {
    switch (this) {
      case TaskPriority.low:
        return 'Low';
      case TaskPriority.medium:
        return 'Medium';
      case TaskPriority.high:
        return 'High';
    }
  }
}

enum TaskStatus {
  notStarted,
  inProgress,
  completed,
  blocked,
  overdue;

  String get label {
    switch (this) {
      case TaskStatus.notStarted:
        return 'Not Started';
      case TaskStatus.inProgress:
        return 'In Progress';
      case TaskStatus.completed:
        return 'Completed';
      case TaskStatus.blocked:
        return 'Blocked';
      case TaskStatus.overdue:
        return 'Overdue';
    }
  }

  static TaskStatus fromString(String? value) {
    if (value == null) return TaskStatus.notStarted;
    switch (value.toLowerCase()) {
      case 'inprogress':
      case 'active':
        return TaskStatus.inProgress;
      case 'completed':
      case 'done':
        return TaskStatus.completed;
      case 'blocked':
        return TaskStatus.blocked;
      case 'overdue':
      case 'delayed':
        return TaskStatus.overdue;
      case 'notstarted':
      default:
        return TaskStatus.notStarted;
    }
  }
}

class TaskModel {
  final String id;
  final String internshipId;
  final String studentId;
  final String assignedBy;
  final String title;
  final String description;
  final TaskPriority priority;
  final TaskStatus status;
  final double progress; // 0.0 to 100.0
  final DateTime deadline;
  final String? blockerReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TaskModel({
    required this.id,
    required this.internshipId,
    required this.studentId,
    required this.assignedBy,
    required this.title,
    required this.description,
    this.priority = TaskPriority.medium,
    this.status = TaskStatus.notStarted,
    this.progress = 0.0,
    required this.deadline,
    this.blockerReason,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'internshipId': internshipId,
      'studentId': studentId,
      'assignedBy': assignedBy,
      'title': title,
      'description': description,
      'priority': priority.name,
      'status': status.name,
      'progress': progress,
      'deadline': deadline.toIso8601String(),
      'blockerReason': blockerReason,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory TaskModel.fromMap(Map<String, dynamic> map, String id) {
    return TaskModel(
      id: id,
      internshipId: map['internshipId'] ?? '',
      studentId: map['studentId'] ?? '',
      assignedBy: map['assignedBy'] ?? '',
      title: map['title'] ?? '',
      description: map['description'] ?? '',
      priority: TaskPriority.values.firstWhere(
        (p) => p.name == map['priority'],
        orElse: () => TaskPriority.medium,
      ),
      status: TaskStatus.fromString(map['status']),
      progress: (map['progress'] as num?)?.toDouble() ?? 0.0,
      deadline: DateTime.tryParse(map['deadline'].toString()) ?? DateTime.now(),
      blockerReason: map['blockerReason'],
      createdAt: DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now(),
      updatedAt: DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now(),
    );
  }
}
