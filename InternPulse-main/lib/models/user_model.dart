import 'user_role.dart';

class UserModel {
  final String id;
  final String email;
  final String displayName;
  final UserRole role;
  final String collegeId;
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
      displayName: map['displayName'] ?? map['name'] ?? '',
      role: UserRole.fromString(map['role']),
      collegeId: map['collegeId'] ?? 'smvec_puducherry_main',
      photoUrl: map['photoUrl'],
      phoneNumber: map['phoneNumber'],
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: map['updatedAt'] != null
          ? DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
