create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text,
  address text,
  product_id uuid references products(id) on delete cascade,
  quantity integer not null,
  amount numeric,
  status text default 'Pending',
  notes text,
  created_at timestamptz default now()
);
