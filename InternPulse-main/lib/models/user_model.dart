import 'user_role.dart';

class UserModel {
  final String id;
  final String email;
  final String displayName;
  final UserRole role;
  final String collegeId;
  final String departmentCode;
  final String? studentId;
  final String? mentorId;
  final bool isActive;
  final String? photoUrl;
  final String? phoneNumber;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    this.collegeId = 'smvec_puducherry_main',
    this.departmentCode = 'CSEBS',
    this.studentId,
    this.mentorId,
    this.isActive = true,
    this.photoUrl,
    this.phoneNumber,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'email': email,
      'displayName': displayName,
      'role': role.value,
      'collegeId': collegeId,
      'departmentCode': departmentCode,
      'studentId': studentId,
      'mentorId': mentorId,
      'isActive': isActive,
      'photoUrl': photoUrl,
      'phoneNumber': phoneNumber,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory UserModel.fromMap(Map<String, dynamic> map, String id) {
    return UserModel(
      id: id,
      email: map['email'] ?? '',
      displayName: map['displayName'] ?? map['full_name'] ?? map['name'] ?? '',
      role: UserRole.fromString(map['role']),
      collegeId: map['collegeId'] ?? 'smvec_puducherry_main',
      departmentCode: (map['department_code'] ?? map['departmentCode'] ?? 'CSEBS').toString().toUpperCase(),
      studentId: map['student_id'] ?? map['studentId'],
      mentorId: map['mentor_id'] ?? map['mentorId'],
      isActive: map['is_active'] ?? map['isActive'] ?? true,
      photoUrl: map['photoUrl'],
      phoneNumber: map['phone'] ?? map['phoneNumber'],
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'].toString()) ?? DateTime.now()
          : (map['createdAt'] != null
              ? DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now()
              : DateTime.now()),
      updatedAt: map['updated_at'] != null
          ? DateTime.tryParse(map['updated_at'].toString()) ?? DateTime.now()
          : (map['updatedAt'] != null
              ? DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now()
              : DateTime.now()),
    );
  }
}
