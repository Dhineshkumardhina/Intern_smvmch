/**
 * ============================================================================
 * INTERNPULSE — PHASE 19C: PRICING PLANS & FEATURE ENTITLEMENTS TEST SUITE
 * Comprehensive Verification of Centralized Plan Catalog, Configurable Plans
 * (STARTER, PROFESSIONAL, ENTERPRISE, CUSTOM), Platform Super Admin RBAC,
 * Custom Institution Contracts, and Grandfathered Entitlement Retention.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PlanManagementService, 
  SubscriptionService, 
  LicensingEngine,
  SaasPlanRecord,
  CreatePlanParams,
  UpdatePlanParams
} from '../../commercial';
import { AuthUser } from '../authUser';
import { ForbiddenException } from '../rbac/authorizationPolicy';
import { canonicalizeInstitutionId } from '../../../data/initialData';

describe('Phase 19C: Pricing Plans & Feature Entitlement Management', () => {
  let planService: PlanManagementService;
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

  // College Admin (SMVEC)
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

  // Target Institution (Pondicherry Engineering College - PEC)
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
    planService = PlanManagementService.getInstance();
    subscriptionService = SubscriptionService.getInstance();
    licensingEngine = LicensingEngine.getInstance();
    planService.resetState();
    subscriptionService.resetState();
    licensingEngine.resetState();
  });

  // ============================================================================
  // 1. CANONICAL INITIAL PLAN STRUCTURE
  // ============================================================================
  describe('1. Canonical Configurable Plan Profiles (STARTER, PROFESSIONAL, ENTERPRISE, CUSTOM)', () => {
    it('1.1 should provide STARTER plan configured for small educational institutions', () => {
      const plan = planService.getPlanById('STARTER');

      expect(plan).toBeDefined();
      expect(plan.planCode).toBe('STARTER');
      expect(plan.tier).toBe('starter');
      expect(plan.basePriceAnnualInr).toBe(75000);
      expect(plan.includedActiveStudents).toBe(250);
      expect(plan.maxDepartments).toBe(2);
      expect(plan.featureEntitlements.basic_internship_management).toBe(true);
      expect(plan.featureEntitlements.student_onboarding).toBe(true);
      expect(plan.featureEntitlements.attendance_tracking).toBe(true);
      expect(plan.featureEntitlements.standard_reporting).toBe(true);
      expect(plan.featureEntitlements.multiple_departments).toBe(false);
      expect(plan.featureEntitlements.advanced_reporting).toBe(false);
    });

    it('1.2 should provide PROFESSIONAL plan configured for larger institutions with multiple departments', () => {
      const plan = planService.getPlanById('PROFESSIONAL');

      expect(plan).toBeDefined();
      expect(plan.planCode).toBe('PROFESSIONAL');
      expect(plan.tier).toBe('professional');
      expect(plan.basePriceAnnualInr).toBe(220000);
      expect(plan.includedActiveStudents).toBe(1000);
      expect(plan.maxDepartments).toBe(8);
      expect(plan.featureEntitlements.multiple_departments).toBe(true);
      expect(plan.featureEntitlements.advanced_reporting).toBe(true);
      expect(plan.featureEntitlements.enhanced_administrative_controls).toBe(true);
      expect(plan.featureEntitlements.extended_operational_analytics).toBe(true);
      expect(plan.featureEntitlements.custom_domain).toBe(true);
      expect(plan.featureEntitlements.erp_integration).toBe(false); // Enterprise only
    });

    it('1.3 should provide ENTERPRISE plan configured for large institutions with custom configurations', () => {
      const plan = planService.getPlanById('ENTERPRISE');

      expect(plan).toBeDefined();
      expect(plan.planCode).toBe('ENTERPRISE');
      expect(plan.tier).toBe('enterprise');
      expect(plan.basePriceAnnualInr).toBe(550000);
      expect(plan.includedActiveStudents).toBe(3000);
      expect(plan.maxDepartments).toBe(-1); // Unlimited departments
      expect(plan.featureEntitlements.multiple_departments).toBe(true);
      expect(plan.featureEntitlements.erp_integration).toBe(true);
      expect(plan.featureEntitlements.priority_support).toBe(true);
      expect(plan.featureEntitlements.dedicated_sla).toBe(true);
      expect(plan.featureEntitlements.custom_integrations).toBe(true);
    });

    it('1.4 should provide CUSTOM plan template for bespoke negotiated institutional agreements', () => {
      const plan = planService.getPlanById('CUSTOM');

      expect(plan).toBeDefined();
      expect(plan.planCode).toBe('CUSTOM');
      expect(plan.tier).toBe('custom');
      expect(plan.isActive).toBe(true);
    });
  });

  // ============================================================================
  // 2. PLATFORM SUPER ADMIN CONFIGURATION APIS
  // ============================================================================
  describe('2. Platform Super Admin Plan Administration', () => {
    it('2.1 allows Platform Super Admin to create a new configurable plan', async () => {
      const newPlanParams: CreatePlanParams = {
        planCode: 'POLYTECHNIC_CONSORTIUM',
        name: 'State Polytechnic Board Tier',
        description: 'Special annual tier for technical education polytechnic colleges',
        tier: 'professional',
        billingInterval: 'annual',
        basePriceAnnualInr: 120000,
        basePriceMonthlyInr: 12000,
        pricePerAdditionalStudentInr: 120,
        includedActiveStudents: 600,
        maxDepartments: 4,
        maxFacultyMentors: 25,
        includedStorageBytes: 20 * 1024 * 1024 * 1024,
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: true,
          advanced_reporting: true,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
        },
      };

      const created = await planService.createPlan(newPlanParams, platformAdmin);

      expect(created.planCode).toBe('POLYTECHNIC_CONSORTIUM');
      expect(created.includedActiveStudents).toBe(600);
      expect(created.maxDepartments).toBe(4);

      // Verify searchable in central catalog
      const retrieved = planService.getPlanById('POLYTECHNIC_CONSORTIUM');
      expect(retrieved.name).toBe('State Polytechnic Board Tier');
    });

    it('2.2 allows Platform Super Admin to edit an existing plan', async () => {
      const updates: UpdatePlanParams = {
        name: 'Starter Educational Tier (2027 Edition)',
        basePriceAnnualInr: 85000,
        includedActiveStudents: 300,
        maxDepartments: 3,
        featureEntitlements: {
          custom_domain: true,
        },
      };

      const updated = await planService.updatePlan('STARTER', updates, platformAdmin);

      expect(updated.name).toBe('Starter Educational Tier (2027 Edition)');
      expect(updated.basePriceAnnualInr).toBe(85000);
      expect(updated.includedActiveStudents).toBe(300);
      expect(updated.maxDepartments).toBe(3);
      expect(updated.featureEntitlements.custom_domain).toBe(true);
    });

    it('2.3 allows Platform Super Admin to activate/deactivate plans', async () => {
      // Deactivate STARTER plan
      const deactivated = await planService.setPlanActive('STARTER', false, platformAdmin);
      expect(deactivated.isActive).toBe(false);

      // Active plans list must exclude deactivated plan
      const activePlans = planService.getPlans({ isActive: true });
      expect(activePlans.some((p) => p.planCode === 'STARTER')).toBe(false);

      // Reactivate STARTER plan
      const reactivated = await planService.setPlanActive('STARTER', true, platformAdmin);
      expect(reactivated.isActive).toBe(true);

      const activePlansAfter = planService.getPlans({ isActive: true });
      expect(activePlansAfter.some((p) => p.planCode === 'STARTER')).toBe(true);
    });

    it('2.4 rejects plan creation, editing, or deactivation by non-Platform Super Admins', async () => {
      // Institution Admin (College Principal) cannot create plans
      await expect(
        planService.createPlan(
          {
            planCode: 'UNAUTHORIZED_PLAN',
            name: 'Unauthorized Plan',
            description: 'Illegal plan creation attempt',
            tier: 'starter',
            basePriceAnnualInr: 1000,
            includedActiveStudents: 100,
            maxDepartments: 1,
          },
          smvecAdmin
        )
      ).rejects.toThrow(ForbiddenException);

      // Institution Admin cannot edit existing plans
      await expect(
        planService.updatePlan('STARTER', { basePriceAnnualInr: 1000 }, smvecAdmin)
      ).rejects.toThrow(ForbiddenException);

      // Institution Admin cannot deactivate plans
      await expect(
        planService.setPlanActive('STARTER', false, smvecAdmin)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // 3. CENTRAL NON-HARDCODED CONFIGURATION & ENTITLEMENT RETENTION GUARANTEE
  // ============================================================================
  describe('3. Central Configuration & Entitlement Retention Guarantee', () => {
    it('3.1 CRITICAL GUARANTEE: existing institutions retain authorized entitlements during plan modifications', async () => {
      // 1. Subscribe PEC to STARTER plan (250 student capacity, max 2 departments)
      await subscriptionService.createSubscription(
        {
          institutionId: pecInstId,
          planId: 'STARTER',
        },
        platformAdmin
      );

      const initialEntitlements = subscriptionService.getEntitlements(pecInstId, pecAdmin);
      expect(initialEntitlements.maxActiveStudents).toBe(250);
      expect(initialEntitlements.maxDepartments).toBe(2);
      expect(initialEntitlements.featureFlags.custom_domain).toBe(false);

      // 2. Platform Admin updates the STARTER plan in the central catalog:
      // Price increases to ₹95,000, capacity reduced to 200, departments reduced to 1
      await planService.updatePlan(
        'STARTER',
        {
          basePriceAnnualInr: 95000,
          includedActiveStudents: 200,
          maxDepartments: 1,
        },
        platformAdmin
      );

      // 3. Verify central plan in catalog was updated
      const catalogPlan = planService.getPlanById('STARTER');
      expect(catalogPlan.basePriceAnnualInr).toBe(95000);
      expect(catalogPlan.includedActiveStudents).toBe(200);

      // 4. VERIFY RETENTION: PEC's active entitlements MUST NOT be downgraded!
      // They retain their licensed 250 capacity and 2 departments!
      const retainedEntitlements = subscriptionService.getEntitlements(pecInstId, pecAdmin);
      expect(retainedEntitlements.maxActiveStudents).toBe(250);
      expect(retainedEntitlements.maxDepartments).toBe(2);

      // Verify LicensingEngine still enforces the retained 250 capacity
      const check = licensingEngine.verifyStudentCapacity(pecInstId, 240, 10);
      expect(check.allowed).toBe(true);
    });
  });

  // ============================================================================
  // 4. CUSTOM INSTITUTION-SPECIFIC AGREEMENTS
  // ============================================================================
  describe('4. Custom Institution-Specific Contracts & Negotiated Agreements', () => {
    it('4.1 allows Platform Super Admin to create a custom negotiated agreement for an institution', async () => {
      const customPlan = await planService.createCustomInstitutionPlan(
        pecInstId,
        {
          planName: 'Pondicherry Engineering College Autonomous MoU 2026',
          planCode: 'PEC_AUTONOMOUS_2026',
          annualPriceInr: 275000,
          studentCapacity: 1200,
          maxDepartments: 12,
          featureEntitlements: {
            custom_domain: true,
            erp_integration: true,
            ai_spoof_detection: true,
            dpdp_dpo_dashboard: true,
            priority_support: true,
            dedicated_sla: true,
            custom_integrations: true,
          },
        },
        platformAdmin
      );

      expect(customPlan.planCode).toBe('PEC_AUTONOMOUS_2026');
      expect(customPlan.tier).toBe('custom');
      expect(customPlan.basePriceAnnualInr).toBe(275000);
      expect(customPlan.includedActiveStudents).toBe(1200);
      expect(customPlan.maxDepartments).toBe(12);
      expect(customPlan.featureEntitlements.erp_integration).toBe(true);
    });

    it('4.2 allows subscribing an institution to their custom plan and enforces custom capacity and features', async () => {
      // 1. Create custom plan
      const customPlan = await planService.createCustomInstitutionPlan(
        pecInstId,
        {
          planName: 'PEC Negotiated Custom Plan',
          planCode: 'PEC_CUSTOM_T1',
          annualPriceInr: 300000,
          studentCapacity: 1500,
          maxDepartments: 10,
          featureEntitlements: {
            custom_domain: true,
            erp_integration: true,
          },
        },
        platformAdmin
      );

      // 2. Subscribe PEC to their custom plan
      const sub = await subscriptionService.createSubscription(
        {
          institutionId: pecInstId,
          planId: customPlan.id,
          contractReference: 'MOU-PEC-GOVT-2026-01',
        },
        platformAdmin
      );

      expect(sub.planCode).toBe('PEC_CUSTOM_T1');
      expect(sub.licensedStudentCapacity).toBe(1500);

      // 3. Verify entitlements enforced by LicensingEngine
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'custom_domain')).toBe(true);
      expect(licensingEngine.hasFeatureEntitlement(pecInstId, 'erp_integration')).toBe(true);

      const capacityCheck = licensingEngine.verifyStudentCapacity(pecInstId, 1400, 100);
      expect(capacityCheck.allowed).toBe(true);
    });
  });

  // ============================================================================
  // 5. QUERYING & FILTERING THE CENTRAL CATALOG
  // ============================================================================
  describe('5. Plan Catalog Querying & Filtering', () => {
    it('5.1 allows filtering plans by tier and search keyword', () => {
      const enterprisePlans = planService.getPlans({ tier: 'enterprise' });
      expect(enterprisePlans.length).toBeGreaterThanOrEqual(1);
      expect(enterprisePlans.every((p) => p.tier === 'enterprise')).toBe(true);

      const searchResults = planService.getPlans({ search: 'Professional' });
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults[0].planCode).toBe('PROFESSIONAL');
    });
  });
});

