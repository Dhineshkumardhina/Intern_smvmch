import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/auth/auth_provider.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../models/attendance_model.dart';
import '../providers/student_dashboard_provider.dart';

class StudentAttendanceScreen extends ConsumerStatefulWidget {
  const StudentAttendanceScreen({super.key});

  @override
  ConsumerState<StudentAttendanceScreen> createState() => _StudentAttendanceScreenState();
}

class _StudentAttendanceScreenState extends ConsumerState<StudentAttendanceScreen> {
  bool _isLoading = false;
  String? _errorMessage;
  List<AttendanceModel> _records = [];

  @override
  void initState() {
    super.initState();
    _fetchAttendance();
  }

  Future<void> _fetchAttendance() async {
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

      final repo = ref.read(attendanceRepositoryProvider);
      final list = await repo.getAttendanceHistory(user.id);

      if (!mounted) return;
      setState(() {
        _records = list;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(
        title: const Text('Attendance & Geofence Logs'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _isLoading ? null : _fetchAttendance,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    // 1. Loading State
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text(
              'Fetching attendance records from Supabase...',
              style: TextStyle(fontSize: 13, color: PulseColors.onSurfaceVariant),
            ),
          ],
        ),
      );
    }

    // 2. Error State with Retry
    if (_errorMessage != null) {
      return Center(
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
                child: const Icon(Icons.cloud_off_rounded, size: 36, color: PulseColors.error),
              ),
              const SizedBox(height: 16),
              const Text(
                'Unable to Load Attendance',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
              ),
              const SizedBox(height: 8),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: PulseColors.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _fetchAttendance,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Retry Connection'),
              ),
            ],
          ),
        ),
      );
    }

    // 3. Empty State
    if (_records.isEmpty) {
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
                child: const Icon(Icons.event_busy_rounded, size: 36, color: PulseColors.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              const Text(
                'No Attendance Sessions Recorded',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your daily check-in and check-out logs verified against approved geofence facilities will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: PulseColors.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: _fetchAttendance,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Refresh'),
              ),
            ],
          ),
        ),
      );
    }

    // 4. Data Presentation
    final totalHours = _records.fold<double>(0.0, (sum, item) => sum + item.totalHours);
    final verifiedCount = _records.where((r) => r.isVerified).length;

    return RefreshIndicator(
      onRefresh: _fetchAttendance,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Stat Summary Cards
          Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  title: 'Total Sessions',
                  value: '${_records.length}',
                  icon: Icons.calendar_today_rounded,
                  color: PulseColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  title: 'Total Hours',
                  value: '${totalHours.toStringAsFixed(1)} hrs',
                  icon: Icons.access_time_rounded,
                  color: PulseColors.secondary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  title: 'HOD Verified',
                  value: '$verifiedCount',
                  icon: Icons.verified_user_rounded,
                  color: PulseColors.success,
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          const Text(
            'Daily Check-in & Check-out History',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
          ),
          const SizedBox(height: 12),

          // Attendance Session Records List
          ..._records.map((r) => _buildRecordCard(r)),
        ],
      ),
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: PulseColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _buildRecordCard(AttendanceModel record) {
    final dateStr = '${record.sessionDate.day}/${record.sessionDate.month}/${record.sessionDate.year}';
    final checkInTime = record.checkInAt != null
        ? '${record.checkInAt!.hour.toString().padLeft(2, '0')}:${record.checkInAt!.minute.toString().padLeft(2, '0')}'
        : '--:--';
    final checkOutTime = record.checkOutAt != null
        ? '${record.checkOutAt!.hour.toString().padLeft(2, '0')}:${record.checkOutAt!.minute.toString().padLeft(2, '0')}'
        : 'In Progress';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: PulseColors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Text(
                dateStr,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: PulseColors.onSurface),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: record.isVerified
                      ? PulseColors.success.withValues(alpha: 0.1)
                      : PulseColors.warning.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: record.isVerified
                        ? PulseColors.success.withValues(alpha: 0.3)
                        : PulseColors.warning.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      record.isVerified ? Icons.check_circle_rounded : Icons.schedule_rounded,
                      size: 12,
                      color: record.isVerified ? PulseColors.success : PulseColors.warning,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      record.isVerified ? 'VERIFIED' : 'PENDING REVIEW',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: record.isVerified ? PulseColors.success : PulseColors.warning,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Check In', style: TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant)),
                    const SizedBox(height: 2),
                    Text(checkInTime, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Check Out', style: TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant)),
                    const SizedBox(height: 2),
                    Text(checkOutTime, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Hours', style: TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant)),
                    const SizedBox(height: 2),
                    Text('${record.totalHours.toStringAsFixed(1)} hrs', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: PulseColors.primary)),
                  ],
                ),
              ),
            ],
          ),
          if (record.notes != null && record.notes!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Notes: ${record.notes}',
              style: TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant, fontStyle: FontStyle.italic),
            ),
          ],
        ],
      ),
    );
  }
}

