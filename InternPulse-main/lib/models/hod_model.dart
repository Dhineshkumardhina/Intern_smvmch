class HodModel {
  final String id;
  final String userId;
  final String name;
  final String email;
  final String collegeId;
  final String departmentCode;
  final String designation;
  final String? profilePhoto;
  final DateTime createdAt;
  final DateTime updatedAt;

  const HodModel({
    required this.id,
    required this.userId,
    required this.name,
    this.email = '',
    this.collegeId = 'smvec_puducherry_main',
    required this.departmentCode,
    this.designation = 'Head of the Department',
    this.profilePhoto,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'email': email,
      'collegeId': collegeId,
      'departmentCode': departmentCode,
      'designation': designation,
      'profilePhoto': profilePhoto,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory HodModel.fromMap(Map<String, dynamic> map, String id) {
    return HodModel(
      id: id,
      userId: map['userId'] ?? '',
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      collegeId: map['collegeId'] ?? 'smvec_puducherry_main',
      departmentCode: map['departmentCode'] ?? 'IT',
      designation: map['designation'] ?? 'Head of the Department',
      profilePhoto: map['profilePhoto'],
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: map['updatedAt'] != null
          ? DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
