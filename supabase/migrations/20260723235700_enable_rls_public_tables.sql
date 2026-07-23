-- Enable Row Level Security (RLS) on public tables to resolve Supabase security warning
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filaments ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'products' table
DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;
CREATE POLICY "Allow public read access on products"
ON public.products FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert access on products" ON public.products;
CREATE POLICY "Allow public insert access on products"
ON public.products FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on products" ON public.products;
CREATE POLICY "Allow public update access on products"
ON public.products FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on products" ON public.products;
CREATE POLICY "Allow public delete access on products"
ON public.products FOR DELETE
USING (true);

-- 2. Policies for 'orders' table
DROP POLICY IF EXISTS "Allow public read access on orders" ON public.orders;
CREATE POLICY "Allow public read access on orders"
ON public.orders FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert access on orders" ON public.orders;
CREATE POLICY "Allow public insert access on orders"
ON public.orders FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on orders" ON public.orders;
CREATE POLICY "Allow public update access on orders"
ON public.orders FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on orders" ON public.orders;
CREATE POLICY "Allow public delete access on orders"
ON public.orders FOR DELETE
USING (true);

-- 3. Policies for 'quotations' table
DROP POLICY IF EXISTS "Allow public read access on quotations" ON public.quotations;
CREATE POLICY "Allow public read access on quotations"
ON public.quotations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert access on quotations" ON public.quotations;
CREATE POLICY "Allow public insert access on quotations"
ON public.quotations FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on quotations" ON public.quotations;
CREATE POLICY "Allow public update access on quotations"
ON public.quotations FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on quotations" ON public.quotations;
CREATE POLICY "Allow public delete access on quotations"
ON public.quotations FOR DELETE
USING (true);

-- 4. Policies for 'filaments' table
DROP POLICY IF EXISTS "Allow public read access on filaments" ON public.filaments;
CREATE POLICY "Allow public read access on filaments"
ON public.filaments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert access on filaments" ON public.filaments;
CREATE POLICY "Allow public insert access on filaments"
ON public.filaments FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access on filaments" ON public.filaments;
CREATE POLICY "Allow public update access on filaments"
ON public.filaments FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access on filaments" ON public.filaments;
CREATE POLICY "Allow public delete access on filaments"
ON public.filaments FOR DELETE
USING (true);
