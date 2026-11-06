import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/core/constants/status_constants.dart';
import 'package:internpulse/models/internship_model.dart';

void main() {
  group('Internship Assignment & Geofence Model Tests', () {
    test('deserializes complete internship assignment record with geofence bounds', () {
      final now = DateTime.now();
      final startDate = now.subtract(const Duration(days: 30));
      final endDate = now.add(const Duration(days: 60));

      final map = {
        'student_id': 'std-smvec-045',
        'company_name': 'Zoho Corporation',
        'role_title': 'Cloud DevOps Intern',
        'description': 'Infrastructure automation and Kubernetes monitoring',
        'start_date': startDate.toIso8601String(),
        'end_date': endDate.toIso8601String(),
        'status': 'onTrack',
        'overallProgress': 35.0,
        'location_id': 'loc-est-001',
        'location_name': 'Zoho Estancia IT Park',
        'location_address': 'Vallancherry, Guduvanchery, Tamil Nadu',
        'geofence_radius_meters': 300.0,
        'latitude': 12.8332,
        'longitude': 80.0435,
        'monitoring_start_time': '09:00:00',
        'monitoring_end_time': '18:00:00',
        'required_daily_hours': 8.0,
        'assigned_by': 'usr-mentor-01',
        'assignment_status': 'active',
      };

      final model = InternshipModel.fromMap(map, 'asg-zoho-001');

      expect(model.id, 'asg-zoho-001');
      expect(model.studentId, 'std-smvec-045');
      expect(model.companyName, 'Zoho Corporation');
      expect(model.role, 'Cloud DevOps Intern');
      expect(model.locationId, 'loc-est-001');
      expect(model.locationName, 'Zoho Estancia IT Park');
      expect(model.geofenceRadiusMeters, 300.0);
      expect(model.latitude, 12.8332);
      expect(model.longitude, 80.0435);
      expect(model.monitoringStartTime, '09:00:00');
      expect(model.monitoringEndTime, '18:00:00');
      expect(model.requiredDailyHours, 8.0);
      expect(model.assignmentStatus, 'active');

      // Timeline duration getters
      expect(model.totalDays, 90);
      expect(model.daysCompleted, greaterThanOrEqualTo(29));
      expect(model.daysRemaining, lessThanOrEqualTo(61));
    });

    test('serializes to map preserving geofence and assignment fields', () {
      final model = InternshipModel(
        id: 'asg-01',
        studentId: 'std-01',
        companyName: 'TCS',
        role: 'Trainee',
        description: 'Testing',
        startDate: DateTime(2026, 1, 1),
        endDate: DateTime(2026, 6, 30),
        locationId: 'loc-01',
        locationName: 'TCS Siruseri',
        geofenceRadiusMeters: 250.0,
        latitude: 12.8284,
        longitude: 80.2198,
        monitoringStartTime: '09:00',
        monitoringEndTime: '18:00',
        requiredDailyHours: 8.0,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
      );

      final map = model.toMap();
      expect(map['id'], 'asg-01');
      expect(map['locationId'], 'loc-01');
      expect(map['geofenceRadiusMeters'], 250.0);
      expect(map['latitude'], 12.8284);
      expect(map['longitude'], 80.2198);
      expect(map['monitoringStartTime'], '09:00');
      expect(map['monitoringEndTime'], '18:00');
    });

    test('InternshipStatus enum parses status string variants correctly', () {
      expect(InternshipStatus.fromString('onTrack'), InternshipStatus.onTrack);
      expect(InternshipStatus.fromString('needsAttention'), InternshipStatus.needsAttention);
      expect(InternshipStatus.fromString('critical'), InternshipStatus.critical);
      expect(InternshipStatus.fromString('completed'), InternshipStatus.completed);
      // Fallback for null or unmapped
      expect(InternshipStatus.fromString(null), InternshipStatus.onTrack);
    });
  });
}

