import { useEffect, useState, useCallback } from 'react'
import { User, Store, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { fmtMoney } from '../lib/format'
import type { Customer, Supplier, Product } from '../lib/types'
import BackButton from '../components/BackButton'

interface PendingLine {
  productId: string
  productName: string
  price: number
}

export default function MasterPartnerView({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'customer' | 'supplier'>('customer')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [supplierLinks, setSupplierLinks] = useState<Record<string, { name: string; price: number }[]>>({})

  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')

  const [supName, setSupName] = useState('')
  const [supPhone, setSupPhone] = useState('')
  const [pending, setPending] = useState<PendingLine[]>([])

  const [npName, setNpName] = useState('')
  const [npCategory, setNpCategory] = useState('')
  const [npUnit, setNpUnit] = useState('')
  const [npBuy, setNpBuy] = useState('')
  const [npSell, setNpSell] = useState('')
  const [saving, setSaving] = useState(false)

  const [editCustId, setEditCustId] = useState<string | null>(null)
  const [editCustForm, setEditCustForm] = useState({ name: '', phone: '' })
  const [editSupId, setEditSupId] = useState<string | null>(null)
  const [editSupForm, setEditSupForm] = useState({ name: '', phone: '' })

  const load = useCallback(async () => {
    const [{ data: cust }, { data: sup }, { data: prod }, { data: links }] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
      supabase.from('supplier_products').select('supplier_id, price, products(name)'),
    ])
    setCustomers((cust as Customer[]) ?? [])
    setSuppliers((sup as Supplier[]) ?? [])
    const plist = (prod as Product[]) ?? []
    setProducts(plist)
    setCategories(Array.from(new Set(plist.map((p) => p.category))))

    const grouped: Record<string, { name: string; price: number }[]> = {}
    ;(links as unknown as { supplier_id: string; price: number; products: { name: string } | null }[] | null)?.forEach(
      (l) => {
        if (!grouped[l.supplier_id]) grouped[l.supplier_id] = []
        grouped[l.supplier_id].push({ name: l.products?.name ?? '-', price: l.price })
      }
    )
    setSupplierLinks(grouped)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addCustomer() {
    if (!custName.trim()) return
    setSaving(true)
    await supabase.from('customers').insert({ name: custName.trim(), phone: custPhone.trim() })
    setSaving(false)
    setCustName('')
    setCustPhone('')
    load()
  }

  function onProductNameInput(value: string) {
    setNpName(value)
    const match = products.find((p) => p.name === value)
    if (match) {
      setNpCategory(match.category)
      setNpUnit(match.unit)
      setNpBuy(String(match.buy_price))
      setNpSell(String(match.sell_price))
    }
  }

  async function addPendingLine() {
    const name = npName.trim()
    if (!name) return
    let product = products.find((p) => p.name === name)
    if (!product) {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name,
          category: npCategory.trim() || 'ทั่วไป',
          unit: npUnit.trim(),
          buy_price: parseFloat(npBuy) || 0,
          sell_price: parseFloat(npSell) || 0,
          qty: 0,
        })
        .select()
        .single()
      if (error || !data) return
      product = data as Product
      setProducts((ps) => [...ps, product as Product])
      if (!categories.includes(product.category)) setCategories((c) => [...c, (product as Product).category])
    }
    setPending((p) => [
      ...p,
      { productId: product!.id, productName: product!.name, price: parseFloat(npBuy) || product!.buy_price },
    ])
    setNpName('')
    setNpCategory('')
    setNpUnit('')
    setNpBuy('')
    setNpSell('')
  }

  function removePending(i: number) {
    setPending((p) => p.filter((_, idx) => idx !== i))
  }

  async function addSupplier() {
    if (!supName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ name: supName.trim(), phone: supPhone.trim() })
      .select()
      .single()
    if (!error && data) {
      const rows = pending.map((p) => ({ supplier_id: data.id, product_id: p.productId, price: p.price }))
      if (rows.length > 0) await supabase.from('supplier_products').insert(rows)
    }
    setSaving(false)
    setSupName('')
    setSupPhone('')
    setPending([])
    load()
  }

  function startEditCustomer(c: Customer) {
    setEditCustId(c.id)
    setEditCustForm({ name: c.name, phone: c.phone ?? '' })
  }
  async function saveEditCustomer(id: string) {
    if (!editCustForm.name.trim()) return
    await supabase
      .from('customers')
      .update({ name: editCustForm.name.trim(), phone: editCustForm.phone.trim() })
      .eq('id', id)
    setEditCustId(null)
    load()
  }

  function startEditSupplier(s: Supplier) {
    setEditSupId(s.id)
    setEditSupForm({ name: s.name, phone: s.phone ?? '' })
  }
  async function saveEditSupplier(id: string) {
    if (!editSupForm.name.trim()) return
    await supabase
      .from('suppliers')
      .update({ name: editSupForm.name.trim(), phone: editSupForm.phone.trim() })
      .eq('id', id)
    setEditSupId(null)
    load()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton onClick={onBack} />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('customer')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm ${
            mode === 'customer' ? 'bg-purple-50 text-purple-800' : 'bg-white border border-sand-200 text-sand-700'
          }`}
        >
          <User size={16} />
          ผู้ซื้อ
        </button>
        <button
          onClick={() => setMode('supplier')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm ${
            mode === 'supplier' ? 'bg-purple-50 text-purple-800' : 'bg-white border border-sand-200 text-sand-700'
          }`}
        >
          <Store size={16} />
          ผู้ขาย
        </button>
      </div>

      {mode === 'customer' ? (
        <div className="rounded-xl border border-sand-200 bg-white p-4 max-w-sm mb-6">
          <p className="font-medium mb-3">เพิ่มผู้ซื้อ (Customer)</p>
          <div className="mb-2.5">
            <label className="block text-xs text-sand-700 mb-1">ชื่อ (บังคับ)</label>
            <input
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-sand-700 mb-1">เบอร์โทร</label>
            <input
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={addCustomer}
            disabled={saving}
            className="w-full rounded-lg bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-60"
          >
            เพิ่มผู้ซื้อ
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-sand-200 bg-white p-4 max-w-md mb-6">
          <p className="font-medium mb-3">เพิ่มผู้ขาย (Supplier)</p>
          <div className="mb-2.5">
            <label className="block text-xs text-sand-700 mb-1">ชื่อ (บังคับ)</label>
            <input
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-sand-700 mb-1">เบอร์โทร</label>
            <input
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
              className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="border-t border-sand-200 pt-3">
            <label className="block text-xs text-sand-700 mb-1">
              เพิ่มสินค้าที่ขายให้เรา (พิมพ์ชื่อใหม่ = สร้างสินค้า/หมวดใหม่อัตโนมัติ)
            </label>
            <input
              value={npName}
              onChange={(e) => onProductNameInput(e.target.value)}
              list="existing-products"
              placeholder="ชื่อสินค้า"
              className="w-full mb-2 rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
            <datalist id="existing-products">
              {products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                value={npCategory}
                onChange={(e) => setNpCategory(e.target.value)}
                list="category-list-2"
                placeholder="หมวด"
                className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
              />
              <datalist id="category-list-2">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <input
                value={npUnit}
                onChange={(e) => setNpUnit(e.target.value)}
                placeholder="หน่วย"
                className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="number"
                value={npBuy}
                onChange={(e) => setNpBuy(e.target.value)}
                placeholder="ราคาซื้อ"
                className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
              />
              <input
                type="number"
                value={npSell}
                onChange={(e) => setNpSell(e.target.value)}
                placeholder="ราคาขาย"
                className="rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={addPendingLine}
              className="flex items-center gap-1 text-xs rounded-md border border-sand-200 px-2 py-1 mb-3"
            >
              <Plus size={14} />
              เพิ่มรายการสินค้านี้
            </button>

            {pending.length > 0 && (
              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="text-sand-700 text-left">
                    <th className="py-1">สินค้า</th>
                    <th className="py-1">ราคา</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p, i) => (
                    <tr key={i} className="border-t border-sand-100">
                      <td className="py-1">{p.productName}</td>
                      <td className="py-1 tabular">{fmtMoney(p.price)}</td>
                      <td className="py-1">
                        <button onClick={() => removePending(i)} className="text-red-500">
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button
            onClick={addSupplier}
            disabled={saving}
            className="w-full rounded-lg bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-60"
          >
            เพิ่มผู้ขาย
          </button>
        </div>
      )}

      <p className="text-sm text-sand-700 mb-2">ผู้ซื้อทั้งหมด</p>
      <div className="rounded-xl border border-sand-200 bg-white overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-sand-700 border-b border-sand-200">
              <th className="px-3 py-2 font-medium">ชื่อ</th>
              <th className="px-3 py-2 font-medium">เบอร์โทร</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) =>
              editCustId === c.id ? (
                <tr key={c.id} className="border-b border-sand-100 last:border-0 bg-teal-50/40">
                  <td className="px-3 py-2">
                    <input
                      value={editCustForm.name}
                      onChange={(e) => setEditCustForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-sand-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editCustForm.phone}
                      onChange={(e) => setEditCustForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-lg border border-sand-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => saveEditCustomer(c.id)}
                      className="text-xs rounded-md bg-teal-600 text-white px-2 py-1 mr-1"
                    >
                      บันทึก
                    </button>
                    <button onClick={() => setEditCustId(null)} className="text-xs rounded-md border border-sand-200 px-2 py-1">
                      ยกเลิก
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="border-b border-sand-100 last:border-0">
                  <td className="px-3 py-2">{c.name || <span className="text-sand-700">(ไม่มีชื่อ)</span>}</td>
                  <td className="px-3 py-2">{c.phone}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => startEditCustomer(c)}
                      className="text-xs rounded-md border border-sand-200 px-2 py-1"
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-sand-700 mb-2">ผู้ขายทั้งหมด</p>
      <div className="rounded-xl border border-sand-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-sand-700 border-b border-sand-200">
              <th className="px-3 py-2 font-medium">ชื่อ</th>
              <th className="px-3 py-2 font-medium">เบอร์โทร</th>
              <th className="px-3 py-2 font-medium">สินค้าที่ขายให้</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) =>
              editSupId === s.id ? (
                <tr key={s.id} className="border-b border-sand-100 last:border-0 bg-teal-50/40">
                  <td className="px-3 py-2">
                    <input
                      value={editSupForm.name}
                      onChange={(e) => setEditSupForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-lg border border-sand-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={editSupForm.phone}
                      onChange={(e) => setEditSupForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-lg border border-sand-200 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-sand-700">{(supplierLinks[s.id] ?? []).map((l) => l.name).join(', ') || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => saveEditSupplier(s.id)}
                      className="text-xs rounded-md bg-teal-600 text-white px-2 py-1 mr-1"
                    >
                      บันทึก
                    </button>
                    <button onClick={() => setEditSupId(null)} className="text-xs rounded-md border border-sand-200 px-2 py-1">
                      ยกเลิก
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-b border-sand-100 last:border-0">
                  <td className="px-3 py-2">{s.name || <span className="text-sand-700">(ไม่มีชื่อ)</span>}</td>
                  <td className="px-3 py-2">{s.phone}</td>
                  <td className="px-3 py-2">{(supplierLinks[s.id] ?? []).map((l) => l.name).join(', ') || '-'}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => startEditSupplier(s)}
                      className="text-xs rounded-md border border-sand-200 px-2 py-1"
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
