import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/router.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../shared/widgets/pulse_stat_card.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(
        title: const Text('Admin Console • SMVEC'),
        actions: [
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
            const Text(
              'Institution Monitoring (SMVEC)',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            LayoutBuilder(
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
                      title: 'Total Enrolled Interns',
                      value: '420',
                      icon: Icons.school_outlined,
                      onTap: () => context.push(AppRoutes.adminStudents),
                    ),
                    PulseStatCard(
                      title: 'Faculty Mentors',
                      value: '36',
                      icon: Icons.supervisor_account_outlined,
                      onTap: () => context.push(AppRoutes.adminMentorAssignment),
                    ),
                    const PulseStatCard(
                      title: 'Departments Active',
                      value: '9 Depts',
                      icon: Icons.account_tree_outlined,
                      iconColor: PulseColors.secondary,
                    ),
                    const PulseStatCard(
                      title: 'Overall Placement Rate',
                      value: '94.2%',
                      icon: Icons.trending_up_rounded,
                      iconColor: PulseColors.success,
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => context.push(AppRoutes.adminStudents),
                    icon: const Icon(Icons.manage_accounts_outlined),
                    label: const Text('Student Directory & Status'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push(AppRoutes.adminMentorAssignment),
                    icon: const Icon(Icons.group_add_outlined),
                    label: const Text('Mentor Assignment Matrix'),
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

class AdminStudentManagementScreen extends StatelessWidget {
  const AdminStudentManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Student Management')),
      body: const Center(child: Text('Department Filter & Student Status Table')),
    );
  }
}

class AdminMentorAssignmentScreen extends StatelessWidget {
  const AdminMentorAssignmentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Mentor Assignment')),
      body: const Center(child: Text('Assign Students to Faculty Mentors')),
    );
  }
}
