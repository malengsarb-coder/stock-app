import { useEffect, useState, useCallback } from 'react'
import { ShoppingCart, Truck, Pencil, Clock, CheckCircle2, Store, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtMoney, todayIso } from '../lib/format'
import type { Product, Supplier, Customer, FlatTxItem, TxType } from '../lib/types'
import BackButton from '../components/BackButton'
import BuyModal from '../components/BuyModal'
import SellModal from '../components/SellModal'

export default function TradeView({ onBack }: { onBack: () => void }) {
  const { isAdmin, session } = useAuth()
  const [date, setDate] = useState(todayIso())
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [items, setItems] = useState<FlatTxItem[]>([])
  const [loading, setLoading] = useState(true)

  const [showBuy, setShowBuy] = useState(false)
  const [showSell, setShowSell] = useState(false)
  const [editing, setEditing] = useState<FlatTxItem | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editPrice, setEditPrice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: prod }, { data: sup }, { data: cust }, { data: tx }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
      supabase
        .from('transaction_items')
        .select(
          'id, transaction_id, product_id, product_name, qty, unit_price, paid, transactions!inner(type, partner_id, partner_name, transaction_date)'
        )
        .order('created_at', { ascending: false }),
    ])
    setProducts((prod as Product[]) ?? [])
    setSuppliers((sup as Supplier[]) ?? [])
    setCustomers((cust as Customer[]) ?? [])
    const rows = (tx ?? []) as unknown as {
      id: string
      transaction_id: string
      product_id: string | null
      product_name: string
      qty: number
      unit_price: number
      paid: boolean
      transactions: { type: TxType; partner_id: string | null; partner_name: string; transaction_date: string }
    }[]
    setItems(
      rows.map((r) => ({
        item_id: r.id,
        transaction_id: r.transaction_id,
        type: r.transactions.type,
        partner_id: r.transactions.partner_id,
        partner_name: r.transactions.partner_name,
        transaction_date: r.transactions.transaction_date,
        product_id: r.product_id,
        product_name: r.product_name,
        qty: r.qty,
        unit_price: r.unit_price,
        paid: r.paid,
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const buyRows = items.filter((i) => i.type === 'in' && i.transaction_date === date)
  const sellRows = items.filter((i) => i.type === 'out' && i.transaction_date === date)

  function startEdit(it: FlatTxItem) {
    setEditing(it)
    setEditQty(String(it.qty))
    setEditPrice(String(it.unit_price))
  }

  async function saveEdit() {
    if (!editing) return
    const newQty = parseFloat(editQty) || 0
    const newPrice = parseFloat(editPrice) || 0
    const deltaQty = newQty - editing.qty
    if (deltaQty !== 0 && editing.product_id) {
      const { data: current } = await supabase
        .from('products')
        .select('qty')
        .eq('id', editing.product_id)
        .single()
      const base = current?.qty ?? 0
      const adjusted = editing.type === 'in' ? base + deltaQty : base - deltaQty
      await supabase.from('products').update({ qty: Math.max(0, adjusted) }).eq('id', editing.product_id)
    }
    await supabase
      .from('transaction_items')
      .update({ qty: newQty, unit_price: newPrice })
      .eq('id', editing.item_id)
    setEditing(null)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton onClick={onBack} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm bg-white"
        />
        <button
          onClick={() => setShowBuy(true)}
          className="flex items-center gap-1.5 rounded-lg bg-teal-50 text-teal-800 px-3 py-1.5 text-sm"
        >
          <ShoppingCart size={16} />
          ซื้อ
        </button>
        <button
          onClick={() => setShowSell(true)}
          className="flex items-center gap-1.5 rounded-lg bg-amber-50 text-amber-800 px-3 py-1.5 text-sm"
        >
          <Truck size={16} />
          ขาย
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        <>
          <p className="text-xs text-sand-700 mb-1.5">ตารางซื้อ</p>
          <div className="rounded-xl border border-sand-200 bg-white overflow-hidden mb-5 divide-y divide-sand-100">
            {buyRows.length === 0 && <p className="text-sm text-sand-700 px-3 py-3">ไม่มีรายการวันนี้</p>}
            {buyRows.map((it) => (
              <RowItem key={it.item_id} it={it} icon={Store} iconBg="bg-teal-50" iconFg="text-teal-800" isAdmin={isAdmin} onEdit={startEdit} />
            ))}
          </div>

          <p className="text-xs text-sand-700 mb-1.5">ตารางขาย</p>
          <div className="rounded-xl border border-sand-200 bg-white overflow-hidden divide-y divide-sand-100">
            {sellRows.length === 0 && <p className="text-sm text-sand-700 px-3 py-3">ไม่มีรายการวันนี้</p>}
            {sellRows.map((it) => (
              <RowItem key={it.item_id} it={it} icon={User} iconBg="bg-pink-50" iconFg="text-pink-800" isAdmin={isAdmin} onEdit={startEdit} />
            ))}
          </div>
        </>
      )}

      {showBuy && (
        <BuyModal
          date={date}
          suppliers={suppliers}
          userId={session?.user.id ?? null}
          onClose={() => setShowBuy(false)}
          onSaved={load}
        />
      )}
      {showSell && (
        <SellModal
          date={date}
          products={products}
          customers={customers}
          userId={session?.user.id ?? null}
          onClose={() => setShowSell(false)}
          onSaved={load}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium mb-1">แก้ไขรายการ</p>
            <p className="text-sm text-sand-700 mb-4">
              {editing.partner_name} — {editing.product_name}
            </p>
            <label className="block text-xs text-sand-700 mb-1">จำนวน</label>
            <input
              type="number"
              value={editQty}
              onChange={(e) => setEditQty(e.target.value)}
              className="w-full mb-3 rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
            <label className="block text-xs text-sand-700 mb-1">ราคาต่อหน่วย</label>
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-sand-200 py-2 text-sm">
                ยกเลิก
              </button>
              <button onClick={saveEdit} className="flex-1 rounded-lg bg-teal-600 text-white py-2 text-sm font-medium">
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RowItem({
  it,
  icon: Icon,
  iconBg,
  iconFg,
  isAdmin,
  onEdit,
}: {
  it: FlatTxItem
  icon: typeof Store
  iconBg: string
  iconFg: string
  isAdmin: boolean
  onEdit: (it: FlatTxItem) => void
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={iconFg} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{it.partner_name}</p>
        <p className="text-xs text-sand-700 truncate">
          {it.product_name} x{it.qty} — {fmtMoney(it.qty * it.unit_price)}
        </p>
      </div>
      {it.paid ? (
        <CheckCircle2 size={16} className="text-teal-600" aria-label="ชำระแล้ว" />
      ) : (
        <Clock size={16} className="text-amber-600" aria-label="ค้างชำระ" />
      )}
      {isAdmin && (
        <button onClick={() => onEdit(it)} className="p-1 text-sand-700" aria-label="แก้ไข">
          <Pencil size={16} />
        </button>
      )}
    </div>
  )
}
