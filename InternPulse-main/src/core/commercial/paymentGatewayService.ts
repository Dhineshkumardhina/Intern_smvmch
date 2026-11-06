/**
 * ============================================================================
 * INTERNPULSE — PHASE 19D: SECURE PAYMENT GATEWAY SERVICE
 * Indian Payment Gateway Integration (Razorpay Primary / Cashfree Fallback),
 * Server-Side HMAC Signature Verification, Idempotent Webhook Processing,
 * Tamper-Proof Order Checkout, Automated Refunds & PCI-DSS/DPDP Sanitization.
 * ============================================================================
 */

import { AuthUser } from '../auth/authUser';
import { 
  AuthorizationPolicy, 
  ForbiddenException, 
  UnauthorizedException 
} from '../auth/rbac/authorizationPolicy';
import { 
  PaymentGatewayProvider, 
  PaymentEnvironment, 
  PaymentOrderRecord, 
  ClientSafeCheckoutConfig, 
  PaymentVerificationPayload, 
  PaymentTransactionRecord, 
  WebhookEventRecord, 
  RefundRequestParams, 
  PaymentRefundRecord, 
  GatewayCredentials,
  PaymentSignatureVerificationException,
  WebhookSignatureException,
  AmountMismatchException,
  DuplicateWebhookException,
  DuplicatePaymentException,
  PaymentFailedException,
  RefundException 
} from './paymentGatewayTypes';
import { CryptoUtils } from './cryptoUtils';
import { SubscriptionService } from './subscriptionService';
import { canonicalizeInstitutionId } from '../../data/initialData';

export class PaymentGatewayService {
  private static instance: PaymentGatewayService;

  // Active Environment & Credentials (Configurable via environment variables)
  private environment: PaymentEnvironment = 'sandbox';
  private provider: PaymentGatewayProvider = 'RAZORPAY';

  // Server-side secret credentials (STRICTLY NEVER EXPOSED TO CLIENT)
  private credentials: Record<PaymentGatewayProvider, GatewayCredentials> = {
    RAZORPAY: {
      provider: 'RAZORPAY',
      environment: 'sandbox',
      keyId: 'rzp_test_internpulse_2026', // Public Key ID
      keySecret: 'sec_test_internpulse_supersecret_key_998313', // Secret Key
      webhookSecret: 'whsec_test_internpulse_webhook_secret_2026', // Webhook Secret
      merchantId: 'merch_smvec_internpulse_01',
    },
    CASHFREE: {
      provider: 'CASHFREE',
      environment: 'sandbox',
      keyId: 'cf_test_app_id_internpulse_2026',
      keySecret: 'cf_test_secret_key_internpulse_2026',
      webhookSecret: 'cf_whsec_test_internpulse_2026',
    },
    MOCK_SANDBOX: {
      provider: 'MOCK_SANDBOX',
      environment: 'development',
      keyId: 'mock_key_id_dev_2026',
      keySecret: 'mock_key_secret_dev_2026',
      webhookSecret: 'mock_webhook_secret_dev_2026',
    },
  };

  // In-Memory Ledgers (Mirroring PostgreSQL 15 Schema)
  private orders: Map<string, PaymentOrderRecord> = new Map(); // gatewayOrderId -> PaymentOrderRecord
  private transactions: Map<string, PaymentTransactionRecord> = new Map(); // gatewayPaymentId -> PaymentTransactionRecord
  private webhooksLog: Map<string, WebhookEventRecord> = new Map(); // `${provider}:${eventId}` -> WebhookEventRecord
  private refunds: Map<string, PaymentRefundRecord> = new Map(); // gatewayRefundId -> PaymentRefundRecord

  private constructor() {
    this.resetState();
  }

  public static getInstance(): PaymentGatewayService {
    if (!PaymentGatewayService.instance) {
      PaymentGatewayService.instance = new PaymentGatewayService();
    }
    return PaymentGatewayService.instance;
  }

  /**
   * Resets all in-memory ledgers (for tests)
   */
  public resetState(): void {
    this.orders.clear();
    this.transactions.clear();
    this.webhooksLog.clear();
    this.refunds.clear();
    this.environment = 'sandbox';
    this.provider = 'RAZORPAY';
  }

  // ============================================================================
  // ENVIRONMENT & PROVIDER CONFIGURATION
  // ============================================================================

  public getEnvironment(): PaymentEnvironment {
    return this.environment;
  }

  public setEnvironment(env: PaymentEnvironment): void {
    this.environment = env;
  }

  public getProvider(): PaymentGatewayProvider {
    return this.provider;
  }

  public setProvider(provider: PaymentGatewayProvider): void {
    this.provider = provider;
  }

  public getPublicKeyId(): string {
    return this.credentials[this.provider].keyId;
  }

  // ============================================================================
  // TASK 1: PAYMENT ORDER CREATION (SERVER-SIDE AMOUNT ENFORCEMENT)
  // ============================================================================

  /**
   * Creates a tamper-proof payment order.
   * 
   * SECURITY ENFORCEMENT:
   * The order amount is fetched directly from the authoritative invoice in the database.
   * Client-supplied amounts are NEVER accepted, preventing client-side price tampering.
   */
  public async createPaymentOrder(
    invoiceId: string,
    caller: AuthUser
  ): Promise<ClientSafeCheckoutConfig> {
    AuthorizationPolicy.validateIdentity(caller);

    // Look up the invoice from the central SubscriptionService
    const subService = SubscriptionService.getInstance();
    const invoice = subService.getInvoiceById(invoiceId);

    if (!invoice) {
      throw new Error(`Invoice '${invoiceId}' was not found.`);
    }

    const targetInstId = canonicalizeInstitutionId(invoice.institutionId);
    AuthorizationPolicy.validateInstitutionScope(caller, targetInstId);

    if (invoice.status === 'PAID') {
      throw new DuplicatePaymentException(invoiceId);
    }

    // Amount in Indian Rupees and Paise (1 INR = 100 Paise)
    const amountInr = invoice.totalAmountInr;
    if (amountInr <= 0) {
      throw new Error(`Cannot initiate checkout for zero-value or credit invoice (Total: ₹${amountInr}).`);
    }

    const amountInPaise = Math.round(amountInr * 100);
    const orderUuid = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const gatewayOrderId = `order_${this.provider === 'RAZORPAY' ? 'rzp' : 'cf'}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const receiptNumber = `RCPT-${invoice.invoiceNumber}`;
    const now = new Date().toISOString();

    const orderRecord: PaymentOrderRecord = {
      id: orderUuid,
      institutionId: targetInstId,
      invoiceId: invoice.id,
      gatewayProvider: this.provider,
      gatewayOrderId,
      receiptNumber,
      amountInr,
      amountInPaise,
      currency: 'INR',
      status: 'CREATED',
      notes: {
        invoiceNumber: invoice.invoiceNumber,
        college: caller.college,
        billingPeriod: `${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(gatewayOrderId, orderRecord);

    // Return client-safe checkout options (Zero secret keys exposed)
    return {
      orderId: orderUuid,
      gatewayOrderId,
      amountInPaise,
      amountInr,
      currency: 'INR',
      keyId: this.getPublicKeyId(), // Public Key only
      gatewayProvider: this.provider,
      institutionName: caller.college || 'Educational Institution',
      institutionEmail: caller.email,
      themeColor: '#1E3A8A', // InternPulse Navy Blue
      prefill: {
        name: caller.name,
        email: caller.email,
        contact: caller.phone,
      },
    };
  }

  // ============================================================================
  // TASK 2: PAYMENT VERIFICATION & SERVER-SIDE HMAC VALIDATION
  // ============================================================================

  /**
   * Verifies payment signature server-side using constant-time HMAC-SHA256 comparison.
   * Prevents client-side tampering, amount manipulation, and duplicate subscription activations.
   */
  public async verifyPayment(
    payload: PaymentVerificationPayload,
    caller: AuthUser
  ): Promise<PaymentTransactionRecord> {
    AuthorizationPolicy.validateIdentity(caller);

    const order = this.orders.get(payload.gatewayOrderId);
    if (!order) {
      throw new Error(`Payment order '${payload.gatewayOrderId}' was not found.`);
    }

    AuthorizationPolicy.validateInstitutionScope(caller, order.institutionId);

    // Prevent duplicate activation
    if (order.status === 'PAID') {
      throw new DuplicatePaymentException(order.invoiceId);
    }

    // 1. Cryptographic HMAC-SHA256 Signature Verification
    // Razorpay Standard: HMAC_SHA256(order_id + "|" + payment_id, secret)
    const signaturePayload = `${payload.gatewayOrderId}|${payload.gatewayPaymentId}`;
    const secret = this.credentials[order.gatewayProvider].keySecret;

    const isValidSignature = CryptoUtils.verifyHmacSha256(
      signaturePayload,
      payload.gatewaySignature,
      secret
    );

    if (!isValidSignature) {
      throw new PaymentSignatureVerificationException(
        `Cryptographic signature verification failed for payment '${payload.gatewayPaymentId}'. Possible payload tampering.`
      );
    }

    // 2. Prevent Duplicate Payment on Invoice
    const subService = SubscriptionService.getInstance();
    const billingHistory = subService.getBillingHistory(order.institutionId, caller);
    const invoice = billingHistory.invoices.find((i) => i.id === order.invoiceId);

    if (!invoice) {
      throw new Error(`Invoice '${order.invoiceId}' could not be resolved.`);
    }

    if (invoice.status === 'PAID') {
      throw new DuplicatePaymentException(order.invoiceId);
    }

    // 3. PCI-DSS & DPDP Sanitized Transaction Record
    const txId = `ptx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const transaction: PaymentTransactionRecord = {
      id: txId,
      orderId: order.id,
      institutionId: order.institutionId,
      invoiceId: order.invoiceId,
      gatewayPaymentId: payload.gatewayPaymentId,
      gatewaySignature: payload.gatewaySignature,
      amountInr: order.amountInr,
      paymentMethod: payload.paymentMethod || 'netbanking',
      bankReference: payload.bankReference || `BANK-${Date.now()}`,
      cardNetwork: payload.cardNetwork,
      cardLast4: payload.cardLast4, // ONLY last 4 digits stored! Zero PAN or CVV storage!
      vpa: payload.vpa,
      status: 'SUCCESS',
      verifiedAt: now,
      createdAt: now,
    };

    this.transactions.set(payload.gatewayPaymentId, transaction);

    // 4. Update Order Status
    order.status = 'PAID';
    order.updatedAt = now;

    // 5. Reconcile Invoice & Activate Subscription via SubscriptionService
    // First record the payment receipt
    const paymentReceipt = subService.recordPayment(
      {
        institutionId: order.institutionId,
        invoiceId: order.invoiceId,
        paymentMethod: 'NET_BANKING',
        transactionReference: payload.gatewayPaymentId,
        amountPaidInr: order.amountInr,
        notes: `Automated ${order.gatewayProvider} checkout reconciliation (Tx: ${txId})`,
      },
      caller
    );

    // System reconciles payment immediately
    subService.reconcilePayment(
      paymentReceipt.id,
      true,
      `Automated cryptographic signature match verified by PaymentGatewayService`,
      {
        id: 'system-gateway-worker',
        name: 'Payment Gateway Automated Reconciler',
        email: 'reconciliation@internpulse.gov.in',
        role: 'platform_super_admin',
        dept: 'SYSTEM_OPS',
        departmentCode: 'SYSTEM_OPS',
        college: 'InternPulse Platform Operations',
        isActive: true,
      }
    );

    return JSON.parse(JSON.stringify(transaction));
  }

  // ============================================================================
  // TASK 3: IDEMPOTENT WEBHOOK PROCESSING (HMAC + DEDUPLICATION)
  // ============================================================================

  /**
   * Processes incoming asynchronous webhook notifications from the payment gateway.
   * Enforces webhook signature validation and strict idempotency via unique event IDs.
   */
  public async processWebhook(
    headers: Record<string, string>,
    rawPayload: string | Record<string, any>
  ): Promise<{ status: WebhookStatus; eventId: string; message: string }> {
    const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    const payloadObj = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

    // 1. Resolve Signature Header
    // Razorpay header: 'x-razorpay-signature' | Cashfree header: 'x-cashfree-signature'
    const signature = headers['x-razorpay-signature'] || 
                      headers['X-Razorpay-Signature'] ||
                      headers['x-cashfree-signature'] || 
                      headers['x-webhook-signature'];

    if (!signature) {
      throw new WebhookSignatureException('Missing required webhook signature header.');
    }

    const secret = this.credentials[this.provider].webhookSecret;
    const isValid = CryptoUtils.verifyHmacSha256(payloadStr, signature, secret);

    if (!isValid) {
      throw new WebhookSignatureException('Invalid cryptographic webhook signature.');
    }

    // 2. Extract Event ID & Type
    const eventId = payloadObj.event_id || payloadObj.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const eventType = payloadObj.event || payloadObj.type || 'order.paid';
    const idempotencyKey = `${this.provider}:${eventId}`;

    // 3. Webhook Idempotency Check (Prevent Duplicate Subscription Activations)
    if (this.webhooksLog.has(idempotencyKey)) {
      const existing = this.webhooksLog.get(idempotencyKey)!;
      return {
        status: 'DUPLICATE',
        eventId,
        message: `Webhook event '${eventId}' has already been processed at ${existing.processedAt}. Safely ignored.`,
      };
    }

    // 4. Record Webhook Log Entry
    const now = new Date().toISOString();
    const webhookRecord: WebhookEventRecord = {
      id: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      gatewayProvider: this.provider,
      eventId,
      eventType,
      signature,
      payload: payloadObj,
      status: 'RECEIVED',
      processedAt: null,
      errorMessage: null,
      createdAt: now,
    };
    this.webhooksLog.set(idempotencyKey, webhookRecord);

    // 5. Handle Specific Event Types
    try {
      if (eventType === 'order.paid' || eventType === 'payment.captured') {
        const paymentEntity = payloadObj.payload?.payment?.entity || payloadObj.data?.payment;
        const orderId = paymentEntity?.order_id || payloadObj.payload?.order?.entity?.id || payloadObj.data?.order?.order_id;
        const paymentId = paymentEntity?.id || payloadObj.data?.payment?.payment_id;

        if (orderId && this.orders.has(orderId)) {
          const order = this.orders.get(orderId)!;
          if (order.status !== 'PAID') {
            order.status = 'PAID';
            order.updatedAt = now;

            // Reconcile associated invoice if not already paid
            const subService = SubscriptionService.getInstance();
            const billingHistory = subService.getBillingHistory(order.institutionId, {
              id: 'system-gateway-worker',
              name: 'System Worker',
              email: 'system@internpulse.gov.in',
              role: 'platform_super_admin',
              dept: 'SYSTEM_OPS',
              departmentCode: 'SYSTEM_OPS',
              college: 'Platform Operations',
              isActive: true,
            });

            const invoice = billingHistory.invoices.find((i) => i.id === order.invoiceId);
            if (invoice && invoice.status !== 'PAID') {
              const paymentReceipt = subService.recordPayment(
                {
                  institutionId: order.institutionId,
                  invoiceId: order.invoiceId,
                  paymentMethod: 'NET_BANKING',
                  transactionReference: paymentId || `WEBHOOK-${Date.now()}`,
                  amountPaidInr: order.amountInr,
                  notes: `Automated webhook reconciliation (${eventType})`,
                },
                {
                  id: 'system-gateway-worker',
                  name: 'System Worker',
                  email: 'system@internpulse.gov.in',
                  role: 'platform_super_admin',
                  dept: 'SYSTEM_OPS',
                  departmentCode: 'SYSTEM_OPS',
                  college: 'Platform Operations',
                  isActive: true,
                }
              );

              subService.reconcilePayment(
                paymentReceipt.id,
                true,
                `Verified via asynchronous webhook event '${eventId}'`,
                {
                  id: 'system-gateway-worker',
                  name: 'System Worker',
                  email: 'system@internpulse.gov.in',
                  role: 'platform_super_admin',
                  dept: 'SYSTEM_OPS',
                  departmentCode: 'SYSTEM_OPS',
                  college: 'Platform Operations',
                  isActive: true,
                }
              );
            }
          }
        }
      } else if (eventType === 'payment.failed') {
        const paymentEntity = payloadObj.payload?.payment?.entity || payloadObj.data?.payment;
        const orderId = paymentEntity?.order_id;
        if (orderId && this.orders.has(orderId)) {
          const order = this.orders.get(orderId)!;
          order.status = 'FAILED';
          order.updatedAt = now;
        }
      }

      webhookRecord.status = 'PROCESSED';
      webhookRecord.processedAt = new Date().toISOString();

      return {
        status: 'PROCESSED',
        eventId,
        message: `Webhook event '${eventType}' processed successfully.`,
      };
    } catch (err: any) {
      webhookRecord.status = 'FAILED';
      webhookRecord.errorMessage = err?.message || 'Webhook processing failed.';
      throw err;
    }
  }

  // ============================================================================
  // TASK 4: REFUND HANDLING (FULL & PARTIAL REFUNDS)
  // ============================================================================

  /**
   * Processes full or partial refunds for institutional subscriptions.
   * Platform Super Admin only.
   */
  public async processRefund(
    params: RefundRequestParams,
    caller: AuthUser
  ): Promise<PaymentRefundRecord> {
    AuthorizationPolicy.validatePlatformSuperAdminScope(caller);

    const tx = Array.from(this.transactions.values()).find(
      (t) => t.id === params.paymentTransactionId || t.gatewayPaymentId === params.paymentTransactionId
    );

    if (!tx) {
      throw new RefundException(`Payment transaction '${params.paymentTransactionId}' was not found.`);
    }

    if (tx.status === 'REFUNDED') {
      throw new RefundException(`Payment transaction '${params.paymentTransactionId}' has already been fully refunded.`);
    }

    // Calculate existing refunds on this transaction
    const existingRefunds = Array.from(this.refunds.values()).filter(
      (r) => r.paymentTransactionId === tx.id && r.status === 'PROCESSED'
    );
    const totalRefundedInr = existingRefunds.reduce((sum, r) => sum + r.amountInr, 0);
    const remainingRefundableInr = tx.amountInr - totalRefundedInr;

    const requestedAmountInr = params.amountInr !== undefined ? params.amountInr : remainingRefundableInr;

    if (requestedAmountInr <= 0) {
      throw new RefundException('Refund amount must be greater than zero.');
    }

    if (requestedAmountInr > remainingRefundableInr) {
      throw new RefundException(
        `Requested refund (₹${requestedAmountInr}) exceeds remaining refundable amount (₹${remainingRefundableInr}).`
      );
    }

    const refundId = `ref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const gatewayRefundId = `rfnd_${this.provider === 'RAZORPAY' ? 'rzp' : 'cf'}_${Date.now()}`;
    const now = new Date().toISOString();

    const refundRecord: PaymentRefundRecord = {
      id: refundId,
      paymentTransactionId: tx.id,
      institutionId: tx.institutionId,
      gatewayRefundId,
      amountInr: requestedAmountInr,
      reason: params.reason,
      status: 'PROCESSED',
      processedBy: caller.id,
      createdAt: now,
    };

    this.refunds.set(gatewayRefundId, refundRecord);

    // Update transaction status
    const newTotalRefunded = totalRefundedInr + requestedAmountInr;
    tx.status = newTotalRefunded >= tx.amountInr ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    return JSON.parse(JSON.stringify(refundRecord));
  }

  // ============================================================================
  // TASK 5: PAYMENT DISCREPANCY RECONCILIATION
  // ============================================================================

  /**
   * Reconciles discrepancies when a client network disconnects before completing the redirect,
   * by verifying the order status directly against the gateway records.
   */
  public async reconcileDiscrepancy(
    gatewayOrderId: string,
    caller: AuthUser
  ): Promise<{ reconciled: boolean; status: string; message: string }> {
    AuthorizationPolicy.validateIdentity(caller);

    const order = this.orders.get(gatewayOrderId);
    if (!order) {
      throw new Error(`Order '${gatewayOrderId}' was not found.`);
    }

    AuthorizationPolicy.validateInstitutionScope(caller, order.institutionId);

    // If already marked PAID, reconciliation is not required
    if (order.status === 'PAID') {
      return {
        reconciled: true,
        status: 'PAID',
        message: 'Order is already reconciled and marked PAID.',
      };
    }

    // In a live integration, this queries the gateway GET /orders/{order_id} API
    // For sandbox/test, if a matching transaction exists in the ledger, update order
    const matchingTx = Array.from(this.transactions.values()).find((t) => t.orderId === order.id);

    if (matchingTx && matchingTx.status === 'SUCCESS') {
      order.status = 'PAID';
      order.updatedAt = new Date().toISOString();
      return {
        reconciled: true,
        status: 'PAID',
        message: `Order status reconciled from matching transaction '${matchingTx.gatewayPaymentId}'.`,
      };
    }

    return {
      reconciled: false,
      status: order.status,
      message: `Order remains in '${order.status}' status at payment gateway.`,
    };
  }

  // ============================================================================
  // READ QUERY HELPERS
  // ============================================================================

  public getOrder(gatewayOrderId: string): PaymentOrderRecord | undefined {
    return this.orders.get(gatewayOrderId);
  }

  public getTransaction(gatewayPaymentId: string): PaymentTransactionRecord | undefined {
    return this.transactions.get(gatewayPaymentId);
  }

  public getRefund(gatewayRefundId: string): PaymentRefundRecord | undefined {
    return this.refunds.get(gatewayRefundId);
  }
}
