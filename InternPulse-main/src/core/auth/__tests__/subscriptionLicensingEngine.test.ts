/**
 * ============================================================================
 * INTERNPULSE — PHASE 19B: SUBSCRIPTION & LICENSING ENGINE TEST SUITE
 * Exhaustive Verification of Subscription Lifecycle State Transitions,
 * Licensing Enforcement, Capacity Restrictions, Grandfathering Governance,
 * Server-Side Security, Cross-Tenant Isolation & Immutable Audit Trails.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  SubscriptionService, 
  LicensingEngine, 
  SubscriptionStateMachine,
  SubscriptionStateException,
  LicensingCapacityException,
  FeatureNotEntitledException,
  SubscriptionSuspendedException,
  SubscriptionExpiredException,
  SubscriptionCancelledException
} from '../../commercial';
import { AuthUser } from '../authUser';
import { ForbiddenException } from '../rbac/authorizationPolicy';
import { canonicalizeInstitutionId } from '../../../data/initialData';

describe('Phase 19B: Subscription & Institution Licensing Engine', () => {
  let subscriptionService: SubscriptionService;
  let licensingEngine: LicensingEngine;

  // Platform Super Admin (System Ops)
  const platformAdmin: AuthUser = {
    id: 'platform-admin-01',
    name: 'Antigravity Platform Operator',
    email: 'platform.ops@internpulse.gov.in',
    role: 'platform_super_admin',
    dept: 'SYSTEM_OPS',
    departmentCode: 'SYSTEM_OPS',
    college: 'InternPulse Platform Operations',
    isActive: true,
  };

  // SMVEC Institution Admin (College A)
  const smvecAdmin: AuthUser = {
    id: 'admin-smvec-01',
    name: 'Dr. SMVEC Principal',
    email: 'principal@smvec.ac.in',
    role: 'admin',
    dept: 'ADMIN',
    departmentCode: 'ADMIN',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    institutionCode: 'SMVEC',
    institutionDomain: 'smvec.ac.in',
    college: 'Sri Manakula Vinayagar Engineering College (Autonomous)',
    isActive: true,
  };

  // SMVMCH Institution Admin (College B)
  const smvmchAdmin: AuthUser = {
    id: 'admin-smvmch-01',
    name: 'Dr. SMVMCH Dean',
    email: 'dean@smvmch.ac.in',
    role: 'admin',
    dept: 'ADMIN',
    departmentCode: 'ADMIN',
    institutionId: 'a0000000-0000-0000-0000-000000000002',
    institutionCode: 'SMVMCH',
    institutionDomain: 'smvmch.ac.in',
    college: 'Sri Manakula Vinayagar Medical College and Hospital',
    isActive: true,
  };

  // External Institution Admin (Pondicherry Engineering College - PEC)
  const pecInstId = 'c0000000-0000-0000-0000-000000000003';
  const pecAdmin: AuthUser = {
    id: 'admin-pec-01',
    name: 'Dr. PEC Principal',
    email: 'principal@pec.edu',
    role: 'admin',
    dept: 'ADMIN',
    departmentCode: 'ADMIN',
    institutionId: pecInstId,
    institutionCode: 'PEC',
    institutionDomain: 'pec.edu',
    college: 'Pondicherry Engineering College',
    isActive: true,
  };

  beforeEach(() => {
    subscriptionService = SubscriptionService.getInstance();
    licensingEngine = LicensingEngine.getInstance();
    subscriptionService.resetState();
    licensingEngine.resetState();
  });

  // ============================================================================
  // 1. GRANDFATHERING & INITIAL STATE VERIFICATION
  // ============================================================================
  describe('1. Institutional Grandfathering & Backward Compatibility', () => {
    it('1.1 should grandfather founding anchor institution SMVEC with perpetual Enterprise active subscription', () => {
      const smvecId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');
      const sub = subscriptionService.getSubscription(smvecId, platformAdmin);

      expect(sub).toBeDefined();
      expect(sub.institutionId).toBe(smvecId);
      expect(sub.planCode).toBe('UNIV_ENTERPRISE');
      expect(sub.status).toBe('ACTIVE');
      expect(sub.isGrandfathered).toBe(true);
      expect(sub.licensedStudentCapacity).toBe(3000);
      expect(sub.licensedDepartmentCapacity).toBe(-1); // Unlimited
      expect(sub.contractReference).toBe('MOU-SMVEC-FOUNDING-2026');
    });

    it('1.2 should unlock all feature entitlements for grandfathered SMVEC', () => {
      const smvecId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');
      const ent = subscriptionService.getEntitlements(smvecId, smvecAdmin);

      expect(ent.maxActiveStudents).toBe(3000);
      expect(ent.bufferStudentAllowance).toBe(300);
      expect(ent.maxDepartments).toBe(-1);
      expect(ent.featureFlags.custom_domain).toBe(true);
      expect(ent.featureFlags.erp_integration).toBe(true);
      expect(ent.featureFlags.ai_spoof_detection).toBe(true);
      expect(ent.featureFlags.dpdp_dpo_dashboard).toBe(true);
      expect(ent.featureFlags.dedicated_sla).toBe(true);
    });

    it('1.3 should provision pilot institution SMVMCH with controlled pilot tier entitlements', () => {
      const smvmchId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000002');
      const sub = subscriptionService.getSubscription(smvmchId, smvmchAdmin);

      expect(sub).toBeDefined();
      expect(sub.planCode).toBe('PILOT_50');
      expect(sub.status).toBe('ACTIVE');
      expect(sub.licensedStudentCapacity).toBe(50);
      expect(sub.contractReference).toBe('PILOT-SMVMCH-MED-2026');
    });
  });

  // ============================================================================
  // 2. SUBSCRIPTION LIFECYCLE & STATE TRANSITIONS
  // ============================================================================
  describe('2. Subscription Lifecycle State Machine Transitions', () => {
    it('2.1 should validate legal transition sequence: TRIAL -> ACTIVE -> PAST_DUE -> GRACE_PERIOD -> ACTIVE', async () => {
      // Create new trial institution
      const sub = await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'PILOT_50',
      }, platformAdmin);

      expect(sub.status).toBe('TRIAL');

      // 1. TRIAL -> ACTIVE (Purchased subscription)
      const activeSub = await subscriptionService.transitionSubscriptionStatus(
        pecInstId,
        'ACTIVE',
        'Institutional contract executed and advance received',
        platformAdmin
      );
      expect(activeSub.status).toBe('ACTIVE');

      // 2. ACTIVE -> PAST_DUE (Invoice due date elapsed)
      const pastDueSub = await subscriptionService.transitionSubscriptionStatus(
        pecInstId,
        'PAST_DUE',
        'Academic renewal invoice payment pending',
        platformAdmin
      );
      expect(pastDueSub.status).toBe('PAST_DUE');

      // 3. PAST_DUE -> GRACE_PERIOD (Automated safety buffer)
      const graceSub = await subscriptionService.transitionSubscriptionStatus(
        pecInstId,
        'GRACE_PERIOD',
        '30-day statutory grace period activated to protect student internship credits',
        platformAdmin
      );
      expect(graceSub.status).toBe('GRACE_PERIOD');
      expect(graceSub.gracePeriodEnd).toBeDefined();

      // 4. GRACE_PERIOD -> ACTIVE (Payment received and cleared)
      const restoredSub = await subscriptionService.transitionSubscriptionStatus(
        pecInstId,
        'ACTIVE',
        'Bank wire transfer reconciled by accounts team',
        platformAdmin
      );
      expect(restoredSub.status).toBe('ACTIVE');
      expect(restoredSub.gracePeriodEnd).toBeNull();
    });

    it('2.2 should reject illegal state transitions according to state machine matrix', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'PILOT_50',
      }, platformAdmin);

      // Illegal: TRIAL cannot transition directly to PAST_DUE
      await expect(
        subscriptionService.transitionSubscriptionStatus(
          pecInstId,
          'PAST_DUE',
          'Attempted direct skip to past due',
          platformAdmin
        )
      ).rejects.toThrow(SubscriptionStateException);

      // Illegal: TRIAL cannot transition directly to GRACE_PERIOD
      await expect(
        subscriptionService.transitionSubscriptionStatus(
          pecInstId,
          'GRACE_PERIOD',
          'Attempted direct jump to grace period',
          platformAdmin
        )
      ).rejects.toThrow(SubscriptionStateException);
    });

    it('2.3 Root Anchor Protection: SMVEC cannot be suspended or cancelled', async () => {
      const smvecId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');

      await expect(
        subscriptionService.suspendSubscription(smvecId, 'Arbitrary suspension test', platformAdmin)
      ).rejects.toThrow(/Root anchor institution SMVEC is protected and cannot be suspended/);

      await expect(
        subscriptionService.cancelSubscription(smvecId, 'Arbitrary cancellation test', platformAdmin)
      ).rejects.toThrow(/Root anchor institution SMVEC is protected and cannot be suspended/);
    });
  });

  // ============================================================================
  // 3. CAPACITY RESTRICTIONS & LICENSING ENFORCEMENT
  // ============================================================================
  describe('3. Server-Side Licensing & Capacity Restrictions', () => {
    it('3.1 should enforce student capacity limit and allow within licensed limit + soft buffer', () => {
      const smvmchId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000002');
      // SMVMCH has 50 students licensed + 10 buffer = 60 total allowed

      // 45 students: Within limit
      const check1 = licensingEngine.verifyStudentCapacity(smvmchId, 45, 5);
      expect(check1.allowed).toBe(true);

      // 55 students: Within 10-student buffer
      const check2 = licensingEngine.verifyStudentCapacity(smvmchId, 55, 3);
      expect(check2.allowed).toBe(true);

      // 61 students: Exceeds effective limit (50 + 10 buffer) -> Throws LicensingCapacityException
      expect(() => {
        licensingEngine.verifyStudentCapacity(smvmchId, 58, 5);
      }).toThrow(LicensingCapacityException);
    });

    it('3.2 should allow unlimited student capacity for Enterprise tier (SMVEC)', () => {
      const smvecId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');
      const check = licensingEngine.verifyStudentCapacity(smvecId, 2900, 100);
      expect(check.allowed).toBe(true);
    });

    it('3.3 should enforce department capacity limits server-side', () => {
      // Create Starter institution (max 2 departments)
      subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'DEPT_STARTER',
      }, platformAdmin);

      // 1 existing department, adding 1 -> Allowed (2/2)
      const check1 = licensingEngine.verifyDepartmentCapacity(pecInstId, 1, 1);
      expect(check1.allowed).toBe(true);

      // 2 existing departments, attempting to add 1 more -> Throws LicensingCapacityException
      expect(() => {
        licensingEngine.verifyDepartmentCapacity(pecInstId, 2, 1);
      }).toThrow(LicensingCapacityException);
    });

    it('3.4 should enforce faculty mentor capacity limits server-side', () => {
      // Starter plan has max 10 faculty mentors
      subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'DEPT_STARTER',
      }, platformAdmin);

      const check1 = licensingEngine.verifyMentorCapacity(pecInstId, 9, 1);
      expect(check1.allowed).toBe(true);

      expect(() => {
        licensingEngine.verifyMentorCapacity(pecInstId, 10, 1);
      }).toThrow(LicensingCapacityException);
    });
  });

  // ============================================================================
  // 4. FEATURE ENTITLEMENTS ENFORCEMENT
  // ============================================================================
  describe('4. Feature Entitlements & Add-on Access Control', () => {
    it('4.1 should allow core features and block advanced features on starter tiers', () => {
      subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'DEPT_STARTER',
      }, platformAdmin);

      // Core features: allowed on Starter
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'ai_spoof_detection')).toBe(true);
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'dpdp_dpo_dashboard')).toBe(true);

      // Advanced features: blocked on Starter
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'custom_domain')).toBe(false);
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'erp_integration')).toBe(false);
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'dedicated_sla')).toBe(false);
    });

    it('4.2 should throw FeatureNotEntitledException when invoking enforceFeatureEntitlement on locked feature', () => {
      subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'DEPT_STARTER',
      }, platformAdmin);

      expect(() => {
        licensingEngine.enforceFeatureEntitlement(pecInstId, 'erp_integration');
      }).toThrow(FeatureNotEntitledException);
    });

    it('4.3 should honor custom feature overrides set by platform administration', () => {
      subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'DEPT_STARTER',
        customOverrides: {
          erp_integration: true, // Special institutional pilot concession
        },
      }, platformAdmin);

      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'erp_integration')).toBe(true);
    });
  });

  // ============================================================================
  // 5. OPERATIONAL VALIDITY & EDUCATIONAL DUTY OF CARE
  // ============================================================================
  describe('5. Operational Validity & Educational Duty of Care', () => {
    it('5.1 Educational Duty of Care: allows student attendance verifications during PAST_DUE and GRACE_PERIOD', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'COLLEGE_STANDARD',
      }, platformAdmin);

      await subscriptionService.transitionSubscriptionStatus(pecInstId, 'PAST_DUE', 'Payment delayed', platformAdmin);
      expect(() => {
        licensingEngine.validateSubscriptionForAction(pecInstId, 'verify');
      }).not.toThrow();

      await subscriptionService.transitionSubscriptionStatus(pecInstId, 'GRACE_PERIOD', 'Grace period active', platformAdmin);
      expect(() => {
        licensingEngine.validateSubscriptionForAction(pecInstId, 'verify');
      }).not.toThrow();
    });

    it('5.2 freezes attendance verification and resource provisioning when SUSPENDED', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'COLLEGE_STANDARD',
      }, platformAdmin);

      await subscriptionService.suspendSubscription(pecInstId, 'Regulatory investigation', platformAdmin);

      expect(() => {
        licensingEngine.validateSubscriptionForAction(pecInstId, 'verify');
      }).toThrow(SubscriptionSuspendedException);

      expect(() => {
        licensingEngine.validateSubscriptionForAction(pecInstId, 'write');
      }).toThrow(SubscriptionSuspendedException);

      // Read access (for institutional data export) MUST remain available
      expect(() => {
        licensingEngine.validateSubscriptionForAction(pecInstId, 'read');
      }).not.toThrow();
    });

    it('5.3 blocks mutations and verifications when EXPIRED or CANCELLED while maintaining read access', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'COLLEGE_STANDARD',
      }, platformAdmin);

      await subscriptionService.transitionSubscriptionStatus(pecInstId, 'EXPIRED', 'Contract term ended', platformAdmin);

      expect(() => {
        licensingEngine.validateSubscriptionForAction(pecInstId, 'write');
      }).toThrow(SubscriptionExpiredException);

      expect(() => {
        licensingEngine.validateSubscriptionForAction(pecInstId, 'read');
      }).not.toThrow();
    });
  });

  // ============================================================================
  // 6. UPGRADES, DOWNGRADES & RENEWALS
  // ============================================================================
  describe('6. Plan Upgrades, Non-Destructive Downgrades & Renewals', () => {
    it('6.1 should upgrade subscription plan and expand entitlements immediately', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'DEPT_STARTER',
      }, platformAdmin);

      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'custom_domain')).toBe(false);

      // Upgrade to Campus Premium
      const upgraded = await subscriptionService.upgradeSubscription(
        pecInstId,
        'CAMPUS_PREMIUM',
        2000,
        platformAdmin
      );

      expect(upgraded.planCode).toBe('CAMPUS_PREMIUM');
      expect(upgraded.licensedStudentCapacity).toBe(2000);
      expect(upgraded.licensedDepartmentCapacity).toBe(15);
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'custom_domain')).toBe(true);
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'erp_integration')).toBe(true);
    });

    it('6.2 should execute non-destructive plan downgrade preserving historical records', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'COLLEGE_STANDARD',
      }, platformAdmin);

      // Downgrade to Starter
      const downgraded = await subscriptionService.downgradeSubscription(
        pecInstId,
        'DEPT_STARTER',
        250,
        platformAdmin
      );

      expect(downgraded.planCode).toBe('DEPT_STARTER');
      expect(downgraded.licensedStudentCapacity).toBe(250);
      expect(downgraded.licensedDepartmentCapacity).toBe(2);
    });

    it('6.3 should renew subscription extending expiry date and restoring ACTIVE status', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'COLLEGE_STANDARD',
      }, platformAdmin);

      await subscriptionService.transitionSubscriptionStatus(pecInstId, 'PAST_DUE', 'Overdue notice', platformAdmin);

      const renewed = await subscriptionService.renewSubscription(pecInstId, 12, platformAdmin);

      expect(renewed.status).toBe('ACTIVE');
      expect(new Date(renewed.expiryDate).getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ============================================================================
  // 7. SECURITY & CROSS-TENANT ISOLATION
  // ============================================================================
  describe('7. Security, Authorization & Tenant Isolation', () => {
    it('7.1 should prevent Institution Administrators from modifying subscription status', async () => {
      // SMVEC Admin cannot modify SMVEC subscription status
      await expect(
        subscriptionService.transitionSubscriptionStatus(
          smvecAdmin.institutionId!,
          'SUSPENDED',
          'Self-suspension attempt',
          smvecAdmin
        )
      ).rejects.toThrow(ForbiddenException);

      // SMVMCH Admin cannot modify SMVMCH subscription status
      await expect(
        subscriptionService.transitionSubscriptionStatus(
          smvmchAdmin.institutionId!,
          'CANCELLED',
          'Self-cancellation attempt',
          smvmchAdmin
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('7.2 should prevent cross-tenant access to subscriptions and billing history', () => {
      const smvecId = canonicalizeInstitutionId(smvecAdmin.institutionId!);
      const smvmchId = canonicalizeInstitutionId(smvmchAdmin.institutionId!);

      // SMVEC Admin cannot inspect SMVMCH subscription
      expect(() => {
        subscriptionService.getSubscription(smvmchId, smvecAdmin);
      }).toThrow(ForbiddenException);

      // SMVMCH Admin cannot inspect SMVEC billing history
      expect(() => {
        subscriptionService.getBillingHistory(smvecId, smvmchAdmin);
      }).toThrow(ForbiddenException);
    });

    it('7.3 should record immutable audit logs for all commercial and licensing modifications', async () => {
      await subscriptionService.createSubscription({
        institutionId: pecInstId,
        planId: 'COLLEGE_STANDARD',
      }, platformAdmin);

      await subscriptionService.transitionSubscriptionStatus(
        pecInstId,
        'PAST_DUE',
        'Testing audit logging',
        platformAdmin
      );

      const logs = subscriptionService.getAuditLogs(pecInstId, platformAdmin);
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0].action).toBe('STATUS_TRANSITION');
      expect(logs[0].reason).toBe('Testing audit logging');
      expect(logs[0].actorId).toBe(platformAdmin.id);
    });
  });
});

