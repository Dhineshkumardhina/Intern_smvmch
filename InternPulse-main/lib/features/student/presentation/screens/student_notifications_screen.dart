import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/auth/auth_provider.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../models/notification_model.dart';
import '../providers/student_dashboard_provider.dart';

class StudentNotificationsScreen extends ConsumerStatefulWidget {
  const StudentNotificationsScreen({super.key});

  @override
  ConsumerState<StudentNotificationsScreen> createState() => _StudentNotificationsScreenState();
}

class _StudentNotificationsScreenState extends ConsumerState<StudentNotificationsScreen> {
  bool _isLoading = false;
  String? _errorMessage;
  List<NotificationModel> _notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = ref.read(authProvider.notifier).currentUser;
      if (user == null) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'User session not active.';
        });
        return;
      }

      final repo = ref.read(notificationRepositoryProvider);
      final list = await repo.getNotifications(user.id);

      if (!mounted) return;
      setState(() {
        _notifications = list;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      final user = ref.read(authProvider.notifier).currentUser;
      if (user == null) return;

      final repo = ref.read(notificationRepositoryProvider);
      await repo.markAllAsRead(user.id);

      if (!mounted) return;
      setState(() {
        _notifications = _notifications.map((n) => NotificationModel(
          id: n.id,
          recipientId: n.recipientId,
          senderId: n.senderId,
          title: n.title,
          message: n.message,
          notificationType: n.notificationType,
          actionUrl: n.actionUrl,
          payload: n.payload,
          isRead: true,
          readAt: DateTime.now(),
          createdAt: n.createdAt,
        )).toList();
      });

      ref.read(studentDashboardProvider.notifier).loadDashboard(isRefresh: true);
    } catch (_) {}
  }

  Future<void> _markSingleAsRead(NotificationModel notification) async {
    if (notification.isRead) return;
    try {
      final repo = ref.read(notificationRepositoryProvider);
      await repo.markAsRead(notification.id);

      if (!mounted) return;
      setState(() {
        final index = _notifications.indexWhere((n) => n.id == notification.id);
        if (index != -1) {
          _notifications[index] = NotificationModel(
            id: notification.id,
            recipientId: notification.recipientId,
            senderId: notification.senderId,
            title: notification.title,
            message: notification.message,
            notificationType: notification.notificationType,
            actionUrl: notification.actionUrl,
            payload: notification.payload,
            isRead: true,
            readAt: DateTime.now(),
            createdAt: notification.createdAt,
          );
        }
      });

      ref.read(studentDashboardProvider.notifier).loadDashboard(isRefresh: true);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(
        title: const Text('Institutional Notifications'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (_notifications.any((n) => !n.isRead))
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text('Mark All Read', style: TextStyle(fontSize: 12)),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _isLoading ? null : _fetchNotifications,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, size: 36, color: PulseColors.error),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: PulseColors.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _fetchNotifications,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_notifications.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: PulseColors.surfaceContainerLow,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.notifications_off_outlined, size: 36, color: PulseColors.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              const Text(
                'You are all caught up!',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
              ),
              const SizedBox(height: 6),
              const Text(
                'No new announcements or geofence verification alerts.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: PulseColors.onSurfaceVariant),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchNotifications,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _notifications.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final item = _notifications[index];
          return _buildNotificationTile(item);
        },
      ),
    );
  }

  Widget _buildNotificationTile(NotificationModel item) {
    IconData icon = Icons.info_outline_rounded;
    Color iconColor = PulseColors.primary;

    switch (item.notificationType) {
      case 'verification_request':
        icon = Icons.my_location_rounded;
        iconColor = PulseColors.warning;
        break;
      case 'verification_result':
        icon = Icons.verified_user_rounded;
        iconColor = PulseColors.success;
        break;
      case 'attendance_alert':
        icon = Icons.schedule_rounded;
        iconColor = PulseColors.secondary;
        break;
      case 'risk_alert':
        icon = Icons.warning_amber_rounded;
        iconColor = PulseColors.error;
        break;
      case 'assignment_update':
        icon = Icons.business_rounded;
        iconColor = PulseColors.primary;
        break;
    }

    return InkWell(
      onTap: () => _markSingleAsRead(item),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.isRead ? PulseColors.surfaceContainerLowest : PulseColors.primary.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: item.isRead ? PulseColors.outlineVariant : PulseColors.primary.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                            color: PulseColors.onSurface,
                          ),
                        ),
                      ),
                      if (!item.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: PulseColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.message,
                    style: TextStyle(
                      fontSize: 12,
                      color: PulseColors.onSurfaceVariant,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${item.createdAt.day}/${item.createdAt.month} • ${item.createdAt.hour.toString().padLeft(2, '0')}:${item.createdAt.minute.toString().padLeft(2, '0')}',
                    style: TextStyle(fontSize: 10, color: PulseColors.onSurfaceVariant.withValues(alpha: 0.7)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

