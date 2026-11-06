/// Verification Schedule Window Model (Flutter / Mobile)
enum ScheduleStatus {
  scheduled,
  open,
  submitted,
  verified,
  missed,
  locationUnavailable,
  expired,
  cancelled;

  String toDbString() {
    switch (this) {
      case ScheduleStatus.scheduled:
        return 'SCHEDULED';
      case ScheduleStatus.open:
        return 'OPEN';
      case ScheduleStatus.submitted:
        return 'SUBMITTED';
      case ScheduleStatus.verified:
        return 'VERIFIED';
      case ScheduleStatus.missed:
        return 'MISSED';
      case ScheduleStatus.locationUnavailable:
        return 'LOCATION_UNAVAILABLE';
      case ScheduleStatus.expired:
        return 'EXPIRED';
      case ScheduleStatus.cancelled:
        return 'CANCELLED';
    }
  }

  static ScheduleStatus fromDbString(String? val) {
    switch (val?.toUpperCase()) {
      case 'OPEN':
      case 'DISPATCHED':
        return ScheduleStatus.open;
      case 'SUBMITTED':
      case 'RESPONDED':
        return ScheduleStatus.submitted;
      case 'VERIFIED':
        return ScheduleStatus.verified;
      case 'MISSED':
        return ScheduleStatus.missed;
      case 'LOCATION_UNAVAILABLE':
        return ScheduleStatus.locationUnavailable;
      case 'EXPIRED':
        return ScheduleStatus.expired;
      case 'CANCELLED':
        return ScheduleStatus.cancelled;
      case 'SCHEDULED':
      case 'PENDING':
      default:
        return ScheduleStatus.scheduled;
    }
  }
}

class VerificationScheduleModel {
  final String id;
  final String assignmentId;
  final String studentId;
  final String targetDate;
  final DateTime windowStart;
  final DateTime windowEnd;
  final ScheduleStatus status;
  final String? verificationId;
  final DateTime? submissionTimestamp;
  final DateTime? notificationDispatchedAt;
  final int retryCount;
  final int maxRetries;
  final String? missedReason;
  final String timezone;
  final DateTime createdAt;

  const VerificationScheduleModel({
    required this.id,
    required this.assignmentId,
    required this.studentId,
    required this.targetDate,
    required this.windowStart,
    required this.windowEnd,
    this.status = ScheduleStatus.scheduled,
    this.verificationId,
    this.submissionTimestamp,
    this.notificationDispatchedAt,
    this.retryCount = 0,
    this.maxRetries = 3,
    this.missedReason,
    this.timezone = 'Asia/Kolkata',
    required this.createdAt,
  });

  bool get isOpen => status == ScheduleStatus.open;
  bool get isVerified => status == ScheduleStatus.verified;
  bool get isMissed => status == ScheduleStatus.missed;
  bool get canRetry => status == ScheduleStatus.locationUnavailable && retryCount < maxRetries;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'assignment_id': assignmentId,
      'student_id': studentId,
      'target_date': targetDate,
      'window_start': windowStart.toIso8601String(),
      'window_end': windowEnd.toIso8601String(),
      'status': status.toDbString(),
      'verification_id': verificationId,
      'submission_timestamp': submissionTimestamp?.toIso8601String(),
      'notification_dispatched_at': notificationDispatchedAt?.toIso8601String(),
      'retry_count': retryCount,
      'max_retries': maxRetries,
      'missed_reason': missedReason,
      'timezone': timezone,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory VerificationScheduleModel.fromMap(Map<String, dynamic> map, String id) {
    return VerificationScheduleModel(
      id: id,
      assignmentId: map['assignment_id'] ?? map['assignmentId'] ?? '',
      studentId: map['student_id'] ?? map['studentId'] ?? '',
      targetDate: map['target_date'] ?? map['targetDate'] ?? '',
      windowStart: DateTime.tryParse(map['window_start']?.toString() ?? '') ?? DateTime.now(),
      windowEnd: DateTime.tryParse(map['window_end']?.toString() ?? '') ?? DateTime.now(),
      status: ScheduleStatus.fromDbString(map['status']?.toString()),
      verificationId: map['verification_id'] ?? map['verificationId'],
      submissionTimestamp: map['submission_timestamp'] != null
          ? DateTime.tryParse(map['submission_timestamp'].toString())
          : null,
      notificationDispatchedAt: map['notification_dispatched_at'] != null
          ? DateTime.tryParse(map['notification_dispatched_at'].toString())
          : null,
      retryCount: (map['retry_count'] as num?)?.toInt() ?? 0,
      maxRetries: (map['max_retries'] as num?)?.toInt() ?? 3,
      missedReason: map['missed_reason'],
      timezone: map['timezone'] ?? 'Asia/Kolkata',
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

