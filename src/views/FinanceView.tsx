import { useEffect, useState, useCallback, Fragment } from 'react'
import { ArrowUpCircle, ArrowDownCircle, ChevronRight, Store, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney, fmtDateShort } from '../lib/format'
import type { FlatTxItem, TxType } from '../lib/types'
import BackButton from '../components/BackButton'

interface Group {
  partner: string
  total: number
  items: FlatTxItem[]
}

function groupByPartner(items: FlatTxItem[]): Group[] {
  const map = new Map<string, Group>()
  for (const it of items) {
    if (!map.has(it.partner_name)) map.set(it.partner_name, { partner: it.partner_name, total: 0, items: [] })
    const g = map.get(it.partner_name)!
    g.items.push(it)
    if (!it.paid) g.total += it.qty * it.unit_price
  }
  return Array.from(map.values())
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total)
}

export default function FinanceView({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<FlatTxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openPartner, setOpenPartner] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmGroup, setConfirmGroup] = useState<{ partner: string; items: FlatTxItem[] } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transaction_items')
      .select(
        'id, transaction_id, product_id, product_name, qty, unit_price, paid, transactions!inner(type, partner_id, partner_name, transaction_date)'
      )
    const rows = (data ?? []) as unknown as {
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

  const payable = groupByPartner(items.filter((i) => i.type === 'in'))
  const receivable = groupByPartner(items.filter((i) => i.type === 'out'))

  function toggleOpen(name: string) {
    setOpenPartner((cur) => (cur === name ? null : name))
    setSelected(new Set())
  }
  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  async function confirmPayment() {
    if (!confirmGroup) return
    setSaving(true)
    const ids = confirmGroup.items.map((i) => i.item_id)
    await supabase.from('transaction_items').update({ paid: true, paid_at: new Date().toISOString() }).in('id', ids)
    setSaving(false)
    setConfirmGroup(null)
    setSelected(new Set())
    load()
  }

  function Section({ title, icon: Icon, tint, groups }: { title: string; icon: typeof ArrowUpCircle; tint: string; groups: Group[] }) {
    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 rounded-lg ${tint} px-3 py-2 mb-2`}>
          <Icon size={16} />
          <span className="text-sm">{title}</span>
        </div>
        <div className="rounded-xl border border-sand-200 bg-white overflow-hidden">
          {groups.length === 0 && <p className="text-sm text-sand-700 px-3 py-3">ไม่มียอดค้าง</p>}
          {groups.map((g) => {
            const open = openPartner === g.partner
            const unpaidItems = g.items.filter((i) => !i.paid)
            const selectedItems = unpaidItems.filter((i) => selected.has(i.item_id))
            const selectedSum = selectedItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
            return (
              <Fragment key={g.partner}>
                <button
                  onClick={() => toggleOpen(g.partner)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-sand-100 last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-sand-100 flex items-center justify-center flex-shrink-0">
                    {title.includes('จ่าย') ? <Store size={14} className="text-sand-700" /> : <User size={14} className="text-sand-700" />}
                  </div>
                  <span className="flex-1 text-sm text-left truncate">{g.partner}</span>
                  <span className="text-sm font-medium tabular">{fmtMoney(g.total)}</span>
                  <ChevronRight size={16} className={`text-sand-700 transition-transform ${open ? 'rotate-90' : ''}`} />
                </button>
                {open && (
                  <div className="px-3 pb-3 border-b border-sand-100 last:border-0">
                    <table className="w-full text-xs mb-2">
                      <tbody>
                        {unpaidItems.map((it) => (
                          <tr key={it.item_id} className="border-t border-sand-100">
                            <td className="py-1.5 w-6">
                              <input
                                type="checkbox"
                                checked={selected.has(it.item_id)}
                                onChange={() => toggleSelect(it.item_id)}
                              />
                            </td>
                            <td className="py-1.5">{fmtDateShort(it.transaction_date)}</td>
                            <td className="py-1.5">{it.product_name}</td>
                            <td className="py-1.5 tabular">{it.qty}</td>
                            <td className="py-1.5 tabular text-right">{fmtMoney(it.qty * it.unit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedItems.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-sand-700">
                          เลือกแล้ว {selectedItems.length} รายการ ({fmtMoney(selectedSum)} บาท)
                        </span>
                        <button
                          onClick={() => setConfirmGroup({ partner: g.partner, items: selectedItems })}
                          className="text-xs rounded-md bg-teal-600 text-white px-3 py-1.5"
                        >
                          ยืนยันการชำระ
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton onClick={onBack} />
      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        <>
          <Section title="ยอดค้างจ่าย (Supplier)" icon={ArrowUpCircle} tint="bg-coral-50 text-coral-800" groups={payable} />
          <Section title="ยอดค้างเก็บ (Customer)" icon={ArrowDownCircle} tint="bg-teal-50 text-teal-800" groups={receivable} />
        </>
      )}

      {confirmGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setConfirmGroup(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-1">ยืนยันการชำระเงิน</p>
            <p className="text-sm text-sand-700 mb-3">{confirmGroup.partner}</p>
            <table className="w-full text-sm mb-3">
              <tbody>
                {confirmGroup.items.map((it) => (
                  <tr key={it.item_id} className="border-t border-sand-100">
                    <td className="py-1">{it.product_name}</td>
                    <td className="py-1 tabular">{it.qty}</td>
                    <td className="py-1 tabular text-right">{fmtMoney(it.qty * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-semibold border-t border-sand-200 pt-2 mb-4">
              <span>รวม</span>
              <span className="tabular">{fmtMoney(confirmGroup.items.reduce((s, i) => s + i.qty * i.unit_price, 0))} บาท</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmGroup(null)} className="flex-1 rounded-lg border border-sand-200 py-2 text-sm font-medium">
                ยกเลิก
              </button>
              <button
                onClick={confirmPayment}
                disabled={saving}
                className="flex-1 rounded-lg bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'กำลังบันทึก...' : 'ยืนยันชำระแล้ว'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
