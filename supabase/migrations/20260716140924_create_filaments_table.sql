create table filaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color_hex text not null default '#ffffff',
  color_name text not null,
  type text not null,
  cost_per_kg numeric not null,
  purchase_price numeric not null,
  grams_left numeric not null,
  has_spool boolean not null default true,
  created_at timestamptz default now()
);
