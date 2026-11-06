/**
 * Geolocation Verification Repository
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Implements historical verification record storage and retrieval with
 * strict immutability preservation and audit compliance.
 */

import {
  VerificationEvaluationResult,
  VerificationResultState,
  AssignedGeofenceTarget,
  DeviceLocationMeasurement,
  StudentConsent,
} from './geolocationTypes';
import {
  GeolocationVerificationEngine,
  geolocationVerificationEngine,
} from './geolocationVerificationEngine';
import { getSupabaseClient } from '../../lib/supabase';
import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy } from '../auth/rbac/authorizationPolicy';

export interface VerificationFilterOptions {
  studentId?: string;
  assignmentId?: string;
  resultState?: VerificationResultState;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export class GeolocationVerificationRepository {
  private inMemoryRecords: VerificationEvaluationResult[] = [];
  private engine: GeolocationVerificationEngine;

  constructor(engine: GeolocationVerificationEngine = geolocationVerificationEngine) {
    this.engine = engine;
    this.seedDefaultRecords();
  }

  /**
   * Resets and seeds representative historical records
   */
  public resetToDefaults(): void {
    this.inMemoryRecords = [];
    this.seedDefaultRecords();
  }

  private seedDefaultRecords(): void {
    // Historical verification record 1: WITHIN_GEOFENCE
    this.inMemoryRecords.push({
      id: 'ver-00000000-0000-0000-0000-000000000001',
      studentId: '23CSEBS001',
      assignmentId: 'asg-00000000-0000-0000-0000-000000000001',
      latitude: 12.82845,
      longitude: 80.21982,
      accuracy: 8.5,
      timestamp: '2026-03-02T09:05:00.000Z',
      distanceFromAssignedLocation: 6.8,
      geofenceRadius: 200.0,
      verificationResult: 'WITHIN_GEOFENCE',
      connectivityStatus: 'WIFI',
      batteryOptimizationStatus: 'OPTIMIZED',
      consentVerified: true,
      withinMonitoringWindow: true,
      remarks: 'Student device verified within assigned workplace geofence.',
      createdAt: '2026-03-02T09:05:00.000Z',
    });

    // Historical verification record 2: OUTSIDE_GEOFENCE
    this.inMemoryRecords.push({
      id: 'ver-00000000-0000-0000-0000-000000000002',
      studentId: '23CSEBS002',
      assignmentId: 'asg-00000000-0000-0000-0000-000000000002',
      latitude: 12.8390,
      longitude: 80.2250,
      accuracy: 12.0,
      timestamp: '2026-03-02T09:15:00.000Z',
      distanceFromAssignedLocation: 1312.4,
      geofenceRadius: 200.0,
      verificationResult: 'OUTSIDE_GEOFENCE',
      connectivityStatus: 'CELLULAR',
      batteryOptimizationStatus: 'OPTIMIZED',
      consentVerified: true,
      withinMonitoringWindow: true,
      remarks: 'Student device confirmed outside assigned workplace geofence.',
      createdAt: '2026-03-02T09:15:00.000Z',
    });

    // Historical record 3: GPS_DISABLED (Notice: NEVER OUTSIDE_GEOFENCE!)
    this.inMemoryRecords.push({
      id: 'ver-00000000-0000-0000-0000-000000000003',
      studentId: '23CSEBS003',
      assignmentId: 'asg-00000000-0000-0000-0000-000000000003',
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: '2026-03-02T09:20:00.000Z',
      distanceFromAssignedLocation: null,
      geofenceRadius: 200.0,
      verificationResult: 'GPS_DISABLED',
      connectivityStatus: 'WIFI',
      batteryOptimizationStatus: 'OPTIMIZED',
      consentVerified: true,
      withinMonitoringWindow: true,
      remarks: 'Device location sensor / GPS service is disabled.',
      createdAt: '2026-03-02T09:20:00.000Z',
    });
  }

  /**
   * Evaluates and records a new location verification event
   * Preserves historical immutability
   */
  public async recordVerification(
    target: AssignedGeofenceTarget,
    measurement: DeviceLocationMeasurement,
    consent?: StudentConsent | null
  ): Promise<VerificationEvaluationResult> {
    const evaluation = this.engine.evaluateLocationVerification(target, measurement, consent);
    const newRecord: VerificationEvaluationResult = {
      ...evaluation,
      id: `ver-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    // Immutable append to in-memory store
    this.inMemoryRecords.push(newRecord);

    // Optional Supabase cloud synchronization
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('location_verifications').insert({
          assignment_id: newRecord.assignmentId,
          student_id: newRecord.studentId,
          event_type: 'check_in',
          requested_at: newRecord.timestamp,
          responded_at: newRecord.timestamp,
          captured_latitude: newRecord.latitude,
          captured_longitude: newRecord.longitude,
          accuracy_meters: newRecord.accuracy,
          distance_to_center_meters: newRecord.distanceFromAssignedLocation,
          geofence_radius_meters: newRecord.geofenceRadius,
          connectivity_status: newRecord.connectivityStatus,
          battery_optimization_status: newRecord.batteryOptimizationStatus,
          consent_verified: newRecord.consentVerified,
          within_monitoring_window: newRecord.withinMonitoringWindow,
          verification_result: newRecord.verificationResult,
          remarks: newRecord.remarks,
        });
      } catch (err) {
        // Fallback gracefully without dropping local verification record
        console.warn('[GeolocationVerificationRepository] Supabase persistence note:', err);
      }
    }

    return newRecord;
  }

  /**
   * Retrieves verification history with filtering options
   * Enforces Anti-Surveillance privacy: Blocks Platform Super Admins from reading raw coordinates
   */
  public async getVerificationHistory(
    options: VerificationFilterOptions = {},
    caller?: AuthUser
  ): Promise<VerificationEvaluationResult[]> {
    if (caller) {
      AuthorizationPolicy.validateLocationPrivacy(caller);
    }
    let records = [...this.inMemoryRecords];

    if (options.studentId) {
      records = records.filter((r) => r.studentId === options.studentId);
    }
    if (options.assignmentId) {
      records = records.filter((r) => r.assignmentId === options.assignmentId);
    }
    if (options.resultState) {
      records = records.filter((r) => r.verificationResult === options.resultState);
    }
    if (options.startDate) {
      records = records.filter((r) => r.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      records = records.filter((r) => r.timestamp <= options.endDate!);
    }

    // Sort descending by timestamp (newest first)
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options.limit && options.limit > 0) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /**
   * Ensures historical record immutability: Rejects attempts to overwrite recorded outcomes
   */
  public updateRecordResult(
    id: string,
    _newResult: VerificationResultState
  ): never {
    throw new Error(`Security Exception: Verification record ${id} is an immutable audit artifact and cannot be modified.`);
  }
}

export const geolocationVerificationRepository = new GeolocationVerificationRepository();

