class NotificationModel {
  final String id;
  final String recipientId;
  final String? senderId;
  final String title;
  final String message;
  final String notificationType;
  final String? actionUrl;
  final Map<String, dynamic> payload;
  final bool isRead;
  final DateTime? readAt;
  final DateTime createdAt;

  const NotificationModel({
    required this.id,
    required this.recipientId,
    this.senderId,
    required this.title,
    required this.message,
    required this.notificationType,
    this.actionUrl,
    this.payload = const {},
    this.isRead = false,
    this.readAt,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'recipient_id': recipientId,
      'sender_id': senderId,
      'title': title,
      'message': message,
      'notification_type': notificationType,
      'action_url': actionUrl,
      'payload': payload,
      'is_read': isRead,
      'read_at': readAt?.toIso8601String(),
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
      actionUrl: map['action_url'] ?? map['actionUrl'],
      payload: Map<String, dynamic>.from(map['payload'] ?? {}),
      isRead: map['is_read'] ?? map['isRead'] ?? false,
      readAt: map['read_at'] != null ? DateTime.tryParse(map['read_at'].toString()) : null,
      createdAt: DateTime.tryParse(map['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

