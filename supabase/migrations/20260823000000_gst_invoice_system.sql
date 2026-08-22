-- Migration: 20260823000000_gst_invoice_system.sql
-- Description: Complete GST Invoicing & Accounting Schema with RLS and Indexes

-- 1. Businesses Table (Profiles)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'My Business',
    logo_url TEXT,
    address TEXT,
    city TEXT,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    state_code TEXT NOT NULL DEFAULT '27',
    pincode TEXT,
    gstin TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    upi_id TEXT,
    upi_qr_url TEXT,
    instagram_handle TEXT,
    whatsapp_number TEXT,
    facebook_handle TEXT,
    twitter_handle TEXT,
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    bank_branch TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV',
    default_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    default_notes TEXT DEFAULT 'Thank you for your business!',
    default_terms TEXT DEFAULT 'Goods once sold will not be returned unless damaged upon delivery.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. GST Customers Table
CREATE TABLE IF NOT EXISTS public.gst_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    city TEXT,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    state_code TEXT NOT NULL DEFAULT '27',
    pincode TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. GST Products Master Table
CREATE TABLE IF NOT EXISTS public.gst_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    hsn_sac TEXT,
    default_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    default_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    description TEXT,
    category TEXT,
    unit TEXT NOT NULL DEFAULT 'PCS',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. GST Invoices Table (With Immutable Snapshots)
CREATE TABLE IF NOT EXISTS public.gst_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.gst_customers(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    is_draft BOOLEAN NOT NULL DEFAULT false,
    place_of_supply TEXT NOT NULL,
    place_of_supply_state_code TEXT NOT NULL,
    is_inter_state BOOLEAN NOT NULL DEFAULT false,
    
    -- Immutable Historical Snapshots
    seller_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    billing_address TEXT,
    shipping_address TEXT,
    
    -- Monetary & Tax Computations
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    item_discount_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    invoice_discount_type TEXT NOT NULL DEFAULT 'fixed',
    invoice_discount_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    invoice_discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    shipping_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    shipping_gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_gst NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    rounding_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_in_words TEXT NOT NULL DEFAULT '',
    
    -- Payment Details
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    payment_method TEXT,
    
    -- Metadata
    notes TEXT,
    terms TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_invoice_number_per_business UNIQUE (business_id, invoice_number)
);

-- 5. GST Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.gst_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.gst_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.gst_products(id) ON DELETE SET NULL,
    
    -- Immutable Snapshot Properties
    product_name_snapshot TEXT NOT NULL,
    description_snapshot TEXT,
    hsn_sac_snapshot TEXT,
    
    -- Quantity & Pricing
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    unit TEXT NOT NULL DEFAULT 'PCS',
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    
    -- Item Discount
    discount_type TEXT NOT NULL DEFAULT 'fixed',
    discount_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    
    -- Tax Calculations
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. GST Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.gst_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.gst_invoices(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'upi',
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Invoice Sequences
CREATE TABLE IF NOT EXISTS public.gst_invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    prefix TEXT NOT NULL DEFAULT 'INV',
    next_number INT NOT NULL DEFAULT 1,
    fiscal_year TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_business_seq UNIQUE (business_id, prefix)
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_gst_invoices_business_date ON public.gst_invoices(business_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_customer ON public.gst_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_gst_invoices_status ON public.gst_invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_gst_invoice_items_invoice ON public.gst_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_gst_customers_business ON public.gst_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_gst_products_business ON public.gst_products(business_id);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_invoice_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies allowing authorized access
DROP POLICY IF EXISTS "Allow business access" ON public.businesses;
CREATE POLICY "Allow business access" ON public.businesses
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow gst_customers access" ON public.gst_customers;
CREATE POLICY "Allow gst_customers access" ON public.gst_customers
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow gst_products access" ON public.gst_products;
CREATE POLICY "Allow gst_products access" ON public.gst_products
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow gst_invoices access" ON public.gst_invoices;
CREATE POLICY "Allow gst_invoices access" ON public.gst_invoices
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow gst_invoice_items access" ON public.gst_invoice_items;
CREATE POLICY "Allow gst_invoice_items access" ON public.gst_invoice_items
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow gst_payments access" ON public.gst_payments;
CREATE POLICY "Allow gst_payments access" ON public.gst_payments
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow gst_invoice_sequences access" ON public.gst_invoice_sequences;
CREATE POLICY "Allow gst_invoice_sequences access" ON public.gst_invoice_sequences
FOR ALL USING (true) WITH CHECK (true);
