import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/user_model.dart';
import '../../models/user_role.dart';
import '../config/supabase_config.dart';
import '../network/network_retry.dart';
import 'auth_state.dart';

class SupabaseAuthService {
  static final SupabaseAuthService _instance = SupabaseAuthService._internal();
  factory SupabaseAuthService() => _instance;
  SupabaseAuthService._internal();

  SupabaseClient? _client;

  /// Initialize Supabase Flutter SDK with PKCE flow and session persistence
  Future<void> initialize({
    String url = SupabaseConfig.supabaseUrl,
    String anonKey = SupabaseConfig.supabaseAnonKey,
  }) async {
    try {
      await Supabase.initialize(
        url: url,
        anonKey: anonKey,
        authOptions: const FlutterAuthClientOptions(
          authFlowType: AuthFlowType.pkce,
        ),
      );
      _client = Supabase.instance.client;
      if (kDebugMode) {
        debugPrint('[SupabaseAuthService] Initialized successfully with $url');
      }
    } catch (e) {
      debugPrint('[SupabaseAuthService] Initialization note: $e');
      try {
        _client = Supabase.instance.client;
      } catch (_) {
        _client = null;
      }
    }
  }

  SupabaseClient? get client {
    if (_client != null) return _client;
    try {
      _client = Supabase.instance.client;
      return _client;
    } catch (_) {
      return null;
    }
  }

  /// Sets custom client (for testing or dependency injection)
  void setClient(SupabaseClient? customClient) {
    _client = customClient;
  }

  /// Determines if a session currently exists and is unexpired
  bool get isAuthenticated {
    final session = client?.auth.currentSession;
    if (session == null || session.user == null) return false;
    return !session.isExpired;
  }

  /// Restores session on app startup with token expiration check
  Future<UserModel?> restoreSession() async {
    final c = client;
    if (c == null) return null;

    return NetworkRetry.execute(() async {
      final session = c.auth.currentSession;
      if (session == null || session.user == null) {
        return null;
      }

      // Check if session token is expired; try refreshing if needed
      if (session.isExpired) {
        try {
          final refreshRes = await c.auth.refreshSession();
          if (refreshRes.session == null) {
            await signOut();
            return null;
          }
        } catch (e) {
          debugPrint('[SupabaseAuthService] Session refresh error: $e');
          await signOut();
          return null;
        }
      }

      final user = c.auth.currentUser ?? session.user;
      final profile = await fetchAuthoritativeProfile(user.id, user.email ?? '');

      if (profile == null || !profile.isActive) {
        await signOut();
        return null;
      }

      return profile;
    }, operationName: 'restoreSession');
  }

  /// Authenticate using Supabase Auth signInWithPassword
  /// Strictly eliminates simulated auth, role guessing, and table bypasses.
  Future<UserModel> login({
    required String emailOrId,
    required String password,
  }) async {
    final c = client;
    if (c == null) {
      throw const ServerException('Backend client is not initialized. Please restart the application.');
    }

    final query = emailOrId.trim();
    if (query.isEmpty) {
      throw const ServerException('Please enter your institutional Email or Student ID.');
    }
    if (password.isEmpty) {
      throw const ServerException('Please enter your account password.');
    }

    return NetworkRetry.execute(() async {
      String targetEmail = query;

      // If identifier is not an email (e.g. "23CSEBS001"), lookup registered email in profiles table
      if (!query.contains('@')) {
        try {
          final res = await c
              .from('profiles')
              .select('email')
              .or('student_id.ilike.$query,mentor_id.ilike.$query')
              .limit(1)
              .maybeSingle();

          if (res != null && res['email'] != null) {
            targetEmail = res['email'];
          }
        } catch (e) {
          debugPrint('[SupabaseAuthService] ID to email lookup note: $e');
        }
      }

      // 1. Authenticate against Supabase Auth API
      final AuthResponse res = await c.auth.signInWithPassword(
        email: targetEmail,
        password: password,
      );

      if (res.session == null || res.user == null) {
        throw const ServerException('Invalid institutional credentials. Please check your email and password.');
      }

      // 2. Fetch authoritative profile from database (`profiles` table)
      final profile = await fetchAuthoritativeProfile(res.user!.id, res.user!.email ?? targetEmail);

      if (profile == null) {
        await signOut();
        throw const ServerException('Institutional profile record not found. Please contact your Department HOD.');
      }

      // 3. Validate account active status
      if (!profile.isActive) {
        await signOut();
        throw const ServerException('Your institutional account has been deactivated. Please contact your HOD.');
      }

      return profile;
    }, operationName: 'login');
  }

  /// Fetches authoritative profile from database `profiles` table
  /// Role is never inferred from email, username, or client claims.
  Future<UserModel?> fetchAuthoritativeProfile(String userId, String email) async {
    final c = client;
    if (c == null) return null;

    try {
      final res = await c
          .from('profiles')
          .select()
          .or('id.eq.$userId,email.ilike.$email')
          .limit(1)
          .maybeSingle();

      if (res != null) {
        return UserModel.fromMap(res, res['id'] ?? userId);
      }
    } catch (e) {
      debugPrint('[SupabaseAuthService] Error fetching authoritative profile: $e');
    }

    return null;
  }

  /// Self-registration for students (role strictly locked to 'student')
  Future<UserModel> registerStudent({
    required String fullName,
    required String studentId,
    required String email,
    required String phone,
    required String password,
    required String departmentCode,
    required String academicYear,
  }) async {
    final c = client;
    if (c == null) {
      throw const ServerException('Supabase backend client is not connected.');
    }

    final cleanEmail = email.trim().toLowerCase();
    final cleanStudentId = studentId.trim().toUpperCase();

    return NetworkRetry.execute(() async {
      // 1. Sign up user in Supabase Auth (Role locked to 'student')
      final res = await c.auth.signUp(
        email: cleanEmail,
        password: password,
        data: {
          'fullName': fullName.trim(),
          'studentId': cleanStudentId,
          'role': 'student',
          'phone': phone.trim(),
          'departmentCode': departmentCode,
          'academicYear': academicYear,
        },
      );

      if (res.user == null) {
        throw const ServerException('Registration failed. Please verify credentials and try again.');
      }

      // 2. Insert into `profiles` table
      try {
        await c.from('profiles').upsert({
          'id': res.user!.id,
          'role': 'student',
          'full_name': fullName.trim(),
          'email': cleanEmail,
          'phone': phone.trim(),
          'department_code': departmentCode,
          'student_id': cleanStudentId,
          'is_active': true,
          'account_status': 'active',
        });
      } catch (e) {
        debugPrint('[SupabaseAuthService] Profile insert note: $e');
      }

      return UserModel(
        id: res.user!.id,
        email: cleanEmail,
        displayName: fullName.trim(),
        role: UserRole.student,
        departmentCode: departmentCode,
        studentId: cleanStudentId,
        phoneNumber: phone.trim(),
        isActive: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    }, operationName: 'registerStudent');
  }

  /// Password reset request
  Future<void> resetPassword(String email) async {
    final c = client;
    if (c == null) {
      throw const ServerException('Backend client is not initialized.');
    }
    final cleanEmail = email.trim();
    if (cleanEmail.isEmpty || !cleanEmail.contains('@')) {
      throw const ServerException('Please provide a valid institutional email address.');
    }
    await NetworkRetry.execute(
      () => c.auth.resetPasswordForEmail(cleanEmail),
      operationName: 'resetPassword',
    );
  }

  /// Revokes session and signs out cleanly
  Future<void> signOut() async {
    final c = client;
    if (c != null) {
      try {
        await c.auth.signOut();
      } catch (e) {
        debugPrint('[SupabaseAuthService] Sign out notice: $e');
      }
    }
  }

  /// Stream of Supabase Auth state changes with authoritative profile mapping
  Stream<AuthState> get onAuthStateChange {
    final c = client;
    if (c == null) {
      return Stream.value(const Unauthenticated());
    }

    return c.auth.onAuthStateChange.asyncMap((data) async {
      final session = data.session;
      if (session == null || session.user == null || session.isExpired) {
        return const Unauthenticated();
      }

      final profile = await fetchAuthoritativeProfile(
        session.user.id,
        session.user.email ?? '',
      );

      if (profile == null || !profile.isActive) {
        return const Unauthenticated('Account inactive or institutional profile not found.');
      }

      return Authenticated(profile);
    });
  }
}
