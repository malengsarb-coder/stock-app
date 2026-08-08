-- ============================================================
-- Migration v2 -> v3
-- Run this in your EXISTING project's SQL Editor.
-- ============================================================

-- 1) Purchases become "bills": invoice number + bill-level payment
--    (with discount support), instead of per-line-item paid status.
alter table transactions add column if not exists invoice_no text;
alter table transactions add column if not exists paid boolean not null default false;
alter table transactions add column if not exists paid_amount numeric(12,2);
alter table transactions add column if not exists paid_at timestamptz;

drop policy if exists "transactions_update" on transactions;
create policy "transactions_update" on transactions for update to authenticated using (is_staff_or_admin());

-- 2) Customer receivables become a running-balance ledger: sales add to the
--    balance, rows in this new table (any amount, not tied to one sale) subtract.
create table if not exists customer_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_date date not null default current_date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
alter table customer_payments enable row level security;
drop policy if exists "customer_payments_select" on customer_payments;
drop policy if exists "customer_payments_write" on customer_payments;
create policy "customer_payments_select" on customer_payments for select to authenticated using (true);
create policy "customer_payments_write" on customer_payments for insert to authenticated with check (is_staff_or_admin());

-- ============================================================
-- Note: transaction_items.paid / paid_at from v2 are no longer used by the
-- app (payment now tracked at the transaction/bill level for purchases, and
-- via customer_payments for sales). Safe to leave the columns in place.
-- ============================================================
