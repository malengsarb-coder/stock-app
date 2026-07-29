import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney } from '../lib/format'
import type { Supplier } from '../lib/types'

interface LinkedProduct {
  productId: string
  name: string
  price: number
}

interface Row {
  productId: string
  qty: string
  price: string
}

export default function BuyModal({
  date,
  suppliers,
  userId,
  onClose,
  onSaved,
}: {
  date: string
  suppliers: Supplier[]
  userId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const activeSuppliers = suppliers.filter((s) => s.active)
  const [supplierId, setSupplierId] = useState(activeSuppliers[0]?.id ?? '')
  const [linked, setLinked] = useState<LinkedProduct[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!supplierId) return
    supabase
      .from('supplier_products')
      .select('product_id, price, products(name)')
      .eq('supplier_id', supplierId)
      .then(({ data }) => {
        const list = (
          (data as unknown as { product_id: string; price: number; products: { name: string } | null }[]) ?? []
        ).map((d) => ({ productId: d.product_id, name: d.products?.name ?? '-', price: d.price }))
        setLinked(list)
        setRows(list.length > 0 ? [{ productId: list[0].productId, qty: '', price: String(list[0].price) }] : [])
      })
  }, [supplierId])

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function onProductChange(i: number, productId: string) {
    const lp = linked.find((l) => l.productId === productId)
    updateRow(i, { productId, price: lp ? String(lp.price) : '0' })
  }
  function addRow() {
    if (linked.length === 0) return
    setRows((rs) => [...rs, { productId: linked[0].productId, qty: '', price: String(linked[0].price) }])
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  const total = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0)

  async function handleSave() {
    setErr(null)
    const supplier = activeSuppliers.find((s) => s.id === supplierId)
    if (!supplier) {
      setErr('กรุณาเลือก Supplier')
      return
    }
    const validRows = rows.filter((r) => (parseFloat(r.qty) || 0) > 0)
    if (validRows.length === 0) {
      setErr('กรุณาใส่จำนวนอย่างน้อย 1 รายการ')
      return
    }
    setSaving(true)
    try {
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          type: 'in',
          partner_id: supplier.id,
          partner_name: supplier.name,
          transaction_date: date,
          created_by: userId,
        })
        .select()
        .single()
      if (txErr || !tx) throw txErr

      const items = validRows.map((r) => {
        const lp = linked.find((l) => l.productId === r.productId)!
        return {
          transaction_id: tx.id,
          product_id: r.productId,
          product_name: lp.name,
          qty: parseFloat(r.qty),
          unit_price: parseFloat(r.price),
          paid: false,
        }
      })
      const { error: itemsErr } = await supabase.from('transaction_items').insert(items)
      if (itemsErr) throw itemsErr

      for (const r of validRows) {
        const { data: current } = await supabase.from('products').select('qty').eq('id', r.productId).single()
        const newQty = (current?.qty ?? 0) + parseFloat(r.qty)
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
          <p className="font-semibold">บันทึกการซื้อ (จาก Supplier)</p>
          <button onClick={onClose} aria-label="ปิด">
            <X size={18} className="text-sand-700" />
          </button>
        </div>

        <label className="block text-xs text-sand-700 mb-1">Supplier</label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm"
        >
          {activeSuppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {linked.length === 0 ? (
          <p className="text-sm text-sand-700 mb-4">Supplier รายนี้ยังไม่ได้ผูกสินค้าไว้ใน Master</p>
        ) : (
          <>
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
                    {linked.map((lp) => (
                      <option key={lp.productId} value={lp.productId}>
                        {lp.name}
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
          </>
        )}

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
            disabled={saving || linked.length === 0}
            className="flex-1 rounded-lg bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
