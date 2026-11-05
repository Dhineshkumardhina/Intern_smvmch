import '../models/notification_model.dart';

abstract class NotificationRepository {
  /// Fetches notifications for a user, optionally filtering for unread only
  Future<List<NotificationModel>> getNotifications(
    String recipientId, {
    bool? unreadOnly,
  });

  /// Marks a specific notification as read
  Future<void> markAsRead(String notificationId);

  /// Marks all notifications for a recipient as read
  Future<void> markAllAsRead(String recipientId);

  /// Returns count of unread notifications for badge rendering
  Future<int> getUnreadCount(String recipientId);

  /// Realtime stream of notifications for instant alerts
  Stream<List<NotificationModel>> watchNotifications(String recipientId);
}

