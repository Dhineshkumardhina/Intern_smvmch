import 'package:flutter/material.dart';
import '../../../../core/theme/color_schemes.dart';

class StudentTasksScreen extends StatelessWidget {
  const StudentTasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Internship Tasks')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildTaskItem('API Gateway Integration', 'Implement OAuth2 proxy routes', 'Due in 2 days', 0.8, 'In Progress'),
          _buildTaskItem('Database Schema Migration', 'Migrate user and assignment tables', 'Due in 5 days', 0.3, 'In Progress'),
          _buildTaskItem('Unit Testing Suite', 'Write unit tests for authentication repository', 'Completed', 1.0, 'Completed'),
        ],
      ),
    );
  }

  Widget _buildTaskItem(String title, String desc, String due, double progress, String status) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PulseColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: progress == 1.0 ? PulseColors.successContainer : PulseColors.secondaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: progress == 1.0 ? PulseColors.success : PulseColors.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(desc, style: const TextStyle(color: PulseColors.onSurfaceVariant, fontSize: 13)),
          const SizedBox(height: 12),
          LinearProgressIndicator(value: progress, backgroundColor: PulseColors.surfaceContainerHigh),
          const SizedBox(height: 8),
          Text(due, style: const TextStyle(fontSize: 12, color: PulseColors.onSurfaceVariant)),
        ],
      ),
    );
  }
}

class StudentUpdateProgressScreen extends StatelessWidget {
  const StudentUpdateProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Update Progress')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Daily Internship Work Log',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            const Text(
              'Your faculty mentor will receive this update in real-time.',
              style: TextStyle(color: PulseColors.onSurfaceVariant, fontSize: 13),
            ),
            const SizedBox(height: 20),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Work Completed Today',
                hintText: 'Describe modules developed, tickets solved, bugs fixed...',
              ),
              maxLines: 4,
            ),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Blockers / Challenges (Optional)',
                hintText: 'Any issues blocking your next milestone...',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Plan for Tomorrow',
                hintText: 'What will you focus on during your next shift?',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Hours Worked Today',
                hintText: 'e.g. 7.5',
                prefixIcon: Icon(Icons.timer_outlined),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Submit Progress Update'),
            ),
          ],
        ),
      ),
    );
  }
}
