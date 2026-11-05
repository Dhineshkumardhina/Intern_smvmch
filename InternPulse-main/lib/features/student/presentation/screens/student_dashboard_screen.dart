import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/router.dart';
import '../../../../core/constants/status_constants.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../shared/widgets/pulse_stat_card.dart';
import '../../../../shared/widgets/pulse_status_badge.dart';

class StudentDashboardScreen extends StatelessWidget {
  const StudentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(
        title: const Text('Student Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => context.go(AppRoutes.login),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Header Card
            Container(
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
                    child: const Text(
                      'AP',
                      style: TextStyle(
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
                        const Text(
                          'Welcome back, Alex Parker',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: PulseColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'SMVEC • IT Dept (3rd Year) • Cloud Intern',
                          style: TextStyle(
                            fontSize: 13,
                            color: PulseColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const PulseStatusBadge(status: InternshipStatus.onTrack),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Top Stat Cards Grid
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 600;
                return GridView.count(
                  crossAxisCount: isWide ? 4 : 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: const [
                    PulseStatCard(
                      title: 'Overall Progress',
                      value: '68%',
                      icon: Icons.trending_up_rounded,
                      iconColor: PulseColors.primary,
                    ),
                    PulseStatCard(
                      title: 'Active Tasks',
                      value: '4',
                      icon: Icons.assignment_outlined,
                      iconColor: PulseColors.secondary,
                    ),
                    PulseStatCard(
                      title: 'Days Left',
                      value: '42 Days',
                      icon: Icons.calendar_today_outlined,
                      iconColor: PulseColors.warning,
                    ),
                    PulseStatCard(
                      title: 'Assigned Mentor',
                      value: 'Dr. Ramesh',
                      icon: Icons.person_outline_rounded,
                      iconColor: PulseColors.success,
                    ),
                  ],
                );
              },
            ),

            const SizedBox(height: 24),

            // Action Buttons
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
    );
  }
}
