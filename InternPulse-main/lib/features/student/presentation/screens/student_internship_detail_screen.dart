import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/router.dart';
import '../../../../core/constants/status_constants.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../models/internship_model.dart';
import '../../../../shared/widgets/pulse_status_badge.dart';

class StudentInternshipDetailScreen extends StatelessWidget {
  final InternshipModel? internship;

  const StudentInternshipDetailScreen({
    super.key,
    this.internship,
  });

  @override
  Widget build(BuildContext context) {
    // Fallback default assignment record if none passed via state
    final assignment = internship ?? InternshipModel(
      id: 'asgn-smvec-001',
      studentId: '23CSEBS001',
      companyName: 'Tata Consultancy Services',
      role: 'Software Engineer Intern',
      description: 'Cloud native software development, API design, and telemetry pipeline integration.',
      startDate: DateTime(2026, 1, 5),
      endDate: DateTime(2026, 6, 30),
      mentorId: 'MENTOR_CSEBS_01',
      status: InternshipStatus.onTrack,
      overallProgress: 68.0,
      createdAt: DateTime(2026, 1, 2),
      updatedAt: DateTime(2026, 1, 2),
      locationId: 'c0000000-0000-0000-0000-000000000001',
      locationName: 'TCS Siruseri Innovation Hub',
      locationAddress: 'SIPCOT IT Park, Siruseri, Chennai, Tamil Nadu 603103',
      geofenceRadiusMeters: 200.0,
      latitude: 12.8284,
      longitude: 80.2198,
      monitoringStartTime: '09:00:00',
      monitoringEndTime: '18:00:00',
      requiredDailyHours: 8.0,
      assignedAt: DateTime(2026, 1, 2, 10, 0),
      assignedBy: 'Prof. Anitha Kumar (Faculty Mentor)',
      assignmentStatus: 'active',
    );

    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(
        title: const Text('Internship Placement Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Organization & Status Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: PulseColors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: PulseColors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: PulseColors.primaryContainer,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(
                          Icons.business_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              assignment.companyName,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: PulseColors.onSurface,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              assignment.role,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: PulseColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      PulseStatusBadge(status: assignment.status),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    assignment.description,
                    style: TextStyle(
                      fontSize: 13,
                      color: PulseColors.onSurfaceVariant,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Approved Geofence Facility Location Card
            Container(
              padding: const EdgeInsets.all(20),
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
                      Icon(Icons.location_on_rounded, color: PulseColors.primary, size: 22),
                      const SizedBox(width: 8),
                      const Text(
                        'Approved Geofence Facility',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: PulseColors.onSurface,
                        ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: PulseColors.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: PulseColors.success.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.verified_rounded, size: 14, color: PulseColors.success),
                            const SizedBox(width: 4),
                            Text(
                              'HOD Approved',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: PulseColors.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    assignment.locationName ?? 'Official Host Facility',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: PulseColors.onSurface,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    assignment.locationAddress ?? 'Designated Placement Address',
                    style: TextStyle(
                      fontSize: 13,
                      color: PulseColors.onSurfaceVariant,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 14),
                  // Geofence Coordinate Pill Details
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: PulseColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: PulseColors.outlineVariant),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildInfoColumn(
                          label: 'PostGIS Latitude',
                          value: assignment.latitude?.toStringAsFixed(4) ?? '12.8284',
                          icon: Icons.my_location_rounded,
                        ),
                        _buildInfoColumn(
                          label: 'PostGIS Longitude',
                          value: assignment.longitude?.toStringAsFixed(4) ?? '80.2198',
                          icon: Icons.explore_outlined,
                        ),
                        _buildInfoColumn(
                          label: 'Geofence Radius',
                          value: '${assignment.geofenceRadiusMeters?.toInt() ?? 200} m',
                          icon: Icons.radio_button_checked_rounded,
                          highlight: true,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Monitoring Schedule Card
            Container(
              padding: const EdgeInsets.all(20),
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
                      Icon(Icons.schedule_rounded, color: PulseColors.warning, size: 22),
                      const SizedBox(width: 8),
                      const Text(
                        'Monitoring Schedule & Hours',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: PulseColors.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _buildDetailTile(
                          title: 'Work Hours Window',
                          value: '${assignment.monitoringStartTime ?? "09:00"} - ${assignment.monitoringEndTime ?? "18:00"}',
                          subtitle: 'Daily Geofence Verification Window',
                          icon: Icons.access_time_rounded,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildDetailTile(
                          title: 'Daily Required Hours',
                          value: '${assignment.requiredDailyHours ?? 8.0} hrs/day',
                          subtitle: 'Mandatory Active Presence',
                          icon: Icons.timer_outlined,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Placement Timeline & Guide Card
            Container(
              padding: const EdgeInsets.all(20),
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
                      Icon(Icons.date_range_rounded, color: PulseColors.secondary, size: 22),
                      const SizedBox(width: 8),
                      const Text(
                        'Placement Duration & Governance',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: PulseColors.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: _buildDetailTile(
                          title: 'Start Date',
                          value: '${assignment.startDate.day}/${assignment.startDate.month}/${assignment.startDate.year}',
                          subtitle: 'Commencement',
                          icon: Icons.play_arrow_rounded,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildDetailTile(
                          title: 'End Date',
                          value: '${assignment.endDate.day}/${assignment.endDate.month}/${assignment.endDate.year}',
                          subtitle: '${assignment.totalDays} Total Days',
                          icon: Icons.flag_rounded,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildDetailTile(
                    title: 'Assigned Faculty Guide',
                    value: assignment.assignedBy ?? 'Prof. Anitha Kumar (Faculty Mentor)',
                    subtitle: 'Assigned on: ${assignment.assignedAt != null ? "${assignment.assignedAt!.day}/${assignment.assignedAt!.month}/${assignment.assignedAt!.year}" : "Semester Term"}',
                    icon: Icons.person_rounded,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Anti-Tamper Security Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: PulseColors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: PulseColors.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.shield_rounded, color: PulseColors.primary, size: 22),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Institutional Placement parameters are configured by Department HOD & Mentor. Parameters are tamper-proof and read-only for students.',
                      style: TextStyle(
                        fontSize: 12,
                        color: PulseColors.primary,
                        height: 1.3,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoColumn({
    required String label,
    required String value,
    required IconData icon,
    bool highlight = false,
  }) {
    return Column(
      children: [
        Icon(icon, size: 18, color: highlight ? PulseColors.primary : PulseColors.onSurfaceVariant),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: highlight ? PulseColors.primary : PulseColors.onSurface,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: PulseColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailTile({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: PulseColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: PulseColors.outlineVariant),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: PulseColors.primary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    color: PulseColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: PulseColors.onSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11,
                    color: PulseColors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

