import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/user_role.dart';
import '../core/auth/supabase_auth_service.dart';

// Authentication
import '../features/authentication/presentation/screens/login_screen.dart';
import '../features/authentication/presentation/screens/register_screen.dart';
import '../features/authentication/presentation/screens/forgot_password_screen.dart';
import '../features/authentication/presentation/screens/onboarding_screen.dart';
import '../features/authentication/presentation/screens/access_denied_screen.dart';

// Student
import '../features/student/presentation/screens/student_dashboard_screen.dart';
import '../features/student/presentation/screens/student_tasks_screen.dart';
import '../features/student/presentation/screens/student_update_progress_screen.dart';
import '../features/student/presentation/screens/student_internship_detail_screen.dart';
import '../features/student/presentation/screens/student_attendance_screen.dart';
import '../features/student/presentation/screens/student_notifications_screen.dart';

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

// Admin
import '../features/admin/presentation/screens/admin_dashboard_screen.dart';

class AppRoutes {
  AppRoutes._();

  // Auth Routes
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String onboarding = '/onboarding';
  static const String accessDenied = '/access-denied';

  // Student Routes
  static const String studentDashboard = '/student/dashboard';
  static const String studentTasks = '/student/tasks';
  static const String studentUpdateProgress = '/student/update-progress';
  static const String studentInternshipDetail = '/student/internship-detail';
  static const String studentAttendance = '/student/attendance';
  static const String studentNotifications = '/student/notifications';

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

  // Admin Routes (Institutional Governance)
  static const String adminDashboard = '/admin/dashboard';
  static const String adminStudents = '/admin/students';
  static const String adminMentorAssignment = '/admin/mentor-assignment';

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

  /// Verifies if a role has permission to access a target path
  static bool canAccessRoute(UserRole? role, String location) {
    if (location == login || location == register || location == forgotPassword || location == accessDenied) {
      return true;
    }

    if (role == null) return false;

    // Student Only / Student Primary
    if (location.startsWith('/student/') || location == onboarding) {
      return role == UserRole.student || role == UserRole.hod;
    }

    // Mentor Only / Mentor Primary
    if (location.startsWith('/mentor/')) {
      return role == UserRole.mentor || role == UserRole.hod;
    }

    // HOD / Admin Only
    if (location.startsWith('/hod/') || location.startsWith('/admin/')) {
      return role == UserRole.hod;
    }

    return true;
  }
}

final appRouter = GoRouter(
  initialLocation: AppRoutes.login,
  redirect: (BuildContext context, GoRouterState state) {
    final authService = SupabaseAuthService();
    final session = authService.client?.auth.currentSession;
    final isAuthenticated = session != null && session.user != null;

    final loc = state.matchedLocation;
    final isPublicRoute = loc == AppRoutes.login || 
                          loc == AppRoutes.register || 
                          loc == AppRoutes.forgotPassword;

    // 1. Unauthenticated users cannot access protected screens
    if (!isAuthenticated && !isPublicRoute) {
      return AppRoutes.login;
    }

    // 2. Authenticated user attempting to visit login/register
    if (isAuthenticated && isPublicRoute) {
      // Role is derived from user metadata or profile
      final roleStr = session.user.appMetadata['role'] ?? session.user.userMetadata?['role'];
      final role = UserRole.fromString(roleStr);
      return AppRoutes.getInitialRouteForRole(role);
    }

    // 3. Role-Based Access Control checks
    if (isAuthenticated) {
      final roleStr = session.user.appMetadata['role'] ?? session.user.userMetadata?['role'];
      final role = UserRole.fromString(roleStr);

      if (!AppRoutes.canAccessRoute(role, loc)) {
        return AppRoutes.accessDenied;
      }
    }

    return null;
  },
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
    GoRoute(
      path: AppRoutes.accessDenied,
      builder: (context, state) => const AccessDeniedScreen(),
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
    GoRoute(
      path: AppRoutes.studentInternshipDetail,
      builder: (context, state) => StudentInternshipDetailScreen(
        internship: state.extra is InternshipModel ? state.extra as InternshipModel : null,
      ),
    ),
    GoRoute(
      path: AppRoutes.studentAttendance,
      builder: (context, state) => const StudentAttendanceScreen(),
    ),
    GoRoute(
      path: AppRoutes.studentNotifications,
      builder: (context, state) => const StudentNotificationsScreen(),
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

    // Admin Flow
    GoRoute(
      path: AppRoutes.adminDashboard,
      builder: (context, state) => const AdminDashboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.adminStudents,
      builder: (context, state) => const AdminStudentManagementScreen(),
    ),
    GoRoute(
      path: AppRoutes.adminMentorAssignment,
      builder: (context, state) => const AdminMentorAssignmentScreen(),
    ),
  ],
);
