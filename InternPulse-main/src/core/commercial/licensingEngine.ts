/**
 * ============================================================================
 * INTERNPULSE — PHASE 19B: LICENSING & CAPACITY ENFORCEMENT ENGINE
 * Authoritative Server-Side License Checks, Student & Department Capacity
 * Gateways, Feature Entitlements & Subscription Validity Enforcers.
 * ============================================================================
 */

import { 
  CapacityCheckResult, 
  FeatureCheckResult, 
  LicenseEntitlementsRecord, 
  InstitutionSubscriptionRecord,
  LicensingCapacityException, 
  FeatureNotEntitledException, 
  SubscriptionSuspendedException, 
  SubscriptionExpiredException, 
  SubscriptionCancelledException,
  SubscriptionStateException
} from './commercialTypes';
import { SubscriptionStateMachine } from './subscriptionStateMachine';
import { canonicalizeInstitutionId } from '../../data/initialData';

export class LicensingEngine {
  private static instance: LicensingEngine;

  // In-memory registry of entitlements and subscriptions for fast synchronous & asynchronous evaluation
  private entitlementsStore: Map<string, LicenseEntitlementsRecord> = new Map();
  private subscriptionsStore: Map<string, InstitutionSubscriptionRecord> = new Map();

  private constructor() {
    this.seedDefaultEntitlements();
  }

  public static getInstance(): LicensingEngine {
    if (!LicensingEngine.instance) {
      LicensingEngine.instance = new LicensingEngine();
    }
    return LicensingEngine.instance;
  }

  /**
   * Seeds default grandfathered entitlements for SMVEC and authorized pilot SMVMCH
   */
  public seedDefaultEntitlements(): void {
    const smvecId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');
    const smvmchId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000002');

    // SMVEC Anchor Institution - Grandfathered University Enterprise
    this.subscriptionsStore.set(smvecId, {
      id: 'sub-smvec-0000-0000-0000-000000000001',
      institutionId: smvecId,
      planId: '00000000-0000-0000-0000-000000000005',
      planCode: 'UNIV_ENTERPRISE',
      status: 'ACTIVE',
      billingCadence: 'annual',
      licensedStudentCapacity: 3000,
      licensedDepartmentCapacity: -1, // Unlimited
      licensedMentorCapacity: -1, // Unlimited
      startDate: '2026-01-01T00:00:00Z',
      expiryDate: '2036-01-01T00:00:00Z',
      renewalDate: '2027-01-01T00:00:00Z',
      autoRenew: true,
      contractReference: 'MOU-SMVEC-FOUNDING-2026',
      isGrandfathered: true,
      grandfatheredTerms: 'Founding anchor institution grandfathered under perpetual academic development agreement. Unlimited departments, 3,000 active students, priority feature updates.',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    this.entitlementsStore.set(smvecId, {
      id: 'ent-smvec-0000-0000-0000-000000000001',
      institutionId: smvecId,
      subscriptionId: 'sub-smvec-0000-0000-0000-000000000001',
      maxActiveStudents: 3000,
      bufferStudentAllowance: 300, // 10% soft buffer
      maxDepartments: -1, // Unlimited
      maxFacultyMentors: -1, // Unlimited
      maxGeofenceLocations: 500,
      maxStorageBytes: 53687091200, // 50 GB
      featureFlags: {
        custom_domain: true,
        erp_integration: true,
        ai_spoof_detection: true,
        dpdp_dpo_dashboard: true,
        dedicated_sla: true,
        export_pdf_reports: true,
        geofence_calibration_support: true,
      },
      customOverrides: {},
      isHardCapped: false,
      updatedAt: '2026-01-01T00:00:00Z',
    });

    // SMVMCH Medical Pilot Institution - Supervised Trial / Active Pilot
    this.subscriptionsStore.set(smvmchId, {
      id: 'sub-smvmch-0000-0000-0000-000000000002',
      institutionId: smvmchId,
      planId: '00000000-0000-0000-0000-000000000001',
      planCode: 'PILOT_50',
      status: 'ACTIVE',
      billingCadence: 'annual',
      licensedStudentCapacity: 50,
      licensedDepartmentCapacity: 6, // Medical college cohort templates
      licensedMentorCapacity: 20,
      startDate: '2026-11-01T00:00:00Z',
      expiryDate: '2027-01-01T00:00:00Z',
      renewalDate: '2026-12-15T00:00:00Z',
      autoRenew: true,
      contractReference: 'PILOT-SMVMCH-MED-2026',
      isGrandfathered: false,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    });

    this.entitlementsStore.set(smvmchId, {
      id: 'ent-smvmch-0000-0000-0000-000000000002',
      institutionId: smvmchId,
      subscriptionId: 'sub-smvmch-0000-0000-0000-000000000002',
      maxActiveStudents: 50,
      bufferStudentAllowance: 10,
      maxDepartments: 6,
      maxFacultyMentors: 20,
      maxGeofenceLocations: 50,
      maxStorageBytes: 10737418240, // 10 GB
      featureFlags: {
        custom_domain: false,
        erp_integration: false,
        ai_spoof_detection: true,
        dpdp_dpo_dashboard: true,
        dedicated_sla: false,
        export_pdf_reports: true,
        geofence_calibration_support: false,
      },
      customOverrides: {},
      isHardCapped: true,
      updatedAt: '2026-11-01T00:00:00Z',
    });
  }

  /**
   * Reset in-memory state (for tests)
   */
  public resetState(): void {
    this.entitlementsStore.clear();
    this.subscriptionsStore.clear();
    this.seedDefaultEntitlements();
  }

  /**
   * Register or update subscription in local licensing cache
   */
  public registerSubscription(sub: InstitutionSubscriptionRecord): void {
    this.subscriptionsStore.set(canonicalizeInstitutionId(sub.institutionId), { ...sub });
  }

  /**
   * Register or update entitlements in local licensing cache
   */
  public registerEntitlements(ent: LicenseEntitlementsRecord): void {
    this.entitlementsStore.set(canonicalizeInstitutionId(ent.institutionId), { ...ent });
  }

  /**
   * Retrieve active subscription record (auto-provisions standard tier fallback for new tenants)
   */
  public getSubscription(rawInstitutionId: string): InstitutionSubscriptionRecord {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    let sub = this.subscriptionsStore.get(instId);

    if (!sub) {
      // Auto-provision standard tier subscription for dynamically created test tenants
      const now = new Date();
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 1);
      const renewal = new Date(expiry);
      renewal.setDate(renewal.getDate() - 30);

      sub = {
        id: `sub-${instId.substring(0, 8)}`,
        institutionId: instId,
        planId: '00000000-0000-0000-0000-000000000003', // COLLEGE_STANDARD
        planCode: 'COLLEGE_STANDARD',
        status: 'ACTIVE',
        billingCadence: 'annual',
        licensedStudentCapacity: 750,
        licensedDepartmentCapacity: 6,
        licensedMentorCapacity: 30,
        startDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
        renewalDate: renewal.toISOString(),
        autoRenew: true,
        isGrandfathered: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.subscriptionsStore.set(instId, sub);
    }

    return sub;
  }

  /**
   * Retrieve license entitlements record (auto-provisions standard tier fallback for new tenants)
   */
  public getEntitlements(rawInstitutionId: string): LicenseEntitlementsRecord {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    let ent = this.entitlementsStore.get(instId);

    if (!ent) {
      const sub = this.getSubscription(instId);
      ent = {
        id: `ent-${instId.substring(0, 8)}`,
        institutionId: instId,
        subscriptionId: sub.id,
        maxActiveStudents: 750,
        bufferStudentAllowance: 75,
        maxDepartments: 6,
        maxFacultyMentors: 30,
        maxGeofenceLocations: 150,
        maxStorageBytes: 25 * 1024 * 1024 * 1024,
        featureFlags: {
          custom_domain: true,
          erp_integration: false,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          dedicated_sla: false,
          export_pdf_reports: true,
          geofence_calibration_support: false,
        },
        customOverrides: {},
        isHardCapped: false,
        updatedAt: new Date().toISOString(),
      };
      this.entitlementsStore.set(instId, ent);
    }

    return ent;
  }

  // ============================================================================
  // VALIDATION & ENFORCEMENT APIs
  // ============================================================================

  /**
   * Validates subscription validity for the requested action type:
   * - 'read': Always permitted (data preservation, logbook exports, audits).
   * - 'verify': Permitted during ACTIVE, TRIAL, PAST_DUE, and GRACE_PERIOD.
   * - 'write': Permitted during ACTIVE and TRIAL only.
   */
  public validateSubscriptionForAction(
    rawInstitutionId: string,
    actionType: 'read' | 'verify' | 'write'
  ): void {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    const sub = this.getSubscription(instId);

    if (!sub) {
      throw new SubscriptionStateException(`No active subscription found for institution '${instId}'.`);
    }

    // Read operations are universally allowed for compliance
    if (actionType === 'read') {
      return;
    }

    if (sub.status === 'SUSPENDED') {
      throw new SubscriptionSuspendedException(instId);
    }
    if (sub.status === 'CANCELLED') {
      throw new SubscriptionCancelledException(instId);
    }
    if (sub.status === 'EXPIRED') {
      throw new SubscriptionExpiredException(instId, sub.expiryDate);
    }

    if (actionType === 'verify') {
      if (!SubscriptionStateMachine.isStudentVerificationPermitted(sub.status)) {
        throw new SubscriptionStateException(
          `Attendance verification is not permitted for institution '${instId}' with status '${sub.status}'.`
        );
      }
      return;
    }

    if (actionType === 'write') {
      if (!SubscriptionStateMachine.isResourceProvisioningPermitted(sub.status)) {
        throw new SubscriptionStateException(
          `Resource provisioning is blocked for institution '${instId}' while in '${sub.status}' status.`
        );
      }
    }
  }

  /**
   * Enforces Student Capacity limit server-side.
   * Calculates: currentActiveCount + requestedIncrement <= (maxActiveStudents + bufferStudentAllowance)
   */
  public verifyStudentCapacity(
    rawInstitutionId: string,
    currentActiveCount: number,
    requestedIncrement: number = 1
  ): CapacityCheckResult {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    this.validateSubscriptionForAction(instId, 'write');

    const entitlements = this.getEntitlements(instId);
    if (!entitlements) {
      throw new SubscriptionStateException(`License entitlements not found for institution '${instId}'.`);
    }

    // Unlimited Enterprise Capacity
    if (entitlements.maxActiveStudents === -1) {
      return {
        allowed: true,
        currentCount: currentActiveCount,
        maxLimit: -1,
        bufferAllowance: 0,
        remainingCapacity: 999999,
        reason: 'Enterprise unlimited student capacity active.',
      };
    }

    const effectiveLimit = entitlements.maxActiveStudents + (entitlements.bufferStudentAllowance || 0);
    const newTotal = currentActiveCount + requestedIncrement;

    if (newTotal > effectiveLimit) {
      throw new LicensingCapacityException(
        'student',
        currentActiveCount,
        effectiveLimit,
        `Student capacity exceeded for institution '${instId}'. Licensed: ${entitlements.maxActiveStudents} (Buffer: ${entitlements.bufferStudentAllowance}). Attempted: ${newTotal}.`
      );
    }

    return {
      allowed: true,
      currentCount: currentActiveCount,
      maxLimit: effectiveLimit,
      bufferAllowance: entitlements.bufferStudentAllowance,
      remainingCapacity: effectiveLimit - currentActiveCount,
      reason: 'Student capacity available within licensed allocation.',
    };
  }

  /**
   * Enforces Department Capacity limit server-side.
   */
  public verifyDepartmentCapacity(
    rawInstitutionId: string,
    currentDepartmentCount: number,
    requestedIncrement: number = 1
  ): CapacityCheckResult {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    this.validateSubscriptionForAction(instId, 'write');

    const entitlements = this.getEntitlements(instId);
    if (!entitlements) {
      throw new SubscriptionStateException(`License entitlements not found for institution '${instId}'.`);
    }

    if (entitlements.maxDepartments === -1) {
      return {
        allowed: true,
        currentCount: currentDepartmentCount,
        maxLimit: -1,
        bufferAllowance: 0,
        remainingCapacity: 999999,
        reason: 'Unlimited department tier active.',
      };
    }

    const newTotal = currentDepartmentCount + requestedIncrement;
    if (newTotal > entitlements.maxDepartments) {
      throw new LicensingCapacityException(
        'department',
        currentDepartmentCount,
        entitlements.maxDepartments,
        `Department capacity limit reached (${currentDepartmentCount}/${entitlements.maxDepartments}). Upgrade plan to add more departments.`
      );
    }

    return {
      allowed: true,
      currentCount: currentDepartmentCount,
      maxLimit: entitlements.maxDepartments,
      bufferAllowance: 0,
      remainingCapacity: entitlements.maxDepartments - currentDepartmentCount,
      reason: 'Department capacity available.',
    };
  }

  /**
   * Enforces Faculty Mentor Capacity limit server-side.
   */
  public verifyMentorCapacity(
    rawInstitutionId: string,
    currentMentorCount: number,
    requestedIncrement: number = 1
  ): CapacityCheckResult {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    this.validateSubscriptionForAction(instId, 'write');

    const entitlements = this.getEntitlements(instId);
    if (!entitlements) {
      throw new SubscriptionStateException(`License entitlements not found for institution '${instId}'.`);
    }

    if (entitlements.maxFacultyMentors === -1) {
      return {
        allowed: true,
        currentCount: currentMentorCount,
        maxLimit: -1,
        bufferAllowance: 0,
        remainingCapacity: 999999,
        reason: 'Unlimited faculty mentor tier active.',
      };
    }

    const newTotal = currentMentorCount + requestedIncrement;
    if (newTotal > entitlements.maxFacultyMentors) {
      throw new LicensingCapacityException(
        'mentor',
        currentMentorCount,
        entitlements.maxFacultyMentors,
        `Faculty mentor capacity limit reached (${currentMentorCount}/${entitlements.maxFacultyMentors}). Upgrade plan to add more mentors.`
      );
    }

    return {
      allowed: true,
      currentCount: currentMentorCount,
      maxLimit: entitlements.maxFacultyMentors,
      bufferAllowance: 0,
      remainingCapacity: entitlements.maxFacultyMentors - currentMentorCount,
      reason: 'Faculty mentor capacity available.',
    };
  }

  /**
   * Checks whether an institution has entitlement to a specific feature flag.
   */
  public hasFeatureEntitlement(rawInstitutionId: string, featureKey: string): boolean {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    const entitlements = this.getEntitlements(instId);
    if (!entitlements) return false;

    // Check custom overrides first
    if (entitlements.customOverrides && typeof entitlements.customOverrides[featureKey] === 'boolean') {
      return entitlements.customOverrides[featureKey];
    }

    return Boolean(entitlements.featureFlags && entitlements.featureFlags[featureKey]);
  }

  /**
   * Enforces a feature entitlement, throwing FeatureNotEntitledException if false.
   */
  public enforceFeatureEntitlement(rawInstitutionId: string, featureKey: string): FeatureCheckResult {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    const isEntitled = this.hasFeatureEntitlement(instId, featureKey);

    if (!isEntitled) {
      throw new FeatureNotEntitledException(
        featureKey,
        `Access denied. Feature '${featureKey}' is not licensed for institution '${instId}'. Please upgrade to an advanced tier.`
      );
    }

    return {
      allowed: true,
      featureKey,
      institutionId: instId,
      reason: 'Feature entitlement verified.',
    };
  }
}
