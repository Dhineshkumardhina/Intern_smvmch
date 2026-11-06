import '../core/geolocation/geolocation_types.dart';
import '../models/location_verification_model.dart';

abstract class VerificationRepository {
  /// Fetches historical spatial geofence verification events for a student
  Future<List<LocationVerificationModel>> getVerificationHistory(
    String studentId, {
    int limit = 50,
  });

  /// Records a spatial geofence verification event captured by the mobile client
  Future<LocationVerificationModel> recordVerification({
    required String assignmentId,
    required String studentId,
    required String eventType,
    required double? latitude,
    required double? longitude,
    double? accuracyMeters,
    double? distanceMeters,
    double? geofenceRadiusMeters,
    VerificationResultState? verificationResult,
    ConnectivityStatus? connectivityStatus,
    BatteryOptimizationStatus? batteryOptimizationStatus,
    bool consentVerified = true,
    bool withinMonitoringWindow = true,
    String? locationId,
    String? sessionId,
    bool isMockLocation = false,
    Map<String, dynamic>? deviceMetadata,
    String? remarks,
  });

  /// Realtime stream of location verification outcomes
  Stream<List<LocationVerificationModel>> watchVerifications(String studentId);
}
