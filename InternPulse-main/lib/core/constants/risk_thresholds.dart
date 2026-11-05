/// Centralized Configuration for At-Risk Identification Rules
/// 
/// Prevents hardcoding threshold logic across different screens/widgets.
library;

class RiskMonitoringConfig {
  RiskMonitoringConfig._();

  /// Number of consecutive days without a progress update before a student is flagged as 'Inactive'
  static const int inactiveThresholdDays = 3;

  /// Number of days past a task deadline before a task is flagged as 'Delayed'
  static const int delayedGracePeriodDays = 1;

  /// Overall progress threshold below expected linear progress curve to trigger warning
  static const double progressDeviationWarningThreshold = 0.20; // 20% behind schedule

  /// Daily update submission cutoff time (local 24h format e.g., 20:00)
  static const int dailyUpdateReminderHour = 18; // 6:00 PM
  static const int dailyUpdateOverdueHour = 22; // 10:00 PM

  /// Returns true if student is inactive based on last activity timestamp
  static bool isStudentInactive(DateTime? lastActivityDate) {
    if (lastActivityDate == null) return true;
    final difference = DateTime.now().difference(lastActivityDate).inDays;
    return difference >= inactiveThresholdDays;
  }

  /// Returns true if task is delayed based on deadline and completion status
  static bool isTaskDelayed(DateTime? deadline, bool isCompleted) {
    if (isCompleted || deadline == null) return false;
    final now = DateTime.now();
    return now.isAfter(deadline.add(const Duration(days: delayedGracePeriodDays)));
  }
}
