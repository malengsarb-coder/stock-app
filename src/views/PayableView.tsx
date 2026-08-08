import { useEffect, useState, useCallback, Fragment } from 'react'
import { ChevronRight, Store, History as HistoryIcon } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney, fmtDateShort } from '../lib/format'
import type { Supplier, Transaction, TxItem } from '../lib/types'
import BackButton from '../components/BackButton'

export default function PayableView({
  onBack,
  onGotoHistory,
  focusSupplierId,
}: {
  onBack: () => void
  onGotoHistory: () => void
  focusSupplierId: string | null
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [bills, setBills] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [openSupplierId, setOpenSupplierId] = useState<string | null>(focusSupplierId)
  const [payBill, setPayBill] = useState<Transaction | null>(null)
  const [actualAmount, setActualAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: sup }, { data: tx }] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase
        .from('transactions')
        .select('id, type, partner_id, partner_name, invoice_no, transaction_date, paid, paid_amount, transaction_items(id, product_id, product_name, qty, unit_price)')
        .eq('type', 'in')
        .order('transaction_date', { ascending: false }),
    ])
    setSuppliers((sup as Supplier[]) ?? [])
    const rows = (tx ?? []) as unknown as (Omit<Transaction, 'items'> & { transaction_items: TxItem[] })[]
    setBills(rows.map((r) => ({ ...r, items: r.transaction_items })))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function billTotal(b: Transaction) {
    return b.items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  }

  const totalsBySupplier = suppliers
    .map((s) => ({
      supplier: s,
      total: bills.filter((b) => b.partner_id === s.id && !b.paid).reduce((sum, b) => sum + billTotal(b), 0),
      bills: bills.filter((b) => b.partner_id === s.id),
    }))
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total)

  function openPay(bill: Transaction) {
    setPayBill(bill)
    setActualAmount(String(billTotal(bill)))
  }

  async function confirmPay() {
    if (!payBill) return
    setSaving(true)
    const amount = parseFloat(actualAmount) || 0
    await supabase
      .from('transactions')
      .update({ paid: true, paid_amount: amount, paid_at: new Date().toISOString() })
      .eq('id', payBill.id)
    setSaving(false)
    setPayBill(null)
    load()
  }

  const billTotalForModal = payBill ? billTotal(payBill) : 0
  const actualNum = parseFloat(actualAmount) || 0
  const discount = billTotalForModal - actualNum
  const discountPct = billTotalForModal > 0 ? (discount / billTotalForModal) * 100 : 0

  return (
    <div className="max-w-xl mx-auto relative">
      <BackButton onClick={onBack} />
      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        <div className="rounded-xl border border-sand-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sand-700 border-b border-sand-200">
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium">ยอดค้างจ่าย</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {totalsBySupplier.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-sand-700">
                    ไม่มียอดค้าง
                  </td>
                </tr>
              )}
              {totalsBySupplier.map((g) => (
                <Fragment key={g.supplier.id}>
                  <tr
                    onClick={() => setOpenSupplierId(openSupplierId === g.supplier.id ? null : g.supplier.id)}
                    className="cursor-pointer border-b border-sand-100 bg-amber-50/60"
                  >
                    <td className="px-3 py-2 flex items-center gap-2">
                      <Store size={14} className="text-sand-700" />
                      {g.supplier.name}
                    </td>
                    <td className="px-3 py-2 tabular">{fmtMoney(g.total)}</td>
                    <td className="px-3 py-2">
                      <ChevronRight size={16} className={`text-sand-700 transition-transform ${openSupplierId === g.supplier.id ? 'rotate-90' : ''}`} />
                    </td>
                  </tr>
                  {openSupplierId === g.supplier.id && (
                    <tr>
                      <td colSpan={3} className="px-3 pb-3">
                        <table className="w-full text-xs mb-2">
                          <thead>
                            <tr className="text-sand-700 text-left">
                              <th className="py-1">เลขที่บิล</th>
                              <th className="py-1">วันที่</th>
                              <th className="py-1">ยอดรวม</th>
                              <th className="py-1"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.bills.map((b) => (
                              <tr key={b.id} className="border-t border-sand-100">
                                <td className="py-1.5">{b.invoice_no || '-'}</td>
                                <td className="py-1.5">{fmtDateShort(b.transaction_date)}</td>
                                <td className="py-1.5 tabular">{fmtMoney(billTotal(b))}</td>
                                <td className="py-1.5">
                                  {b.paid ? (
                                    <span className="text-teal-700">ชำระแล้ว</span>
                                  ) : (
                                    <button onClick={() => openPay(b)} className="rounded-md bg-teal-600 text-white px-2 py-1">
                                      ชำระเงิน
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          onClick={onGotoHistory}
                          className="flex items-center gap-1 text-xs text-teal-800"
                        >
                          <HistoryIcon size={13} />
                          ดูประวัติการสั่งซื้อ
                        </button>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setPayBill(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-1">ชำระเงินบิล {payBill.invoice_no || '-'}</p>
            <p className="text-sm text-sand-700 mb-4">ยอดตามบิล: {fmtMoney(billTotalForModal)} บาท</p>
            <label className="block text-xs text-sand-700 mb-1">จำนวนเงินตามใบแจ้งหนี้จริง</label>
            <input
              type="number"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              className="w-full mb-3 rounded-lg border border-sand-200 px-3 py-2 text-sm"
            />
            <div className="flex justify-between text-sm mb-1">
              <span>ส่วนลด</span>
              <span className="tabular">{fmtMoney(discount > 0 ? discount : 0)} บาท</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span>คิดเป็น</span>
              <span>{discountPct.toFixed(1)}%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPayBill(null)} className="flex-1 rounded-lg border border-sand-200 py-2 text-sm font-medium">
                ยกเลิก
              </button>
              <button
                onClick={confirmPay}
                disabled={saving}
                className="flex-1 rounded-lg bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'กำลังบันทึก...' : 'Confirm จ่าย'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
