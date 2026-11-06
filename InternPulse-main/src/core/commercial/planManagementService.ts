/**
 * ============================================================================
 * INTERNPULSE — PHASE 19C: CONFIGURABLE SAAS PLAN MANAGEMENT SERVICE
 * Centralized, Non-Hardcoded Plan Repository, Custom Institution Contracts,
 * Plan Administration, Billing Intervals & Entitlement Retention Architecture.
 * ============================================================================
 */

import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy, ForbiddenException } from '../auth/rbac/authorizationPolicy';
import { 
  SaasPlanRecord, 
  CreatePlanParams, 
  UpdatePlanParams, 
  PlanFilterOptions,
  FeatureEntitlementsMap,
  PlanTier 
} from './commercialTypes';
import { canonicalizeInstitutionId } from '../../data/initialData';

export class PlanManagementService {
  private static instance: PlanManagementService;

  // Central in-memory registry of configurable plans
  private plans: Map<string, SaasPlanRecord> = new Map();

  private constructor() {
    this.resetState();
  }

  public static getInstance(): PlanManagementService {
    if (!PlanManagementService.instance) {
      PlanManagementService.instance = new PlanManagementService();
    }
    return PlanManagementService.instance;
  }

  /**
   * Resets and seeds the canonical Phase 19C Plan Catalog.
   */
  public resetState(): void {
    this.plans.clear();

    const defaultPlans: SaasPlanRecord[] = [
      // 1. STARTER PLAN
      {
        id: '00000000-0000-0000-0000-000000000010',
        planCode: 'STARTER',
        name: 'Starter Educational Tier',
        description: 'Configured for small educational institutions. Core internship tracking, student onboarding, attendance and standard reporting.',
        tier: 'starter',
        billingInterval: 'annual',
        basePriceAnnualInr: 75000,
        basePriceMonthlyInr: 7500,
        pricePerAdditionalStudentInr: 180,
        includedActiveStudents: 250,
        maxDepartments: 2,
        maxFacultyMentors: 10,
        includedStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: false,
          advanced_reporting: false,
          enhanced_administrative_controls: false,
          extended_operational_analytics: false,
          custom_domain: false,
          erp_integration: false,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: false,
          dedicated_sla: false,
          custom_integrations: false,
          export_pdf_reports: true,
          geofence_calibration_support: false,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },

      // 2. PROFESSIONAL PLAN
      {
        id: '00000000-0000-0000-0000-000000000020',
        planCode: 'PROFESSIONAL',
        name: 'Professional Institutional Tier',
        description: 'Configured for larger institutions with multiple departments, advanced reporting, enhanced administrative controls and extended operational analytics.',
        tier: 'professional',
        billingInterval: 'annual',
        basePriceAnnualInr: 220000,
        basePriceMonthlyInr: 22000,
        pricePerAdditionalStudentInr: 140,
        includedActiveStudents: 1000,
        maxDepartments: 8,
        maxFacultyMentors: 40,
        includedStorageBytes: 30 * 1024 * 1024 * 1024, // 30 GB
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: true,
          advanced_reporting: true,
          enhanced_administrative_controls: true,
          extended_operational_analytics: true,
          custom_domain: true,
          erp_integration: false,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: false,
          dedicated_sla: false,
          custom_integrations: false,
          export_pdf_reports: true,
          geofence_calibration_support: false,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },

      // 3. ENTERPRISE PLAN
      {
        id: '00000000-0000-0000-0000-000000000030',
        planCode: 'ENTERPRISE',
        name: 'Enterprise Institutional Tier',
        description: 'Configured for large universities and institutional networks. Advanced configurations, custom capacity, enterprise reporting, priority support and custom integrations.',
        tier: 'enterprise',
        billingInterval: 'annual',
        basePriceAnnualInr: 550000,
        basePriceMonthlyInr: 55000,
        pricePerAdditionalStudentInr: 100,
        includedActiveStudents: 3000,
        maxDepartments: -1, // Unlimited
        maxFacultyMentors: -1, // Unlimited
        includedStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: true,
          advanced_reporting: true,
          enhanced_administrative_controls: true,
          extended_operational_analytics: true,
          custom_domain: true,
          erp_integration: true,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: true,
          dedicated_sla: true,
          custom_integrations: true,
          export_pdf_reports: true,
          geofence_calibration_support: true,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },

      // 4. CUSTOM PLAN TEMPLATE
      {
        id: '00000000-0000-0000-0000-000000000040',
        planCode: 'CUSTOM',
        name: 'Custom Institutional Agreement',
        description: 'Tailored institutional agreement with negotiated student capacity, custom department limits, bespoke feature entitlements and contract-specific billing.',
        tier: 'custom',
        billingInterval: 'annual',
        basePriceAnnualInr: 0, // Negotiated
        basePriceMonthlyInr: 0,
        pricePerAdditionalStudentInr: 0,
        includedActiveStudents: 1000,
        maxDepartments: -1,
        maxFacultyMentors: -1,
        includedStorageBytes: 50 * 1024 * 1024 * 1024,
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: true,
          advanced_reporting: true,
          enhanced_administrative_controls: true,
          extended_operational_analytics: true,
          custom_domain: true,
          erp_integration: true,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: true,
          dedicated_sla: true,
          custom_integrations: true,
          export_pdf_reports: true,
          geofence_calibration_support: true,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },

      // Backward-compatibility aliases for earlier phase tests
      {
        id: '00000000-0000-0000-0000-000000000001',
        planCode: 'PILOT_50',
        name: 'Supervised Institutional Trial',
        description: 'Controlled 30 to 60-day trial for single department pilot evaluations',
        tier: 'pilot',
        billingInterval: 'annual',
        basePriceAnnualInr: 0,
        basePriceMonthlyInr: 0,
        pricePerAdditionalStudentInr: 0,
        includedActiveStudents: 50,
        maxDepartments: 1,
        maxFacultyMentors: 5,
        includedStorageBytes: 5 * 1024 * 1024 * 1024,
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: false,
          advanced_reporting: false,
          enhanced_administrative_controls: false,
          extended_operational_analytics: false,
          custom_domain: false,
          erp_integration: false,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: false,
          dedicated_sla: false,
          custom_integrations: false,
          export_pdf_reports: true,
          geofence_calibration_support: false,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        planCode: 'DEPT_STARTER',
        name: 'Department Starter Tier (Legacy)',
        description: 'Legacy starter plan',
        tier: 'starter',
        billingInterval: 'annual',
        basePriceAnnualInr: 75000,
        basePriceMonthlyInr: 7500,
        pricePerAdditionalStudentInr: 180,
        includedActiveStudents: 250,
        maxDepartments: 2,
        maxFacultyMentors: 10,
        includedStorageBytes: 10 * 1024 * 1024 * 1024,
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: false,
          advanced_reporting: false,
          enhanced_administrative_controls: false,
          extended_operational_analytics: false,
          custom_domain: false,
          erp_integration: false,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: false,
          dedicated_sla: false,
          custom_integrations: false,
          export_pdf_reports: true,
          geofence_calibration_support: false,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        planCode: 'COLLEGE_STANDARD',
        name: 'College Standard Tier (Legacy)',
        description: 'Legacy standard plan',
        tier: 'standard',
        billingInterval: 'annual',
        basePriceAnnualInr: 180000,
        basePriceMonthlyInr: 18000,
        pricePerAdditionalStudentInr: 150,
        includedActiveStudents: 750,
        maxDepartments: 6,
        maxFacultyMentors: 30,
        includedStorageBytes: 25 * 1024 * 1024 * 1024,
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: true,
          advanced_reporting: true,
          enhanced_administrative_controls: true,
          extended_operational_analytics: false,
          custom_domain: true,
          erp_integration: false,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: false,
          dedicated_sla: false,
          custom_integrations: false,
          export_pdf_reports: true,
          geofence_calibration_support: false,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        planCode: 'CAMPUS_PREMIUM',
        name: 'Campus Premium Tier (Legacy)',
        description: 'Legacy premium plan',
        tier: 'premium',
        billingInterval: 'annual',
        basePriceAnnualInr: 360000,
        basePriceMonthlyInr: 36000,
        pricePerAdditionalStudentInr: 130,
        includedActiveStudents: 1800,
        maxDepartments: 15,
        maxFacultyMentors: 75,
        includedStorageBytes: 50 * 1024 * 1024 * 1024,
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: true,
          advanced_reporting: true,
          enhanced_administrative_controls: true,
          extended_operational_analytics: true,
          custom_domain: true,
          erp_integration: true,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: true,
          dedicated_sla: true,
          custom_integrations: true,
          export_pdf_reports: true,
          geofence_calibration_support: true,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        planCode: 'UNIV_ENTERPRISE',
        name: 'University Enterprise Tier (Legacy)',
        description: 'Legacy enterprise plan',
        tier: 'enterprise',
        billingInterval: 'annual',
        basePriceAnnualInr: 650000,
        basePriceMonthlyInr: 65000,
        pricePerAdditionalStudentInr: 100,
        includedActiveStudents: 3500,
        maxDepartments: -1,
        maxFacultyMentors: -1,
        includedStorageBytes: 100 * 1024 * 1024 * 1024,
        featureEntitlements: {
          basic_internship_management: true,
          student_onboarding: true,
          attendance_tracking: true,
          standard_reporting: true,
          multiple_departments: true,
          advanced_reporting: true,
          enhanced_administrative_controls: true,
          extended_operational_analytics: true,
          custom_domain: true,
          erp_integration: true,
          ai_spoof_detection: true,
          dpdp_dpo_dashboard: true,
          priority_support: true,
          dedicated_sla: true,
          custom_integrations: true,
          export_pdf_reports: true,
          geofence_calibration_support: true,
        },
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    for (const plan of defaultPlans) {
      this.plans.set(plan.planCode.toUpperCase(), plan);
      this.plans.set(plan.id, plan);
    }
  }

  // ============================================================================
  // READ APIS
  // ============================================================================

  /**
   * Returns all plans matching optional filter criteria.
   */
  public getPlans(filter?: PlanFilterOptions, caller?: AuthUser): SaasPlanRecord[] {
    if (caller) {
      AuthorizationPolicy.validateIdentity(caller);
    }

    // Deduplicate Map (it stores both by id and by planCode)
    const uniquePlans = Array.from(new Set(this.plans.values()));

    return uniquePlans.filter((p) => {
      if (filter) {
        if (filter.isActive !== undefined && p.isActive !== filter.isActive) {
          return false;
        }
        if (filter.tier && p.tier !== filter.tier) {
          return false;
        }
        if (filter.search) {
          const s = filter.search.toLowerCase();
          const matches = p.name.toLowerCase().includes(s) || p.planCode.toLowerCase().includes(s);
          if (!matches) return false;
        }
      }
      return true;
    });
  }

  /**
   * Retrieves a single plan by unique ID or planCode.
   */
  public getPlanById(planIdOrCode: string): SaasPlanRecord {
    const key = planIdOrCode.trim();
    const plan = this.plans.get(key) || this.plans.get(key.toUpperCase());
    if (!plan) {
      throw new Error(`SaaS plan with ID or code '${planIdOrCode}' was not found.`);
    }
    return JSON.parse(JSON.stringify(plan));
  }

  // ============================================================================
  // PLATFORM SUPER ADMIN CONFIGURATION APIS
  // ============================================================================

  /**
   * Creates a new configurable subscription plan.
   * Platform Super Admin only.
   */
  public async createPlan(params: CreatePlanParams, caller: AuthUser): Promise<SaasPlanRecord> {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const normCode = params.planCode.trim().toUpperCase();
    if (this.plans.has(normCode)) {
      throw new Error(`A plan with code '${normCode}' already exists in the catalog.`);
    }

    if (!params.name || params.name.trim().length < 3) {
      throw new Error('Plan name is required and must be at least 3 characters.');
    }

    if (params.basePriceAnnualInr < 0) {
      throw new Error('Base annual price cannot be negative.');
    }

    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newPlan: SaasPlanRecord = {
      id: planId,
      planCode: normCode,
      name: params.name.trim(),
      description: params.description || '',
      tier: params.tier,
      billingInterval: params.billingInterval || 'annual',
      basePriceAnnualInr: params.basePriceAnnualInr,
      basePriceMonthlyInr: params.basePriceMonthlyInr ?? Math.round(params.basePriceAnnualInr / 10),
      pricePerAdditionalStudentInr: params.pricePerAdditionalStudentInr ?? 150,
      includedActiveStudents: params.includedActiveStudents,
      maxDepartments: params.maxDepartments,
      maxFacultyMentors: params.maxFacultyMentors ?? (params.maxDepartments === -1 ? -1 : params.maxDepartments * 5),
      includedStorageBytes: params.includedStorageBytes ?? 10 * 1024 * 1024 * 1024,
      featureEntitlements: {
        basic_internship_management: true,
        student_onboarding: true,
        attendance_tracking: true,
        standard_reporting: true,
        ...params.featureEntitlements,
      },
      isActive: params.isActive !== undefined ? params.isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    this.plans.set(normCode, newPlan);
    this.plans.set(planId, newPlan);

    return JSON.parse(JSON.stringify(newPlan));
  }

  /**
   * Updates an existing plan's prices, capacities, or feature entitlements.
   * Platform Super Admin only.
   * 
   * CRITICAL GUARANTEE:
   * Updating a plan in the catalog affects new subscriptions. Existing institutions
   * subscribed to this plan RETAIN their authorized entitlements snapshot unless
   * explicitly upgraded or renegotiated.
   */
  public async updatePlan(
    planIdOrCode: string,
    updates: UpdatePlanParams,
    caller: AuthUser
  ): Promise<SaasPlanRecord> {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const existing = this.getPlanById(planIdOrCode);
    const updatedPlan: SaasPlanRecord = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      description: updates.description !== undefined ? updates.description : existing.description,
      basePriceAnnualInr: updates.basePriceAnnualInr !== undefined ? updates.basePriceAnnualInr : existing.basePriceAnnualInr,
      basePriceMonthlyInr: updates.basePriceMonthlyInr !== undefined ? updates.basePriceMonthlyInr : existing.basePriceMonthlyInr,
      pricePerAdditionalStudentInr: updates.pricePerAdditionalStudentInr !== undefined ? updates.pricePerAdditionalStudentInr : existing.pricePerAdditionalStudentInr,
      billingInterval: updates.billingInterval !== undefined ? updates.billingInterval : existing.billingInterval,
      includedActiveStudents: updates.includedActiveStudents !== undefined ? updates.includedActiveStudents : existing.includedActiveStudents,
      maxDepartments: updates.maxDepartments !== undefined ? updates.maxDepartments : existing.maxDepartments,
      maxFacultyMentors: updates.maxFacultyMentors !== undefined ? updates.maxFacultyMentors : existing.maxFacultyMentors,
      includedStorageBytes: updates.includedStorageBytes !== undefined ? updates.includedStorageBytes : existing.includedStorageBytes,
      featureEntitlements: {
        ...existing.featureEntitlements,
        ...(updates.featureEntitlements || {}),
      },
      isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
      updatedAt: new Date().toISOString(),
    };

    this.plans.set(updatedPlan.planCode.toUpperCase(), updatedPlan);
    this.plans.set(updatedPlan.id, updatedPlan);

    return JSON.parse(JSON.stringify(updatedPlan));
  }

  /**
   * Activates or deactivates a plan in the catalog.
   */
  public async setPlanActive(
    planIdOrCode: string,
    isActive: boolean,
    caller: AuthUser
  ): Promise<SaasPlanRecord> {
    return this.updatePlan(planIdOrCode, { isActive }, caller);
  }

  /**
   * Creates an institution-specific custom plan agreement.
   * Platform Super Admin only.
   */
  public async createCustomInstitutionPlan(
    institutionId: string,
    params: {
      planName: string;
      planCode?: string;
      annualPriceInr: number;
      monthlyPriceInr?: number;
      studentCapacity: number;
      maxDepartments: number;
      maxFacultyMentors?: number;
      featureEntitlements: Partial<FeatureEntitlementsMap>;
    },
    caller: AuthUser
  ): Promise<SaasPlanRecord> {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const instId = canonicalizeInstitutionId(institutionId);
    const code = params.planCode ? params.planCode.trim().toUpperCase() : `CUSTOM_${instId.substring(0, 8).toUpperCase()}`;

    return this.createPlan(
      {
        planCode: code,
        name: params.planName,
        description: `Custom negotiated agreement for institution ${instId}`,
        tier: 'custom',
        billingInterval: 'annual',
        basePriceAnnualInr: params.annualPriceInr,
        basePriceMonthlyInr: params.monthlyPriceInr ?? Math.round(params.annualPriceInr / 10),
        includedActiveStudents: params.studentCapacity,
        maxDepartments: params.maxDepartments,
        maxFacultyMentors: params.maxFacultyMentors ?? (params.maxDepartments === -1 ? -1 : params.maxDepartments * 10),
        featureEntitlements: params.featureEntitlements,
        isActive: true,
      },
      caller
    );
  }
}

