import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';

/// Custom Exception types for clean, user-friendly presentation
sealed class AppException implements Exception {
  final String message;
  final String? technicalDetails;

  const AppException(this.message, [this.technicalDetails]);

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException([String message = 'Network connection unavailable. Please check your internet connection.', String? details])
      : super(message, details);
}

class AuthExpiredException extends AppException {
  const AuthExpiredException([String message = 'Your session has expired. Please sign in again.', String? details])
      : super(message, details);
}

class ServerException extends AppException {
  const ServerException([String message = 'Unable to reach the institutional server. Please try again.', String? details])
      : super(message, details);
}

class DataNotFoundException extends AppException {
  const DataNotFoundException([String message = 'Requested institutional record not found.', String? details])
      : super(message, details);
}

/// Robust Network Retry Engine with Exponential Backoff
class NetworkRetry {
  NetworkRetry._();

  /// Executes an asynchronous operation with retry logic for transient network failures
  static Future<T> execute<T>(
    Future<T> Function() operation, {
    int maxAttempts = SupabaseConfig.maxRetryAttempts,
    Duration delay = SupabaseConfig.initialRetryDelay,
    String? operationName,
  }) async {
    int attempt = 0;
    Duration currentDelay = delay;

    while (true) {
      attempt++;
      try {
        return await operation().timeout(SupabaseConfig.requestTimeout);
      } catch (e, stack) {
        final isLastAttempt = attempt >= maxAttempts;
        final isRetryable = _isTransientError(e);

        if (kDebugMode) {
          debugPrint('[NetworkRetry] ${operationName ?? "Operation"} attempt $attempt/$maxAttempts failed: $e (retryable: $isRetryable)');
        }

        // If not retryable or max attempts exhausted, map to clean exception
        if (!isRetryable || isLastAttempt) {
          throw _mapToAppException(e, stack);
        }

        // Exponential backoff with jitter
        await Future.delayed(currentDelay);
        currentDelay = currentDelay * 2;
      }
    }
  }

  /// Determines if an error is transient (e.g. timeout, socket disconnect, 5xx server glitch)
  static bool _isTransientError(dynamic error) {
    if (error is TimeoutException) return true;
    if (error is SocketException) return true;
    if (error is HttpException) return true;

    if (error is PostgrestException) {
      final code = error.code;
      // 5xx or connection termination codes
      if (code == '57P01' || code == '57P02' || code == '57P03' || code == '08006' || code == '08001') {
        return true;
      }
      final msg = error.message.toLowerCase();
      if (msg.contains('timeout') || msg.contains('connection refused') || msg.contains('network')) {
        return true;
      }
      return false;
    }

    if (error is AuthException) {
      final msg = error.message.toLowerCase();
      if (msg.contains('network') || msg.contains('timeout')) return true;
      return false; // Authentication credentials or permissions are not transient
    }

    final str = error.toString().toLowerCase();
    if (str.contains('connection reset') || 
        str.contains('failed host lookup') || 
        str.contains('network is unreachable') ||
        str.contains('connection timed out')) {
      return true;
    }

    return false;
  }

  /// Maps native or Supabase errors into human-readable AppExceptions
  static AppException _mapToAppException(dynamic error, StackTrace stack) {
    if (error is AppException) return error;

    if (error is TimeoutException) {
      return const NetworkException('Connection timed out while reaching the backend. Please check your network.');
    }
    if (error is SocketException) {
      return const NetworkException('No internet connection. Please verify your WiFi or mobile data.');
    }

    if (error is AuthException) {
      final msg = error.message.toLowerCase();
      if (msg.contains('invalid login credentials') || msg.contains('invalid email or password')) {
        return const ServerException('Invalid institutional email or password.');
      }
      if (msg.contains('expired') || msg.contains('token is expired')) {
        return const AuthExpiredException();
      }
      return ServerException(error.message);
    }

    if (error is PostgrestException) {
      final msg = error.message.toLowerCase();
      if (msg.contains('jwt expired') || msg.contains('invalid claim')) {
        return const AuthExpiredException();
      }
      if (error.code == 'PGRST116') {
        return const DataNotFoundException('No record found matching the request.');
      }
      if (msg.contains('permission denied') || msg.contains('violates row-level security')) {
        return const ServerException('Access denied by institutional security policy.');
      }
      return ServerException(error.message);
    }

    return ServerException('An unexpected error occurred: ${error.toString().split("\n").first}');
  }
}

