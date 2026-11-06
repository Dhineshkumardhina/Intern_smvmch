/**
 * ============================================================================
 * INTERNPULSE — PHASE 19D: SECURE PAYMENT GATEWAY TEST SUITE
 * Comprehensive Verification of Indian Payment Gateway Integration (Razorpay),
 * Server-Side HMAC Signature Verification, Idempotent Webhook Processing,
 * Duplicate Payment Prevention, Partial/Full Refunds, Network Reconciliations,
 * and PCI-DSS / DPDP Zero Cardholder Data Exposure.
 * ============================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PaymentGatewayService, 
  CryptoUtils,
  SubscriptionService,
  PlanManagementService,
  PaymentSignatureVerificationException,
  WebhookSignatureException,
  DuplicatePaymentException,
  RefundException 
} from '../../commercial';
import { AuthUser } from '../authUser';
import { ForbiddenException } from '../rbac/authorizationPolicy';
import { canonicalizeInstitutionId } from '../../../data/initialData';

describe('Phase 19D: Secure Indian Payment Gateway Integration', () => {
  let gatewayService: PaymentGatewayService;
  let subscriptionService: SubscriptionService;
  let planService: PlanManagementService;

  // Platform Super Admin
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

  // Pondicherry Engineering College (PEC - College B)
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

  // Test Invoice ID
  let testInvoiceId: string;
  const testSecret = 'sec_test_internpulse_supersecret_key_998313';
  const testWebhookSecret = 'whsec_test_internpulse_webhook_secret_2026';

  beforeEach(async () => {
    gatewayService = PaymentGatewayService.getInstance();
    subscriptionService = SubscriptionService.getInstance();
    planService = PlanManagementService.getInstance();

    gatewayService.resetState();
    subscriptionService.resetState();
    planService.resetState();

    // Create an active subscription and issued invoice for PEC
    const sub = await subscriptionService.createSubscription(
      {
        institutionId: pecInstId,
        planId: 'COLLEGE_STANDARD', // ₹1,80,000 / year
      },
      platformAdmin
    );

    // Mock an invoice for PEC
    testInvoiceId = `inv-pec-${Date.now()}`;
    (subscriptionService as any).invoices.push({
      id: testInvoiceId,
      institutionId: pecInstId,
      subscriptionId: sub.id,
      invoiceNumber: 'INV-2026-PEC-001',
      invoiceType: 'TAX_INVOICE',
      status: 'ISSUED',
      billingPeriodStart: '2026-06-01',
      billingPeriodEnd: '2027-05-31',
      subtotalInr: 180000,
      cgstAmountInr: 16200,
      sgstAmountInr: 16200,
      igstAmountInr: 0,
      totalAmountInr: 212400, // ₹1,80,000 + 18% GST = ₹2,12,400
      issueDate: '2026-06-01',
      dueDate: '2026-06-30',
      paidDate: null,
      notes: 'PEC Annual College Standard License with 18% GST',
      createdAt: new Date().toISOString(),
    });
  });

  // ============================================================================
  // 1. PAYMENT ORDER CREATION & AMOUNT INTEGRITY
  // ============================================================================
  describe('1. Payment Order Creation & Tamper-Proof Amounts', () => {
    it('1.1 should create a client-safe payment order with server-side amount enforcement', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);

      expect(checkout).toBeDefined();
      expect(checkout.amountInr).toBe(212400); // Authoritative amount from invoice
      expect(checkout.amountInPaise).toBe(21240000); // 21,240,000 Paise
      expect(checkout.currency).toBe('INR');
      expect(checkout.gatewayProvider).toBe('RAZORPAY');
      expect(checkout.keyId).toBe('rzp_test_internpulse_2026'); // Public Key only
      expect(checkout.gatewayOrderId).toMatch(/^order_rzp_/);

      // Verify Secret Key is NEVER exposed in client config
      expect((checkout as any).keySecret).toBeUndefined();
      expect((checkout as any).secret).toBeUndefined();
    });

    it('1.2 should reject payment order creation on already PAID invoices', async () => {
      // Mark invoice as PAID
      const invoice = (subscriptionService as any).invoices.find((i: any) => i.id === testInvoiceId);
      invoice.status = 'PAID';

      await expect(
        gatewayService.createPaymentOrder(testInvoiceId, pecAdmin)
      ).rejects.toThrow(DuplicatePaymentException);
    });

    it('1.3 should prevent cross-tenant order creation', async () => {
      // SMVEC Admin cannot initiate checkout for PEC invoice
      await expect(
        gatewayService.createPaymentOrder(testInvoiceId, smvecAdmin)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // 2. SERVER-SIDE HMAC-SHA256 SIGNATURE VERIFICATION
  // ============================================================================
  describe('2. Server-Side HMAC-SHA256 Signature Verification', () => {
    it('2.1 should verify authentic cryptographic signature and complete payment', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const gatewayPaymentId = `pay_rzp_mock_${Date.now()}`;

      // Generate legitimate HMAC-SHA256 signature: HMAC(order_id + "|" + payment_id, secret)
      const payloadString = `${checkout.gatewayOrderId}|${gatewayPaymentId}`;
      const validSignature = CryptoUtils.generateHmacSha256(payloadString, testSecret);

      const tx = await gatewayService.verifyPayment(
        {
          gatewayOrderId: checkout.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature: validSignature,
          paymentMethod: 'netbanking',
          bankReference: 'HDFC-REF-998811',
        },
        pecAdmin
      );

      expect(tx).toBeDefined();
      expect(tx.status).toBe('SUCCESS');
      expect(tx.amountInr).toBe(212400);

      // Verify invoice marked PAID
      const invoice = (subscriptionService as any).invoices.find((i: any) => i.id === testInvoiceId);
      expect(invoice.status).toBe('PAID');

      // Verify order marked PAID
      const order = gatewayService.getOrder(checkout.gatewayOrderId);
      expect(order?.status).toBe('PAID');
    });

    it('2.2 should reject tampered signature with PaymentSignatureVerificationException', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const gatewayPaymentId = `pay_rzp_mock_${Date.now()}`;

      // Spoofed signature (or wrong secret)
      const spoofedSignature = CryptoUtils.generateHmacSha256(
        `${checkout.gatewayOrderId}|${gatewayPaymentId}`,
        'wrong_attacker_secret'
      );

      await expect(
        gatewayService.verifyPayment(
          {
            gatewayOrderId: checkout.gatewayOrderId,
            gatewayPaymentId,
            gatewaySignature: spoofedSignature,
          },
          pecAdmin
        )
      ).rejects.toThrow(PaymentSignatureVerificationException);

      // Verify invoice remains UNPAID
      const invoice = (subscriptionService as any).invoices.find((i: any) => i.id === testInvoiceId);
      expect(invoice.status).toBe('ISSUED');
    });

    it('2.3 should prevent duplicate verification and double subscription activation', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const gatewayPaymentId = `pay_rzp_mock_${Date.now()}`;
      const validSignature = CryptoUtils.generateHmacSha256(
        `${checkout.gatewayOrderId}|${gatewayPaymentId}`,
        testSecret
      );

      // First verification succeeds
      await gatewayService.verifyPayment(
        {
          gatewayOrderId: checkout.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature: validSignature,
        },
        pecAdmin
      );

      // Second identical verification attempt must be blocked
      await expect(
        gatewayService.verifyPayment(
          {
            gatewayOrderId: checkout.gatewayOrderId,
            gatewayPaymentId,
            gatewaySignature: validSignature,
          },
          pecAdmin
        )
      ).rejects.toThrow(DuplicatePaymentException);
    });
  });

  // ============================================================================
  // 3. PCI-DSS & DPDP CARD CREDENTIAL SANITIZATION
  // ============================================================================
  describe('3. PCI-DSS & DPDP Zero Cardholder Data Exposure', () => {
    it('3.1 should sanitize card data and store only cardLast4 (never full PAN or CVV)', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const gatewayPaymentId = `pay_card_${Date.now()}`;
      const validSignature = CryptoUtils.generateHmacSha256(
        `${checkout.gatewayOrderId}|${gatewayPaymentId}`,
        testSecret
      );

      const tx = await gatewayService.verifyPayment(
        {
          gatewayOrderId: checkout.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature: validSignature,
          paymentMethod: 'card',
          cardNetwork: 'Visa',
          cardLast4: '4242',
        },
        pecAdmin
      );

      expect(tx.cardLast4).toBe('4242');
      expect((tx as any).cardNumber).toBeUndefined();
      expect((tx as any).pan).toBeUndefined();
      expect((tx as any).cvv).toBeUndefined();
      expect((tx as any).expiryMonth).toBeUndefined();
    });
  });

  // ============================================================================
  // 4. IDEMPOTENT WEBHOOK PROCESSING & EVENT DEDUPLICATION
  // ============================================================================
  describe('4. Idempotent Webhook Processing & Resilience', () => {
    it('4.1 should process legitimate webhook with valid HMAC signature', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const eventId = `evt_order_paid_${Date.now()}`;

      const webhookPayload = {
        event_id: eventId,
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: checkout.gatewayOrderId,
              amount: 21240000,
              status: 'paid',
            },
          },
          payment: {
            entity: {
              id: `pay_webhook_${Date.now()}`,
              order_id: checkout.gatewayOrderId,
              amount: 21240000,
              status: 'captured',
            },
          },
        },
      };

      const payloadStr = JSON.stringify(webhookPayload);
      const validSignature = CryptoUtils.generateHmacSha256(payloadStr, testWebhookSecret);

      const result = await gatewayService.processWebhook(
        { 'x-razorpay-signature': validSignature },
        payloadStr
      );

      expect(result.status).toBe('PROCESSED');
      expect(result.eventId).toBe(eventId);

      // Verify order and invoice marked PAID via webhook
      const order = gatewayService.getOrder(checkout.gatewayOrderId);
      expect(order?.status).toBe('PAID');
    });

    it('4.2 should reject webhook with invalid signature', async () => {
      const payloadStr = JSON.stringify({ event: 'order.paid', event_id: 'evt_spoof_01' });

      await expect(
        gatewayService.processWebhook(
          { 'x-razorpay-signature': 'invalid_forged_signature' },
          payloadStr
        )
      ).rejects.toThrow(WebhookSignatureException);
    });

    it('4.3 should handle duplicate webhooks idempotently without double processing', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const eventId = `evt_dedup_${Date.now()}`;

      const webhookPayload = {
        event_id: eventId,
        event: 'order.paid',
        payload: {
          order: { entity: { id: checkout.gatewayOrderId } },
        },
      };

      const payloadStr = JSON.stringify(webhookPayload);
      const signature = CryptoUtils.generateHmacSha256(payloadStr, testWebhookSecret);

      // First delivery: PROCESSED
      const firstResult = await gatewayService.processWebhook(
        { 'x-razorpay-signature': signature },
        payloadStr
      );
      expect(firstResult.status).toBe('PROCESSED');

      // Immediate second delivery: DUPLICATE (safely returns 200 without throwing)
      const secondResult = await gatewayService.processWebhook(
        { 'x-razorpay-signature': signature },
        payloadStr
      );
      expect(secondResult.status).toBe('DUPLICATE');
      expect(secondResult.message).toContain('already been processed');
    });

    it('4.4 should handle delayed webhook where client disconnected before completing redirect', async () => {
      // 1. Order created
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      expect(gatewayService.getOrder(checkout.gatewayOrderId)?.status).toBe('CREATED');

      // 2. Delayed webhook arrives after client window was closed
      const eventId = `evt_delayed_${Date.now()}`;
      const delayedPayload = {
        event_id: eventId,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: `pay_delayed_${Date.now()}`,
              order_id: checkout.gatewayOrderId,
              amount: 21240000,
              status: 'captured',
            },
          },
        },
      };

      const payloadStr = JSON.stringify(delayedPayload);
      const signature = CryptoUtils.generateHmacSha256(payloadStr, testWebhookSecret);

      const result = await gatewayService.processWebhook(
        { 'x-razorpay-signature': signature },
        payloadStr
      );

      expect(result.status).toBe('PROCESSED');
      expect(gatewayService.getOrder(checkout.gatewayOrderId)?.status).toBe('PAID');
    });
  });

  // ============================================================================
  // 5. FULL & PARTIAL REFUND HANDLING
  // ============================================================================
  describe('5. Full & Partial Refund Processing', () => {
    it('5.1 allows Platform Super Admin to execute a partial refund followed by remaining balance', async () => {
      // Setup successful payment (₹2,12,400)
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const gatewayPaymentId = `pay_refund_test_${Date.now()}`;
      const validSig = CryptoUtils.generateHmacSha256(
        `${checkout.gatewayOrderId}|${gatewayPaymentId}`,
        testSecret
      );
      const tx = await gatewayService.verifyPayment(
        {
          gatewayOrderId: checkout.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature: validSig,
        },
        pecAdmin
      );

      // 1. Execute Partial Refund (₹50,000)
      const partialRefund = await gatewayService.processRefund(
        {
          paymentTransactionId: tx.id,
          amountInr: 50000,
          reason: 'Institutional scholarship deduction adjustment',
        },
        platformAdmin
      );

      expect(partialRefund.amountInr).toBe(50000);
      expect(partialRefund.status).toBe('PROCESSED');

      const txAfterPartial = gatewayService.getTransaction(gatewayPaymentId);
      expect(txAfterPartial?.status).toBe('PARTIALLY_REFUNDED');

      // 2. Execute Remaining Refund (₹1,62,400)
      const remainingRefund = await gatewayService.processRefund(
        {
          paymentTransactionId: tx.id,
          amountInr: 162400,
          reason: 'Course cancellation refund',
        },
        platformAdmin
      );

      expect(remainingRefund.amountInr).toBe(162400);
      const txAfterFull = gatewayService.getTransaction(gatewayPaymentId);
      expect(txAfterFull?.status).toBe('REFUNDED');
    });

    it('5.2 should reject refund exceeding the transaction balance', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const gatewayPaymentId = `pay_excess_${Date.now()}`;
      const validSig = CryptoUtils.generateHmacSha256(
        `${checkout.gatewayOrderId}|${gatewayPaymentId}`,
        testSecret
      );
      const tx = await gatewayService.verifyPayment(
        {
          gatewayOrderId: checkout.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature: validSig,
        },
        pecAdmin
      );

      // Attempting to refund ₹300,000 on a ₹212,400 payment
      await expect(
        gatewayService.processRefund(
          {
            paymentTransactionId: tx.id,
            amountInr: 300000,
            reason: 'Excess refund test',
          },
          platformAdmin
        )
      ).rejects.toThrow(RefundException);
    });

    it('5.3 should reject refund initiation by non-Platform Super Admins', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);
      const gatewayPaymentId = `pay_unauth_${Date.now()}`;
      const validSig = CryptoUtils.generateHmacSha256(
        `${checkout.gatewayOrderId}|${gatewayPaymentId}`,
        testSecret
      );
      const tx = await gatewayService.verifyPayment(
        {
          gatewayOrderId: checkout.gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature: validSig,
        },
        pecAdmin
      );

      // College Principal cannot execute refunds (Restricted to Platform Finance Ops)
      await expect(
        gatewayService.processRefund(
          {
            paymentTransactionId: tx.id,
            amountInr: 10000,
            reason: 'Unauthorized refund test',
          },
          pecAdmin
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // 6. NETWORK INTERRUPTION RECONCILIATION
  // ============================================================================
  describe('6. Network Interruption & Discrepancy Reconciliation', () => {
    it('6.1 should reconcile order discrepancy when network drops out', async () => {
      const checkout = await gatewayService.createPaymentOrder(testInvoiceId, pecAdmin);

      // Simulate network dropped prior to redirect
      const checkResult = await gatewayService.reconcileDiscrepancy(
        checkout.gatewayOrderId,
        pecAdmin
      );

      expect(checkResult.reconciled).toBe(false);
      expect(checkResult.status).toBe('CREATED');
    });
  });
});

