/// Anti-Surveillance Guard (Mobile / Dart)
/// Enforces user consent and ensures telemetry collection is restricted
/// strictly to authorized internship monitoring windows.
class AntiSurveillanceGuard {
  /// Validates informed consent status
  static bool verifyConsent({
    required bool consentGiven,
    DateTime? consentTimestamp,
  }) {
    return consentGiven && consentTimestamp != null;
  }

  /// Parses "HH:MM" or "HH:MM:SS" into minutes from midnight
  static int? parseTimeToMinutes(String? timeStr) {
    if (timeStr == null || timeStr.trim().isEmpty) return null;
    final parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;

    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null || h < 0 || h > 23 || m < 0 || m > 59) {
      return null;
    }
    return h * 60 + m;
  }

  /// Checks if current timestamp falls within the authorized internship monitoring schedule
  static bool isWithinMonitoringWindow({
    required DateTime timestamp,
    String? monitoringStartTime,
    String? monitoringEndTime,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    // 1. Check Date Bounds
    final checkDate = DateTime(timestamp.year, timestamp.month, timestamp.day);
    if (startDate != null) {
      final startOnly = DateTime(startDate.year, startDate.month, startDate.day);
      if (checkDate.isBefore(startOnly)) return false;
    }
    if (endDate != null) {
      final endOnly = DateTime(endDate.year, endDate.month, endDate.day);
      if (checkDate.isAfter(endOnly)) return false;
    }

    // 2. Check Daily Monitoring Hours
    if (monitoringStartTime != null && monitoringEndTime != null) {
      final startMinutes = parseTimeToMinutes(monitoringStartTime);
      final endMinutes = parseTimeToMinutes(monitoringEndTime);

      if (startMinutes != null && endMinutes != null) {
        // Evaluate in local time or IST
        final currentMinutes = timestamp.hour * 60 + timestamp.minute;
        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          return false;
        }
      }
    }

    return true;
  }
}

