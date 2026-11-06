import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/core/privacy/consent_service.dart';

void main() {
  group('Informed Consent & DPDP Compliance Tests', () {
    late ConsentService service;

    setUp(() {
      service = ConsentService();
      service.reset();
    });

    test('Initial consent state for unregistered student is inactive', () {
      expect(service.isConsentActive('std-999'), false);
    });

    test('Recording affirmative consent updates store and notifies stream', () async {
      UserConsentRecord? emittedRecord;
      final sub = service.onConsentChanged.listen((rec) {
        emittedRecord = rec;
      });

      final record = await service.recordConsent(
        studentId: 'std-2026-001',
        consentGiven: true,
        noticeVersion: '2026.1-DPDP',
      );

      expect(record.studentId, 'std-2026-001');
      expect(record.consentGiven, true);
      expect(record.noticeVersion, '2026.1-DPDP');
      expect(record.isActive, true);
      expect(service.isConsentActive('std-2026-001'), true);

      // Verify broadcast stream emission
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(emittedRecord, isNotNull);
      expect(emittedRecord!.studentId, 'std-2026-001');

      await sub.cancel();
    });

    test('Consent withdrawal (DPDP Section 6(4)) deactivates status and logs timestamp', () async {
      await service.recordConsent(
        studentId: 'std-2026-002',
        consentGiven: true,
      );
      expect(service.isConsentActive('std-2026-002'), true);

      final withdrawn = await service.withdrawConsent(
        studentId: 'std-2026-002',
        reason: 'Privacy preference updated by user',
      );

      expect(withdrawn.studentId, 'std-2026-002');
      expect(withdrawn.consentGiven, false);
      expect(withdrawn.withdrawnAt, isNotNull);
      expect(withdrawn.withdrawalReason, 'Privacy preference updated by user');
      expect(withdrawn.isActive, false);
      expect(service.isConsentActive('std-2026-002'), false);
    });
  });
}

