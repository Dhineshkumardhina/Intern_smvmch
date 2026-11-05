import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/router.dart';
import '../../../../core/constants/academic_constants.dart';
import '../../../../core/constants/status_constants.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../shared/widgets/pulse_stat_card.dart';
import '../../../../shared/widgets/pulse_status_badge.dart';

class MentorDashboardScreen extends StatefulWidget {
  const MentorDashboardScreen({super.key});

  @override
  State<MentorDashboardScreen> createState() => _MentorDashboardScreenState();
}

class _MentorDashboardScreenState extends State<MentorDashboardScreen> {
  String _selectedYear = 'All Years';
  String _selectedDept = 'All Departments';
  String _selectedStatus = 'All Status';

  // Mock Assigned Student Database for Mentor
  final List<Map<String, dynamic>> _allStudents = [
    {
      'id': 'st_1',
      'name': 'Rahul Kumar',
      'studentId': '23IT001',
      'year': '3rd Year',
      'deptCode': 'IT',
      'deptName': 'Information Technology (IT)',
      'task': 'API Integration & OAuth',
      'progress': 75.0,
      'status': InternshipStatus.onTrack,
      'lastActivity': '2 min ago',
      'company': 'Amazon Web Services',
    },
    {
      'id': 'st_2',
      'name': 'Priya S.',
      'studentId': '23ECE014',
      'year': '3rd Year',
      'deptCode': 'ECE',
      'deptName': 'Electronics and Communication Engineering (ECE)',
      'task': 'Database Setup & Schemas',
      'progress': 100.0,
      'status': InternshipStatus.completed,
      'lastActivity': '12 min ago',
      'company': 'Qualcomm India',
    },
    {
      'id': 'st_3',
      'name': 'Karthik V.',
      'studentId': '23MECH009',
      'year': '3rd Year',
      'deptCode': 'MECH',
      'deptName': 'Mechanical Engineering',
      'task': 'Thermal Stress Simulation',
      'progress': 42.0,
      'status': InternshipStatus.blocked,
      'lastActivity': '3 hours ago',
      'company': 'Tata Motors',
    },
    {
      'id': 'st_4',
      'name': 'Dinesh K.',
      'studentId': '23CSEBS003',
      'year': '3rd Year',
      'deptCode': 'CSEBS',
      'deptName': 'Computer Science and Business Systems (CSEBS)',
      'task': 'Market Analysis Report',
      'progress': 30.0,
      'status': InternshipStatus.inactive,
      'lastActivity': '3 days ago',
      'company': 'TCS Innovation Labs',
    },
    {
      'id': 'st_5',
      'name': 'Sneha R.',
      'studentId': '22IT045',
      'year': '4th Year',
      'deptCode': 'IT',
      'deptName': 'Information Technology (IT)',
      'task': 'Microservices Gateway',
      'progress': 88.0,
      'status': InternshipStatus.onTrack,
      'lastActivity': '25 min ago',
      'company': 'Zoho Corporation',
    },
    {
      'id': 'st_6',
      'name': 'Arun Prakash',
      'studentId': '24EEE012',
      'year': '2nd Year',
      'deptCode': 'EEE',
      'deptName': 'Electrical and Electronics Engineering (EEE)',
      'task': 'Inverter Control Firmware',
      'progress': 55.0,
      'status': InternshipStatus.delayed,
      'lastActivity': '1 day ago',
      'company': 'Schneider Electric',
    },
  ];

  List<Map<String, dynamic>> get _filteredStudents {
    return _allStudents.where((s) {
      if (_selectedYear != 'All Years' && s['year'] != _selectedYear) {
        return false;
      }
      if (_selectedDept != 'All Departments' && s['deptCode'] != _selectedDept) {
        return false;
      }
      if (_selectedStatus != 'All Status') {
        final st = s['status'] as InternshipStatus;
        if (st.label != _selectedStatus && st.name != _selectedStatus.toLowerCase()) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredStudents;

    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Mentor Dashboard', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
            Text('Sri Manakula Vinayagar Engineering College', style: TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant)),
          ],
        ),
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
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Statistics Grid (Total, On Track, Delayed, Blocked, Inactive, Completed)
            const Text(
              'Cohort Overview & Real-Time Statistics',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PulseColors.onSurface),
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 700;
                return GridView.count(
                  crossAxisCount: isWide ? 6 : 3,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    PulseStatCard(
                      title: 'Total Students',
                      value: '${_allStudents.length}',
                      icon: Icons.people_alt_outlined,
                      iconColor: PulseColors.primary,
                      onTap: () => setState(() {
                        _selectedYear = 'All Years';
                        _selectedDept = 'All Departments';
                        _selectedStatus = 'All Status';
                      }),
                    ),
                    PulseStatCard(
                      title: 'On Track',
                      value: '${_allStudents.where((s) => s['status'] == InternshipStatus.onTrack).length}',
                      icon: Icons.check_circle_outline,
                      iconColor: PulseColors.success,
                      onTap: () => setState(() => _selectedStatus = 'On Track'),
                    ),
                    PulseStatCard(
                      title: 'Delayed',
                      value: '${_allStudents.where((s) => s['status'] == InternshipStatus.delayed).length}',
                      icon: Icons.schedule_rounded,
                      iconColor: PulseColors.warning,
                      onTap: () => setState(() => _selectedStatus = 'Delayed'),
                    ),
                    PulseStatCard(
                      title: 'Blocked',
                      value: '${_allStudents.where((s) => s['status'] == InternshipStatus.blocked).length}',
                      icon: Icons.error_outline_rounded,
                      iconColor: PulseColors.error,
                      iconBackgroundColor: PulseColors.errorContainer,
                      onTap: () => setState(() => _selectedStatus = 'Blocked'),
                    ),
                    PulseStatCard(
                      title: 'Inactive',
                      value: '${_allStudents.where((s) => s['status'] == InternshipStatus.inactive).length}',
                      icon: Icons.bedtime_outlined,
                      iconColor: const Color(0xFF6B7280),
                      onTap: () => setState(() => _selectedStatus = 'Inactive'),
                    ),
                    PulseStatCard(
                      title: 'Completed',
                      value: '${_allStudents.where((s) => s['status'] == InternshipStatus.completed).length}',
                      icon: Icons.task_alt_rounded,
                      iconColor: PulseColors.success,
                      onTap: () => setState(() => _selectedStatus = 'Completed'),
                    ),
                  ],
                );
              },
            ),

            const SizedBox(height: 24),

            // Department-Wise Overview Section (Clickable)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: PulseColors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: PulseColors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'STUDENTS BY DEPARTMENT',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: PulseColors.onSurfaceVariant,
                        ),
                      ),
                      if (_selectedDept != 'All Departments')
                        TextButton(
                          onPressed: () => setState(() => _selectedDept = 'All Departments'),
                          child: const Text('Reset Dept Filter', style: TextStyle(fontSize: 12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: AcademicConstants.departments.map((dept) {
                      final count = _allStudents.where((s) => s['deptCode'] == dept.code).length;
                      final isSelected = _selectedDept == dept.code;
                      return InkWell(
                        onTap: () => setState(() => _selectedDept = isSelected ? 'All Departments' : dept.code),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? PulseColors.primary : PulseColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isSelected ? PulseColors.primary : PulseColors.outlineVariant,
                            ),
                          ),
                          child: Text(
                            '${dept.code} ($count)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.white : PulseColors.onSurface,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Year-Wise Classification Section (Clickable)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: PulseColors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: PulseColors.outlineVariant),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'STUDENTS BY ACADEMIC YEAR',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: PulseColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _buildYearChip('All Years'),
                      const SizedBox(width: 8),
                      _buildYearChip('1st Year'),
                      const SizedBox(width: 8),
                      _buildYearChip('2nd Year'),
                      const SizedBox(width: 8),
                      _buildYearChip('3rd Year'),
                      const SizedBox(width: 8),
                      _buildYearChip('4th Year'),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Prominent Combinable Student Filter Header & Controls
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Assigned Students',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PulseColors.onSurface),
                    ),
                    Text(
                      'Showing ${filtered.length} of ${_allStudents.length} students',
                      style: const TextStyle(fontSize: 12, color: PulseColors.onSurfaceVariant),
                    ),
                  ],
                ),

                // Reset all filters button
                if (_selectedYear != 'All Years' || _selectedDept != 'All Departments' || _selectedStatus != 'All Status')
                  OutlinedButton.icon(
                    onPressed: () => setState(() {
                      _selectedYear = 'All Years';
                      _selectedDept = 'All Departments';
                      _selectedStatus = 'All Status';
                    }),
                    icon: const Icon(Icons.refresh, size: 14),
                    label: const Text('Reset All', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Combined Dropdown Selectors
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: PulseColors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: PulseColors.outlineVariant),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedYear,
                      isDense: true,
                      decoration: const InputDecoration(
                        labelText: 'Year',
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                      items: ['All Years', ...AcademicConstants.academicYears].map((y) {
                        return DropdownMenuItem(value: y, child: Text(y, style: const TextStyle(fontSize: 12)));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedYear = val ?? 'All Years'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedDept,
                      isDense: true,
                      decoration: const InputDecoration(
                        labelText: 'Department',
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                      items: ['All Departments', ...AcademicConstants.departmentCodes].map((d) {
                        return DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 12)));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedDept = val ?? 'All Departments'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedStatus,
                      isDense: true,
                      decoration: const InputDecoration(
                        labelText: 'Status',
                        contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      ),
                      items: ['All Status', 'On Track', 'In Progress', 'Delayed', 'Blocked', 'Inactive', 'Completed'].map((s) {
                        return DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12)));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedStatus = val ?? 'All Status'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Immediate Student List View (No empty state search requirement)
            if (filtered.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: PulseColors.surfaceContainerLowest,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: PulseColors.outlineVariant),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.filter_list_off_rounded, size: 40, color: PulseColors.outline),
                    const SizedBox(height: 12),
                    const Text('No students match the selected filter combination', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    TextButton(
                      onPressed: () => setState(() {
                        _selectedYear = 'All Years';
                        _selectedDept = 'All Departments';
                        _selectedStatus = 'All Status';
                      }),
                      child: const Text('Clear Filters'),
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final student = filtered[index];
                  final status = student['status'] as InternshipStatus;

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: PulseColors.surfaceContainerLowest,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: PulseColors.outlineVariant),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: PulseColors.primaryContainer,
                              child: Text(
                                student['name'].toString().substring(0, 2).toUpperCase(),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    student['name'],
                                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${student['studentId']} • ${student['year']} • ${student['deptName']}',
                                    style: const TextStyle(color: PulseColors.onSurfaceVariant, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                            PulseStatusBadge(status: status),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: PulseColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Current Task: ${student['task']}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                  ),
                                  Text(
                                    '${(student['progress'] as double).toInt()}%',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: PulseColors.primary),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              LinearProgressIndicator(
                                value: (student['progress'] as double) / 100,
                                backgroundColor: PulseColors.surfaceVariant,
                                color: status == InternshipStatus.blocked ? PulseColors.error : PulseColors.primary,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Company: ${student['company']} • Last activity: ${student['lastActivity']}',
                              style: const TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant),
                            ),
                            TextButton.icon(
                              onPressed: () => context.push(AppRoutes.mentorMonitoring),
                              icon: const Icon(Icons.arrow_forward, size: 14),
                              label: const Text('Monitor Details', style: TextStyle(fontSize: 12)),
                              style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildYearChip(String year) {
    final isSelected = _selectedYear == year;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedYear = year),
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? PulseColors.primary : PulseColors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? PulseColors.primary : PulseColors.outlineVariant),
          ),
          child: Text(
            year,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : PulseColors.onSurface,
            ),
          ),
        ),
      ),
    );
  }
}

class MentorStudentMonitoringScreen extends StatelessWidget {
  const MentorStudentMonitoringScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Student Monitoring Details')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text('Detailed Student Progress, Tasks, Daily Updates, Timeline & Feedback (SMVEC)'),
        ),
      ),
    );
  }
}

class MentorAtRiskScreen extends StatelessWidget {
  const MentorAtRiskScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('At-Risk Students (SMVEC)')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text('Delayed, Blocked & Inactive Students Triggering Immediate Faculty Action'),
        ),
      ),
    );
  }
}

class MentorActivityScreen extends StatelessWidget {
  const MentorActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Live Activity Stream')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text('Real-Time Firestore Activity Listener Feed'),
        ),
      ),
    );
  }
}
