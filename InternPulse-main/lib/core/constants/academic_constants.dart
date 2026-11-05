/// Academic Classification Constants for Sri Manakula Vinayagar Engineering College (SMVEC)
///
/// This file provides centralized structured definitions for college identification,
/// academic years, and standardized department codes.
library;

class AcademicConstants {
  AcademicConstants._();

  static const String collegeName = 'Sri Manakula Vinayagar Engineering College';
  static const String collegeCode = 'SMVEC';
  static const String collegeId = 'smvec_puducherry_main';

  /// Standardized Academic Years
  static const List<String> academicYears = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
  ];

  /// Standardized Department Definitions with code, full name, and short title
  static const List<DepartmentInfo> departments = [
    DepartmentInfo(
      code: 'IT',
      name: 'Information Technology',
      shortName: 'IT',
    ),
    DepartmentInfo(
      code: 'ECE',
      name: 'Electronics and Communication Engineering',
      shortName: 'ECE',
    ),
    DepartmentInfo(
      code: 'EEE',
      name: 'Electrical and Electronics Engineering',
      shortName: 'EEE',
    ),
    DepartmentInfo(
      code: 'MECH',
      name: 'Mechanical Engineering',
      shortName: 'Mechanical',
    ),
    DepartmentInfo(
      code: 'CIVIL',
      name: 'Civil Engineering',
      shortName: 'Civil',
    ),
    DepartmentInfo(
      code: 'BME',
      name: 'Biomedical Engineering',
      shortName: 'Biomedical',
    ),
    DepartmentInfo(
      code: 'MECT',
      name: 'Mechatronics Engineering',
      shortName: 'Mechatronics',
    ),
    DepartmentInfo(
      code: 'ICE',
      name: 'Instrumentation and Control Engineering',
      shortName: 'ICE',
    ),
    DepartmentInfo(
      code: 'CSEBS',
      name: 'Computer Science and Engineering and Business Systems',
      shortName: 'CSEBS',
    ),
  ];

  /// Helper method to lookup department by code
  static DepartmentInfo? getDepartmentByCode(String code) {
    try {
      return departments.firstWhere(
        (dept) => dept.code.toUpperCase() == code.toUpperCase(),
      );
    } catch (_) {
      return null;
    }
  }

  /// Get list of all department codes
  static List<String> get departmentCodes => departments.map((d) => d.code).toList();
}

class DepartmentInfo {
  final String code;
  final String name;
  final String shortName;

  const DepartmentInfo({
    required this.code,
    required this.name,
    required this.shortName,
  });
}
