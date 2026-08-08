import { useEffect, useState, useCallback } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtMoney, todayIso } from '../lib/format'
import type { Supplier } from '../lib/types'
import BackButton from '../components/BackButton'

interface LinkedRow {
  product_id: string
  name: string
  qty: string
  price: string
}

export default function BuyView({ onBack, onGotoPayable }: { onBack: () => void; onGotoPayable: (supplierId: string) => void }) {
  const { session } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [rows, setRows] = useState<LinkedRow[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('*').eq('active', true).order('name')
    const list = (data as Supplier[]) ?? []
    setSuppliers(list)
    if (list.length > 0) setSupplierId(list[0].id)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadLinked = useCallback(async (sid: string) => {
    if (!sid) {
      setRows([])
      return
    }
    const { data } = await supabase
      .from('supplier_products')
      .select('product_id, price, products(name)')
      .eq('supplier_id', sid)
    const raw = (data as unknown as { product_id: string; price: number; products: { name: string } | null }[]) ?? []
    setRows(
      raw.map((d) => ({
        product_id: d.product_id,
        name: d.products?.name ?? '-',
        price: String(d.price),
        qty: '',
      }))
    )
  }, [])

  useEffect(() => {
    if (supplierId) loadLinked(supplierId)
  }, [supplierId, loadLinked])

  function updateRow(i: number, patch: Partial<LinkedRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const total = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0)

  async function handleSave() {
    setErr(null)
    setSavedOk(false)
    const supplier = suppliers.find((s) => s.id === supplierId)
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
          invoice_no: invoiceNo.trim() || null,
          transaction_date: todayIso(),
          paid: false,
          created_by: session?.user.id ?? null,
        })
        .select()
        .single()
      if (txErr || !tx) throw txErr

      const items = validRows.map((r) => ({
        transaction_id: tx.id,
        product_id: r.product_id,
        product_name: r.name,
        qty: parseFloat(r.qty),
        unit_price: parseFloat(r.price),
      }))
      const { error: itemsErr } = await supabase.from('transaction_items').insert(items)
      if (itemsErr) throw itemsErr

      for (const r of validRows) {
        const { data: current } = await supabase.from('products').select('qty').eq('id', r.product_id).single()
        const newQty = (current?.qty ?? 0) + parseFloat(r.qty)
        await supabase.from('products').update({ qty: newQty }).eq('id', r.product_id)
      }

      setSavedOk(true)
      setInvoiceNo('')
      loadLinked(supplierId)
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
        <p className="font-medium mb-3">บันทึกการซื้อ</p>

        <label className="block text-xs text-sand-700 mb-1">Supplier</label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full mb-3 rounded-lg border border-sand-200 px-3 py-2 text-sm"
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label className="block text-xs text-sand-700 mb-1">เลขที่ใบส่งของ/บิล</label>
        <input
          value={invoiceNo}
          onChange={(e) => setInvoiceNo(e.target.value)}
          placeholder="INV-0001"
          className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm"
        />

        {rows.length === 0 ? (
          <p className="text-sm text-sand-700 mb-4">Supplier รายนี้ยังไม่ได้ผูกสินค้าไว้ (ไปที่ "เพิ่มผู้ซื้อ/ผู้ขาย" เพื่อผูกสินค้าก่อน)</p>
        ) : (
          <div className="rounded-xl border border-sand-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sand-700 bg-sand-50">
                  <th className="px-3 py-2 font-medium">สินค้า</th>
                  <th className="px-3 py-2 font-medium">จำนวน</th>
                  <th className="px-3 py-2 font-medium">ราคา</th>
                  <th className="px-3 py-2 font-medium text-right">รวม</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.product_id} className="border-t border-sand-100">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={r.qty}
                        onChange={(e) => updateRow(i, { qty: e.target.value })}
                        placeholder="0"
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={r.price}
                        onChange={(e) => updateRow(i, { price: e.target.value })}
                        className="w-24 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular">
                      {fmtMoney((parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center font-semibold border-t border-sand-200 pt-3 mb-4">
          <span>ยอดรวมทั้งหมด</span>
          <span className="tabular">{fmtMoney(total)} บาท</span>
        </div>

        {supplierId && (
          <button onClick={() => onGotoPayable(supplierId)} className="text-sm text-teal-800 mb-4 block">
            ดูยอดค้างจ่ายของ Supplier นี้ →
          </button>
        )}

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        {savedOk && <p className="text-sm text-teal-700 mb-3">บันทึกการซื้อเรียบร้อยแล้ว</p>}

        <button
          onClick={handleSave}
          disabled={saving || rows.length === 0}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-white py-2.5 text-sm font-medium disabled:opacity-60"
        >
          <Check size={16} />
          {saving ? 'กำลังบันทึก...' : 'บันทึกการซื้อ'}
        </button>
      </div>
    </div>
  )
}
