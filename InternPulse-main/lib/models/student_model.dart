import '../core/constants/status_constants.dart';

class StudentModel {
  final String id;
  final String userId;
  final String studentId;
  final String name;
  final String email;
  final String collegeId;
  final String departmentCode;
  final String departmentName;
  final String academicYear;
  final String phone;
  final String? profilePhoto;
  final List<String> mentorIds;
  final String? internshipId;
  final InternshipStatus status;
  final double overallProgress;
  final DateTime? lastActivityAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  const StudentModel({
    required this.id,
    required this.userId,
    required this.studentId,
    required this.name,
    required this.email,
    required this.collegeId,
    required this.departmentCode,
    required this.departmentName,
    required this.academicYear,
    required this.phone,
    this.profilePhoto,
    this.mentorIds = const [],
    this.internshipId,
    this.status = InternshipStatus.onTrack,
    this.overallProgress = 0.0,
    this.lastActivityAt,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'userId': userId,
      'studentId': studentId,
      'name': name,
      'email': email,
      'collegeId': collegeId,
      'departmentCode': departmentCode,
      'departmentName': departmentName,
      'academicYear': academicYear,
      'phone': phone,
      'profilePhoto': profilePhoto,
      'mentorIds': mentorIds,
      'internshipId': internshipId,
      'status': status.name,
      'overallProgress': overallProgress,
      'lastActivityAt': lastActivityAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory StudentModel.fromMap(Map<String, dynamic> map, String id) {
    return StudentModel(
      id: id,
      userId: map['userId'] ?? '',
      studentId: map['studentId'] ?? '',
      name: map['name'] ?? '',
      email: map['email'] ?? '',
      collegeId: map['collegeId'] ?? '',
      departmentCode: map['departmentCode'] ?? '',
      departmentName: map['departmentName'] ?? '',
      academicYear: map['academicYear'] ?? '1st Year',
      phone: map['phone'] ?? '',
      profilePhoto: map['profilePhoto'],
      mentorIds: List<String>.from(map['mentorIds'] ?? []),
      internshipId: map['internshipId'],
      status: InternshipStatus.fromString(map['status']),
      overallProgress: (map['overallProgress'] as num?)?.toDouble() ?? 0.0,
      lastActivityAt: map['lastActivityAt'] != null
          ? DateTime.tryParse(map['lastActivityAt'].toString())
          : null,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: map['updatedAt'] != null
          ? DateTime.tryParse(map['updatedAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
