import 'dart:math' as math;

/// Geospatial Distance & Accuracy Calculation Engine (Dart / Mobile)
class GeospatialCalculator {
  // WGS-84 Mean Earth Radius in meters
  static const double earthRadiusMeters = 6371000.0;

  // Maximum allowable accuracy threshold in meters
  static const double defaultMaxAccuracyThresholdMeters = 65.0;

  /// Converts degrees to radians
  static double degreesToRadians(double degrees) {
    return (degrees * math.pi) / 180.0;
  }

  /// Converts radians to degrees
  static double radiansToDegrees(double radians) {
    return (radians * 180.0) / math.pi;
  }

  /// Calculates geodesic distance between two coordinates using the Haversine formula
  /// Returns distance in meters
  static double calculateHaversineDistance({
    required double lat1,
    required double lon1,
    required double lat2,
    required double lon2,
  }) {
    if (lat1 == lat2 && lon1 == lon2) {
      return 0.0;
    }

    final phi1 = degreesToRadians(lat1);
    final phi2 = degreesToRadians(lat2);
    final deltaPhi = degreesToRadians(lat2 - lat1);
    final deltaLambda = degreesToRadians(lon2 - lon1);

    final a = math.sin(deltaPhi / 2.0) * math.sin(deltaPhi / 2.0) +
        math.cos(phi1) * math.cos(phi2) * math.sin(deltaLambda / 2.0) * math.sin(deltaLambda / 2.0);

    final c = 2.0 * math.atan2(math.sqrt(math.min(1.0, a)), math.sqrt(math.max(0.0, 1.0 - a)));

    final distance = earthRadiusMeters * c;
    return (distance * 100).round() / 100.0; // 2 decimal precision
  }

  /// Validates horizontal GPS accuracy against threshold
  static bool isAccuracyAdequate(
    double? accuracyMeters, {
    double threshold = defaultMaxAccuracyThresholdMeters,
  }) {
    if (accuracyMeters == null || accuracyMeters.isNaN || accuracyMeters < 0) {
      return false;
    }
    return accuracyMeters <= threshold;
  }

  /// Calculates an offset coordinate given a distance (meters) and bearing (degrees)
  static Map<String, double> computeOffsetCoordinate({
    required double originLat,
    required double originLon,
    required double distanceMeters,
    required double bearingDegrees,
  }) {
    final delta = distanceMeters / earthRadiusMeters;
    final theta = degreesToRadians(bearingDegrees);
    final phi1 = degreesToRadians(originLat);
    final lambda1 = degreesToRadians(originLon);

    final sinPhi1 = math.sin(phi1);
    final cosPhi1 = math.cos(phi1);
    final sinDelta = math.sin(delta);
    final cosDelta = math.cos(delta);

    final phi2 = math.asin(sinPhi1 * cosDelta + cosPhi1 * sinDelta * math.cos(theta));
    final lambda2 = lambda1 +
        math.atan2(
          math.sin(theta) * sinDelta * cosPhi1,
          cosDelta - sinPhi1 * math.sin(phi2),
        );

    return {
      'latitude': (radiansToDegrees(phi2) * 1e7).round() / 1e7,
      'longitude': (radiansToDegrees(lambda2) * 1e7).round() / 1e7,
    };
  }
}

