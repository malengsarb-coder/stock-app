import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney, todayIso } from '../lib/format'
import type { Supplier, Customer, TxItem } from '../lib/types'
import BackButton from '../components/BackButton'

export default function TradeHistoryView({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [partnerId, setPartnerId] = useState('')
  const [date, setDate] = useState(todayIso())

  const [buyRows, setBuyRows] = useState<{ name: string; qty: number; price: number }[]>([])
  const [sellRows, setSellRows] = useState<TxItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadPartners = useCallback(async () => {
    const [{ data: sup }, { data: cust }] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
    ])
    setSuppliers((sup as Supplier[]) ?? [])
    setCustomers((cust as Customer[]) ?? [])
  }, [])

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  useEffect(() => {
    if (mode === 'buy' && suppliers.length > 0 && !partnerId) setPartnerId(suppliers[0].id)
    if (mode === 'sell' && customers.length > 0 && !partnerId) setPartnerId(customers[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, suppliers, customers])

  const loadData = useCallback(async () => {
    if (!partnerId) return
    setLoading(true)
    if (mode === 'buy') {
      const { data: linkData } = await supabase
        .from('supplier_products')
        .select('product_id, price, products(name)')
        .eq('supplier_id', partnerId)
      const linkList = (
        (linkData as unknown as { product_id: string; price: number; products: { name: string } | null }[]) ?? []
      ).map((d) => ({ product_id: d.product_id, name: d.products?.name ?? '-', price: d.price }))

      const { data: tx } = await supabase
        .from('transactions')
        .select('id, transaction_items(product_id, qty, unit_price)')
        .eq('type', 'in')
        .eq('partner_id', partnerId)
        .eq('transaction_date', date)
      const items = ((tx ?? []) as unknown as { transaction_items: TxItem[] }[]).flatMap((t) => t.transaction_items)
      setBuyRows(
        linkList.map((l) => {
          const found = items.find((it) => it.product_id === l.product_id)
          return { name: l.name, qty: found?.qty ?? 0, price: found?.unit_price ?? l.price }
        })
      )
    } else {
      const { data: tx } = await supabase
        .from('transactions')
        .select('id, transaction_items(id, product_id, product_name, qty, unit_price)')
        .eq('type', 'out')
        .eq('partner_id', partnerId)
        .eq('transaction_date', date)
      const items = ((tx ?? []) as unknown as { transaction_items: TxItem[] }[]).flatMap((t) => t.transaction_items)
      setSellRows(items)
    }
    setLoading(false)
  }, [mode, partnerId, date])

  useEffect(() => {
    loadData()
  }, [loadData])

  const total =
    mode === 'buy'
      ? buyRows.reduce((s, r) => s + r.qty * r.price, 0)
      : sellRows.reduce((s, r) => s + r.qty * r.unit_price, 0)

  return (
    <div className="max-w-xl mx-auto">
      <BackButton onClick={onBack} />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setMode('buy')
            setPartnerId('')
          }}
          className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'buy' ? 'bg-teal-50 text-teal-800' : 'bg-white border border-sand-200 text-sand-700'}`}
        >
          เลือกการซื้อ
        </button>
        <button
          onClick={() => {
            setMode('sell')
            setPartnerId('')
          }}
          className={`px-3 py-1.5 rounded-lg text-sm ${mode === 'sell' ? 'bg-teal-50 text-teal-800' : 'bg-white border border-sand-200 text-sand-700'}`}
        >
          เลือกการขาย
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm bg-white min-w-[180px]">
          {(mode === 'buy' ? suppliers : customers).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm bg-white"
        />
      </div>

      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        <div className="rounded-xl border border-sand-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            {mode === 'buy' ? (
              <>
                <thead>
                  <tr className="text-left text-sand-700 border-b border-sand-200">
                    <th className="px-3 py-2 font-medium">สินค้า</th>
                    <th className="px-3 py-2 font-medium">จำนวน</th>
                    <th className="px-3 py-2 font-medium">ราคาซื้อ</th>
                    <th className="px-3 py-2 font-medium text-right">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {buyRows.map((r, i) => (
                    <tr key={i} className="border-b border-sand-100 last:border-0">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 tabular">{r.qty}</td>
                      <td className="px-3 py-2 tabular">{fmtMoney(r.price)}</td>
                      <td className="px-3 py-2 text-right tabular">{fmtMoney(r.qty * r.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr className="text-left text-sand-700 border-b border-sand-200">
                    <th className="px-3 py-2 font-medium">สินค้า</th>
                    <th className="px-3 py-2 font-medium">จำนวน</th>
                    <th className="px-3 py-2 font-medium">ราคาขาย</th>
                    <th className="px-3 py-2 font-medium text-right">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {sellRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sand-700">
                        ไม่มีรายการวันนี้
                      </td>
                    </tr>
                  )}
                  {sellRows.map((r) => (
                    <tr key={r.id} className="border-b border-sand-100 last:border-0">
                      <td className="px-3 py-2">{r.product_name}</td>
                      <td className="px-3 py-2 tabular">{r.qty}</td>
                      <td className="px-3 py-2 tabular">{fmtMoney(r.unit_price)}</td>
                      <td className="px-3 py-2 text-right tabular">{fmtMoney(r.qty * r.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}

      <div className="flex justify-between font-semibold border-t border-sand-200 pt-2 mt-3">
        <span>ยอดรวม</span>
        <span className="tabular">{fmtMoney(total)} บาท</span>
      </div>
    </div>
  )
}
