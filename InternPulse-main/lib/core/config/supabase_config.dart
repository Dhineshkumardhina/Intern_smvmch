import 'package:flutter/foundation.dart';

/// Centralized Supabase Backend Configuration for InternPulse
/// Sri Manakula Vinayagar Engineering College (Autonomous) - SMVEC
class SupabaseConfig {
  SupabaseConfig._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://gvnakdxtjjnfcjkcnavz.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_9rHXjELSfv1I-BH8o3_qLQ_o212kYfQ',
  );

  /// Network timeout duration in milliseconds
  static const Duration requestTimeout = Duration(seconds: 15);

  /// Maximum network retry attempts on transient network failures
  static const int maxRetryAttempts = 3;

  /// Base backoff delay for exponential retry algorithm
  static const Duration initialRetryDelay = Duration(milliseconds: 500);

  /// Determines if Supabase endpoint is configured
  static bool get isConfigured {
    return supabaseUrl.isNotEmpty && 
           supabaseAnonKey.isNotEmpty && 
           !supabaseUrl.contains('your-project-ref');
  }
}

