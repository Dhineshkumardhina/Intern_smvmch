/**
 * ============================================================================
 * INTERNPULSE — PHASE 19D: PAYMENT GATEWAY TYPES & EXCEPTIONS
 * Data Contracts, Checkout Configurations, PCI-DSS / DPDP Sanitized Ledgers,
 * Webhook Event Payloads & Security Domain Exceptions.
 * ============================================================================
 */

export type PaymentGatewayProvider = 'RAZORPAY' | 'CASHFREE' | 'MOCK_SANDBOX';

export type PaymentEnvironment = 'development' | 'sandbox' | 'production';

export type PaymentOrderStatus = 'CREATED' | 'ATTEMPTED' | 'PAID' | 'FAILED' | 'EXPIRED';

export type PaymentTransactionStatus = 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type WebhookStatus = 'RECEIVED' | 'PROCESSED' | 'DUPLICATE' | 'FAILED' | 'SIGNATURE_INVALID';

export interface PaymentOrderRecord {
  id: string;
  institutionId: string;
  invoiceId: string;
  gatewayProvider: PaymentGatewayProvider;
  gatewayOrderId: string;
  receiptNumber: string;
  amountInr: number;
  amountInPaise: number;
  currency: 'INR' | 'USD';
  status: PaymentOrderStatus;
  notes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSafeCheckoutConfig {
  orderId: string;
  gatewayOrderId: string;
  amountInPaise: number;
  amountInr: number;
  currency: 'INR' | 'USD';
  keyId: string; // PUBLIC KEY ONLY - Secret key NEVER exposed!
  gatewayProvider: PaymentGatewayProvider;
  institutionName: string;
  institutionEmail: string;
  themeColor: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface PaymentVerificationPayload {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
  paymentMethod?: 'netbanking' | 'card' | 'upi' | 'emandate' | 'bank_transfer' | 'wallet';
  cardNetwork?: string;
  cardLast4?: string; // Only last 4 digits allowed!
  vpa?: string; // UPI VPA (e.g., 'principal@sbi')
  bankReference?: string;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  institutionId: string;
  invoiceId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
  amountInr: number;
  paymentMethod: 'netbanking' | 'card' | 'upi' | 'emandate' | 'bank_transfer' | 'wallet';
  bankReference?: string;
  cardNetwork?: string;
  cardLast4?: string; // Sanitized: Zero PAN or CVV storage
  vpa?: string;
  status: PaymentTransactionStatus;
  errorCode?: string;
  errorDescription?: string;
  verifiedAt: string;
  createdAt: string;
}

export interface WebhookEventRecord {
  id: string;
  gatewayProvider: PaymentGatewayProvider;
  eventId: string;
  eventType: string;
  signature: string;
  payload: Record<string, any>;
  status: WebhookStatus;
  processedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface RefundRequestParams {
  paymentTransactionId: string;
  amountInr?: number; // Optional for partial refund; full refund if omitted
  reason: string;
}

export interface PaymentRefundRecord {
  id: string;
  paymentTransactionId: string;
  institutionId: string;
  gatewayRefundId: string;
  amountInr: number;
  reason: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  processedBy?: string;
  createdAt: string;
}

export interface GatewayCredentials {
  provider: PaymentGatewayProvider;
  environment: PaymentEnvironment;
  keyId: string;
  keySecret: string; // Strictly server-side
  webhookSecret: string; // Strictly server-side
  merchantId?: string;
}

// ==============================================================================
// Domain Exceptions for Payment Gateway Engine
// ==============================================================================

export class PaymentSignatureVerificationException extends Error {
  public readonly statusCode = 400;
  constructor(message = 'Payment signature verification failed. Possible payload tampering detected.') {
    super(message);
    this.name = 'PaymentSignatureVerificationException';
  }
}

export class WebhookSignatureException extends Error {
  public readonly statusCode = 401;
  constructor(message = 'Invalid webhook signature. Request rejected as untrusted.') {
    super(message);
    this.name = 'WebhookSignatureException';
  }
}

export class AmountMismatchException extends Error {
  public readonly statusCode = 400;
  constructor(expected: number, received: number) {
    super(`Payment amount mismatch detected. Expected ₹${expected}, received ₹${received}. Transaction aborted.`);
    this.name = 'AmountMismatchException';
  }
}

export class DuplicateWebhookException extends Error {
  public readonly statusCode = 200; // Return 200 to gateway so it does not retry
  constructor(eventId: string) {
    super(`Webhook event '${eventId}' has already been processed.`);
    this.name = 'DuplicateWebhookException';
  }
}

export class DuplicatePaymentException extends Error {
  public readonly statusCode = 409;
  constructor(invoiceId: string) {
    super(`Invoice '${invoiceId}' is already paid. Duplicate payment rejected.`);
    this.name = 'DuplicatePaymentException';
  }
}

export class PaymentFailedException extends Error {
  public readonly statusCode = 402;
  public readonly errorCode?: string;
  constructor(message: string, errorCode?: string) {
    super(message);
    this.name = 'PaymentFailedException';
    this.errorCode = errorCode;
  }
}

export class RefundException extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'RefundException';
  }
}

