-- ============================================================
-- Migration v1 -> v2
-- Run this in your EXISTING project's SQL Editor (the one you
-- already set up). Safe to run once; do not run schema.sql again.
-- ============================================================

-- 1) Supplier can now be linked to specific products at a specific price
create table if not exists supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (supplier_id, product_id)
);

alter table supplier_products enable row level security;

drop policy if exists "supplier_products_select" on supplier_products;
drop policy if exists "supplier_products_write" on supplier_products;
drop policy if exists "supplier_products_update" on supplier_products;
drop policy if exists "supplier_products_delete" on supplier_products;

create policy "supplier_products_select" on supplier_products for select to authenticated using (true);
create policy "supplier_products_write" on supplier_products for insert to authenticated with check (is_staff_or_admin());
create policy "supplier_products_update" on supplier_products for update to authenticated using (is_staff_or_admin());
create policy "supplier_products_delete" on supplier_products for delete to authenticated using (is_staff_or_admin());

-- 2) suppliers can be marked active/inactive
alter table suppliers add column if not exists active boolean not null default true;

-- 3) transactions: remember which supplier/customer row was picked (nullable --
--    still supports free-typed customer names that aren't in Master)
alter table transactions add column if not exists partner_id uuid;

-- 4) products.code no longer has to be unique/required the same way -- relax
--    the not-null if your original schema had one (safe no-op if already nullable)
alter table products alter column code drop not null;

-- 5) Only Admin may edit/adjust an existing product row (adding new ones is
--    still open to any staff, since the Supplier form can create products inline)
drop policy if exists "products_update" on products;
drop policy if exists "products_update_admin" on products;
create policy "products_update_admin" on products for update to authenticated using (is_admin());

-- ============================================================
-- Nothing else to do -- the stock_adjustments table from v1 is no longer
-- used by the app (adjustment history was intentionally dropped). You can
-- leave it in place harmlessly, or remove it with:
--   drop table if exists stock_adjustments;
-- ============================================================
