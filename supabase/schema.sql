-- ============================================================
-- Stock In/Out System v2 - Full database schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- (For an EXISTING project that already ran v1 schema.sql, use
--  migration_v2.sql instead -- do not re-run this file.)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin','staff','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  category text not null default 'ทั่วไป',
  unit text not null default '',
  buy_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  qty numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  created_at timestamptz not null default now()
);

-- Which products a supplier sells us, and at what price (can differ per supplier)
create table if not exists supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (supplier_id, product_id)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('in','out')), -- in = ซื้อจาก supplier, out = ขายให้ customer
  partner_id uuid, -- supplier id (type=in) or customer id (type=out); null when a free-typed name was used
  partner_name text not null,
  transaction_date date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  qty numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Auto-create a profile row on signup ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper functions for RLS ----------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff'));
$$;

-- ---------- Row Level Security ----------

alter table profiles enable row level security;
alter table products enable row level security;
alter table suppliers enable row level security;
alter table customers enable row level security;
alter table supplier_products enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;

create policy "profiles_select_all" on profiles for select to authenticated using (true);
create policy "profiles_update_self_name" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_update_admin" on profiles for update to authenticated
  using (is_admin()) with check (true);

-- products: everyone signed in can read and add; only ADMIN can edit/adjust existing rows
create policy "products_select" on products for select to authenticated using (true);
create policy "products_insert" on products for insert to authenticated with check (is_staff_or_admin());
create policy "products_update_admin" on products for update to authenticated using (is_admin());

create policy "suppliers_select" on suppliers for select to authenticated using (true);
create policy "suppliers_write" on suppliers for insert to authenticated with check (is_staff_or_admin());
create policy "suppliers_update" on suppliers for update to authenticated using (is_staff_or_admin());

create policy "customers_select" on customers for select to authenticated using (true);
create policy "customers_write" on customers for insert to authenticated with check (is_staff_or_admin());
create policy "customers_update" on customers for update to authenticated using (is_staff_or_admin());

create policy "supplier_products_select" on supplier_products for select to authenticated using (true);
create policy "supplier_products_write" on supplier_products for insert to authenticated with check (is_staff_or_admin());
create policy "supplier_products_update" on supplier_products for update to authenticated using (is_staff_or_admin());
create policy "supplier_products_delete" on supplier_products for delete to authenticated using (is_staff_or_admin());

create policy "transactions_select" on transactions for select to authenticated using (true);
create policy "transactions_write" on transactions for insert to authenticated with check (is_staff_or_admin());

create policy "transaction_items_select" on transaction_items for select to authenticated using (true);
create policy "transaction_items_write" on transaction_items for insert to authenticated with check (is_staff_or_admin());
create policy "transaction_items_update" on transaction_items for update to authenticated using (is_staff_or_admin());

-- ============================================================
-- After running this file:
-- 1. Authentication -> Users -> create your login (Auto Confirm on).
-- 2. SQL Editor:
--      update profiles set role = 'admin' where id = '<the new user''s UUID>';
-- ============================================================
