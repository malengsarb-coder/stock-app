import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney } from '../lib/format'
import type { Product, Customer } from '../lib/types'

interface Row {
  productId: string
  qty: string
  price: string
}

export default function SellModal({
  date,
  products,
  customers,
  userId,
  onClose,
  onSaved,
}: {
  date: string
  products: Product[]
  customers: Customer[]
  userId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const activeProducts = products.filter((p) => p.active)
  const [customerName, setCustomerName] = useState('')
  const [rows, setRows] = useState<Row[]>(
    activeProducts.length > 0
      ? [{ productId: activeProducts[0].id, qty: '', price: String(activeProducts[0].sell_price) }]
      : []
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function onProductChange(i: number, productId: string) {
    const p = activeProducts.find((x) => x.id === productId)
    updateRow(i, { productId, price: p ? String(p.sell_price) : '0' })
  }
  function addRow() {
    if (activeProducts.length === 0) return
    setRows((rs) => [...rs, { productId: activeProducts[0].id, qty: '', price: String(activeProducts[0].sell_price) }])
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  const total = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0)

  async function handleSave() {
    setErr(null)
    if (!customerName.trim()) {
      setErr('กรุณาระบุชื่อผู้ซื้อ')
      return
    }
    const validRows = rows.filter((r) => (parseFloat(r.qty) || 0) > 0)
    if (validRows.length === 0) {
      setErr('กรุณาใส่จำนวนอย่างน้อย 1 รายการ')
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
          transaction_date: date,
          created_by: userId,
        })
        .select()
        .single()
      if (txErr || !tx) throw txErr

      const items = validRows.map((r) => {
        const p = activeProducts.find((x) => x.id === r.productId)!
        return {
          transaction_id: tx.id,
          product_id: p.id,
          product_name: p.name,
          qty: parseFloat(r.qty),
          unit_price: parseFloat(r.price),
          paid: false,
        }
      })
      const { error: itemsErr } = await supabase.from('transaction_items').insert(items)
      if (itemsErr) throw itemsErr

      for (const r of validRows) {
        const { data: current } = await supabase.from('products').select('qty').eq('id', r.productId).single()
        const newQty = Math.max(0, (current?.qty ?? 0) - parseFloat(r.qty))
        await supabase.from('products').update({ qty: newQty }).eq('id', r.productId)
      }
      onSaved()
      onClose()
    } catch {
      setErr('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <p className="font-semibold">บันทึกการขาย (ให้ Customer)</p>
          <button onClick={onClose} aria-label="ปิด">
            <X size={18} className="text-sand-700" />
          </button>
        </div>

        <label className="block text-xs text-sand-700 mb-1">Customer</label>
        <input
          list="customer-names"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="เลือกหรือพิมพ์ชื่อใหม่"
          className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm"
        />
        <datalist id="customer-names">
          {customers.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>

        <div className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2 text-xs text-sand-700 mb-1">
          <span>สินค้า</span>
          <span>จำนวน</span>
          <span>ราคา</span>
          <span className="text-right">รวม</span>
          <span />
        </div>
        {rows.map((r, i) => {
          const lineTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0)
          return (
            <div key={i} className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2 items-center mb-2">
              <select
                value={r.productId}
                onChange={(e) => onProductChange(i, e.target.value)}
                className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
              >
                {activeProducts.map((p) => (
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
              <button onClick={() => removeRow(i)} className="text-red-500" aria-label="ลบ">
                ✕
              </button>
            </div>
          )
        })}
        <button onClick={addRow} className="text-sm text-teal-800 font-medium mb-4">
          + เพิ่มรายการสินค้า
        </button>

        <div className="flex justify-between items-center font-semibold border-t border-sand-200 pt-3 mb-4">
          <span>ยอดรวม</span>
          <span className="tabular">{fmtMoney(total)} บาท</span>
        </div>

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-sand-200 py-2 text-sm font-medium">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
