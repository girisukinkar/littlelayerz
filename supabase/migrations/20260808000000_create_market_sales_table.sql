-- Create market_sales table for stall items sold & rough invoicing
CREATE TABLE IF NOT EXISTS public.market_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_profit numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'UPI',
  customer_name text,
  customer_phone text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.market_sales ENABLE ROW LEVEL SECURITY;

-- Setup Public Access Policies
DROP POLICY IF EXISTS "Allow public read access on market_sales" ON public.market_sales;
CREATE POLICY "Allow public read access on market_sales"
ON public.market_sales FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert access on market_sales" ON public.market_sales;
CREATE POLICY "Allow public insert access on market_sales"
ON public.market_sales FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on market_sales" ON public.market_sales;
CREATE POLICY "Allow public update access on market_sales"
ON public.market_sales FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on market_sales" ON public.market_sales;
CREATE POLICY "Allow public delete access on market_sales"
ON public.market_sales FOR DELETE
USING (true);
