create table quotations (
  id uuid primary key default gen_random_uuid(),
  quote_ref text not null,
  client_name text not null,
  items jsonb not null,
  total_amount numeric not null,
  created_at timestamptz default now()
);
