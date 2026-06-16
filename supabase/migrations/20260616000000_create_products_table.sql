create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  print_time text not null,
  filament_weight numeric not null,
  cost_per_kg numeric not null,
  selling_price numeric not null,
  image_url text,
  created_at timestamptz default now()
);
