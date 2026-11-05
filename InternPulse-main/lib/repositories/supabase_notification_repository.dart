import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/supabase_auth_service.dart';
import '../core/network/network_retry.dart';
import '../models/notification_model.dart';
import 'notification_repository.dart';

class SupabaseNotificationRepository implements NotificationRepository {
  final SupabaseClient? _client;

  SupabaseNotificationRepository([SupabaseClient? client])
      : _client = client ?? SupabaseAuthService().client;

  SupabaseClient get _ensureClient {
    final c = _client ?? SupabaseAuthService().client;
    if (c == null) {
      throw const ServerException('Backend database connection is not available.');
    }
    return c;
  }

  @override
  Future<List<NotificationModel>> getNotifications(
    String recipientId, {
    bool? unreadOnly,
  }) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      var query = client
          .from('notifications')
          .select()
          .eq('recipient_id', recipientId);

      if (unreadOnly == true) {
        query = query.eq('is_read', false);
      }

      final res = await query.order('created_at', ascending: false);
      final list = res as List<dynamic>;

      return list.map((item) => NotificationModel.fromMap(item, item['id'] ?? '')).toList();
    }, operationName: 'getNotifications');
  }

  @override
  Future<void> markAsRead(String notificationId) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final nowIso = DateTime.now().toIso8601String();

      await client
          .from('notifications')
          .update({
            'is_read': true,
            'read_at': nowIso,
          })
          .eq('id', notificationId);
    }, operationName: 'markAsRead');
  }

  @override
  Future<void> markAllAsRead(String recipientId) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;
      final nowIso = DateTime.now().toIso8601String();

      await client
          .from('notifications')
          .update({
            'is_read': true,
            'read_at': nowIso,
          })
          .eq('recipient_id', recipientId)
          .eq('is_read', false);
    }, operationName: 'markAllAsRead');
  }

  @override
  Future<int> getUnreadCount(String recipientId) async {
    return NetworkRetry.execute(() async {
      final client = _ensureClient;

      final res = await client
          .from('notifications')
          .select('id')
          .eq('recipient_id', recipientId)
          .eq('is_read', false);

      final list = res as List<dynamic>;
      return list.length;
    }, operationName: 'getUnreadCount');
  }

  @override
  Stream<List<NotificationModel>> watchNotifications(String recipientId) {
    try {
      final client = _ensureClient;
      return client
          .from('notifications')
          .stream(primaryKey: ['id'])
          .eq('recipient_id', recipientId)
          .order('created_at', ascending: false)
          .map((list) => list.map((item) => NotificationModel.fromMap(item, item['id'] ?? '')).toList());
    } catch (e) {
      debugPrint('[SupabaseNotificationRepository] Stream fallback note: $e');
      return Stream.fromFuture(getNotifications(recipientId));
    }
  }
}

