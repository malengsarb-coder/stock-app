import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtMoney, todayIso } from '../lib/format'
import type { Product, Partner, TxType } from '../lib/types'
import Modal from './Modal'

interface LineRow {
  productId: string
  qty: string
  price: string
}

export default function StockInOutModal({
  open,
  onClose,
  type,
  products,
  partners,
  prefillProductId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  type: TxType
  products: Product[]
  partners: Partner[]
  prefillProductId: string | null
  onSaved: () => void
}) {
  const { session } = useAuth()
  const [partnerName, setPartnerName] = useState('')
  const [rows, setRows] = useState<LineRow[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const activeProducts = products.filter((p) => p.active)
  const priceKey = type === 'in' ? 'buy_price' : 'sell_price'
  const label = type === 'in' ? 'รับสินค้าเข้า' : 'จ่ายสินค้าออก'
  const partnerLabel = type === 'in' ? 'Supplier' : 'Customer'

  useEffect(() => {
    if (!open) return
    setPartnerName('')
    setErr(null)
    const first = prefillProductId ?? activeProducts[0]?.id ?? ''
    const firstProduct = activeProducts.find((p) => p.id === first)
    setRows([
      {
        productId: first,
        qty: '',
        price: firstProduct ? String(firstProduct[priceKey]) : '0',
      },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillProductId, type])

  function updateRow(idx: number, patch: Partial<LineRow>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function addRow() {
    const p = activeProducts[0]
    if (!p) return
    setRows((rs) => [...rs, { productId: p.id, qty: '', price: String(p[priceKey]) }])
  }

  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx))
  }

  function onProductChange(idx: number, productId: string) {
    const p = activeProducts.find((x) => x.id === productId)
    updateRow(idx, { productId, price: p ? String(p[priceKey]) : '0' })
  }

  const total = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0)

  async function handleSave() {
    setErr(null)
    const validRows = rows.filter((r) => (parseFloat(r.qty) || 0) > 0 && r.productId)
    if (validRows.length === 0) {
      setErr('กรุณาใส่จำนวนอย่างน้อย 1 รายการ')
      return
    }
    if (!partnerName.trim()) {
      setErr(`กรุณาระบุชื่อ ${partnerLabel}`)
      return
    }
    setSaving(true)
    try {
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          type,
          partner_name: partnerName.trim(),
          transaction_date: todayIso(),
          created_by: session?.user.id ?? null,
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

      // Update stock qty per product (fetch-then-update; fine for single-writer MVP use)
      for (const r of validRows) {
        const p = activeProducts.find((x) => x.id === r.productId)!
        const delta = type === 'in' ? parseFloat(r.qty) : -parseFloat(r.qty)
        const { data: current } = await supabase
          .from('products')
          .select('qty')
          .eq('id', p.id)
          .single()
        const newQty = Math.max(0, (current?.qty ?? p.qty) + delta)
        await supabase.from('products').update({ qty: newQty }).eq('id', p.id)
      }

      onSaved()
      onClose()
    } catch (e) {
      setErr('บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง')
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} wide>
      <p className="font-semibold text-sand-900 mb-3">{label} (หลายรายการได้)</p>

      <label className="block text-xs text-sand-700 mb-1">{partnerLabel}</label>
      <input
        list="partner-list"
        value={partnerName}
        onChange={(e) => setPartnerName(e.target.value)}
        placeholder="เลือกหรือพิมพ์ชื่อใหม่"
        className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pond-500"
      />
      <datalist id="partner-list">
        {partners.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <div className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2 text-xs text-sand-700 mb-1">
        <span>สินค้า</span>
        <span>จำนวน</span>
        <span>ราคา/หน่วย</span>
        <span className="text-right">รวม</span>
        <span />
      </div>

      {rows.map((r, idx) => {
        const lineTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0)
        return (
          <div key={idx} className="grid grid-cols-[1fr_70px_90px_90px_28px] gap-2 items-center mb-2">
            <select
              value={r.productId}
              onChange={(e) => onProductChange(idx, e.target.value)}
              className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={r.qty}
              onChange={(e) => updateRow(idx, { qty: e.target.value })}
              placeholder="0"
              className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              min="0"
              value={r.price}
              onChange={(e) => updateRow(idx, { price: e.target.value })}
              className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-sand-700 text-right tabular">{fmtMoney(lineTotal)}</span>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="text-red-500 text-base leading-none"
              aria-label="ลบรายการ"
            >
              ✕
            </button>
          </div>
        )
      })}

      <button type="button" onClick={addRow} className="text-sm text-pond-600 font-medium mb-4">
        + เพิ่มรายการสินค้า
      </button>

      <div className="flex justify-between items-center font-semibold border-t border-sand-200 pt-3 mb-4">
        <span>ยอดรวมทั้งบิล</span>
        <span className="tabular">{fmtMoney(total)} บาท</span>
      </div>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-sand-200 py-2 text-sm font-medium"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-pond-600 text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </Modal>
  )
}
