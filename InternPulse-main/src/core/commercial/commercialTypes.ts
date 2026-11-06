/**
 * ============================================================================
 * INTERNPULSE — PHASE 19B: COMMERCIAL TYPES & DOMAIN EXCEPTIONS
 * Subscription States, Plan Definitions, License Entitlements, Invoices,
 * Payments, Audit Trails & Granular Commercial Domain Exceptions.
 * ============================================================================
 */

export type SubscriptionState =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PlanTier = 
  | 'pilot' 
  | 'starter' 
  | 'professional' 
  | 'standard' 
  | 'premium' 
  | 'enterprise' 
  | 'custom';

export type BillingCadence = 'monthly' | 'annual' | 'term_cohort' | 'multi_year';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'VOID' | 'REFUNDED';

export type PaymentMethod =
  | 'NEFT_RTGS'
  | 'NET_BANKING'
  | 'CORPORATE_CARD'
  | 'UPI'
  | 'TREASURY_CHALLAN'
  | 'PURCHASE_ORDER'
  | 'CHEQUE_DD';

export type ReconciliationStatus = 'PENDING' | 'RECONCILED' | 'FAILED' | 'REJECTED' | 'REFUNDED';

export interface FeatureEntitlementsMap {
  basic_internship_management?: boolean;
  student_onboarding?: boolean;
  attendance_tracking?: boolean;
  standard_reporting?: boolean;
  multiple_departments?: boolean;
  advanced_reporting?: boolean;
  enhanced_administrative_controls?: boolean;
  extended_operational_analytics?: boolean;
  custom_domain?: boolean;
  erp_integration?: boolean;
  ai_spoof_detection?: boolean;
  dpdp_dpo_dashboard?: boolean;
  priority_support?: boolean;
  dedicated_sla?: boolean;
  custom_integrations?: boolean;
  export_pdf_reports?: boolean;
  geofence_calibration_support?: boolean;
  [key: string]: boolean | undefined;
}

export interface CreatePlanParams {
  planCode: string;
  name: string;
  description: string;
  tier: PlanTier;
  billingInterval?: BillingCadence;
  basePriceAnnualInr: number;
  basePriceMonthlyInr?: number;
  pricePerAdditionalStudentInr?: number;
  includedActiveStudents: number;
  maxDepartments: number; // -1 for unlimited
  maxFacultyMentors?: number; // -1 for unlimited
  includedStorageBytes?: number;
  featureEntitlements?: Partial<FeatureEntitlementsMap>;
  isActive?: boolean;
}

export interface UpdatePlanParams {
  name?: string;
  description?: string;
  basePriceAnnualInr?: number;
  basePriceMonthlyInr?: number;
  pricePerAdditionalStudentInr?: number;
  billingInterval?: BillingCadence;
  includedActiveStudents?: number;
  maxDepartments?: number;
  maxFacultyMentors?: number;
  includedStorageBytes?: number;
  featureEntitlements?: Partial<FeatureEntitlementsMap>;
  isActive?: boolean;
}

export interface PlanFilterOptions {
  tier?: PlanTier;
  isActive?: boolean;
  search?: string;
}

export interface SaasPlanRecord {
  id: string;
  planCode: string;
  name: string;
  description: string;
  tier: PlanTier;
  billingInterval: BillingCadence;
  basePriceAnnualInr: number;
  basePriceMonthlyInr: number;
  pricePerAdditionalStudentInr: number;
  includedActiveStudents: number;
  maxDepartments: number; // -1 for unlimited
  maxFacultyMentors: number; // -1 for unlimited
  includedStorageBytes: number;
  featureEntitlements: FeatureEntitlementsMap;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionSubscriptionRecord {
  id: string;
  institutionId: string;
  planId: string;
  planCode: string;
  status: SubscriptionState;
  billingCadence: BillingCadence;
  licensedStudentCapacity: number;
  licensedDepartmentCapacity: number; // -1 for unlimited
  licensedMentorCapacity: number; // -1 for unlimited
  startDate: string;
  expiryDate: string;
  renewalDate: string;
  gracePeriodEnd?: string | null;
  autoRenew: boolean;
  contractReference?: string;
  isGrandfathered: boolean;
  grandfatheredTerms?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseEntitlementsRecord {
  id: string;
  institutionId: string;
  subscriptionId: string;
  maxActiveStudents: number;
  bufferStudentAllowance: number; // soft buffer
  maxDepartments: number; // -1 for unlimited
  maxFacultyMentors: number; // -1 for unlimited
  maxGeofenceLocations: number;
  maxStorageBytes: number;
  featureFlags: FeatureEntitlementsMap;
  customOverrides: Record<string, any>;
  isHardCapped: boolean;
  updatedAt: string;
}

export interface SubscriptionInvoiceRecord {
  id: string;
  institutionId: string;
  subscriptionId: string;
  invoiceNumber: string;
  invoiceType: 'PRO_FORMA' | 'TAX_INVOICE' | 'CREDIT_NOTE';
  status: InvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotalInr: number;
  cgstAmountInr: number;
  sgstAmountInr: number;
  igstAmountInr: number;
  totalAmountInr: number;
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  notes?: string;
  createdAt: string;
}

export interface SubscriptionPaymentRecord {
  id: string;
  invoiceId: string;
  institutionId: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  amountPaidInr: number;
  paymentDate: string;
  reconciliationStatus: ReconciliationStatus;
  reconciledAt?: string | null;
  reconciledBy?: string | null;
  notes?: string;
  createdAt: string;
}

export interface SubscriptionAuditLogRecord {
  id: string;
  institutionId: string;
  subscriptionId?: string;
  action:
    | 'SUBSCRIPTION_CREATED'
    | 'STATUS_TRANSITION'
    | 'CAPACITY_UPGRADE'
    | 'PLAN_DOWNGRADE'
    | 'RENEWAL_EXECUTED'
    | 'ENTITLEMENT_OVERRIDE'
    | 'PAYMENT_RECORDED'
    | 'PAYMENT_RECONCILED';
  previousState?: any;
  newState?: any;
  reason?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  timestamp: string;
}

export interface CapacityCheckResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  bufferAllowance: number;
  remainingCapacity: number;
  reason?: string;
}

export interface FeatureCheckResult {
  allowed: boolean;
  featureKey: string;
  institutionId: string;
  reason?: string;
}

// ==============================================================================
// Domain Exceptions for Subscription & Licensing Engine
// ==============================================================================

export class SubscriptionStateException extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionStateException';
  }
}

export class LicensingCapacityException extends Error {
  public readonly statusCode = 403;
  public readonly resourceType: 'student' | 'department' | 'mentor';
  public readonly currentCount: number;
  public readonly maxLimit: number;

  constructor(resourceType: 'student' | 'department' | 'mentor', currentCount: number, maxLimit: number, message?: string) {
    super(message || `Licensing capacity limit reached for ${resourceType} (${currentCount}/${maxLimit}). Upgrade subscription to increase capacity.`);
    this.name = 'LicensingCapacityException';
    this.resourceType = resourceType;
    this.currentCount = currentCount;
    this.maxLimit = maxLimit;
  }
}

export class FeatureNotEntitledException extends Error {
  public readonly statusCode = 403;
  public readonly featureKey: string;

  constructor(featureKey: string, message?: string) {
    super(message || `Feature '${featureKey}' is not included in current subscription entitlements. Upgrade plan to unlock.`);
    this.name = 'FeatureNotEntitledException';
    this.featureKey = featureKey;
  }
}

export class SubscriptionSuspendedException extends Error {
  public readonly statusCode = 403;
  constructor(institutionId: string, reason?: string) {
    super(`Institution '${institutionId}' subscription is SUSPENDED: ${reason || 'Operations frozen by platform administration'}. Read-only audit export is accessible.`);
    this.name = 'SubscriptionSuspendedException';
  }
}

export class SubscriptionExpiredException extends Error {
  public readonly statusCode = 403;
  constructor(institutionId: string, expiryDate?: string) {
    super(`Institution '${institutionId}' subscription EXPIRED on ${expiryDate || 'contract term end'}. Renewal is required to resume operations.`);
    this.name = 'SubscriptionExpiredException';
  }
}

export class SubscriptionCancelledException extends Error {
  public readonly statusCode = 403;
  constructor(institutionId: string) {
    super(`Institution '${institutionId}' subscription is CANCELLED. Contact platform administration for reinstatement.`);
    this.name = 'SubscriptionCancelledException';
  }
}

