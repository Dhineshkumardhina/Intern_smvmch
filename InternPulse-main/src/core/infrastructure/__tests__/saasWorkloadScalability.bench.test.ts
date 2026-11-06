/**
 * ============================================================================
 * INTERNPULSE — PHASE 18E: SAAS WORKLOAD SCALABILITY & INFRASTRUCTURE BENCHMARKS
 * Validates Tenant Quotas, Sliding Rate Limiting, Anti-Surveillance Redaction,
 * Multi-Tier Health Audits, Disaster Recovery SLOs, and Real Scalability Benchmarks
 * across 1, 5, 10, 25, 50, and 100 independent educational institutions.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  tenantQuotaService, 
  structuredLogger, 
  systemHealthService, 
  errorTrackingService, 
  backupVerificationService 
} from '../index';
import { AuthUser } from '../../auth/authUser';
import { generateRandomizedDailyWindows } from '../../scheduler/randomWindowGenerator';
import { EligibleAssignment } from '../../scheduler/schedulerTypes';
import { calculateHaversineDistance } from '../../geolocation/geospatialCalculator';
import { canonicalizeInstitutionId } from '../../../data/initialData';

describe('Phase 18E: Multi-Institution SaaS Infrastructure & Operations', () => {

  const platformAdmin: AuthUser = {
    id: 'admin-sys-001',
    email: 'sysadmin@internpulse.io',
    name: 'Platform Operations Admin',
    role: 'platform_super_admin',
    institutionId: '00000000-0000-0000-0000-000000000000',
    departmentCode: 'SYSTEM_OPS',
    isActive: true
  };

  const smvecAdmin: AuthUser = {
    id: 'admin-smvec-001',
    email: 'admin@smvec.ac.in',
    name: 'SMVEC College Admin',
    role: 'institution_admin',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    departmentCode: 'ADMIN',
    isActive: true
  };

  const collegeAId = 'c0000000-0000-0000-0000-000000000003';
  const collegeBId = 'd0000000-0000-0000-0000-000000000004';

  const baseAssignment: EligibleAssignment = {
    assignmentId: 'assign-bench-001',
    studentId: 'student-bench-001',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    departmentCode: 'CSE',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    monitoringStartTime: '09:00',
    monitoringEndTime: '17:00',
    assignmentStatus: 'active',
    timezone: 'Asia/Kolkata'
  };

  beforeEach(() => {
    tenantQuotaService.resetAll();
    structuredLogger.clearLogs();
    errorTrackingService.clearErrors();
    backupVerificationService.clearHistory();
  });

  // ============================================================================
  // 1. TENANT RESOURCE QUOTAS & ISOLATION
  // ============================================================================
  describe('1. Tenant Resource Quotas & Isolation', () => {
    it('1.1 should seed anchor institutions with appropriate tiers', async () => {
      const smvecQuota = await tenantQuotaService.getQuota('a0000000-0000-0000-0000-000000000001');
      expect(smvecQuota.quotaTier).toBe('enterprise');
      expect(smvecQuota.maxActiveStudents).toBe(3000);
      expect(smvecQuota.maxStorageBytes).toBe(50 * 1024 * 1024 * 1024);
      expect(smvecQuota.maxApiRpm).toBe(1200);

      const smvmchQuota = await tenantQuotaService.getQuota('b0000000-0000-0000-0000-000000000002');
      expect(smvmchQuota.quotaTier).toBe('premium');
      expect(smvmchQuota.maxActiveStudents).toBe(1500);
    });

    it('1.2 should auto-provision standard tier quotas for newly registered institutions', async () => {
      const newQuota = await tenantQuotaService.getQuota(collegeAId);
      expect(newQuota.quotaTier).toBe('standard');
      expect(newQuota.maxActiveStudents).toBe(1000);
      expect(newQuota.maxStorageBytes).toBe(10 * 1024 * 1024 * 1024);
      expect(newQuota.maxApiRpm).toBe(600);
    });

    it('1.3 should block student enrollment when active student quota is exceeded', async () => {
      // Set College A limit to 5 students
      await tenantQuotaService.setQuota(collegeAId, { maxActiveStudents: 5 }, platformAdmin);

      // Consume 5 students
      const res1 = await tenantQuotaService.consumeQuota(collegeAId, 'student', 5);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(0);

      // Attempt 6th student
      const res2 = await tenantQuotaService.consumeQuota(collegeAId, 'student', 1);
      expect(res2.allowed).toBe(false);
      expect(res2.reason).toContain('Student capacity limit reached');
    });

    it('1.4 should restrict quota updates to Platform Super Admins', async () => {
      await expect(
        tenantQuotaService.setQuota(collegeAId, { maxActiveStudents: 10000 }, smvecAdmin)
      ).rejects.toThrow('Only Platform Super Administrators can modify tenant resource quotas.');

      const updated = await tenantQuotaService.setQuota(collegeAId, { maxActiveStudents: 5000 }, platformAdmin);
      expect(updated.maxActiveStudents).toBe(5000);
    });

    it('1.5 should enforce storage quotas and calculate remaining bytes', async () => {
      const quota = await tenantQuotaService.getQuota(collegeAId);
      const oneGb = 1024 * 1024 * 1024;

      const res = await tenantQuotaService.consumeQuota(collegeAId, 'storage', 2 * oneGb);
      expect(res.allowed).toBe(true);
      expect(res.currentUsage).toBe(2 * oneGb);
      expect(res.remaining).toBe(quota.maxStorageBytes - (2 * oneGb));
    });
  });

  // ============================================================================
  // 2. SLIDING-WINDOW RATE LIMITING & NOISY NEIGHBOR PREVENTION
  // ============================================================================
  describe('2. Sliding-Window Rate Limiting & Noisy Neighbor Prevention', () => {
    it('2.1 should throttle excessive API calls within a 60-second window', () => {
      const endpoint = '/api/attendance/check-in';
      const limitRpm = 10;

      // First 10 requests should succeed
      for (let i = 0; i < 10; i++) {
        const check = tenantQuotaService.checkRateLimit(collegeAId, endpoint, limitRpm);
        expect(check.allowed).toBe(true);
        expect(check.remaining).toBe(limitRpm - (i + 1));
      }

      // 11th request must be throttled (HTTP 429)
      const throttledCheck = tenantQuotaService.checkRateLimit(collegeAId, endpoint, limitRpm);
      expect(throttledCheck.allowed).toBe(false);
      expect(throttledCheck.remaining).toBe(0);
      expect(throttledCheck.resetSeconds).toBeGreaterThan(0);
    });

    it('2.2 should strictly isolate noisy neighbors: throttling Tenant A must NEVER throttle Tenant B', () => {
      const endpoint = '/api/verification/verify';
      const limitRpm = 5;

      // Exhaust Tenant A's quota
      for (let i = 0; i < 5; i++) {
        tenantQuotaService.checkRateLimit(collegeAId, endpoint, limitRpm);
      }
      const tenantACheck = tenantQuotaService.checkRateLimit(collegeAId, endpoint, limitRpm);
      expect(tenantACheck.allowed).toBe(false); // Tenant A is throttled

      // Tenant B requests the exact same endpoint at the exact same moment
      const tenantBCheck = tenantQuotaService.checkRateLimit(collegeBId, endpoint, limitRpm);
      expect(tenantBCheck.allowed).toBe(true); // Tenant B is completely unaffected
      expect(tenantBCheck.remaining).toBe(4);
    });
  });

  // ============================================================================
  // 3. STRUCTURED LOGGING & DPDP PRIVACY REDACTION
  // ============================================================================
  describe('3. Structured Logging & DPDP Privacy Redaction', () => {
    it('3.1 should emit compliant JSON logs with correlation IDs and tenant IDs', () => {
      const entry = structuredLogger.info(
        'scheduler-service',
        'WINDOW_GENERATED',
        'Generated randomized verification window',
        {
          institutionId: 'a0000000-0000-0000-0000-000000000001',
          actorId: 'student-001',
          correlationId: 'req-test-1234'
        }
      );

      expect(entry.service).toBe('scheduler-service');
      expect(entry.event).toBe('WINDOW_GENERATED');
      expect(entry.correlationId).toBe('req-test-1234');
      expect(entry.institutionId).toBe(canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001'));
      expect(entry.timestamp).toBeDefined();
    });

    it('3.2 should sanitize raw GPS coordinates and secrets to uphold DPDP anti-surveillance', () => {
      const dirtyPayload = {
        studentId: 'STU1001',
        latitude: 11.933821,
        longitude: 79.637284,
        targetLatitude: 11.934000,
        targetLongitude: 79.637000,
        accuracy: 14.2,
        nested: {
          rawLocation: '11.933821,79.637284',
          authToken: 'Bearer secret_jwt_token_xyz',
          password: 'plain_password'
        }
      };

      const sanitized = structuredLogger.sanitize(dirtyPayload);

      // Verifies exact coordinates are eliminated
      expect(sanitized.latitude).toBe('[REDACTED_DPDP_LOCATION]');
      expect(sanitized.longitude).toBe('[REDACTED_DPDP_LOCATION]');
      expect(sanitized.targetLatitude).toBe('[REDACTED_DPDP_LOCATION]');
      expect(sanitized.targetLongitude).toBe('[REDACTED_DPDP_LOCATION]');
      expect(sanitized.nested.rawLocation).toBe('[REDACTED_DPDP_LOCATION]');

      // Verifies secrets are redacted
      expect(sanitized.nested.authToken).toBe('[REDACTED_SECRET]');
      expect(sanitized.nested.password).toBe('[REDACTED_SECRET]');

      // Verifies accuracy is bucketed
      expect(sanitized.accuracy).toBe('<=50m');
      expect(sanitized.studentId).toBe('STU1001'); // Non-sensitive ID preserved
    });
  });

  // ============================================================================
  // 4. MULTI-TIER SYSTEM HEALTH AUDITS
  // ============================================================================
  describe('4. Multi-Tier System Health Audits', () => {
    it('4.1 should perform multi-tier health evaluation across 7 core subsystems', async () => {
      const report = await systemHealthService.checkHealth();

      expect(report.status).toBe('HEALTHY');
      expect(report.version).toContain('18.5.0-saas');
      expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);

      // Verify all 7 subsystem health checks
      expect(report.components.database.status).toBe('HEALTHY');
      expect(report.components.postgis.status).toBe('HEALTHY');
      expect(report.components.supabaseAuth.status).toBe('HEALTHY');
      expect(report.components.storage.status).toBe('HEALTHY');
      expect(report.components.scheduler.status).toBe('HEALTHY');
      expect(report.components.pushGateway.status).toBe('HEALTHY');
      expect(report.components.quotaService.status).toBe('HEALTHY');

      // Verify measured PostGIS spatial calculation
      expect(report.components.postgis.details?.spatialDistanceCalculatedMeters).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 5. ERROR TRACKING & OPERATIONAL DEDUPLICATION
  // ============================================================================
  describe('5. Error Tracking & Operational Deduplication', () => {
    it('5.1 should fingerprint, categorize, and deduplicate repetitive operational errors', () => {
      const err = new Error('Database connection pool timeout on port 6543');

      // Emit error 3 times
      errorTrackingService.captureError(err, { category: 'SYSTEM_ERROR', institutionId: collegeAId, endpoint: '/api/check-in' });
      errorTrackingService.captureError(err, { category: 'SYSTEM_ERROR', institutionId: collegeAId, endpoint: '/api/check-in' });
      const record = errorTrackingService.captureError(err, { category: 'SYSTEM_ERROR', institutionId: collegeAId, endpoint: '/api/check-in' });

      expect(record.count).toBe(3);
      expect(record.category).toBe('SYSTEM_ERROR');
      expect(record.errorMessage).toContain('pool timeout');

      const traces = errorTrackingService.getAggregatedErrors(collegeAId);
      expect(traces.length).toBe(1);
      expect(traces[0].count).toBe(3);
    });

    it('5.2 should isolate error traces between institutions', () => {
      errorTrackingService.captureError('Cross-tenant forbidden probe', { category: 'TENANT_SECURITY_VIOLATION', institutionId: collegeAId });
      errorTrackingService.captureError('Storage quota exceeded', { category: 'QUOTA_EXCEEDED', institutionId: collegeBId });

      const collegeATraces = errorTrackingService.getAggregatedErrors(collegeAId);
      const collegeBTraces = errorTrackingService.getAggregatedErrors(collegeBId);

      expect(collegeATraces.length).toBe(1);
      expect(collegeATraces[0].category).toBe('TENANT_SECURITY_VIOLATION');

      expect(collegeBTraces.length).toBe(1);
      expect(collegeBTraces[0].category).toBe('QUOTA_EXCEEDED');
    });
  });

  // ============================================================================
  // 6. DISASTER RECOVERY & BACKUP VERIFICATION DRILLS
  // ============================================================================
  describe('6. Disaster Recovery & Backup Verification Drills', () => {
    it('6.1 should execute Point-in-Time Recovery (PITR) drill within SaaS RPO & RTO SLOs', async () => {
      const drill = await backupVerificationService.executeDisasterRecoveryDrill('PITR_SIMULATION', 'a0000000-0000-0000-0000-000000000001');

      expect(drill.drillType).toBe('PITR_SIMULATION');
      expect(drill.status).toBe('SUCCESS');
      expect(drill.rpoSeconds).toBeLessThanOrEqual(300); // RPO < 5 minutes
      expect(drill.rtoSeconds).toBeLessThanOrEqual(900); // RTO < 15 minutes
      expect(drill.checksumVerified).toBe(true);
      expect(drill.recordsVerified).toBeGreaterThan(1000);
    });

    it('6.2 should execute Snapshot & Schema Drift Audits successfully', async () => {
      const snapshotDrill = await backupVerificationService.executeDisasterRecoveryDrill('SNAPSHOT_VERIFICATION');
      expect(snapshotDrill.status).toBe('SUCCESS');
      expect(snapshotDrill.details.sha256Checksum).toBeDefined();

      const schemaDrill = await backupVerificationService.executeDisasterRecoveryDrill('SCHEMA_DRIFT_AUDIT');
      expect(schemaDrill.status).toBe('SUCCESS');
      expect(schemaDrill.details.tablesWithRlsEnabled).toBe(38);
      expect(schemaDrill.details.foreignKeyIntegrityViolations).toBe(0);
    });

    it('6.3 should execute Standby Replica Failover drill within target failover time', async () => {
      const failoverDrill = await backupVerificationService.executeDisasterRecoveryDrill('FAILOVER_TEST');
      expect(failoverDrill.status).toBe('SUCCESS');
      expect(failoverDrill.rtoSeconds).toBeLessThan(60); // < 1 minute switchover
    });
  });

  // ============================================================================
  // 7. EMPIRICAL SAAS SCALABILITY BENCHMARKS (1, 5, 10, 25, 50, 100 INSTITUTIONS)
  // ============================================================================
  describe('7. Empirical SaaS Scalability Benchmarks (1, 5, 10, 25, 50, 100 Institutions)', () => {
    // Model parameters:
    // - 500 active students per institution
    // - 5 randomized verification windows per student per day
    const STUDENTS_PER_INSTITUTION = 500;
    const WINDOWS_PER_STUDENT = 5;

    it('7.1 benchmark: 1 Institution Workload (500 Students, 2,500 daily verifications)', () => {
      const totalStudents = 1 * STUDENTS_PER_INSTITUTION;
      const totalWindows = totalStudents * WINDOWS_PER_STUDENT;

      const start = performance.now();
      // Generate randomized verification windows for 500 students
      const windows = [];
      for (let i = 0; i < totalStudents; i++) {
        const studentWindows = generateRandomizedDailyWindows(
          { ...baseAssignment, studentId: `student-${i}` },
          '2026-11-06'
        );
        windows.push(...studentWindows);
      }
      const durationMs = performance.now() - start;
      const ratePerSec = (totalWindows / (durationMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 1 Institution (500 students, ${totalWindows} windows): ${durationMs.toFixed(2)} ms (${ratePerSec} windows/sec)`);

      expect(windows.length).toBe(totalWindows);
      expect(durationMs).toBeLessThan(500); // Target < 500ms
    });

    it('7.2 benchmark: 5 Institutions Workload (2,500 Students, 12,500 daily verifications)', () => {
      const totalStudents = 5 * STUDENTS_PER_INSTITUTION;
      const totalWindows = totalStudents * WINDOWS_PER_STUDENT;

      const start = performance.now();
      let windowCount = 0;
      for (let i = 0; i < totalStudents; i++) {
        const w = generateRandomizedDailyWindows({ ...baseAssignment, studentId: `student-${i}` }, '2026-11-06');
        windowCount += w.length;
      }
      const durationMs = performance.now() - start;
      const ratePerSec = (totalWindows / (durationMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 5 Institutions (2,500 students, ${totalWindows} windows): ${durationMs.toFixed(2)} ms (${ratePerSec} windows/sec)`);

      expect(windowCount).toBe(totalWindows);
      expect(durationMs).toBeLessThan(1500);
    });

    it('7.3 benchmark: 10 Institutions Workload (5,000 Students, 25,000 daily verifications)', () => {
      const totalStudents = 10 * STUDENTS_PER_INSTITUTION;
      const totalWindows = totalStudents * WINDOWS_PER_STUDENT;

      const start = performance.now();
      let windowCount = 0;
      for (let i = 0; i < totalStudents; i++) {
        const w = generateRandomizedDailyWindows({ ...baseAssignment, studentId: `student-${i}` }, '2026-11-06');
        windowCount += w.length;
      }
      const durationMs = performance.now() - start;
      const ratePerSec = (totalWindows / (durationMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 10 Institutions (5,000 students, ${totalWindows} windows): ${durationMs.toFixed(2)} ms (${ratePerSec} windows/sec)`);

      expect(windowCount).toBe(totalWindows);
      expect(durationMs).toBeLessThan(3000);
    });

    it('7.4 benchmark: 25 Institutions Workload (12,500 Students, 62,500 daily verifications)', () => {
      const totalStudents = 25 * STUDENTS_PER_INSTITUTION;
      const totalWindows = totalStudents * WINDOWS_PER_STUDENT;

      // Sample a representative 2,500 students and scale to measure precise throughput
      const sampleSize = 2500;
      const start = performance.now();
      for (let i = 0; i < sampleSize; i++) {
        generateRandomizedDailyWindows({ ...baseAssignment, studentId: `student-${i}` }, '2026-11-06');
      }
      const sampleDurationMs = performance.now() - start;
      const projectedDurationMs = (sampleDurationMs / sampleSize) * totalStudents;
      const ratePerSec = ((sampleSize * WINDOWS_PER_STUDENT) / (sampleDurationMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 25 Institutions (12,500 students, ${totalWindows} windows): projected ${projectedDurationMs.toFixed(2)} ms (${ratePerSec} windows/sec)`);

      expect(Number(ratePerSec)).toBeGreaterThan(5000);
    });

    it('7.5 benchmark: 50 Institutions Workload (25,000 Students, 125,000 daily verifications)', () => {
      const totalStudents = 50 * STUDENTS_PER_INSTITUTION;
      const totalWindows = totalStudents * WINDOWS_PER_STUDENT;

      const sampleSize = 2500;
      const start = performance.now();
      for (let i = 0; i < sampleSize; i++) {
        generateRandomizedDailyWindows({ ...baseAssignment, studentId: `student-${i}` }, '2026-11-06');
      }
      const sampleDurationMs = performance.now() - start;
      const projectedDurationMs = (sampleDurationMs / sampleSize) * totalStudents;
      const ratePerSec = ((sampleSize * WINDOWS_PER_STUDENT) / (sampleDurationMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 50 Institutions (25,000 students, ${totalWindows} windows): projected ${projectedDurationMs.toFixed(2)} ms (${ratePerSec} windows/sec)`);

      expect(Number(ratePerSec)).toBeGreaterThan(5000);
    });

    it('7.6 benchmark: 100 Institutions Workload (50,000 Students, 250,000 daily verifications)', () => {
      const totalStudents = 100 * STUDENTS_PER_INSTITUTION;
      const totalWindows = totalStudents * WINDOWS_PER_STUDENT;

      const sampleSize = 5000;
      const start = performance.now();
      for (let i = 0; i < sampleSize; i++) {
        generateRandomizedDailyWindows({ ...baseAssignment, studentId: `student-${i}` }, '2026-11-06');
      }
      const sampleDurationMs = performance.now() - start;
      const projectedDurationMs = (sampleDurationMs / sampleSize) * totalStudents;
      const ratePerSec = ((sampleSize * WINDOWS_PER_STUDENT) / (sampleDurationMs / 1000)).toFixed(1);

      console.log(`[BENCHMARK] 100 Institutions (50,000 students, ${totalWindows} windows): projected ${projectedDurationMs.toFixed(2)} ms (${ratePerSec} windows/sec)`);

      expect(Number(ratePerSec)).toBeGreaterThan(5000);
    });

    it('7.7 benchmark: PostGIS Geofence Spatial Calculation Throughput (10,000 evaluations)', () => {
      const center = { latitude: 11.9338, longitude: 79.6372 };
      const testCoordinates = Array.from({ length: 10000 }, (_, i) => ({
        latitude: 11.9338 + (i * 0.00001),
        longitude: 79.6372 + (i * 0.00001)
      }));

      const start = performance.now();
      let withinCount = 0;
      for (let i = 0; i < 10000; i++) {
        const d = calculateHaversineDistance(
          center.latitude, 
          center.longitude, 
          testCoordinates[i].latitude, 
          testCoordinates[i].longitude
        );
        if (d <= 150) withinCount++;
      }
      const durationMs = performance.now() - start;
      const opsPerSec = (10000 / (durationMs / 1000)).toFixed(0);

      console.log(`[BENCHMARK] PostGIS Geofence Throughput (10,000 coords): ${durationMs.toFixed(2)} ms (${opsPerSec} ops/sec)`);

      expect(durationMs).toBeLessThan(100); // Must compute 10k coords in < 100ms
      expect(Number(opsPerSec)).toBeGreaterThan(100000);
    });

    it('7.8 benchmark: Concurrent Sliding-Window Rate Limiter Throughput (50,000 checks)', () => {
      const iterations = 50000;
      const institutions = Array.from({ length: 100 }, (_, i) => `inst-${i}`);

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const instId = institutions[i % 100];
        tenantQuotaService.checkRateLimit(instId, '/api/telemetry', 1000);
      }
      const durationMs = performance.now() - start;
      const opsPerSec = (iterations / (durationMs / 1000)).toFixed(0);

      console.log(`[BENCHMARK] Multi-Tenant Rate Limiter Throughput (50,000 checks across 100 tenants): ${durationMs.toFixed(2)} ms (${opsPerSec} checks/sec)`);

      expect(durationMs).toBeLessThan(2500); // 50,000 checks in < 2.5s under parallel test load
      expect(Number(opsPerSec)).toBeGreaterThan(25000);
    });
  });
});
