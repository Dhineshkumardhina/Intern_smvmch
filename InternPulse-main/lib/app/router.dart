import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/user_role.dart';

// Authentication
import '../features/authentication/presentation/screens/login_screen.dart';
import '../features/authentication/presentation/screens/register_screen.dart';
import '../features/authentication/presentation/screens/forgot_password_screen.dart';
import '../features/authentication/presentation/screens/onboarding_screen.dart';

// Student
import '../features/student/presentation/screens/student_dashboard_screen.dart';
import '../features/student/presentation/screens/student_tasks_screen.dart';
import '../features/student/presentation/screens/student_update_progress_screen.dart';

// Mentor
import '../features/mentor/presentation/screens/mentor_dashboard_screen.dart';
import '../features/mentor/presentation/screens/mentor_student_monitoring_screen.dart';
import '../features/mentor/presentation/screens/mentor_at_risk_screen.dart';
import '../features/mentor/presentation/screens/mentor_activity_screen.dart';

// HOD (Head of Department)
import '../features/hod/presentation/screens/hod_dashboard_screen.dart';
import '../features/hod/presentation/screens/hod_students_screen.dart';
import '../features/hod/presentation/screens/hod_departments_screen.dart';
import '../features/hod/presentation/screens/hod_mentors_screen.dart';
import '../features/hod/presentation/screens/hod_at_risk_screen.dart';

class AppRoutes {
  AppRoutes._();

  // Auth Routes
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String onboarding = '/onboarding';

  // Student Routes
  static const String studentDashboard = '/student/dashboard';
  static const String studentTasks = '/student/tasks';
  static const String studentUpdateProgress = '/student/update-progress';

  // Mentor Routes
  static const String mentorDashboard = '/mentor/dashboard';
  static const String mentorMonitoring = '/mentor/monitoring';
  static const String mentorAtRisk = '/mentor/at-risk';
  static const String mentorLiveActivity = '/mentor/live-activity';

  // HOD (Head of Department) Routes
  static const String hodDashboard = '/hod/dashboard';
  static const String hodStudents = '/hod/students';
  static const String hodDepartments = '/hod/departments';
  static const String hodMentors = '/hod/mentors';
  static const String hodAtRisk = '/hod/at-risk';

  /// Helper to route to the correct landing screen based on authenticated role
  static String getInitialRouteForRole(UserRole role) {
    switch (role) {
      case UserRole.student:
        return studentDashboard;
      case UserRole.mentor:
        return mentorDashboard;
      case UserRole.hod:
        return hodDashboard;
    }
  }
}

final appRouter = GoRouter(
  initialLocation: AppRoutes.login,
  routes: [
    // Authentication Flow (Entry screen for unauthenticated users)
    GoRoute(
      path: AppRoutes.login,
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: AppRoutes.register,
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: AppRoutes.forgotPassword,
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboarding,
      builder: (context, state) => const OnboardingScreen(),
    ),

    // Student Flow
    GoRoute(
      path: AppRoutes.studentDashboard,
      builder: (context, state) => const StudentDashboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.studentTasks,
      builder: (context, state) => const StudentTasksScreen(),
    ),
    GoRoute(
      path: AppRoutes.studentUpdateProgress,
      builder: (context, state) => const StudentUpdateProgressScreen(),
    ),

    // Mentor Flow
    GoRoute(
      path: AppRoutes.mentorDashboard,
      builder: (context, state) => const MentorDashboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.mentorMonitoring,
      builder: (context, state) => const MentorStudentMonitoringScreen(),
    ),
    GoRoute(
      path: AppRoutes.mentorAtRisk,
      builder: (context, state) => const MentorAtRiskScreen(),
    ),
    GoRoute(
      path: AppRoutes.mentorLiveActivity,
      builder: (context, state) => const MentorActivityScreen(),
    ),

    // HOD (Head of Department) Flow
    GoRoute(
      path: AppRoutes.hodDashboard,
      builder: (context, state) => const HodDashboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.hodStudents,
      builder: (context, state) => const HodStudentsScreen(),
    ),
    GoRoute(
      path: AppRoutes.hodDepartments,
      builder: (context, state) => const HodDepartmentsScreen(),
    ),
    GoRoute(
      path: AppRoutes.hodMentors,
      builder: (context, state) => const HodMentorsScreen(),
    ),
    GoRoute(
      path: AppRoutes.hodAtRisk,
      builder: (context, state) => const HodAtRiskScreen(),
    ),
  ],
);
