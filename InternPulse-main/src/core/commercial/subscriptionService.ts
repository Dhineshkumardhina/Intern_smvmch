/**
 * ============================================================================
 * INTERNPULSE — PHASE 19B: SUBSCRIPTION & LICENSING MANAGEMENT SERVICE
 * Manages SaaS Plans, Subscriptions, Entitlements, Invoices, Payments,
 * Lifecycle Transitions, Grandfathering Governance & Immutable Audit Logs.
 * ============================================================================
 */

import { AuthUser } from '../auth/authUser';
import { 
  AuthorizationPolicy, 
  ForbiddenException, 
  UnauthorizedException 
} from '../auth/rbac/authorizationPolicy';
import { 
  SaasPlanRecord, 
  InstitutionSubscriptionRecord, 
  LicenseEntitlementsRecord, 
  SubscriptionInvoiceRecord, 
  SubscriptionPaymentRecord, 
  SubscriptionAuditLogRecord, 
  SubscriptionState, 
  BillingCadence, 
  PaymentMethod,
  SubscriptionStateException 
} from './commercialTypes';
import { SubscriptionStateMachine } from './subscriptionStateMachine';
import { LicensingEngine } from './licensingEngine';
import { PlanManagementService } from './planManagementService';
import { canonicalizeInstitutionId } from '../../data/initialData';

export interface CreateSubscriptionParams {
  institutionId: string;
  planId: string;
  billingCadence?: BillingCadence;
  studentCapacity?: number;
  contractReference?: string;
  customOverrides?: Record<string, any>;
}

export interface RecordPaymentParams {
  institutionId: string;
  invoiceId: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  amountPaidInr: number;
  notes?: string;
}

export class SubscriptionService {
  private static instance: SubscriptionService;

  private plans: SaasPlanRecord[] = [];
  private subscriptions: Map<string, InstitutionSubscriptionRecord> = new Map();
  private entitlements: Map<string, LicenseEntitlementsRecord> = new Map();
  private invoices: SubscriptionInvoiceRecord[] = [];
  private payments: SubscriptionPaymentRecord[] = [];
  private auditLogs: SubscriptionAuditLogRecord[] = [];

  private constructor() {
    this.resetState();
  }

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Resets all in-memory collections and seeds default plans and grandfathered institutions
   */
  public resetState(): void {
    PlanManagementService.getInstance().resetState();
    this.plans = PlanManagementService.getInstance().getPlans();

    this.subscriptions.clear();
    this.entitlements.clear();
    this.invoices = [];
    this.payments = [];
    this.auditLogs = [];

    // Grandfather SMVEC Anchor
    const smvecId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001');
    const smvecSub: InstitutionSubscriptionRecord = {
      id: 'sub-smvec-0000-0000-0000-000000000001',
      institutionId: smvecId,
      planId: '00000000-0000-0000-0000-000000000005',
      planCode: 'UNIV_ENTERPRISE',
      status: 'ACTIVE',
      billingCadence: 'annual',
      licensedStudentCapacity: 3000,
      licensedDepartmentCapacity: -1,
      licensedMentorCapacity: -1,
      startDate: '2026-01-01T00:00:00Z',
      expiryDate: '2036-01-01T00:00:00Z',
      renewalDate: '2027-01-01T00:00:00Z',
      autoRenew: true,
      contractReference: 'MOU-SMVEC-FOUNDING-2026',
      isGrandfathered: true,
      grandfatheredTerms: 'Founding anchor institution grandfathered under perpetual academic development agreement. Unlimited departments, 3,000 active students, priority feature updates.',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.subscriptions.set(smvecId, smvecSub);

    const smvecEnt: LicenseEntitlementsRecord = {
      id: 'ent-smvec-0000-0000-0000-000000000001',
      institutionId: smvecId,
      subscriptionId: smvecSub.id,
      maxActiveStudents: 3000,
      bufferStudentAllowance: 300,
      maxDepartments: -1,
      maxFacultyMentors: -1,
      maxGeofenceLocations: 500,
      maxStorageBytes: 53687091200,
      featureFlags: { ...PlanManagementService.getInstance().getPlanById('UNIV_ENTERPRISE').featureEntitlements },
      customOverrides: {},
      isHardCapped: false,
      updatedAt: '2026-01-01T00:00:00Z',
    };
    this.entitlements.set(smvecId, smvecEnt);

    // SMVMCH Pilot
    const smvmchId = canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000002');
    const smvmchSub: InstitutionSubscriptionRecord = {
      id: 'sub-smvmch-0000-0000-0000-000000000002',
      institutionId: smvmchId,
      planId: '00000000-0000-0000-0000-000000000001',
      planCode: 'PILOT_50',
      status: 'ACTIVE',
      billingCadence: 'annual',
      licensedStudentCapacity: 50,
      licensedDepartmentCapacity: 6,
      licensedMentorCapacity: 20,
      startDate: '2026-11-01T00:00:00Z',
      expiryDate: '2027-01-01T00:00:00Z',
      renewalDate: '2026-12-15T00:00:00Z',
      autoRenew: true,
      contractReference: 'PILOT-SMVMCH-MED-2026',
      isGrandfathered: false,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };
    this.subscriptions.set(smvmchId, smvmchSub);

    const smvmchEnt: LicenseEntitlementsRecord = {
      id: 'ent-smvmch-0000-0000-0000-000000000002',
      institutionId: smvmchId,
      subscriptionId: smvmchSub.id,
      maxActiveStudents: 50,
      bufferStudentAllowance: 10,
      maxDepartments: 6,
      maxFacultyMentors: 20,
      maxGeofenceLocations: 50,
      maxStorageBytes: 10737418240,
      featureFlags: { ...PlanManagementService.getInstance().getPlanById('PILOT_50').featureEntitlements },
      customOverrides: {},
      isHardCapped: true,
      updatedAt: '2026-11-01T00:00:00Z',
    };
    this.entitlements.set(smvmchId, smvmchEnt);

    // Initial SMVEC Invoices
    this.invoices.push({
      id: 'inv-smvec-0000-0000-0000-000000000001',
      institutionId: smvecId,
      subscriptionId: smvecSub.id,
      invoiceNumber: 'INV-2026-SMVEC-001',
      invoiceType: 'TAX_INVOICE',
      status: 'PAID',
      billingPeriodStart: '2026-01-01',
      billingPeriodEnd: '2026-12-31',
      subtotalInr: 0,
      cgstAmountInr: 0,
      sgstAmountInr: 0,
      igstAmountInr: 0,
      totalAmountInr: 0,
      issueDate: '2026-01-01',
      dueDate: '2026-01-31',
      paidDate: '2026-01-01T00:00:00Z',
      notes: 'Founding institutional agreement grant.',
      createdAt: '2026-01-01T00:00:00Z',
    });

    // Sync with LicensingEngine
    LicensingEngine.getInstance().resetState();
  }

  // ============================================================================
  // READ APIS
  // ============================================================================

  public getPlans(caller?: AuthUser): SaasPlanRecord[] {
    return PlanManagementService.getInstance().getPlans(undefined, caller);
  }

  public getPlanById(planId: string): SaasPlanRecord {
    return PlanManagementService.getInstance().getPlanById(planId);
  }

  public getSubscription(rawInstitutionId: string, caller: AuthUser): InstitutionSubscriptionRecord {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    AuthorizationPolicy.validateInstitutionScope(caller, instId);

    const sub = this.subscriptions.get(instId);
    if (!sub) {
      throw new Error(`No subscription found for institution '${instId}'.`);
    }
    return JSON.parse(JSON.stringify(sub));
  }

  public getEntitlements(rawInstitutionId: string, caller: AuthUser): LicenseEntitlementsRecord {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    AuthorizationPolicy.validateInstitutionScope(caller, instId);

    const ent = this.entitlements.get(instId);
    if (!ent) {
      throw new Error(`No license entitlements found for institution '${instId}'.`);
    }
    return JSON.parse(JSON.stringify(ent));
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT & STATE TRANSITIONS (Platform Admin Only)
  // ============================================================================

  /**
   * Creates a new subscription for an institution. Platform Admin only.
   */
  public async createSubscription(
    params: CreateSubscriptionParams,
    caller: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const instId = canonicalizeInstitutionId(params.institutionId);
    if (this.subscriptions.has(instId)) {
      throw new Error(`Institution '${instId}' already has an active subscription record.`);
    }

    const plan = this.getPlanById(params.planId);
    const now = new Date();
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1);

    const renewal = new Date(expiry);
    renewal.setDate(renewal.getDate() - 30); // 30 days prior to expiry

    const capacity = params.studentCapacity || plan.includedActiveStudents;
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newSub: InstitutionSubscriptionRecord = {
      id: subId,
      institutionId: instId,
      planId: plan.id,
      planCode: plan.planCode,
      status: plan.tier === 'pilot' ? 'TRIAL' : 'ACTIVE',
      billingCadence: params.billingCadence || 'annual',
      licensedStudentCapacity: capacity,
      licensedDepartmentCapacity: plan.maxDepartments,
      licensedMentorCapacity: plan.maxFacultyMentors,
      startDate: now.toISOString(),
      expiryDate: expiry.toISOString(),
      renewalDate: renewal.toISOString(),
      autoRenew: true,
      contractReference: params.contractReference,
      isGrandfathered: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const newEnt: LicenseEntitlementsRecord = {
      id: `ent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      institutionId: instId,
      subscriptionId: subId,
      maxActiveStudents: capacity,
      bufferStudentAllowance: Math.round(capacity * 0.1),
      maxDepartments: plan.maxDepartments,
      maxFacultyMentors: plan.maxFacultyMentors,
      maxGeofenceLocations: capacity > 1000 ? 500 : 150,
      maxStorageBytes: plan.includedStorageBytes,
      featureFlags: { ...plan.featureEntitlements },
      customOverrides: params.customOverrides || {},
      isHardCapped: plan.tier === 'pilot',
      updatedAt: now.toISOString(),
    };

    this.subscriptions.set(instId, newSub);
    this.entitlements.set(instId, newEnt);

    // Sync into LicensingEngine cache
    LicensingEngine.getInstance().registerSubscription(newSub);
    LicensingEngine.getInstance().registerEntitlements(newEnt);

    this.recordAuditLog('SUBSCRIPTION_CREATED', instId, subId, null, newSub, 'New institutional subscription initialized', caller);

    return JSON.parse(JSON.stringify(newSub));
  }

  /**
   * Transitions subscription status enforcing the Phase 19 state machine rules.
   * Platform Super Admin only. Institutions CANNOT modify their own status.
   */
  public async transitionSubscriptionStatus(
    rawInstitutionId: string,
    targetStatus: SubscriptionState,
    reason: string,
    caller: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const instId = canonicalizeInstitutionId(rawInstitutionId);
    const sub = this.subscriptions.get(instId);
    if (!sub) {
      throw new Error(`Subscription for institution '${instId}' was not found.`);
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('A detailed operational reason (minimum 5 characters) is required for subscription state transition.');
    }

    // Root Anchor Protection: SMVEC cannot be suspended or cancelled
    if (instId === 'a0000000-0000-0000-0000-000000000001' && (targetStatus === 'SUSPENDED' || targetStatus === 'CANCELLED')) {
      throw new Error('Root anchor institution SMVEC is protected and cannot be suspended or cancelled.');
    }

    // Validate state machine rule
    SubscriptionStateMachine.validateTransition(sub.status, targetStatus);

    const previousState = { ...sub };
    sub.status = targetStatus;
    sub.updatedAt = new Date().toISOString();

    if (targetStatus === 'GRACE_PERIOD') {
      const graceEnd = new Date();
      graceEnd.setDate(graceEnd.getDate() + 30); // 30-day grace period
      sub.gracePeriodEnd = graceEnd.toISOString();
    } else if (targetStatus === 'ACTIVE') {
      sub.gracePeriodEnd = null;
    }

    // Update in memory and sync LicensingEngine
    this.subscriptions.set(instId, sub);
    LicensingEngine.getInstance().registerSubscription(sub);

    this.recordAuditLog(
      'STATUS_TRANSITION',
      instId,
      sub.id,
      previousState,
      sub,
      reason.trim(),
      caller
    );

    return JSON.parse(JSON.stringify(sub));
  }

  /**
   * Upgrades subscription plan and capacity. Platform Admin only.
   */
  public async upgradeSubscription(
    rawInstitutionId: string,
    newPlanId: string,
    newStudentCapacity?: number,
    caller?: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    if (caller) {
      AuthorizationPolicy.validatePlatformSuperAdminScope(caller);
    }

    const instId = canonicalizeInstitutionId(rawInstitutionId);
    const sub = this.subscriptions.get(instId);
    if (!sub) {
      throw new Error(`Subscription for institution '${instId}' was not found.`);
    }

    const newPlan = this.getPlanById(newPlanId);
    const ent = this.entitlements.get(instId);

    const previousState = { ...sub };
    const capacity = newStudentCapacity || Math.max(sub.licensedStudentCapacity, newPlan.includedActiveStudents);

    sub.planId = newPlan.id;
    sub.planCode = newPlan.planCode;
    sub.licensedStudentCapacity = capacity;
    sub.licensedDepartmentCapacity = newPlan.maxDepartments;
    sub.licensedMentorCapacity = newPlan.maxFacultyMentors;
    sub.status = 'ACTIVE';
    sub.updatedAt = new Date().toISOString();

    if (ent) {
      ent.maxActiveStudents = capacity;
      ent.bufferStudentAllowance = Math.round(capacity * 0.1);
      ent.maxDepartments = newPlan.maxDepartments;
      ent.maxFacultyMentors = newPlan.maxFacultyMentors;
      ent.maxStorageBytes = newPlan.includedStorageBytes;
      ent.featureFlags = { ...ent.featureFlags, ...newPlan.featureEntitlements };
      ent.updatedAt = new Date().toISOString();
      LicensingEngine.getInstance().registerEntitlements(ent);
    }

    LicensingEngine.getInstance().registerSubscription(sub);

    this.recordAuditLog(
      'CAPACITY_UPGRADE',
      instId,
      sub.id,
      previousState,
      sub,
      `Upgraded to plan '${newPlan.name}' with ${capacity} student capacity`,
      caller
    );

    return JSON.parse(JSON.stringify(sub));
  }

  /**
   * Downgrades subscription plan. Non-destructive: preserves existing historical data.
   */
  public async downgradeSubscription(
    rawInstitutionId: string,
    newPlanId: string,
    newStudentCapacity?: number,
    caller?: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    if (caller) {
      AuthorizationPolicy.validatePlatformSuperAdminScope(caller);
    }

    const instId = canonicalizeInstitutionId(rawInstitutionId);
    const sub = this.subscriptions.get(instId);
    if (!sub) {
      throw new Error(`Subscription for institution '${instId}' was not found.`);
    }

    const newPlan = this.getPlanById(newPlanId);
    const ent = this.entitlements.get(instId);

    const previousState = { ...sub };
    const capacity = newStudentCapacity || newPlan.includedActiveStudents;

    sub.planId = newPlan.id;
    sub.planCode = newPlan.planCode;
    sub.licensedStudentCapacity = capacity;
    sub.licensedDepartmentCapacity = newPlan.maxDepartments;
    sub.licensedMentorCapacity = newPlan.maxFacultyMentors;
    sub.updatedAt = new Date().toISOString();

    if (ent) {
      ent.maxActiveStudents = capacity;
      ent.bufferStudentAllowance = Math.round(capacity * 0.1);
      ent.maxDepartments = newPlan.maxDepartments;
      ent.maxFacultyMentors = newPlan.maxFacultyMentors;
      ent.maxStorageBytes = newPlan.includedStorageBytes;
      ent.updatedAt = new Date().toISOString();
      LicensingEngine.getInstance().registerEntitlements(ent);
    }

    LicensingEngine.getInstance().registerSubscription(sub);

    this.recordAuditLog(
      'PLAN_DOWNGRADE',
      instId,
      sub.id,
      previousState,
      sub,
      `Scheduled downgrade to plan '${newPlan.name}' with ${capacity} student capacity`,
      caller
    );

    return JSON.parse(JSON.stringify(sub));
  }

  /**
   * Renews subscription for a specified duration in months (default 12).
   */
  public async renewSubscription(
    rawInstitutionId: string,
    durationMonths: number = 12,
    caller: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const instId = canonicalizeInstitutionId(rawInstitutionId);
    const sub = this.subscriptions.get(instId);
    if (!sub) {
      throw new Error(`Subscription for institution '${instId}' was not found.`);
    }

    const previousState = { ...sub };
    const currentExpiry = new Date(sub.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();

    baseDate.setMonth(baseDate.getMonth() + durationMonths);
    sub.expiryDate = baseDate.toISOString();

    const renewal = new Date(baseDate);
    renewal.setDate(renewal.getDate() - 30);
    sub.renewalDate = renewal.toISOString();

    sub.status = 'ACTIVE';
    sub.gracePeriodEnd = null;
    sub.updatedAt = new Date().toISOString();

    this.subscriptions.set(instId, sub);
    LicensingEngine.getInstance().registerSubscription(sub);

    this.recordAuditLog(
      'RENEWAL_EXECUTED',
      instId,
      sub.id,
      previousState,
      sub,
      `Subscription renewed for ${durationMonths} months until ${sub.expiryDate}`,
      caller
    );

    return JSON.parse(JSON.stringify(sub));
  }

  /**
   * Suspend an active institution subscription (Platform Admin only).
   */
  public async suspendSubscription(
    rawInstitutionId: string,
    reason: string,
    caller: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    return this.transitionSubscriptionStatus(rawInstitutionId, 'SUSPENDED', reason, caller);
  }

  /**
   * Reactivate a suspended institution subscription (Platform Admin only).
   */
  public async reactivateSubscription(
    rawInstitutionId: string,
    reason: string,
    caller: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    return this.transitionSubscriptionStatus(rawInstitutionId, 'ACTIVE', reason, caller);
  }

  /**
   * Cancel an institution subscription (Platform Admin only).
   */
  public async cancelSubscription(
    rawInstitutionId: string,
    reason: string,
    caller: AuthUser
  ): Promise<InstitutionSubscriptionRecord> {
    return this.transitionSubscriptionStatus(rawInstitutionId, 'CANCELLED', reason, caller);
  }

  // ============================================================================
  // BILLING, INVOICES & PAYMENTS
  // ============================================================================

  public getInvoiceById(invoiceId: string): SubscriptionInvoiceRecord | undefined {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    return inv ? JSON.parse(JSON.stringify(inv)) : undefined;
  }

  public getBillingHistory(
    rawInstitutionId: string,
    caller: AuthUser
  ): { invoices: SubscriptionInvoiceRecord[]; payments: SubscriptionPaymentRecord[] } {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    AuthorizationPolicy.validateInstitutionScope(caller, instId);

    const institutionInvoices = this.invoices.filter((i) => canonicalizeInstitutionId(i.institutionId) === instId);
    const institutionPayments = this.payments.filter((p) => canonicalizeInstitutionId(p.institutionId) === instId);

    return {
      invoices: JSON.parse(JSON.stringify(institutionInvoices)),
      payments: JSON.parse(JSON.stringify(institutionPayments)),
    };
  }

  public recordPayment(params: RecordPaymentParams, caller: AuthUser): SubscriptionPaymentRecord {
    const instId = canonicalizeInstitutionId(params.institutionId);
    AuthorizationPolicy.validateInstitutionScope(caller, instId);

    if (caller.role !== 'admin' && caller.role !== 'super_admin' && caller.role !== 'platform_super_admin') {
      throw new ForbiddenException('Access denied. Only Institution Admin or Platform Admin can record payments.');
    }

    const invoice = this.invoices.find((i) => i.id === params.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice with ID '${params.invoiceId}' was not found.`);
    }

    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newPayment: SubscriptionPaymentRecord = {
      id: paymentId,
      invoiceId: invoice.id,
      institutionId: instId,
      paymentMethod: params.paymentMethod,
      transactionReference: params.transactionReference,
      amountPaidInr: params.amountPaidInr,
      paymentDate: new Date().toISOString(),
      reconciliationStatus: 'PENDING',
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    this.payments.push(newPayment);
    this.recordAuditLog('PAYMENT_RECORDED', instId, invoice.subscriptionId, null, newPayment, 'Institutional payment proof uploaded', caller);

    return JSON.parse(JSON.stringify(newPayment));
  }

  public reconcilePayment(
    paymentId: string,
    approved: boolean,
    notes: string,
    caller: AuthUser
  ): SubscriptionPaymentRecord {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const payment = this.payments.find((p) => p.id === paymentId);
    if (!payment) {
      throw new Error(`Payment record with ID '${paymentId}' was not found.`);
    }

    const previousState = { ...payment };
    payment.reconciliationStatus = approved ? 'RECONCILED' : 'REJECTED';
    payment.reconciledAt = new Date().toISOString();
    payment.reconciledBy = caller.id;
    payment.notes = notes;

    if (approved) {
      const invoice = this.invoices.find((i) => i.id === payment.invoiceId);
      if (invoice) {
        invoice.status = 'PAID';
        invoice.paidDate = new Date().toISOString();
      }

      // If subscription was PAST_DUE or GRACE_PERIOD, restore to ACTIVE
      const sub = this.subscriptions.get(canonicalizeInstitutionId(payment.institutionId));
      if (sub && (sub.status === 'PAST_DUE' || sub.status === 'GRACE_PERIOD')) {
        sub.status = 'ACTIVE';
        sub.gracePeriodEnd = null;
        sub.updatedAt = new Date().toISOString();
        LicensingEngine.getInstance().registerSubscription(sub);
      }
    }

    this.recordAuditLog(
      'PAYMENT_RECONCILED',
      payment.institutionId,
      undefined,
      previousState,
      payment,
      approved ? 'Payment reconciled and approved' : `Payment rejected: ${notes}`,
      caller
    );

    return JSON.parse(JSON.stringify(payment));
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  public getAuditLogs(rawInstitutionId: string, caller: AuthUser): SubscriptionAuditLogRecord[] {
    const instId = canonicalizeInstitutionId(rawInstitutionId);
    AuthorizationPolicy.validateInstitutionScope(caller, instId);

    return this.auditLogs.filter((a) => canonicalizeInstitutionId(a.institutionId) === instId);
  }

  private recordAuditLog(
    action: SubscriptionAuditLogRecord['action'],
    institutionId: string,
    subscriptionId?: string,
    previousState?: any,
    newState?: any,
    reason?: string,
    caller?: AuthUser
  ): void {
    const log: SubscriptionAuditLogRecord = {
      id: `saudit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      institutionId,
      subscriptionId,
      action,
      previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
      newState: newState ? JSON.parse(JSON.stringify(newState)) : null,
      reason,
      actorId: caller?.id || 'system',
      actorName: caller?.name || 'System Worker',
      actorRole: caller?.role || 'system',
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
  }
}
