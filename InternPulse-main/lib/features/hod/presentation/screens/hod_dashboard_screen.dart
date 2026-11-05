import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../app/router.dart';
import '../../../../core/constants/academic_constants.dart';
import '../../../../core/constants/status_constants.dart';
import '../../../../core/theme/color_schemes.dart';
import '../../../../shared/widgets/pulse_stat_card.dart';
import '../../../../shared/widgets/pulse_status_badge.dart';

class HodDashboardScreen extends StatefulWidget {
  const HodDashboardScreen({super.key});

  @override
  State<HodDashboardScreen> createState() => _HodDashboardScreenState();
}

class _HodDashboardScreenState extends State<HodDashboardScreen> {
  String _selectedYear = 'All Years';
  String _selectedDept = 'All Departments';
  String _selectedStatus = 'All Status';
  String _selectedMentor = 'All Mentors';

  final List<Map<String, dynamic>> _collegeStudents = [
    {
      'id': 'st_1',
      'studentId': '23IT001',
      'name': 'Rahul Kumar',
      'year': '3rd Year',
      'deptCode': 'IT',
      'mentor': 'Dr. Ramesh K.',
      'company': 'Amazon Web Services',
      'progress': 78.0,
      'status': InternshipStatus.onTrack,
      'lastActivity': '2 min ago',
    },
    {
      'id': 'st_2',
      'studentId': '23ECE014',
      'name': 'Priya S.',
      'year': '3rd Year',
      'deptCode': 'ECE',
      'mentor': 'Prof. Anitha S.',
      'company': 'Qualcomm India',
      'progress': 100.0,
      'status': InternshipStatus.completed,
      'lastActivity': '12 min ago',
    },
    {
      'id': 'st_3',
      'studentId': '23MECH009',
      'name': 'Karthik V.',
      'year': '3rd Year',
      'deptCode': 'MECH',
      'mentor': 'Dr. Vignesh M.',
      'company': 'Tata Motors',
      'progress': 42.0,
      'status': InternshipStatus.blocked,
      'lastActivity': '3 hours ago',
    },
    {
      'id': 'st_4',
      'studentId': '23CSEBS003',
      'name': 'Dinesh K.',
      'year': '3rd Year',
      'deptCode': 'CSEBS',
      'mentor': 'Dr. Priya D.',
      'company': 'TCS Innovation Labs',
      'progress': 30.0,
      'status': InternshipStatus.inactive,
      'lastActivity': '4 days ago',
    },
    {
      'id': 'st_5',
      'studentId': '22IT045',
      'name': 'Sneha R.',
      'year': '4th Year',
      'deptCode': 'IT',
      'mentor': 'Dr. Ramesh K.',
      'company': 'Zoho Corporation',
      'progress': 88.0,
      'status': InternshipStatus.onTrack,
      'lastActivity': '25 min ago',
    },
    {
      'id': 'st_6',
      'studentId': '24EEE012',
      'name': 'Arun Prakash',
      'year': '2nd Year',
      'deptCode': 'EEE',
      'mentor': 'Dr. Suresh B.',
      'company': 'Schneider Electric',
      'progress': 55.0,
      'status': InternshipStatus.delayed,
      'lastActivity': '1 day ago',
    },
    {
      'id': 'st_7',
      'studentId': '22CIVIL019',
      'name': 'Meera N.',
      'year': '4th Year',
      'deptCode': 'CIVIL',
      'mentor': 'Dr. Balaji T.',
      'company': 'L&T Construction',
      'progress': 92.0,
      'status': InternshipStatus.onTrack,
      'lastActivity': '5 hours ago',
    },
    {
      'id': 'st_8',
      'studentId': '23BME007',
      'name': 'Pooja M.',
      'year': '3rd Year',
      'deptCode': 'BME',
      'mentor': 'Dr. Geetha R.',
      'company': 'Apollo TeleHealth',
      'progress': 91.0,
      'status': InternshipStatus.onTrack,
      'lastActivity': '1 hour ago',
    },
  ];

  List<Map<String, dynamic>> get _filteredStudents {
    return _collegeStudents.where((s) {
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
      if (_selectedMentor != 'All Mentors' && s['mentor'] != _selectedMentor) {
        return false;
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
            Text('HOD Dashboard', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
            Text('Sri Manakula Vinayagar Engineering College (SMVEC)', style: TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant)),
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
            // Breadcrumbs / Institutional Hierarchy
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: PulseColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: PulseColors.outlineVariant),
              ),
              child: Row(
                children: [
                  const Icon(Icons.account_balance_outlined, size: 16, color: PulseColors.primary),
                  const SizedBox(width: 6),
                  const Text('SMVEC', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  const Text('  >  ', style: TextStyle(fontSize: 12, color: PulseColors.outline)),
                  Text(_selectedYear, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const Text('  >  ', style: TextStyle(fontSize: 12, color: PulseColors.outline)),
                  Text(_selectedDept, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PulseColors.primary)),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Top HOD Statistics (1,250 Total, 820 Active, 210 Completed, 75 At Risk, 32 Inactive)
            const Text(
              'College-Level Internship Activity',
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
                      value: '1,250',
                      icon: Icons.school_outlined,
                      iconColor: PulseColors.primary,
                      onTap: () => setState(() {
                        _selectedYear = 'All Years';
                        _selectedDept = 'All Departments';
                        _selectedStatus = 'All Status';
                        _selectedMentor = 'All Mentors';
                      }),
                    ),
                    const PulseStatCard(
                      title: 'Total Mentors',
                      value: '84',
                      icon: Icons.supervisor_account_outlined,
                      iconColor: PulseColors.secondary,
                    ),
                    const PulseStatCard(
                      title: 'Active Interns',
                      value: '820',
                      icon: Icons.trending_up_rounded,
                      iconColor: PulseColors.primaryContainer,
                    ),
                    const PulseStatCard(
                      title: 'Completed',
                      value: '210',
                      icon: Icons.task_alt_rounded,
                      iconColor: PulseColors.success,
                    ),
                    PulseStatCard(
                      title: 'At Risk',
                      value: '75',
                      icon: Icons.warning_amber_rounded,
                      iconColor: PulseColors.error,
                      iconBackgroundColor: PulseColors.errorContainer,
                      onTap: () => setState(() => _selectedStatus = 'Blocked'),
                    ),
                    PulseStatCard(
                      title: 'Inactive',
                      value: '32',
                      icon: Icons.bedtime_outlined,
                      iconColor: const Color(0xFF6B7280),
                      onTap: () => setState(() => _selectedStatus = 'Inactive'),
                    ),
                  ],
                );
              },
            ),

            const SizedBox(height: 24),

            // Department-Wise Internship Overview (Cards for 9 SMVEC Departments)
            Container(
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'DEPARTMENT-WISE INTERNSHIP OVERVIEW',
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
                          child: const Text('Show All Departments', style: TextStyle(fontSize: 12)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 320,
                      mainAxisExtent: 110,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemCount: AcademicConstants.departments.length,
                    itemBuilder: (context, idx) {
                      final dept = AcademicConstants.departments[idx];
                      final isSelected = _selectedDept == dept.code;

                      return InkWell(
                        onTap: () => setState(() => _selectedDept = isSelected ? 'All Departments' : dept.code),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isSelected ? PulseColors.primaryFixed : PulseColors.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? PulseColors.primary : PulseColors.outlineVariant,
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    dept.name,
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                      color: isSelected ? PulseColors.onPrimaryFixed : PulseColors.onSurface,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    dept.code,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                ],
                              ),
                              Text(
                                '${120 + idx * 8} Students • ${82 + idx * 4} Active • ${74 + (idx % 8)}% Avg Progress',
                                style: const TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant),
                              ),
                              Row(
                                children: [
                                  Text('${18 + idx} Done  ', style: const TextStyle(fontSize: 10, color: PulseColors.success, fontWeight: FontWeight.bold)),
                                  Text('${6 + (idx % 3)} Delayed  ', style: const TextStyle(fontSize: 10, color: PulseColors.warning, fontWeight: FontWeight.bold)),
                                  Text('${3 + (idx % 2)} Blocked', style: const TextStyle(fontSize: 10, color: PulseColors.error, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Year-Wise Overview Cards (1st, 2nd, 3rd, 4th Year)
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
                    'YEAR-WISE CLASSIFICATION',
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
                      _buildYearTile('All Years', '1,250 Interns', _selectedYear == 'All Years'),
                      const SizedBox(width: 8),
                      _buildYearTile('1st Year', '280 Interns', _selectedYear == '1st Year'),
                      const SizedBox(width: 8),
                      _buildYearTile('2nd Year', '310 Interns', _selectedYear == '2nd Year'),
                      const SizedBox(width: 8),
                      _buildYearTile('3rd Year', '340 Interns', _selectedYear == '3rd Year'),
                      const SizedBox(width: 8),
                      _buildYearTile('4th Year', '320 Interns', _selectedYear == '4th Year'),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Students Requiring Attention (At-Risk Section)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFECDD3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: PulseColors.error, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'STUDENTS REQUIRING ATTENTION',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: PulseColors.error,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFECDD3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Karthik V. • 3rd Year • MECH', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              const SizedBox(height: 2),
                              const Text('BLOCKED: Awaiting host company CAD credentials.', style: TextStyle(color: PulseColors.error, fontSize: 11)),
                              const SizedBox(height: 6),
                              const Text('Mentor: Dr. Vignesh M. • Reported 3h ago', style: TextStyle(fontSize: 10, color: PulseColors.onSurfaceVariant)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFFEF3C7)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Dinesh K. • 3rd Year • CSEBS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              const SizedBox(height: 2),
                              const Text('INACTIVE: No progress update for 4 consecutive days.', style: TextStyle(color: PulseColors.warning, fontSize: 11)),
                              const SizedBox(height: 6),
                              const Text('Mentor: Dr. Priya D. • Last active: Friday', style: TextStyle(fontSize: 10, color: PulseColors.onSurfaceVariant)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Prominent Combinable Filter Controls for HOD
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'All Students Directory',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PulseColors.onSurface),
                    ),
                    Text(
                      'Showing ${filtered.length} of ${_collegeStudents.length} matching students',
                      style: const TextStyle(fontSize: 12, color: PulseColors.onSurfaceVariant),
                    ),
                  ],
                ),
                if (_selectedYear != 'All Years' || _selectedDept != 'All Departments' || _selectedStatus != 'All Status' || _selectedMentor != 'All Mentors')
                  OutlinedButton.icon(
                    onPressed: () => setState(() {
                      _selectedYear = 'All Years';
                      _selectedDept = 'All Departments';
                      _selectedStatus = 'All Status';
                      _selectedMentor = 'All Mentors';
                    }),
                    icon: const Icon(Icons.refresh, size: 14),
                    label: const Text('Reset All', style: TextStyle(fontSize: 11)),
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // 4 Combined Dropdowns: Year, Dept, Status, Mentor
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
                        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      ),
                      items: ['All Years', ...AcademicConstants.academicYears].map((y) {
                        return DropdownMenuItem(value: y, child: Text(y, style: const TextStyle(fontSize: 11)));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedYear = val ?? 'All Years'),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedDept,
                      isDense: true,
                      decoration: const InputDecoration(
                        labelText: 'Department',
                        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      ),
                      items: ['All Departments', ...AcademicConstants.departmentCodes].map((d) {
                        return DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 11)));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedDept = val ?? 'All Departments'),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedStatus,
                      isDense: true,
                      decoration: const InputDecoration(
                        labelText: 'Status',
                        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      ),
                      items: ['All Status', 'On Track', 'In Progress', 'Delayed', 'Blocked', 'Inactive', 'Completed'].map((s) {
                        return DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 11)));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedStatus = val ?? 'All Status'),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedMentor,
                      isDense: true,
                      decoration: const InputDecoration(
                        labelText: 'Mentor',
                        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      ),
                      items: ['All Mentors', 'Dr. Ramesh K.', 'Prof. Anitha S.', 'Dr. Vignesh M.', 'Dr. Priya D.', 'Dr. Suresh B.', 'Dr. Balaji T.', 'Dr. Geetha R.'].map((m) {
                        return DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 11)));
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedMentor = val ?? 'All Mentors'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Professional HOD Student Management Table
            Container(
              decoration: BoxDecoration(
                color: PulseColors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: PulseColors.outlineVariant),
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(PulseColors.surfaceContainerLow),
                  columns: const [
                    DataColumn(label: Text('Student ID', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Student Name', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Year', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Department', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Mentor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Internship Company', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Progress', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                    DataColumn(label: Text('Last Activity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                  ],
                  rows: filtered.map((st) {
                    final status = st['status'] as InternshipStatus;
                    return DataRow(
                      cells: [
                        DataCell(Text(st['studentId'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
                        DataCell(Text(st['name'], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12))),
                        DataCell(Text(st['year'], style: const TextStyle(fontSize: 12))),
                        DataCell(Text(st['deptCode'], style: const TextStyle(fontSize: 12))),
                        DataCell(Text(st['mentor'], style: const TextStyle(fontSize: 12))),
                        DataCell(Text(st['company'], style: const TextStyle(fontSize: 12))),
                        DataCell(
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('${(st['progress'] as double).toInt()}% ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                              SizedBox(
                                width: 50,
                                child: LinearProgressIndicator(
                                  value: (st['progress'] as double) / 100,
                                  color: status == InternshipStatus.blocked ? PulseColors.error : PulseColors.primary,
                                  backgroundColor: PulseColors.surfaceVariant,
                                ),
                              ),
                            ],
                          ),
                        ),
                        DataCell(PulseStatusBadge(status: status, fontSize: 11)),
                        DataCell(Text(st['lastActivity'], style: const TextStyle(fontSize: 11, color: PulseColors.onSurfaceVariant))),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildYearTile(String title, String count, bool isSelected) {
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedYear = title),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? PulseColors.primary : PulseColors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? PulseColors.primary : PulseColors.outlineVariant),
          ),
          child: Column(
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : PulseColors.onSurface,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                count,
                style: TextStyle(
                  fontSize: 10,
                  color: isSelected ? Colors.white.withOpacity(0.85) : PulseColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
