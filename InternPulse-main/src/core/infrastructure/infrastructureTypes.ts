/**
 * Multi-Institution SaaS Infrastructure & Operational Reliability Types
 * Sri Manakula Vinayagar Engineering College (SMVEC) / Multi-Tenant SaaS
 *
 * Defines data structures for:
 * 1. Institution Resource Quotas & Rate Limits
 * 2. Multi-Tier System Health Checks
 * 3. Structured DPDP-Sanitized Logging
 * 4. Error Tracking & Operational Telemetry
 * 5. Disaster Recovery & Backup Verification Drills
 */

export type QuotaTier = 'pilot' | 'standard' | 'premium' | 'enterprise';

export interface InstitutionQuotaRecord {
  id: string;
  institutionId: string;
  maxActiveStudents: number;
  maxStorageBytes: number;
  maxDailyVerifications: number;
  maxDailyPushNotifications: number;
  maxApiRpm: number;
  currentStorageBytes: number;
  currentActiveStudents: number;
  quotaTier: QuotaTier;
  isThrottled: boolean;
  throttledReason?: string | null;
  updatedAt: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  resourceType: 'student' | 'storage' | 'verification' | 'notification' | 'api';
  currentUsage: number;
  maxLimit: number;
  remaining: number;
  reason?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  institutionId: string;
}

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  details?: Record<string, any>;
  error?: string | null;
}

export interface SystemHealthReport {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  environment: 'production' | 'staging' | 'development';
  version: string;
  components: {
    database: ComponentHealth;
    postgis: ComponentHealth;
    supabaseAuth: ComponentHealth;
    storage: ComponentHealth;
    scheduler: ComponentHealth;
    pushGateway: ComponentHealth;
    quotaService: ComponentHealth;
  };
  metrics: {
    activeInstitutionsCount: number;
    totalEnrolledStudents: number;
    openVerificationWindows: number;
    heapMemoryMb: number;
    activePoolConnections?: number;
  };
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  event: string;
  message: string;
  institutionId?: string | null;
  institutionCode?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  correlationId: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export type DrillType = 'PITR_SIMULATION' | 'SNAPSHOT_VERIFICATION' | 'SCHEMA_DRIFT_AUDIT' | 'FAILOVER_TEST';
export type DrillStatus = 'SUCCESS' | 'WARNING' | 'FAILURE';

export interface DisasterRecoveryDrillRecord {
  id: string;
  drillType: DrillType;
  status: DrillStatus;
  targetInstitutionId?: string;
  rpoSeconds: number; // Target < 300s (5 mins)
  rtoSeconds: number; // Target < 900s (15 mins)
  recordsVerified: number;
  checksumVerified: boolean;
  details: Record<string, any>;
  executedBy: string;
  executedAt: string;
}

export interface ErrorTraceRecord {
  id: string;
  category: 'SYSTEM_ERROR' | 'TENANT_SECURITY_VIOLATION' | 'QUOTA_EXCEEDED' | 'INTEGRATION_FAILURE' | 'GEOLOCATION_DISCREPANCY';
  institutionId?: string;
  endpoint?: string;
  errorMessage: string;
  errorStack?: string;
  statusCode?: number;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

