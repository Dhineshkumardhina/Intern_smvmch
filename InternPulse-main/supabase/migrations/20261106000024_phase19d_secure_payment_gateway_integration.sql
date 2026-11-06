-- =====================================================================================
-- Migration: 20261106000024_phase19d_secure_payment_gateway_integration.sql
-- Description: Phase 19D: Secure Indian Payment Gateway Integration, Payment Orders,
--              HMAC Signatures, Idempotent Webhook Ledger & PCI/DPDP Safe Auditing
-- Target: PostgreSQL 15+ / Supabase Multi-Tenant SaaS
-- Date: 2026-11-06
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. PAYMENT ORDERS TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.subscription_invoices(id) ON DELETE CASCADE,
    gateway_provider VARCHAR(30) NOT NULL CHECK (gateway_provider IN ('RAZORPAY', 'CASHFREE', 'MOCK_SANDBOX')),
    gateway_order_id VARCHAR(100) NOT NULL UNIQUE,
    receipt_number VARCHAR(100) NOT NULL,
    amount_inr NUMERIC(12, 2) NOT NULL CHECK (amount_inr > 0),
    amount_in_paise BIGINT NOT NULL CHECK (amount_in_paise > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR', 'USD')),
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED' CHECK (
        status IN ('CREATED', 'ATTEMPTED', 'PAID', 'FAILED', 'EXPIRED')
    ),
    notes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_inst ON public.payment_orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_inv ON public.payment_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_gateway_id ON public.payment_orders(gateway_order_id);

-- -------------------------------------------------------------------------------------
-- 2. PAYMENT TRANSACTIONS TABLE (PCI-DSS & DPDP Sanitized: Zero Cardholder Data)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.payment_orders(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    invoice_id UUID NOT NULL REFERENCES public.subscription_invoices(id) ON DELETE RESTRICT,
    gateway_payment_id VARCHAR(100) NOT NULL UNIQUE,
    gateway_signature VARCHAR(255) NOT NULL,
    amount_inr NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (
        payment_method IN ('netbanking', 'card', 'upi', 'emandate', 'bank_transfer', 'wallet')
    ),
    bank_reference VARCHAR(150),
    card_network VARCHAR(50), -- E.g. 'Visa', 'Mastercard', 'RuPay'
    card_last4 VARCHAR(4),    -- Only last 4 digits allowed! Zero PAN or CVV storage!
    vpa VARCHAR(150),         -- Masked UPI ID (e.g., 'dean@sbi')
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
    error_code VARCHAR(100),
    error_description TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_inst ON public.payment_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_pay ON public.payment_transactions(gateway_payment_id);

-- -------------------------------------------------------------------------------------
-- 3. IDEMPOTENT WEBHOOK LEDGER TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_webhooks_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_provider VARCHAR(30) NOT NULL CHECK (gateway_provider IN ('RAZORPAY', 'CASHFREE', 'MOCK_SANDBOX')),
    event_id VARCHAR(150) NOT NULL, -- Gateway Unique Event ID
    event_type VARCHAR(100) NOT NULL, -- E.g. 'order.paid', 'payment.captured', 'payment.failed'
    signature VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED' CHECK (
        status IN ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED', 'SIGNATURE_INVALID')
    ),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_payment_webhook_event UNIQUE (gateway_provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event ON public.payment_webhooks_log(gateway_provider, event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON public.payment_webhooks_log(status);

-- -------------------------------------------------------------------------------------
-- 4. PAYMENT REFUNDS TABLE
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_transaction_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    gateway_refund_id VARCHAR(100) NOT NULL UNIQUE,
    amount_inr NUMERIC(12, 2) NOT NULL CHECK (amount_inr > 0),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
    processed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_tx ON public.payment_refunds(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_inst ON public.payment_refunds(institution_id);

-- -------------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

-- payment_orders: Institution Admin can view own tenant orders; Platform Admin has full access
CREATE POLICY "payment_orders_select"
ON public.payment_orders FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

CREATE POLICY "payment_orders_admin_modify"
ON public.payment_orders FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- payment_transactions: Institution Admin can view receipts; Platform Admin manages
CREATE POLICY "payment_transactions_select"
ON public.payment_transactions FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

CREATE POLICY "payment_transactions_admin_modify"
ON public.payment_transactions FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- payment_webhooks_log: Platform Super Admin ONLY
CREATE POLICY "payment_webhooks_platform_admin"
ON public.payment_webhooks_log FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

-- payment_refunds: Institution Admin can view own refunds; Platform Admin manages
CREATE POLICY "payment_refunds_select"
ON public.payment_refunds FOR SELECT TO authenticated
USING (
    public.is_platform_super_admin() OR
    (institution_id = public.get_auth_user_institution_id() AND public.is_institution_admin(institution_id))
);

CREATE POLICY "payment_refunds_admin_modify"
ON public.payment_refunds FOR ALL TO authenticated
USING (public.is_platform_super_admin())
WITH CHECK (public.is_platform_super_admin());

