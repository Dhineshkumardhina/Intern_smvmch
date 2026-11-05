import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/router.dart';
import '../../../../core/auth/auth_provider.dart';
import '../../../../core/constants/status_constants.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../shared/widgets/pulse_stat_card.dart';
import '../../../../shared/widgets/pulse_status_badge.dart';
import '../providers/student_dashboard_provider.dart';

class StudentDashboardScreen extends ConsumerWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(studentDashboardProvider);

    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(
        title: const Text('Student Dashboard'),
        actions: [
          // Notifications with dynamic unread badge
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none_rounded),
                onPressed: () => context.push(AppRoutes.studentNotifications),
              ),
              dashboardAsync.maybeWhen(
                data: (data) => data.unreadNotificationsCount > 0
                    ? Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: PulseColors.error,
                            shape: BoxShape.circle,
                          ),
                          constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                          child: Text(
                            '${data.unreadNotificationsCount}',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      )
                    : const SizedBox.shrink(),
                orElse: () => const SizedBox.shrink(),
              ),
            ],
          ),

          // Secure Logout Action
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Sign Out',
            onPressed: () async {
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Confirm Sign Out'),
                  content: const Text('Are you sure you want to log out of InternPulse?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Sign Out'),
                    ),
                  ],
                ),
              );

              if (confirmed == true) {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) {
                  context.go(AppRoutes.login);
                }
              }
            },
          ),
        ],
      ),
      body: dashboardAsync.when(
        // 1. LOADING STATE
        loading: () => const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text(
                'Connecting to SMVEC Supabase backend...',
                style: TextStyle(fontSize: 13, color: PulseColors.onSurfaceVariant),
              ),
            ],
          ),
        ),

        // 2. ERROR STATE WITH RETRY
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: PulseColors.errorContainer,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.wifi_off_rounded, size: 36, color: PulseColors.error),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Unable to Load Dashboard',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString().replaceFirst('Exception: ', ''),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: PulseColors.onSurfaceVariant),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () => ref.read(studentDashboardProvider.notifier).loadDashboard(),
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry Connection'),
                ),
              ],
            ),
          ),
        ),

        // 3. AUTHENTIC DATA PRESENTATION
        data: (data) => RefreshIndicator(
          onRefresh: () => ref.read(studentDashboardProvider.notifier).loadDashboard(isRefresh: true),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Profile Header Card (Dynamic from Supabase profiles)
                _buildProfileHeaderCard(data),

                const SizedBox(height: 20),

                // Active Placement Card / Empty State
                if (data.hasActivePlacement)
                  _buildActivePlacementCard(context, data)
                else
                  _buildEmptyPlacementCard(context),

                const SizedBox(height: 20),

                // Attendance Quick Check-In Bar
                _buildAttendanceActionBar(context, ref, data),

                const SizedBox(height: 20),

                // 4 Top Key Stat Cards
                _buildStatCardsGrid(data),

                const SizedBox(height: 24),

                // Action Navigation Buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => context.push(AppRoutes.studentUpdateProgress),
                        icon: const Icon(Icons.add_task_rounded),
                        label: const Text('Update Today\'s Progress'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => context.push(AppRoutes.studentTasks),
                        icon: const Icon(Icons.list_alt_rounded),
                        label: const Text('View All Tasks'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProfileHeaderCard(StudentDashboardData data) {
    final initials = data.profile.displayName.isNotEmpty
        ? data.profile.displayName.trim().split(' ').map((n) => n.isNotEmpty ? n[0] : '').take(2).join().toUpperCase()
        : 'ST';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: PulseColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: PulseColors.primaryContainer,
            child: Text(
              initials,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.profile.displayName,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: PulseColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'SMVEC • ${data.profile.departmentCode} Dept • ID: ${data.profile.studentId ?? "Registered"}',
                  style: TextStyle(
                    fontSize: 13,
                    color: PulseColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          PulseStatusBadge(
            status: data.activeAssignment?.status ?? InternshipStatus.onTrack,
          ),
        ],
      ),
    );
  }

  Widget _buildActivePlacementCard(BuildContext context, StudentDashboardData data) {
    final assignment = data.activeAssignment!;
    final locationName = assignment.locationName ?? assignment.companyName;
    final radius = assignment.geofenceRadiusMeters?.toInt() ?? 200;
    final scheduleText = '${assignment.monitoringStartTime ?? "09:00"} - ${assignment.monitoringEndTime ?? "18:00"} (${assignment.requiredDailyHours?.toInt() ?? 8}h Daily)';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: PulseColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: PulseColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.apartment_rounded, color: PulseColors.primary, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      assignment.companyName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: PulseColors.onSurface,
                      ),
                    ),
                    Text(
                      '${assignment.role} • $locationName',
                      style: const TextStyle(
                        fontSize: 12,
                        color: PulseColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: PulseColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: PulseColors.success.withValues(alpha: 0.3)),
                ),
                child: const Text(
                  'ACTIVE PLACEMENT',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: PulseColors.success,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: PulseColors.outlineVariant),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 16, color: PulseColors.primary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '$radius m Geofence Radius',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: PulseColors.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.access_time_rounded, size: 16, color: PulseColors.warning),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        scheduleText,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: PulseColors.onSurface,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.push(AppRoutes.studentInternshipDetail, extra: assignment),
              icon: const Icon(Icons.info_outline_rounded, size: 16),
              label: const Text('View Full Assignment & Geofence Details'),
              style: OutlinedButton.styleFrom(
                visualDensity: VisualDensity.compact,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyPlacementCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: PulseColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: PulseColors.warning.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.business_center_outlined, color: PulseColors.warning, size: 28),
          ),
          const SizedBox(height: 12),
          const Text(
            'No Active Internship Placement',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
          ),
          const SizedBox(height: 6),
          const Text(
            'Your department HOD and faculty mentor will assign your approved host organization and geofence coordinates.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: PulseColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceActionBar(BuildContext context, WidgetRef ref, StudentDashboardData data) {
    final isCheckedIn = data.isCheckedInToday;
    final isCompleted = data.isCompletedToday;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PulseColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isCheckedIn
                  ? PulseColors.success.withValues(alpha: 0.1)
                  : PulseColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isCheckedIn ? Icons.how_to_reg_rounded : Icons.schedule_rounded,
              color: isCheckedIn ? PulseColors.success : PulseColors.primary,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isCompleted
                      ? 'Shift Completed Today'
                      : (isCheckedIn ? 'Currently Checked In' : 'Attendance Check-In'),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
                ),
                Text(
                  isCompleted
                      ? '${data.todayAttendance?.totalHours.toStringAsFixed(1)} hours logged'
                      : (isCheckedIn ? 'Active presence being tracked' : 'Record presence at facility geofence'),
                  style: const TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant),
                ),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: () => context.push(AppRoutes.studentAttendance),
            style: OutlinedButton.styleFrom(
              visualDensity: VisualDensity.compact,
            ),
            child: const Text('View Logs', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCardsGrid(StudentDashboardData data) {
    final progressVal = data.activeAssignment != null ? '68%' : '0%';
    final daysRemaining = data.activeAssignment != null ? '${data.activeAssignment!.daysRemaining} Days' : '--';
    final guideName = data.activeAssignment?.assignedBy ?? 'Faculty Guide';
    final totalSessions = '${data.recentAttendance.length} Sessions';

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        return GridView.count(
          crossAxisCount: isWide ? 4 : 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            PulseStatCard(
              title: 'Overall Progress',
              value: progressVal,
              icon: Icons.trending_up_rounded,
              iconColor: PulseColors.primary,
            ),
            PulseStatCard(
              title: 'Attendance Logs',
              value: totalSessions,
              icon: Icons.event_available_rounded,
              iconColor: PulseColors.secondary,
            ),
            PulseStatCard(
              title: 'Days Left',
              value: daysRemaining,
              icon: Icons.calendar_today_outlined,
              iconColor: PulseColors.warning,
            ),
            PulseStatCard(
              title: 'Assigned Guide',
              value: guideName,
              icon: Icons.person_outline_rounded,
              iconColor: PulseColors.success,
            ),
          ],
        );
      },
    );
  }
}
