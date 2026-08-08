export type Role = 'admin' | 'staff' | 'viewer'

export interface Profile {
  id: string
  full_name: string
  role: Role
}

export interface Product {
  id: string
  code: string | null
  name: string
  category: string
  unit: string
  buy_price: number
  sell_price: number
  qty: number
  active: boolean
}

export interface Supplier {
  id: string
  name: string
  phone: string | null
  active: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string | null
}

export interface SupplierProductLink {
  product_id: string
  price: number
}

export type TxType = 'in' | 'out'

export interface TxItem {
  id: string
  product_id: string | null
  product_name: string
  qty: number
  unit_price: number
}

export interface Transaction {
  id: string
  type: TxType
  partner_id: string | null
  partner_name: string
  invoice_no: string | null
  transaction_date: string
  paid: boolean
  paid_amount: number | null
  items: TxItem[]
}

export interface CustomerPayment {
  id: string
  customer_id: string
  amount: number
  payment_date: string
}

export type LedgerEntry =
  | { kind: 'sale'; date: string; amount: number; items: TxItem[] }
  | { kind: 'payment'; date: string; amount: number }
