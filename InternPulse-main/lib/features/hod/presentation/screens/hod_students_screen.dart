import 'package:flutter/material.dart';
import '../../../../core/theme/color_schemes.dart';

class HodStudentsScreen extends StatelessWidget {
  const HodStudentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('All College Students (SMVEC)')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text('Complete Student Registry Across 9 SMVEC Departments'),
        ),
      ),
    );
  }
}

class HodDepartmentsScreen extends StatelessWidget {
  const HodDepartmentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Departments Overview')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text('IT, ECE, EEE, MECH, CIVIL, BME, MECT, ICE, CSEBS'),
        ),
      ),
    );
  }
}

class HodMentorsScreen extends StatelessWidget {
  const HodMentorsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('Faculty Mentors Matrix')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text('Faculty Mentors, Assigned Capacity, At-Risk Counts & Progress'),
        ),
      ),
    );
  }
}

class HodAtRiskScreen extends StatelessWidget {
  const HodAtRiskScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PulseColors.background,
      appBar: AppBar(title: const Text('College At-Risk Students')),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(20),
        child: Center(
          child: Text('Delayed, Blocked & Inactive Students Across All Departments'),
        ),
      ),
    );
  }
}
