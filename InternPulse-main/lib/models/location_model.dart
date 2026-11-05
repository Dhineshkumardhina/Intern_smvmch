class LocationModel {
  final String id;
  final String locationName;
  final String companyName;
  final String address;
  final double latitude;
  final double longitude;
  final double geofenceRadiusMeters;
  final String? internshipStartDate;
  final String? internshipEndDate;
  final String monitoringStartTime;
  final String monitoringEndTime;
  final String departmentCode;
  final String status;
  final bool isActive;
  final String? approvedBy;
  final DateTime? approvedAt;

  const LocationModel({
    required this.id,
    required this.locationName,
    required this.companyName,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.geofenceRadiusMeters,
    this.internshipStartDate,
    this.internshipEndDate,
    this.monitoringStartTime = '09:00:00',
    this.monitoringEndTime = '18:00:00',
    this.departmentCode = 'CSEBS',
    this.status = 'active',
    this.isActive = true,
    this.approvedBy,
    this.approvedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'location_name': locationName,
      'company_name': companyName,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'geofence_radius_meters': geofenceRadiusMeters,
      'internship_start_date': internshipStartDate,
      'internship_end_date': internshipEndDate,
      'monitoring_start_time': monitoringStartTime,
      'monitoring_end_time': monitoringEndTime,
      'department_code': departmentCode,
      'status': status,
      'is_active': isActive,
      'approved_by': approvedBy,
      'approved_at': approvedAt?.toIso8601String(),
    };
  }

  factory LocationModel.fromMap(Map<String, dynamic> map, String id) {
    return LocationModel(
      id: id,
      locationName: map['location_name'] ?? map['locationName'] ?? '',
      companyName: map['company_name'] ?? map['companyName'] ?? '',
      address: map['address'] ?? '',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      geofenceRadiusMeters: (map['geofence_radius_meters'] as num?)?.toDouble() ?? 200.0,
      internshipStartDate: map['internship_start_date'] ?? map['internshipStartDate'],
      internshipEndDate: map['internship_end_date'] ?? map['internshipEndDate'],
      monitoringStartTime: map['monitoring_start_time'] ?? map['monitoringStartTime'] ?? '09:00:00',
      monitoringEndTime: map['monitoring_end_time'] ?? map['monitoringEndTime'] ?? '18:00:00',
      departmentCode: map['department_code'] ?? map['departmentCode'] ?? 'CSEBS',
      status: map['status'] ?? 'active',
      isActive: map['is_active'] ?? map['isActive'] ?? true,
      approvedBy: map['approved_by'] ?? map['approvedBy'],
      approvedAt: map['approved_at'] != null ? DateTime.tryParse(map['approved_at'].toString()) : null,
    );
  }
}

