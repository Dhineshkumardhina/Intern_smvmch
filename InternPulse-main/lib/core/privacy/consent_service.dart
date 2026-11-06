import 'dart:async';

/// User Consent Record for Indian DPDP Act 2023 Compliance
class UserConsentRecord {
  final String studentId;
  final bool consentGiven;
  final DateTime consentTimestamp;
  final String noticeVersion;
  final DateTime? withdrawnAt;
  final String? withdrawalReason;

  const UserConsentRecord({
    required this.studentId,
    required this.consentGiven,
    required this.consentTimestamp,
    this.noticeVersion = '2026.1-DPDP',
    this.withdrawnAt,
    this.withdrawalReason,
  });

  bool get isActive => consentGiven && withdrawnAt == null;
}

/// Mobile Consent Service managing informed consent lifecycle
class ConsentService {
  static final ConsentService _instance = ConsentService._internal();
  factory ConsentService() => _instance;
  ConsentService._internal();

  final Map<String, UserConsentRecord> _store = {};
  final _consentStreamController = StreamController<UserConsentRecord>.broadcast();

  Stream<UserConsentRecord> get onConsentChanged => _consentStreamController.stream;

  /// Records affirmative informed consent
  Future<UserConsentRecord> recordConsent({
    required String studentId,
    required bool consentGiven,
    String noticeVersion = '2026.1-DPDP',
  }) async {
    final record = UserConsentRecord(
      studentId: studentId,
      consentGiven: consentGiven,
      consentTimestamp: DateTime.now(),
      noticeVersion: noticeVersion,
    );
    _store[studentId] = record;
    _consentStreamController.add(record);
    return record;
  }

  /// Checks if active consent exists
  bool isConsentActive(String studentId) {
    final rec = _store[studentId];
    return rec?.isActive ?? false;
  }

  /// Withdraws consent (DPDP Act Section 6(4))
  Future<UserConsentRecord> withdrawConsent({
    required String studentId,
    String reason = 'Student initiated withdrawal from mobile settings',
  }) async {
    final record = UserConsentRecord(
      studentId: studentId,
      consentGiven: false,
      consentTimestamp: DateTime.now(),
      withdrawnAt: DateTime.now(),
      withdrawalReason: reason,
    );
    _store[studentId] = record;
    _consentStreamController.add(record);
    return record;
  }

  /// Reset store for testing
  void reset() {
    _store.clear();
  }
}

