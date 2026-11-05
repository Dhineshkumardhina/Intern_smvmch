class MentorModel {
  final String id;
  final String userId;
  final String name;
  final String email;
  final String phone;
  final String collegeId;
  final List<String> departmentCodes;
  final List<String> academicYears;
  final String designation;
  final String? profilePhoto;
  final int assignedStudentsCount;
  final int maxCapacity;
  final DateTime createdAt;
  final DateTime updatedAt;

  const MentorModel({
    required this.id,
    required this.userId,
    required this.name,
    this.email = '',
    this.phone = '',
    this.collegeId = 'smvec_puducherry_main',
    required this.departmentCodes,
    required this.academicYears,
    this.designation = 'Faculty Mentor',
    this.profilePhoto,
    this.assignedStudentsCount = 0,
    this.maxCapacity = 15,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'email': email,
      'phone': phone,
      'collegeId': collegeId,
      'departmentCodes': departmentCodes,
      'academicYears': academicYears,
      'designation': designation,
      'profilePhoto': profilePhoto,
      'assignedStudentsCount': assignedStudentsCount,
      'maxCapacity': maxCapacity,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory MentorModel.fromMap(Map<String, dynamic> map, String id) {
    return MentorModel(
      id: id,
      userId: map['userId'] ?? '',
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      phone: map['phone'] ?? '',
      collegeId: map['collegeId'] ?? 'smvec_puducherry_main',
      departmentCodes: List<String>.from(map['departmentCodes'] ?? (map['departmentCode'] != null ? [map['departmentCode']] : ['IT'])),
      academicYears: List<String>.from(map['academicYears'] ?? ['3rd Year', '4th Year']),
      designation: map['designation'] ?? 'Faculty Mentor',
      profilePhoto: map['profilePhoto'],
      assignedStudentsCount: map['assignedStudentsCount'] ?? 0,
      maxCapacity: map['maxCapacity'] ?? 15,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: map['updatedAt'] != null
          ? DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
