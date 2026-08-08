import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Check, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtMoney, todayIso } from '../lib/format'
import type { Product, Customer } from '../lib/types'
import BackButton from '../components/BackButton'

interface Row {
  productId: string
  qty: string
  price: string
}

export default function SellView({ onBack, onGotoReceivable }: { onBack: () => void; onGotoReceivable: (customerId: string | null, name: string) => void }) {
  const { session } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerName, setCustomerName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const load = useCallback(async () => {
    const [{ data: prod }, { data: cust }] = await Promise.all([
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('customers').select('*').order('name'),
    ])
    setProducts((prod as Product[]) ?? [])
    setCustomers((cust as Customer[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function addRow() {
    if (products.length === 0) return
    setRows((rs) => [...rs, { productId: products[0].id, qty: '', price: String(products[0].sell_price) }])
  }
  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function onProductChange(i: number, productId: string) {
    const p = products.find((x) => x.id === productId)
    updateRow(i, { productId, price: p ? String(p.sell_price) : '0' })
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  const total = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0)

  async function handleSave() {
    setErr(null)
    setSavedOk(false)
    if (!customerName.trim()) {
      setErr('กรุณาระบุชื่อผู้ซื้อ')
      return
    }
    const validRows = rows.filter((r) => (parseFloat(r.qty) || 0) > 0)
    if (validRows.length === 0) {
      setErr('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ')
      return
    }
    setSaving(true)
    try {
      const matched = customers.find((c) => c.name === customerName.trim())
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          type: 'out',
          partner_id: matched?.id ?? null,
          partner_name: customerName.trim(),
          transaction_date: todayIso(),
          created_by: session?.user.id ?? null,
        })
        .select()
        .single()
      if (txErr || !tx) throw txErr

      const items = validRows.map((r) => {
        const p = products.find((x) => x.id === r.productId)!
        return {
          transaction_id: tx.id,
          product_id: p.id,
          product_name: p.name,
          qty: parseFloat(r.qty),
          unit_price: parseFloat(r.price),
        }
      })
      const { error: itemsErr } = await supabase.from('transaction_items').insert(items)
      if (itemsErr) throw itemsErr

      for (const r of validRows) {
        const { data: current } = await supabase.from('products').select('qty').eq('id', r.productId).single()
        const newQty = Math.max(0, (current?.qty ?? 0) - parseFloat(r.qty))
        await supabase.from('products').update({ qty: newQty }).eq('id', r.productId)
      }

      setSavedOk(true)
      setRows([])
      load()
    } catch {
      setErr('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <BackButton onClick={onBack} />
      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <p className="font-medium mb-3">บันทึกการขาย</p>

        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-sand-700" />
          <input
            list="customer-names"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="เลือกหรือพิมพ์ชื่อ Customer"
            className="flex-1 rounded-lg border border-sand-200 px-3 py-2 text-sm"
          />
        </div>
        <datalist id="customer-names">
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>

        {rows.length > 0 && (
          <div className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2 text-xs text-sand-700 mb-1">
            <span>สินค้า</span>
            <span>จำนวน</span>
            <span>ราคาขาย</span>
            <span className="text-right">รวม</span>
            <span />
          </div>
        )}
        {rows.map((r, i) => {
          const lineTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0)
          return (
            <div key={i} className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2 items-center mb-2">
              <select
                value={r.productId}
                onChange={(e) => onProductChange(i, e.target.value)}
                className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={r.qty}
                onChange={(e) => updateRow(i, { qty: e.target.value })}
                placeholder="0"
                className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                value={r.price}
                onChange={(e) => updateRow(i, { price: e.target.value })}
                className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-sand-700 text-right tabular">{fmtMoney(lineTotal)}</span>
              <button onClick={() => removeRow(i)} aria-label="ลบ">
                <X size={16} className="text-red-500" />
              </button>
            </div>
          )
        })}

        <button onClick={addRow} className="flex items-center gap-1 text-sm text-teal-800 font-medium mb-4">
          <Plus size={15} />
          เพิ่มรายการสินค้า
        </button>

        <div className="flex justify-between items-center font-semibold border-t border-sand-200 pt-3 mb-4">
          <span>ยอดรวม</span>
          <span className="tabular">{fmtMoney(total)} บาท</span>
        </div>

        {customerName.trim() && (
          <button
            onClick={() => {
              const matched = customers.find((c) => c.name === customerName.trim())
              onGotoReceivable(matched?.id ?? null, customerName.trim())
            }}
            className="text-sm text-teal-800 mb-4 block"
          >
            ดูยอดค้างเก็บของลูกค้านี้ →
          </button>
        )}

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        {savedOk && <p className="text-sm text-teal-700 mb-3">บันทึกการขายเรียบร้อยแล้ว</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-white py-2.5 text-sm font-medium disabled:opacity-60"
        >
          <Check size={16} />
          {saving ? 'กำลังบันทึก...' : 'บันทึกการขาย'}
        </button>
      </div>
    </div>
  )
}
