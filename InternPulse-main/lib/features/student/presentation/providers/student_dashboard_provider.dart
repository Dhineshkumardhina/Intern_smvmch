import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/auth/auth_provider.dart';
import '../../../../core/geolocation/geolocation_types.dart';
import '../../../../core/geolocation/geospatial_calculator.dart';
import '../../../../core/geolocation/mobile_location_service.dart';
import '../../../../core/geolocation/anti_surveillance_guard.dart';
import '../../../../core/privacy/consent_service.dart';
import '../../../../models/attendance_model.dart';
import '../../../../models/internship_model.dart';
import '../../../../models/location_model.dart';
import '../../../../models/location_verification_model.dart';
import '../../../../models/user_model.dart';
import '../../../../repositories/attendance_repository.dart';
import '../../../../repositories/internship_repository.dart';
import '../../../../repositories/notification_repository.dart';
import '../../../../repositories/student_repository.dart';
import '../../../../repositories/supabase_attendance_repository.dart';
import '../../../../repositories/supabase_internship_repository.dart';
import '../../../../repositories/supabase_notification_repository.dart';
import '../../../../repositories/supabase_student_repository.dart';
import '../../../../repositories/supabase_verification_repository.dart';
import '../../../../repositories/verification_repository.dart';

// Reusable Repository Providers
final internshipRepositoryProvider = Provider<InternshipRepository>((ref) {
  return SupabaseInternshipRepository();
});

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  return SupabaseAttendanceRepository();
});

final verificationRepositoryProvider = Provider<VerificationRepository>((ref) {
  return SupabaseVerificationRepository();
});

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return SupabaseNotificationRepository();
});

final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  return SupabaseStudentRepository();
});

/// Immutable State containing all dynamic student backend data
class StudentDashboardData {
  final UserModel profile;
  final InternshipModel? activeAssignment;
  final LocationModel? assignedLocation;
  final List<AttendanceModel> recentAttendance;
  final List<LocationVerificationModel> recentVerifications;
  final AttendanceModel? todayAttendance;
  final int unreadNotificationsCount;

  const StudentDashboardData({
    required this.profile,
    this.activeAssignment,
    this.assignedLocation,
    this.recentAttendance = const [],
    this.recentVerifications = const [],
    this.todayAttendance,
    this.unreadNotificationsCount = 0,
  });

  bool get hasActivePlacement => activeAssignment != null;
  bool get isCheckedInToday => todayAttendance?.checkInAt != null && todayAttendance?.checkOutAt == null;
  bool get isCompletedToday => todayAttendance?.checkOutAt != null;

  StudentDashboardData copyWith({
    UserModel? profile,
    InternshipModel? activeAssignment,
    LocationModel? assignedLocation,
    List<AttendanceModel>? recentAttendance,
    List<LocationVerificationModel>? recentVerifications,
    AttendanceModel? todayAttendance,
    int? unreadNotificationsCount,
  }) {
    return StudentDashboardData(
      profile: profile ?? this.profile,
      activeAssignment: activeAssignment ?? this.activeAssignment,
      assignedLocation: assignedLocation ?? this.assignedLocation,
      recentAttendance: recentAttendance ?? this.recentAttendance,
      recentVerifications: recentVerifications ?? this.recentVerifications,
      todayAttendance: todayAttendance ?? this.todayAttendance,
      unreadNotificationsCount: unreadNotificationsCount ?? this.unreadNotificationsCount,
    );
  }
}

/// StateNotifier orchestrating loading, error, empty, and data states
class StudentDashboardNotifier extends StateNotifier<AsyncValue<StudentDashboardData>> {
  final Ref _ref;

  StudentDashboardNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadDashboard();
  }

  Future<void> loadDashboard({bool isRefresh = false}) async {
    if (!isRefresh) {
      state = const AsyncValue.loading();
    }

    try {
      final auth = _ref.read(authProvider.notifier);
      final currentUser = auth.currentUser;

      if (currentUser == null) {
        state = AsyncValue.error('User session is not active. Please sign in.', StackTrace.current);
        return;
      }

      final internshipRepo = _ref.read(internshipRepositoryProvider);
      final attendanceRepo = _ref.read(attendanceRepositoryProvider);
      final verificationRepo = _ref.read(verificationRepositoryProvider);
      final notificationRepo = _ref.read(notificationRepositoryProvider);

      final studentIdQuery = currentUser.id;

      // Parallel data retrieval with resilience
      final results = await Future.wait([
        internshipRepo.getActiveAssignment(studentIdQuery),
        attendanceRepo.getAttendanceHistory(studentIdQuery),
        attendanceRepo.getTodayAttendance(studentIdQuery),
        verificationRepo.getVerificationHistory(studentIdQuery, limit: 10),
        notificationRepo.getUnreadCount(studentIdQuery),
      ]);

      final activeAssignment = results[0] as InternshipModel?;
      final recentAttendance = results[1] as List<AttendanceModel>;
      final todayAttendance = results[2] as AttendanceModel?;
      final recentVerifications = results[3] as List<LocationVerificationModel>;
      final unreadCount = results[4] as int;

      LocationModel? location;
      if (activeAssignment?.locationId != null) {
        location = await internshipRepo.getLocationById(activeAssignment!.locationId!);
      }

      final data = StudentDashboardData(
        profile: currentUser,
        activeAssignment: activeAssignment,
        assignedLocation: location,
        recentAttendance: recentAttendance,
        recentVerifications: recentVerifications,
        todayAttendance: todayAttendance,
        unreadNotificationsCount: unreadCount,
      );

      state = AsyncValue.data(data);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Triggers student attendance check-in
  Future<bool> checkIn({double? latitude, double? longitude}) async {
    final current = state.value;
    if (current == null || current.activeAssignment == null) return false;

    try {
      final attendanceRepo = _ref.read(attendanceRepositoryProvider);
      final verificationRepo = _ref.read(verificationRepositoryProvider);

      final session = await attendanceRepo.checkIn(
        studentId: current.profile.id,
        assignmentId: current.activeAssignment!.id,
        locationId: current.activeAssignment!.locationId,
        latitude: latitude,
        longitude: longitude,
      );

      // Record verification ping if coordinates provided
      if (latitude != null && longitude != null) {
        final consentService = ConsentService();
        final hasConsent = consentService.isConsentActive(current.profile.id);
        final isWithinWindow = AntiSurveillanceGuard.isWithinMonitoringWindow(
          timestamp: DateTime.now(),
          monitoringStartTime: current.activeAssignment?.monitoringStartTime,
          monitoringEndTime: current.activeAssignment?.monitoringEndTime,
          startDate: current.activeAssignment?.startDate,
          endDate: current.activeAssignment?.endDate,
        );

        final loc = current.assignedLocation;
        double? distance;
        VerificationResultState result = VerificationResultState.withinGeofence;
        final radius = loc?.geofenceRadiusMeters ?? 200.0;

        if (!hasConsent || !isWithinWindow) {
          result = VerificationResultState.permissionDenied;
        } else if (loc != null) {
          distance = GeospatialCalculator.calculateHaversineDistance(
            lat1: loc.latitude,
            lon1: loc.longitude,
            lat2: latitude,
            lon2: longitude,
          );
          result = distance <= radius
              ? VerificationResultState.withinGeofence
              : VerificationResultState.outsideGeofence;
        }

        await verificationRepo.recordVerification(
          assignmentId: current.activeAssignment!.id,
          studentId: current.profile.id,
          sessionId: session.id,
          locationId: current.activeAssignment!.locationId,
          eventType: 'check_in',
          latitude: (hasConsent && isWithinWindow) ? latitude : null,
          longitude: (hasConsent && isWithinWindow) ? longitude : null,
          distanceMeters: (hasConsent && isWithinWindow) ? distance : null,
          geofenceRadiusMeters: radius,
          verificationResult: result,
          connectivityStatus: ConnectivityStatus.wifi,
          batteryOptimizationStatus: BatteryOptimizationStatus.optimized,
          consentVerified: hasConsent,
          withinMonitoringWindow: isWithinWindow,
        );
      }

      await loadDashboard(isRefresh: true);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Triggers student attendance check-out
  Future<bool> checkOut({double? latitude, double? longitude}) async {
    final current = state.value;
    if (current == null || current.todayAttendance == null) return false;

    try {
      final attendanceRepo = _ref.read(attendanceRepositoryProvider);
      final verificationRepo = _ref.read(verificationRepositoryProvider);

      await attendanceRepo.checkOut(
        sessionId: current.todayAttendance!.id,
        locationId: current.activeAssignment?.locationId,
        latitude: latitude,
        longitude: longitude,
      );

      if (latitude != null && longitude != null && current.activeAssignment != null) {
        final consentService = ConsentService();
        final hasConsent = consentService.isConsentActive(current.profile.id);
        final isWithinWindow = AntiSurveillanceGuard.isWithinMonitoringWindow(
          timestamp: DateTime.now(),
          monitoringStartTime: current.activeAssignment?.monitoringStartTime,
          monitoringEndTime: current.activeAssignment?.monitoringEndTime,
          startDate: current.activeAssignment?.startDate,
          endDate: current.activeAssignment?.endDate,
        );

        final loc = current.assignedLocation;
        double? distance;
        VerificationResultState result = VerificationResultState.withinGeofence;
        final radius = loc?.geofenceRadiusMeters ?? 200.0;

        if (!hasConsent || !isWithinWindow) {
          result = VerificationResultState.permissionDenied;
        } else if (loc != null) {
          distance = GeospatialCalculator.calculateHaversineDistance(
            lat1: loc.latitude,
            lon1: loc.longitude,
            lat2: latitude,
            lon2: longitude,
          );
          result = distance <= radius
              ? VerificationResultState.withinGeofence
              : VerificationResultState.outsideGeofence;
        }

        await verificationRepo.recordVerification(
          assignmentId: current.activeAssignment!.id,
          studentId: current.profile.id,
          sessionId: current.todayAttendance!.id,
          locationId: current.activeAssignment!.locationId,
          eventType: 'check_out',
          latitude: (hasConsent && isWithinWindow) ? latitude : null,
          longitude: (hasConsent && isWithinWindow) ? longitude : null,
          distanceMeters: (hasConsent && isWithinWindow) ? distance : null,
          geofenceRadiusMeters: radius,
          verificationResult: result,
          connectivityStatus: ConnectivityStatus.wifi,
          batteryOptimizationStatus: BatteryOptimizationStatus.optimized,
          consentVerified: hasConsent,
          withinMonitoringWindow: isWithinWindow,
        );
      }

      await loadDashboard(isRefresh: true);
      return true;
    } catch (e) {
      return false;
    }
  }
}

final studentDashboardProvider = StateNotifierProvider<StudentDashboardNotifier, AsyncValue<StudentDashboardData>>((ref) {
  return StudentDashboardNotifier(ref);
});

