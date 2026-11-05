import 'package:flutter_test/flutter_test.dart';
import 'package:internpulse/models/location_model.dart';

void main() {
  group('LocationModel Tests', () {
    test('deserializes location model correctly from Map', () {
      final map = {
        'location_name': 'TCS Siruseri Innovation Hub',
        'company_name': 'Tata Consultancy Services',
        'address': 'SIPCOT IT Park, Siruseri, Chennai',
        'latitude': 12.8284,
        'longitude': 80.2198,
        'geofence_radius_meters': 250.0,
        'monitoring_start_time': '09:00:00',
        'monitoring_end_time': '18:00:00',
        'department_code': 'CSEBS',
        'status': 'active',
        'is_active': true,
      };

      final model = LocationModel.fromMap(map, 'loc-1');

      expect(model.id, 'loc-1');
      expect(model.locationName, 'TCS Siruseri Innovation Hub');
      expect(model.companyName, 'Tata Consultancy Services');
      expect(model.geofenceRadiusMeters, 250.0);
      expect(model.latitude, 12.8284);
      expect(model.longitude, 80.2198);
      expect(model.monitoringStartTime, '09:00:00');
      expect(model.monitoringEndTime, '18:00:00');
      expect(model.isActive, true);

      final serialized = model.toMap();
      expect(serialized['id'], 'loc-1');
      expect(serialized['location_name'], 'TCS Siruseri Innovation Hub');
      expect(serialized['geofence_radius_meters'], 250.0);
    });
  });
}
