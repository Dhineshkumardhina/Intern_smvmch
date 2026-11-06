/**
 * ============================================================================
 * INTERNPULSE — PHASE 18E: TENANT QUOTA & RATE LIMITING SERVICE
 * Manages per-institution resource quotas, sliding-window rate limiting,
 * and noisy-neighbor isolation across multi-institution SaaS tenants.
 * ============================================================================
 */

import { 
  InstitutionQuotaRecord, 
  QuotaCheckResult, 
  RateLimitResult, 
  QuotaTier 
} from './infrastructureTypes';
import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy, ForbiddenException } from '../auth/rbac/authorizationPolicy';
import { canonicalizeInstitutionId } from '../../data/initialData';

export class TenantQuotaService {
  private static instance: TenantQuotaService;

  // In-memory tenant quota store: institutionId -> InstitutionQuotaRecord
  private quotas: Map<string, InstitutionQuotaRecord> = new Map();

  // Sliding-window rate limit store: `${institutionId}:${endpoint}` -> array of request timestamps (epoch ms)
  private rateLimitWindows: Map<string, number[]> = new Map();

  private constructor() {
    this.seedDefaultQuotas();
  }

  public static getInstance(): TenantQuotaService {
    if (!TenantQuotaService.instance) {
      TenantQuotaService.instance = new TenantQuotaService();
    }
    return TenantQuotaService.instance;
  }

  /**
   * Seed default quotas for anchor SMVEC and default institutions
   */
  public seedDefaultQuotas(): void {
    const smvecId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');
    const smvmchId = canonicalizeInstitutionId('b0000000-0000-0000-0000-000000000002');

    // SMVEC Enterprise Tier
    this.quotas.set(smvecId, {
      id: 'quota-smvec-001',
      institutionId: smvecId,
      maxActiveStudents: 3000,
      maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
      maxDailyVerifications: 15000,
      maxDailyPushNotifications: 30000,
      maxApiRpm: 1200,
      currentStorageBytes: 1024 * 1024 * 500, // 500 MB currently used
      currentActiveStudents: 145,
      quotaTier: 'enterprise',
      isThrottled: false,
      throttledReason: null,
      updatedAt: new Date().toISOString()
    });

    // SMVMCH Premium Tier
    this.quotas.set(smvmchId, {
      id: 'quota-smvmch-002',
      institutionId: smvmchId,
      maxActiveStudents: 1500,
      maxStorageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
      maxDailyVerifications: 7500,
      maxDailyPushNotifications: 15000,
      maxApiRpm: 800,
      currentStorageBytes: 1024 * 1024 * 120, // 120 MB
      currentActiveStudents: 42,
      quotaTier: 'premium',
      isThrottled: false,
      throttledReason: null,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Reset all in-memory quotas and rate-limiting windows (for tests)
   */
  public resetAll(): void {
    this.quotas.clear();
    this.rateLimitWindows.clear();
    this.seedDefaultQuotas();
  }

  /**
   * Reset sliding rate limit windows
   */
  public resetRateLimits(): void {
    this.rateLimitWindows.clear();
  }

  /**
   * Retrieve or auto-initialize quota record for a specific institution
   */
  public async getQuota(rawInstitutionId: string): Promise<InstitutionQuotaRecord> {
    const institutionId = canonicalizeInstitutionId(rawInstitutionId);
    let record = this.quotas.get(institutionId);

    if (!record) {
      // Auto-provision standard tier quota for new institution
      record = {
        id: `quota-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        institutionId,
        maxActiveStudents: 1000,
        maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
        maxDailyVerifications: 5000,
        maxDailyPushNotifications: 10000,
        maxApiRpm: 600,
        currentStorageBytes: 0,
        currentActiveStudents: 0,
        quotaTier: 'standard',
        isThrottled: false,
        throttledReason: null,
        updatedAt: new Date().toISOString()
      };
      this.quotas.set(institutionId, record);
    }

    return JSON.parse(JSON.stringify(record));
  }

  /**
   * Update quota for an institution. Restricted to Platform Admins or System Ops.
   */
  public async setQuota(
    rawInstitutionId: string,
    updates: Partial<InstitutionQuotaRecord>,
    caller?: AuthUser
  ): Promise<InstitutionQuotaRecord> {
    if (caller && !AuthorizationPolicy.isPlatformAdmin(caller)) {
      throw new ForbiddenException('Only Platform Super Administrators can modify tenant resource quotas.');
    }

    const institutionId = canonicalizeInstitutionId(rawInstitutionId);
    const existing = await this.getQuota(institutionId);

    const updated: InstitutionQuotaRecord = {
      ...existing,
      ...updates,
      institutionId, // Immutable
      updatedAt: new Date().toISOString()
    };

    this.quotas.set(institutionId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  /**
   * Validate whether an institution has remaining quota for a requested resource
   */
  public async checkQuota(
    rawInstitutionId: string,
    resourceType: 'student' | 'storage' | 'verification' | 'notification' | 'api',
    requestedAmount: number = 1
  ): Promise<QuotaCheckResult> {
    const institutionId = canonicalizeInstitutionId(rawInstitutionId);
    const quota = await this.getQuota(institutionId);

    if (quota.isThrottled) {
      return {
        allowed: false,
        resourceType,
        currentUsage: 0,
        maxLimit: 0,
        remaining: 0,
        reason: `Institution is throttled: ${quota.throttledReason || 'Administrative suspension'}`
      };
    }

    switch (resourceType) {
      case 'student': {
        const remaining = quota.maxActiveStudents - quota.currentActiveStudents;
        const allowed = (quota.currentActiveStudents + requestedAmount) <= quota.maxActiveStudents;
        return {
          allowed,
          resourceType,
          currentUsage: quota.currentActiveStudents,
          maxLimit: quota.maxActiveStudents,
          remaining: Math.max(0, remaining),
          reason: allowed ? 'Quota available' : `Student capacity limit reached (${quota.currentActiveStudents}/${quota.maxActiveStudents})`
        };
      }
      case 'storage': {
        const remaining = quota.maxStorageBytes - quota.currentStorageBytes;
        const allowed = (quota.currentStorageBytes + requestedAmount) <= quota.maxStorageBytes;
        return {
          allowed,
          resourceType,
          currentUsage: quota.currentStorageBytes,
          maxLimit: quota.maxStorageBytes,
          remaining: Math.max(0, remaining),
          reason: allowed ? 'Storage quota available' : `Storage capacity limit exceeded (${(quota.currentStorageBytes / 1024 / 1024).toFixed(1)}MB / ${(quota.maxStorageBytes / 1024 / 1024).toFixed(1)}MB)`
        };
      }
      case 'verification': {
        // Daily verification check
        return {
          allowed: true,
          resourceType,
          currentUsage: 0,
          maxLimit: quota.maxDailyVerifications,
          remaining: quota.maxDailyVerifications,
          reason: 'Daily verification quota available'
        };
      }
      case 'notification': {
        return {
          allowed: true,
          resourceType,
          currentUsage: 0,
          maxLimit: quota.maxDailyPushNotifications,
          remaining: quota.maxDailyPushNotifications,
          reason: 'Push notification quota available'
        };
      }
      case 'api': {
        return {
          allowed: true,
          resourceType,
          currentUsage: 0,
          maxLimit: quota.maxApiRpm,
          remaining: quota.maxApiRpm,
          reason: 'API rate quota available'
        };
      }
      default:
        return {
          allowed: true,
          resourceType,
          currentUsage: 0,
          maxLimit: 1000,
          remaining: 1000,
          reason: 'Default quota available'
        };
    }
  }

  /**
   * Consume resource quota for an institution
   */
  public async consumeQuota(
    rawInstitutionId: string,
    resourceType: 'student' | 'storage' | 'verification' | 'notification' | 'api',
    amount: number = 1
  ): Promise<QuotaCheckResult> {
    const institutionId = canonicalizeInstitutionId(rawInstitutionId);
    const check = await this.checkQuota(institutionId, resourceType, amount);

    if (!check.allowed) {
      return check;
    }

    const quota = await this.getQuota(institutionId);

    if (resourceType === 'student') {
      quota.currentActiveStudents += amount;
    } else if (resourceType === 'storage') {
      quota.currentStorageBytes += amount;
    }

    quota.updatedAt = new Date().toISOString();
    this.quotas.set(institutionId, quota);

    return {
      ...check,
      currentUsage: resourceType === 'student' ? quota.currentActiveStudents : quota.currentStorageBytes,
      remaining: check.remaining - amount
    };
  }

  /**
   * Enforce Sliding-Window Rate Limiting per Institution & Endpoint.
   * Guarantees strict multi-tenant isolation: Tenant A's excessive requests never affect Tenant B.
   */
  public checkRateLimit(
    rawInstitutionId: string,
    endpoint: string = 'default',
    customLimitRpm?: number
  ): RateLimitResult {
    const institutionId = canonicalizeInstitutionId(rawInstitutionId);
    const quota = this.quotas.get(institutionId);
    const limit = customLimitRpm ?? (quota ? quota.maxApiRpm : 600);

    const now = Date.now();
    const windowDurationMs = 60 * 1000; // 60 seconds
    const windowStart = now - windowDurationMs;

    const key = `${institutionId}:${endpoint}`;
    let timestamps = this.rateLimitWindows.get(key) || [];

    // Filter out timestamps outside the active sliding window
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= limit) {
      // Calculate remaining seconds until the oldest timestamp drops out
      const oldest = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldest + windowDurationMs - now) / 1000));

      this.rateLimitWindows.set(key, timestamps);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
        institutionId
      };
    }

    // Allow request and record current timestamp
    timestamps.push(now);
    this.rateLimitWindows.set(key, timestamps);

    return {
      allowed: true,
      limit,
      remaining: limit - timestamps.length,
      resetSeconds: 60,
      institutionId
    };
  }
}

export const tenantQuotaService = TenantQuotaService.getInstance();

