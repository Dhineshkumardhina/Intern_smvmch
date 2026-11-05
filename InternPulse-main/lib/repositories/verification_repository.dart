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
    required double latitude,
    required double longitude,
    double? accuracyMeters,
    String? locationId,
    String? sessionId,
    bool isMockLocation = false,
    Map<String, dynamic>? deviceMetadata,
  });

  /// Realtime stream of location verification outcomes
  Stream<List<LocationVerificationModel>> watchVerifications(String studentId);
}

