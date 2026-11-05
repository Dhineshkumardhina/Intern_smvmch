import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/user_model.dart';
import '../../models/user_role.dart';
import 'auth_state.dart';
import 'supabase_auth_service.dart';

final authServiceProvider = Provider<SupabaseAuthService>((ref) {
  return SupabaseAuthService();
});

class AuthNotifier extends StateNotifier<AuthState> {
  final SupabaseAuthService _authService;

  AuthNotifier(this._authService) : super(const AuthInitial()) {
    checkSession();
  }

  Future<void> checkSession() async {
    state = const AuthLoading();
    try {
      final user = await _authService.restoreSession();
      if (user != null) {
        state = Authenticated(user);
      } else {
        state = const Unauthenticated();
      }
    } catch (e) {
      state = Unauthenticated(e.toString());
    }
  }

  Future<bool> login(String emailOrId, String password) async {
    state = const AuthLoading();
    try {
      final user = await _authService.login(
        emailOrId: emailOrId,
        password: password,
      );
      state = Authenticated(user);
      return true;
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '').replaceFirst('AuthException: ', '');
      state = AuthError(msg);
      return false;
    }
  }

  Future<bool> registerStudent({
    required String fullName,
    required String studentId,
    required String email,
    required String phone,
    required String password,
    required String departmentCode,
    required String academicYear,
  }) async {
    state = const AuthLoading();
    try {
      final user = await _authService.registerStudent(
        fullName: fullName,
        studentId: studentId,
        email: email,
        phone: phone,
        password: password,
        departmentCode: departmentCode,
        academicYear: academicYear,
      );
      state = Authenticated(user);
      return true;
    } catch (e) {
      final msg = e.toString().replaceFirst('Exception: ', '').replaceFirst('AuthException: ', '');
      state = AuthError(msg);
      return false;
    }
  }

  Future<bool> resetPassword(String email) async {
    try {
      await _authService.resetPassword(email);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    state = const AuthLoading();
    await _authService.signOut();
    state = const Unauthenticated();
  }

  UserModel? get currentUser {
    final s = state;
    if (s is Authenticated) {
      return s.user;
    }
    return null;
  }

  UserRole? get currentRole => currentUser?.role;
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});

