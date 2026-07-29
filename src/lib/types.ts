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

export interface SupplierProduct {
  id: string
  supplier_id: string
  product_id: string
  price: number
}

export type TxType = 'in' | 'out'

export interface FlatTxItem {
  item_id: string
  transaction_id: string
  type: TxType
  partner_id: string | null
  partner_name: string
  transaction_date: string
  product_id: string | null
  product_name: string
  qty: number
  unit_price: number
  paid: boolean
}
