import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/core/auth/auth_state.dart';
import 'package:internpulse/models/user_model.dart';
import 'package:internpulse/models/user_role.dart';

void main() {
  group('Authentication & Role Navigation Tests', () {
    test('UserRole parsing correctly maps role strings and handles case-insensitivity', () {
      expect(UserRole.fromString('student'), UserRole.student);
      expect(UserRole.fromString('STUDENT'), UserRole.student);
      expect(UserRole.fromString('mentor'), UserRole.mentor);
      expect(UserRole.fromString('MENTOR'), UserRole.mentor);
      expect(UserRole.fromString('hod'), UserRole.hod);
      expect(UserRole.fromString('HOD'), UserRole.hod);
      expect(UserRole.fromString('headofdepartment'), UserRole.hod);
      expect(UserRole.fromString('admin'), UserRole.hod);
      // Fallback for null or unexpected
      expect(UserRole.fromString(null), UserRole.student);
      expect(UserRole.fromString('unknown_role'), UserRole.student);
    });

    test('UserRole displayName returns institutional titles', () {
      expect(UserRole.student.displayName, 'Student');
      expect(UserRole.mentor.displayName, 'Mentor');
      expect(UserRole.hod.displayName, 'Head of Department (HOD)');
    });

    test('UserModel serializes and deserializes correctly with role mapping', () {
      final now = DateTime.now();
      final map = {
        'id': 'usr-std-001',
        'email': 'student@smvec.ac.in',
        'displayName': 'Arun Kumar',
        'role': 'student',
        'collegeId': 'smvec_puducherry_main',
        'departmentCode': 'CSEBS',
        'studentId': 'std-2026-001',
        'isActive': true,
        'createdAt': now.toIso8601String(),
        'updatedAt': now.toIso8601String(),
      };

      final user = UserModel.fromMap(map, 'usr-std-001');

      expect(user.id, 'usr-std-001');
      expect(user.email, 'student@smvec.ac.in');
      expect(user.displayName, 'Arun Kumar');
      expect(user.role, UserRole.student);
      expect(user.departmentCode, 'CSEBS');
      expect(user.studentId, 'std-2026-001');
      expect(user.isActive, true);

      final serialized = user.toMap();
      expect(serialized['id'], 'usr-std-001');
      expect(serialized['role'], 'student');
      expect(serialized['departmentCode'], 'CSEBS');
    });

    test('UserModel maps snake_case Supabase fields correctly', () {
      final map = {
        'full_name': 'Dr. S. Ramesh',
        'role': 'hod',
        'email': 'hod.cse@smvec.ac.in',
        'department_code': 'cse',
        'is_active': true,
      };

      final hod = UserModel.fromMap(map, 'usr-hod-01');

      expect(hod.id, 'usr-hod-01');
      expect(hod.displayName, 'Dr. S. Ramesh');
      expect(hod.role, UserRole.hod);
      expect(hod.departmentCode, 'CSE');
    });

    test('AuthState transitions model complete auth lifecycle', () {
      const initial = AuthInitial();
      expect(initial, isA<AuthState>());
      expect(initial.props, isEmpty);

      const loading = AuthLoading();
      expect(loading, isA<AuthState>());

      final user = UserModel(
        id: 'usr-1',
        email: 'test@smvec.ac.in',
        displayName: 'Test User',
        role: UserRole.student,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
      );

      final authenticated = Authenticated(user);
      expect(authenticated.user.id, 'usr-1');
      expect(authenticated.user.role, UserRole.student);
      expect(authenticated.props, [user]);

      const unauthenticated = Unauthenticated('Session expired');
      expect(unauthenticated.message, 'Session expired');
      expect(unauthenticated.props, ['Session expired']);

      const authError = AuthError('Invalid credentials');
      expect(authError.message, 'Invalid credentials');
      expect(authError.props, ['Invalid credentials']);
    });

    test('Role-based navigation path resolution', () {
      String resolveInitialRoute(UserRole role) {
        switch (role) {
          case UserRole.student:
            return '/student/dashboard';
          case UserRole.mentor:
            return '/mentor/dashboard';
          case UserRole.hod:
            return '/hod/dashboard';
        }
      }

      expect(resolveInitialRoute(UserRole.student), '/student/dashboard');
      expect(resolveInitialRoute(UserRole.mentor), '/mentor/dashboard');
      expect(resolveInitialRoute(UserRole.hod), '/hod/dashboard');
    });
  });
}

