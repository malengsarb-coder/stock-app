import { Fragment, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { todayIso } from '../lib/format'
import type { Product, Partner, TxType } from '../lib/types'
import StockInOutModal from '../components/StockInOutModal'

interface DailyLine {
  partner_name: string
  qty: number
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Partner[]>([])
  const [customers, setCustomers] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)

  const [modalType, setModalType] = useState<TxType | null>(null)
  const [prefillProductId, setPrefillProductId] = useState<string | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [inLines, setInLines] = useState<DailyLine[]>([])
  const [outLines, setOutLines] = useState<DailyLine[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [{ data: prod }, { data: sup }, { data: cust }] = await Promise.all([
      supabase.from('products').select('*').order('category').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('customers').select('*').order('name'),
    ])
    setProducts((prod as Product[]) ?? [])
    setSuppliers((sup as Partner[]) ?? [])
    setCustomers((cust as Partner[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const loadDetail = useCallback(async (product: Product, date: string) => {
    setDetailLoading(true)
    const { data } = await supabase
      .from('transaction_items')
      .select('qty, product_id, transactions!inner(type, partner_name, transaction_date)')
      .eq('product_id', product.id)
      .eq('transactions.transaction_date', date)
    const rows = (data ?? []) as unknown as {
      qty: number
      transactions: { type: TxType; partner_name: string }
    }[]
    setInLines(
      rows
        .filter((r) => r.transactions.type === 'in')
        .map((r) => ({ partner_name: r.transactions.partner_name, qty: r.qty }))
    )
    setOutLines(
      rows
        .filter((r) => r.transactions.type === 'out')
        .map((r) => ({ partner_name: r.transactions.partner_name, qty: r.qty }))
    )
    setDetailLoading(false)
  }, [])

  function openDetail(p: Product) {
    setSelectedProduct(p)
    loadDetail(p, selectedDate)
  }

  function onDateChange(d: string) {
    setSelectedDate(d)
    if (selectedProduct) loadDetail(selectedProduct, d)
  }

  function openModal(type: TxType, productId: string | null) {
    setModalType(type)
    setPrefillProductId(productId)
  }

  const categories = Array.from(new Set(products.map((p) => p.category)))

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => openModal('in', null)}
          className="rounded-lg bg-pond-600 text-white text-sm font-medium px-4 py-2"
        >
          + บันทึกรับสินค้าเข้า
        </button>
        <button
          onClick={() => openModal('out', null)}
          className="rounded-lg bg-grain-500 text-white text-sm font-medium px-4 py-2"
        >
          + บันทึกจ่ายสินค้าออก
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-sand-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sand-700 border-b border-sand-200">
                <th className="px-3 py-2">สินค้า</th>
                <th className="px-3 py-2">หน่วย</th>
                <th className="px-3 py-2">คงเหลือ</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <Fragment key={cat}>
                  <tr className="bg-sand-100">
                    <td colSpan={4} className="px-3 py-1.5 font-medium text-sand-700">
                      {cat}
                    </td>
                  </tr>
                  {products
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <tr key={p.id} className={`border-b border-sand-100 ${!p.active ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => openDetail(p)}
                            className="text-pond-600 hover:underline text-left"
                          >
                            {p.name}
                          </button>
                        </td>
                        <td className="px-3 py-2">{p.unit}</td>
                        <td className="px-3 py-2 tabular">{p.qty}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {p.active ? (
                            <>
                              <button
                                onClick={() => openModal('in', p.id)}
                                className="text-xs rounded-md border border-sand-200 px-2 py-1 mr-1"
                              >
                                รับเข้า
                              </button>
                              <button
                                onClick={() => openModal('out', p.id)}
                                className="text-xs rounded-md border border-sand-200 px-2 py-1"
                              >
                                จ่ายออก
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-sand-700">ปิดใช้งาน</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedProduct && (
        <div className="mt-4 rounded-xl border border-sand-200 bg-white p-4">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
            <p className="font-medium">รายละเอียด: {selectedProduct.name}</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="rounded-lg border border-sand-200 px-2 py-1 text-sm"
            />
          </div>
          {detailLoading ? (
            <p className="text-sm text-sand-700">กำลังโหลด...</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-sand-700 mb-1">Supplier ที่ส่งมอบวันนี้</p>
                <ul className="text-sm space-y-1">
                  {inLines.length === 0 && <li className="text-sand-700">ไม่มีรายการ</li>}
                  {inLines.map((l, i) => (
                    <li key={i} className="flex justify-between border-b border-sand-100 py-1">
                      <span>{l.partner_name}</span>
                      <span className="tabular">{l.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-sand-700 mb-1">Customer ที่ซื้อวันนี้</p>
                <ul className="text-sm space-y-1">
                  {outLines.length === 0 && <li className="text-sand-700">ไม่มีรายการ</li>}
                  {outLines.map((l, i) => (
                    <li key={i} className="flex justify-between border-b border-sand-100 py-1">
                      <span>{l.partner_name}</span>
                      <span className="tabular">{l.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {modalType && (
        <StockInOutModal
          open={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
          products={products}
          partners={modalType === 'in' ? suppliers : customers}
          prefillProductId={prefillProductId}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}
