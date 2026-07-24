export type Role = 'admin' | 'staff' | 'viewer'

export interface Profile {
  id: string
  full_name: string
  role: Role
  created_at: string
}

export interface Product {
  id: string
  code: string
  name: string
  category: string
  unit: string
  buy_price: number
  sell_price: number
  qty: number
  active: boolean
  created_at: string
}

export interface Partner {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
}

export type TxType = 'in' | 'out'

export interface Transaction {
  id: string
  type: TxType
  partner_name: string
  transaction_date: string // YYYY-MM-DD
  created_by: string | null
  created_at: string
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string | null
  product_name: string
  qty: number
  unit_price: number
  paid: boolean
  paid_at: string | null
  created_at: string
}

// A transaction item flattened with its parent transaction's fields,
// which is the shape most of the UI actually works with.
export interface FlatTxItem {
  item_id: string
  transaction_id: string
  type: TxType
  partner_name: string
  transaction_date: string
  product_id: string | null
  product_name: string
  qty: number
  unit_price: number
  paid: boolean
}

export interface StockAdjustment {
  id: string
  product_id: string | null
  product_name: string
  before_qty: number
  after_qty: number
  adjusted_by: string | null
  created_at: string
}
