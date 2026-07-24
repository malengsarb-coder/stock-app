import { Fragment, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney, fmtDateShort } from '../lib/format'
import type { FlatTxItem, TxType } from '../lib/types'

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
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

function PartnerSection({
  title,
  type,
  items,
  onPaid,
}: {
  title: string
  type: TxType
  items: FlatTxItem[]
  onPaid: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  const [openPartner, setOpenPartner] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmGroup, setConfirmGroup] = useState<{ partner: string; items: FlatTxItem[] } | null>(null)
  const [saving, setSaving] = useState(false)

  const groups = groupByPartner(items).filter((g) => showAll || g.total > 0)

  function toggleOpen(name: string) {
    setOpenPartner((cur) => (cur === name ? null : name))
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirmPayment() {
    if (!confirmGroup) return
    setSaving(true)
    const ids = confirmGroup.items.map((i) => i.item_id)
    await supabase
      .from('transaction_items')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .in('id', ids)
    setSaving(false)
    setConfirmGroup(null)
    setSelected(new Set())
    onPaid()
  }

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <p className="font-medium">{title}</p>
        <button
          onClick={() => setShowAll((s) => !s)}
          className="text-xs rounded-md border border-sand-200 px-2 py-1"
        >
          {showAll ? 'เฉพาะที่ค้างชำระ' : 'แสดงทั้งหมด'}
        </button>
      </div>

      <div className="rounded-xl border border-sand-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-sand-700 border-b border-sand-200">
              <th className="px-3 py-2">ชื่อ</th>
              <th className="px-3 py-2">ยอดค้างชำระ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-3 text-sand-700">
                  ไม่มีรายการค้างชำระ
                </td>
              </tr>
            )}
            {groups.map((g) => {
              const open = openPartner === g.partner
              const visibleItems = showAll ? g.items : g.items.filter((i) => !i.paid)
              const selectedItems = visibleItems.filter((i) => selected.has(i.item_id))
              const selectedSum = selectedItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
              return (
                <Fragment key={g.partner}>
                  <tr
                    onClick={() => toggleOpen(g.partner)}
                    className={`cursor-pointer border-b border-sand-100 ${g.total > 0 ? 'bg-owe-50' : ''}`}
                  >
                    <td className="px-3 py-2">{g.partner}</td>
                    <td className="px-3 py-2 tabular">{g.total > 0 ? `${fmtMoney(g.total)} บาท` : '-'}</td>
                    <td className="px-3 py-2 text-pond-600">{open ? 'ซ่อนรายการ ▲' : 'ดูรายการ ▼'}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={3} className="px-6 pb-4">
                        <table className="w-full text-xs mb-2">
                          <thead>
                            <tr className="text-sand-700">
                              <th className="py-1 text-left"></th>
                              <th className="py-1 text-left">วันที่</th>
                              <th className="py-1 text-left">รายการ</th>
                              <th className="py-1 text-left">จำนวน</th>
                              <th className="py-1 text-left">จำนวนเงิน</th>
                              <th className="py-1 text-left">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleItems.map((it) => (
                              <tr key={it.item_id} className="border-t border-sand-100">
                                <td className="py-1.5">
                                  {!it.paid && (
                                    <input
                                      type="checkbox"
                                      checked={selected.has(it.item_id)}
                                      onChange={() => toggleSelect(it.item_id)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                </td>
                                <td className="py-1.5">{fmtDateShort(it.transaction_date)}</td>
                                <td className="py-1.5">{it.product_name}</td>
                                <td className="py-1.5 tabular">
                                  {it.qty}
                                </td>
                                <td className="py-1.5 tabular">{fmtMoney(it.qty * it.unit_price)}</td>
                                <td className="py-1.5">{it.paid ? 'ชำระแล้ว' : 'รอชำระ'}</td>
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
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmGroup({ partner: g.partner, items: selectedItems })
                              }}
                              className="text-xs rounded-md bg-pond-600 text-white px-3 py-1.5"
                            >
                              ยืนยันการชำระ
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {confirmGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setConfirmGroup(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-semibold mb-1">ยืนยันการชำระเงิน</p>
            <p className="text-sm text-sand-700 mb-3">
              {type === 'in' ? 'ผู้ขาย' : 'ผู้ซื้อ'}: {confirmGroup.partner}
            </p>
            <table className="w-full text-sm mb-3">
              <thead>
                <tr className="text-sand-700 text-left">
                  <th className="py-1">รายการ</th>
                  <th className="py-1">จำนวน</th>
                  <th className="py-1">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {confirmGroup.items.map((it) => (
                  <tr key={it.item_id} className="border-t border-sand-100">
                    <td className="py-1">{it.product_name}</td>
                    <td className="py-1 tabular">{it.qty}</td>
                    <td className="py-1 tabular">{fmtMoney(it.qty * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-semibold border-t border-sand-200 pt-2 mb-4">
              <span>รวม</span>
              <span className="tabular">
                {fmtMoney(confirmGroup.items.reduce((s, i) => s + i.qty * i.unit_price, 0))} บาท
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmGroup(null)}
                className="flex-1 rounded-lg border border-sand-200 py-2 text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmPayment}
                disabled={saving}
                className="flex-1 rounded-lg bg-pond-600 text-white py-2 text-sm font-medium disabled:opacity-60"
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

export default function Transactions() {
  const [items, setItems] = useState<FlatTxItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transaction_items')
      .select(
        'id, transaction_id, product_id, product_name, qty, unit_price, paid, transactions!inner(type, partner_name, transaction_date)'
      )
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as unknown as {
      id: string
      transaction_id: string
      product_id: string | null
      product_name: string
      qty: number
      unit_price: number
      paid: boolean
      transactions: { type: TxType; partner_name: string; transaction_date: string }
    }[]
    setItems(
      rows.map((r) => ({
        item_id: r.id,
        transaction_id: r.transaction_id,
        type: r.transactions.type,
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

  if (loading) return <p className="text-sm text-sand-700">กำลังโหลด...</p>

  return (
    <div>
      <PartnerSection
        title="ส่วนที่ 1 — ผู้ขาย (Supplier) ที่ซื้อเข้า"
        type="in"
        items={items.filter((i) => i.type === 'in')}
        onPaid={load}
      />
      <PartnerSection
        title="ส่วนที่ 2 — ผู้ซื้อ (Customer) ที่ขายออก"
        type="out"
        items={items.filter((i) => i.type === 'out')}
        onPaid={load}
      />
    </div>
  )
}
