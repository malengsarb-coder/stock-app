import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtDateShort, todayIso } from '../lib/format'
import type { Product, StockAdjustment } from '../lib/types'

export default function Adjustment() {
  const { session } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [history, setHistory] = useState<StockAdjustment[]>([])
  const [productId, setProductId] = useState('')
  const [newQty, setNewQty] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [{ data: prod }, { data: hist }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('stock_adjustments').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    setProducts((prod as Product[]) ?? [])
    setHistory((hist as StockAdjustment[]) ?? [])
    if (prod && prod.length > 0 && !productId) setProductId(prod[0].id)
  }, [productId])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = products.find((p) => p.id === productId)

  async function handleSave() {
    if (!selected || newQty === '') return
    setSaving(true)
    const after = parseFloat(newQty)
    await supabase.from('stock_adjustments').insert({
      product_id: selected.id,
      product_name: selected.name,
      before_qty: selected.qty,
      after_qty: after,
      adjusted_by: session?.user.id ?? null,
    })
    await supabase.from('products').update({ qty: after }).eq('id', selected.id)
    setSaving(false)
    setNewQty('')
    load()
  }

  return (
    <div>
      <span className="inline-block text-xs bg-grain-50 text-grain-600 px-3 py-1 rounded-full mb-4">
        เฉพาะสิทธิ์ Admin
      </span>

      <div className="rounded-xl border border-sand-200 bg-white p-4 mb-6 max-w-md">
        <p className="font-medium mb-3">ปรับยอดสต็อก</p>
        <label className="block text-xs text-sand-700 mb-1">สินค้า</label>
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value)
            setNewQty('')
          }}
          className="w-full mb-3 rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-sand-700 mb-1">ยอดปัจจุบัน</label>
            <input disabled value={selected?.qty ?? ''} className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm bg-sand-50" />
          </div>
          <div>
            <label className="block text-xs text-sand-700 mb-1">ยอดใหม่</label>
            <input
              type="number"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || newQty === ''}
          className="w-full rounded-lg bg-pond-600 text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกการปรับยอด'}
        </button>
      </div>

      <p className="text-sm text-sand-700 mb-2">ประวัติการปรับยอดล่าสุด</p>
      <div className="rounded-xl border border-sand-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-sand-700 border-b border-sand-200">
              <th className="px-3 py-2">วันที่</th>
              <th className="px-3 py-2">สินค้า</th>
              <th className="px-3 py-2">จาก</th>
              <th className="px-3 py-2">เป็น</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-sand-700">
                  ยังไม่มีประวัติ
                </td>
              </tr>
            )}
            {history.map((h) => (
              <tr key={h.id} className="border-b border-sand-100">
                <td className="px-3 py-2">{fmtDateShort(h.created_at.slice(0, 10) || todayIso())}</td>
                <td className="px-3 py-2">{h.product_name}</td>
                <td className="px-3 py-2 tabular">{h.before_qty}</td>
                <td className="px-3 py-2 tabular">{h.after_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
