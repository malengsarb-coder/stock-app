import { useEffect, useState, useCallback, useMemo, Fragment } from 'react'
import { ChevronRight, ChevronLeft, Eye, Plus, History as HistoryIcon, ShoppingCart, Banknote } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtMoney, fmtDateShort, todayIso, THAI_MONTHS, yearMonth } from '../lib/format'
import type { Customer, TxItem, LedgerEntry } from '../lib/types'
import BackButton from '../components/BackButton'

export default function ReceivableView({
  onBack,
  onGotoHistory,
  focusCustomerId,
  focusCustomerName,
}: {
  onBack: () => void
  onGotoHistory: () => void
  focusCustomerId: string | null
  focusCustomerName: string | null
}) {
  const { session } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [entriesByCustomer, setEntriesByCustomer] = useState<Record<string, LedgerEntry[]>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Customer | null>(null)

  const today = new Date()
  const [selYear, setSelYear] = useState(today.getFullYear())
  const [selMonth, setSelMonth] = useState(today.getMonth())
  const [openDetailIdx, setOpenDetailIdx] = useState<number | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: cust }, { data: sales }, { data: payments }] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase
        .from('transactions')
        .select('id, partner_id, transaction_date, transaction_items(id, product_id, product_name, qty, unit_price)')
        .eq('type', 'out'),
      supabase.from('customer_payments').select('*'),
    ])
    setCustomers((cust as Customer[]) ?? [])

    const map: Record<string, LedgerEntry[]> = {}
    const saleRows = (sales ?? []) as unknown as {
      id: string
      partner_id: string | null
      transaction_date: string
      transaction_items: TxItem[]
    }[]
    saleRows.forEach((s) => {
      if (!s.partner_id) return
      if (!map[s.partner_id]) map[s.partner_id] = []
      const amount = s.transaction_items.reduce((sum, it) => sum + it.qty * it.unit_price, 0)
      map[s.partner_id].push({ kind: 'sale', date: s.transaction_date, amount, items: s.transaction_items })
    })
    ;(payments as { customer_id: string; amount: number; payment_date: string }[] | null)?.forEach((p) => {
      if (!map[p.customer_id]) map[p.customer_id] = []
      map[p.customer_id].push({ kind: 'payment', date: p.payment_date, amount: p.amount })
    })
    Object.keys(map).forEach((cid) => map[cid].sort((a, b) => a.date.localeCompare(b.date)))
    setEntriesByCustomer(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (focusCustomerId && customers.length > 0) {
      const c = customers.find((x) => x.id === focusCustomerId)
      if (c) setSelected(c)
    } else if (focusCustomerName && !focusCustomerId) {
      // ad-hoc buyer name not in master customers -- nothing to open
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCustomerId, customers])

  function balance(cid: string): number {
    return (entriesByCustomer[cid] ?? []).reduce((s, e) => s + (e.kind === 'sale' ? e.amount : -e.amount), 0)
  }

  function balanceBefore(cid: string, ym: string): number {
    return (entriesByCustomer[cid] ?? [])
      .filter((e) => yearMonth(e.date) < ym)
      .reduce((s, e) => s + (e.kind === 'sale' ? e.amount : -e.amount), 0)
  }

  function openCustomer(c: Customer) {
    setSelected(c)
    setSelYear(today.getFullYear())
    setSelMonth(today.getMonth())
    setOpenDetailIdx(null)
  }

  const ym = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`
  const monthEntries = useMemo(
    () => (selected ? (entriesByCustomer[selected.id] ?? []).filter((e) => yearMonth(e.date) === ym) : []),
    [selected, entriesByCustomer, ym]
  )
  const years = useMemo(() => {
    const set = new Set<string>()
    if (selected) (entriesByCustomer[selected.id] ?? []).forEach((e) => set.add(e.date.slice(0, 4)))
    set.add(String(selYear))
    return Array.from(set).sort()
  }, [selected, entriesByCustomer, selYear])

  async function recordPayment() {
    if (!selected) return
    const amount = parseFloat(payAmount) || 0
    if (amount <= 0) return
    setSaving(true)
    await supabase.from('customer_payments').insert({
      customer_id: selected.id,
      amount,
      payment_date: todayIso(),
      created_by: session?.user.id ?? null,
    })
    setSaving(false)
    setPayAmount('')
    load()
  }

  function prevMonth() {
    setOpenDetailIdx(null)
    if (selMonth === 0) {
      setSelMonth(11)
      setSelYear((y) => y - 1)
    } else {
      setSelMonth((m) => m - 1)
    }
  }
  function nextMonth() {
    setOpenDetailIdx(null)
    if (selMonth === 11) {
      setSelMonth(0)
      setSelYear((y) => y + 1)
    } else {
      setSelMonth((m) => m + 1)
    }
  }

  if (selected) {
    let runningBal = balanceBefore(selected.id, ym)
    const saleSum = monthEntries.filter((e) => e.kind === 'sale').reduce((s, e) => s + e.amount, 0)
    const paySum = monthEntries.filter((e) => e.kind === 'payment').reduce((s, e) => s + e.amount, 0)

    return (
      <div className="max-w-xl mx-auto">
        <BackButton onClick={() => setSelected(null)} label="กลับรายชื่อ" />
        <div className="rounded-xl border border-sand-200 bg-white p-4">
          <p className="font-medium mb-3">บัญชี {selected.name}</p>

          <div className="flex items-center gap-2 mb-3">
            <button onClick={prevMonth} className="w-7 h-7 rounded-md border border-sand-200 flex items-center justify-center">
              <ChevronLeft size={15} />
            </button>
            <select
              value={selYear}
              onChange={(e) => {
                setSelYear(parseInt(e.target.value, 10))
                setOpenDetailIdx(null)
              }}
              className="flex-1 rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={selMonth}
              onChange={(e) => {
                setSelMonth(parseInt(e.target.value, 10))
                setOpenDetailIdx(null)
              }}
              className="flex-[1.4] rounded-lg border border-sand-200 px-2 py-1.5 text-sm"
            >
              {THAI_MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <button onClick={nextMonth} className="w-7 h-7 rounded-md border border-sand-200 flex items-center justify-center">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-sand-50 rounded-lg px-3 py-2">
              <p className="text-xs text-sand-700">ยอดซื้อเดือนนี้</p>
              <p className="text-sm font-medium tabular">{fmtMoney(saleSum)}</p>
            </div>
            <div className="flex-1 bg-sand-50 rounded-lg px-3 py-2">
              <p className="text-xs text-sand-700">ยอดจ่ายเดือนนี้</p>
              <p className="text-sm font-medium tabular">{fmtMoney(paySum)}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="text-left text-sand-700 border-b border-sand-200">
                <th className="py-1.5"></th>
                <th className="py-1.5 font-medium">วันที่</th>
                <th className="py-1.5 font-medium">จำนวนเงิน</th>
                <th className="py-1.5 font-medium">คงค้าง</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-sand-700">
                    ไม่มีรายการเดือนนี้
                  </td>
                </tr>
              )}
              {monthEntries.map((e, idx) => {
                runningBal += e.kind === 'sale' ? e.amount : -e.amount
                return (
                  <Fragment key={idx}>
                    <tr className="border-b border-sand-100">
                      <td className="py-1.5">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center ${
                            e.kind === 'sale' ? 'bg-amber-50' : 'bg-teal-50'
                          }`}
                        >
                          {e.kind === 'sale' ? (
                            <ShoppingCart size={12} className="text-amber-800" />
                          ) : (
                            <Banknote size={12} className="text-teal-800" />
                          )}
                        </div>
                      </td>
                      <td className="py-1.5">{fmtDateShort(e.date)}</td>
                      <td className="py-1.5 tabular">
                        {e.kind === 'sale' ? '+' : '-'}
                        {fmtMoney(e.amount)}
                      </td>
                      <td className="py-1.5 tabular">{fmtMoney(runningBal)}</td>
                      <td className="py-1.5">
                        {e.kind === 'sale' && (
                          <button onClick={() => setOpenDetailIdx(openDetailIdx === idx ? null : idx)} aria-label="ดูรายละเอียด">
                            <Eye size={15} className="text-teal-800" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {openDetailIdx === idx && e.kind === 'sale' && (
                      <tr>
                        <td colSpan={5} className="pb-2 pl-8">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-sand-700 text-left">
                                <th className="py-1">สินค้า</th>
                                <th className="py-1">จำนวน</th>
                                <th className="py-1">ราคา</th>
                                <th className="py-1">รวม</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.items.map((it) => (
                                <tr key={it.id} className="border-t border-sand-100">
                                  <td className="py-1">{it.product_name}</td>
                                  <td className="py-1 tabular">{it.qty}</td>
                                  <td className="py-1 tabular">{fmtMoney(it.unit_price)}</td>
                                  <td className="py-1 tabular">{fmtMoney(it.qty * it.unit_price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          <div className="flex justify-between font-semibold border-t border-sand-200 pt-2 mb-4">
            <span>คงค้างสิ้นเดือนนี้</span>
            <span className="tabular">{fmtMoney(runningBal)} บาท</span>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Banknote size={14} className="text-sand-700" />
              <span className="text-xs text-sand-700">บันทึกการจ่ายเงิน</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="จำนวนเงิน"
                className="flex-1 rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
              />
              <button
                onClick={recordPayment}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-teal-600 text-white px-3 py-1.5 text-sm disabled:opacity-60"
              >
                <Plus size={14} />
                บันทึก
              </button>
            </div>
          </div>

          <button onClick={onGotoHistory} className="flex items-center gap-1 text-sm text-teal-800">
            <HistoryIcon size={14} />
            ดูประวัติการซื้อ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <BackButton onClick={onBack} />
      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        <div className="rounded-xl border border-sand-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sand-700 border-b border-sand-200">
                <th className="px-3 py-2 font-medium">Customer</th>
                <th className="px-3 py-2 font-medium">ยอดคงค้าง</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const bal = balance(c.id)
                return (
                  <tr
                    key={c.id}
                    onClick={() => openCustomer(c)}
                    className={`cursor-pointer border-b border-sand-100 last:border-0 ${bal > 0 ? 'bg-amber-50/60' : ''}`}
                  >
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2 tabular">{fmtMoney(bal)} บาท</td>
                    <td className="px-3 py-2 text-teal-800">ดำเนินการ</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
