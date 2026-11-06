class NotificationModel {
  final String id;
  final String recipientId;
  final String? senderId;
  final String title;
  final String message;
  final String notificationType;
  final String category; // 'VIOLATION' | 'TECHNICAL_FAILURE' | 'ATTENDANCE_PROMPT' | 'SYSTEM_UPDATE'
  final String priority; // 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
  final String? actionUrl;
  final Map<String, dynamic> payload;
  final bool isRead;
  final DateTime? readAt;
  final String deliveryStatus;
  final String? deduplicationKey;
  final DateTime createdAt;

  const NotificationModel({
    required this.id,
    required this.recipientId,
    this.senderId,
    required this.title,
    required this.message,
    required this.notificationType,
    this.category = 'ATTENDANCE_PROMPT',
    this.priority = 'NORMAL',
    this.actionUrl,
    this.payload = const {},
    this.isRead = false,
    this.readAt,
    this.deliveryStatus = 'DELIVERED',
    this.deduplicationKey,
    required this.createdAt,
  });

  bool get isViolation => category == 'VIOLATION' || notificationType == 'confirmed_outside_geofence';
  bool get isTechnicalFailure =>
      category == 'TECHNICAL_FAILURE' ||
      notificationType == 'gps_disabled' ||
      notificationType == 'location_permission_revoked' ||
      notificationType == 'student_device_offline';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'recipient_id': recipientId,
      'sender_id': senderId,
      'title': title,
      'message': message,
      'notification_type': notificationType,
      'category': category,
      'priority': priority,
      'action_url': actionUrl,
      'payload': payload,
      'is_read': isRead,
      'read_at': readAt?.toIso8601String(),
      'delivery_status': deliveryStatus,
      'deduplication_key': deduplicationKey,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory NotificationModel.fromMap(Map<String, dynamic> map, String id) {
    return NotificationModel(
      id: id,
      recipientId: map['recipient_id'] ?? map['recipientId'] ?? '',
      senderId: map['sender_id'] ?? map['senderId'],
      title: map['title'] ?? 'Notification',
      message: map['message'] ?? '',
      notificationType: map['notification_type'] ?? map['type'] ?? 'system_announcement',
      category: map['category'] ??
          (map['notification_type'] == 'confirmed_outside_geofence'
              ? 'VIOLATION'
              : (map['notification_type'] == 'gps_disabled' ||
                      map['notification_type'] == 'location_permission_revoked' ||
                      map['notification_type'] == 'student_device_offline'
                  ? 'TECHNICAL_FAILURE'
                  : 'ATTENDANCE_PROMPT')),
      priority: map['priority'] ?? 'NORMAL',
      actionUrl: map['action_url'] ?? map['actionUrl'],
      payload: Map<String, dynamic>.from(map['payload'] ?? {}),
      isRead: map['is_read'] ?? map['isRead'] ?? false,
      readAt: map['read_at'] != null ? DateTime.tryParse(map['read_at'].toString()) : null,
      deliveryStatus: map['delivery_status'] ?? 'DELIVERED',
      deduplicationKey: map['deduplication_key'],
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
