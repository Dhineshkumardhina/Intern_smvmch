/// InternPulse Role System
/// 
/// Enforces structured role authorization across Student, Mentor, and Head of Department (HOD)
library;

enum UserRole {
  student,
  mentor,
  hod;

  String get value => name;

  String get displayName {
    switch (this) {
      case UserRole.student:
        return 'Student';
      case UserRole.mentor:
        return 'Mentor';
      case UserRole.hod:
        return 'Head of Department (HOD)';
    }
  }

  static UserRole fromString(String? value) {
    if (value == null) return UserRole.student;
    switch (value.toLowerCase().trim()) {
      case 'hod':
      case 'headofdepartment':
      case 'admin':
        return UserRole.hod;
      case 'mentor':
        return UserRole.mentor;
      case 'student':
      default:
        return UserRole.student;
    }
  }
}
