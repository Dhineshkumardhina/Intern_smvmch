import '../models/internship_model.dart';
import '../models/location_model.dart';

abstract class InternshipRepository {
  /// Fetches current active assignment for a student
  Future<InternshipModel?> getActiveAssignment(String studentId);

  /// Fetches complete historical internship records for a student
  Future<List<InternshipModel>> getAssignmentHistory(String studentId);

  /// Fetches an approved workplace facility location by its unique UUID
  Future<LocationModel?> getLocationById(String locationId);

  /// Fetches all active approved locations, optionally scoped by department
  Future<List<LocationModel>> getApprovedLocations({String? departmentCode});

  /// Realtime stream of the active assignment for live dashboard updates
  Stream<InternshipModel?> watchActiveAssignment(String studentId);
}

