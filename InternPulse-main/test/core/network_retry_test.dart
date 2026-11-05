import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/core/network/network_retry.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  group('NetworkRetry Tests', () {
    test('succeeds on first attempt without retry delay', () async {
      int executions = 0;
      final result = await NetworkRetry.execute(() async {
        executions++;
        return 'success';
      }, maxAttempts: 3);

      expect(result, 'success');
      expect(executions, 1);
    });

    test('recovers after transient TimeoutException within maxAttempts', () async {
      int executions = 0;
      final result = await NetworkRetry.execute(() async {
        executions++;
        if (executions < 2) {
          throw TimeoutException('Request timed out');
        }
        return 'recovered';
      }, maxAttempts: 3, delay: const Duration(milliseconds: 10));

      expect(result, 'recovered');
      expect(executions, 2);
    });

    test('maps non-transient 404 PostgrestException to DataNotFoundException immediately', () async {
      int executions = 0;
      expect(
        () async => await NetworkRetry.execute(() async {
          executions++;
          throw const PostgrestException(message: 'Record not found', code: 'PGRST116');
        }, maxAttempts: 3, delay: const Duration(milliseconds: 10)),
        throwsA(isA<DataNotFoundException>()),
      );
      // Non-transient errors fail immediately without retry
      expect(executions, 1);
    });

    test('maps 401 AuthException to AuthExpiredException immediately', () async {
      int executions = 0;
      expect(
        () async => await NetworkRetry.execute(() async {
          executions++;
          throw const AuthException('Invalid or expired JWT token', statusCode: '401');
        }, maxAttempts: 3, delay: const Duration(milliseconds: 10)),
        throwsA(isA<AuthExpiredException>()),
      );
      expect(executions, 1);
    });
  });
}
