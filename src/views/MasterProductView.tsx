import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { fmtMoney } from '../lib/format'
import type { Product } from '../lib/types'
import BackButton from '../components/BackButton'

interface EditState {
  name: string
  category: string
  unit: string
  buy_price: string
  sell_price: string
  qty: string
}

export default function MasterProductView({ onBack }: { onBack: () => void }) {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', category: '', unit: '', buy_price: '', sell_price: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditState | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    const list = (data as Product[]) ?? []
    setProducts(list)
    setCategories(Array.from(new Set(list.map((p) => p.category))))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!form.name.trim()) {
      setErr('กรุณาใส่ชื่อสินค้า')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('products').insert({
      name: form.name.trim(),
      category: form.category.trim() || 'ทั่วไป',
      unit: form.unit.trim(),
      buy_price: parseFloat(form.buy_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      qty: 0,
    })
    setSaving(false)
    if (error) {
      setErr('เพิ่มสินค้าไม่สำเร็จ')
      return
    }
    setForm({ name: '', category: '', unit: '', buy_price: '', sell_price: '' })
    load()
  }

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditForm({
      name: p.name,
      category: p.category,
      unit: p.unit,
      buy_price: String(p.buy_price),
      sell_price: String(p.sell_price),
      qty: String(p.qty),
    })
  }

  async function saveEdit(p: Product) {
    if (!editForm) return
    setSaving(true)
    const { error } = await supabase
      .from('products')
      .update({
        name: editForm.name.trim() || p.name,
        category: editForm.category.trim() || p.category,
        unit: editForm.unit,
        buy_price: parseFloat(editForm.buy_price) || 0,
        sell_price: parseFloat(editForm.sell_price) || 0,
        qty: parseFloat(editForm.qty) || 0,
      })
      .eq('id', p.id)
    setSaving(false)
    if (!error) {
      setEditingId(null)
      setEditForm(null)
      load()
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton onClick={onBack} />

      <form onSubmit={handleAdd} className="rounded-xl border border-sand-200 bg-white p-4 mb-6 max-w-sm">
        <p className="font-medium mb-3">เพิ่มสินค้า</p>
        <div className="mb-2.5">
          <label className="block text-xs text-sand-700 mb-1">ชื่อสินค้า</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="mb-2.5">
          <label className="block text-xs text-sand-700 mb-1">หมวด</label>
          <input
            list="category-list"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          />
          <datalist id="category-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="mb-2.5">
          <label className="block text-xs text-sand-700 mb-1">หน่วย</label>
          <input
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-xs text-sand-700 mb-1">ราคาซื้อ</label>
            <input
              type="number"
              value={form.buy_price}
              onChange={(e) => setForm((f) => ({ ...f, buy_price: e.target.value }))}
              className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-sand-700 mb-1">ราคาขาย</label>
            <input
              type="number"
              value={form.sell_price}
              onChange={(e) => setForm((f) => ({ ...f, sell_price: e.target.value }))}
              className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
        </button>
      </form>

      {isAdmin && (
        <span className="inline-block text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded-full mb-3">
          แก้ไข / ปรับยอด เฉพาะสิทธิ์ Admin
        </span>
      )}

      <div className="rounded-xl border border-sand-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-sand-700 border-b border-sand-200">
              <th className="px-3 py-2 font-medium">ชื่อ</th>
              <th className="px-3 py-2 font-medium">หมวด</th>
              <th className="px-3 py-2 font-medium">หน่วย</th>
              <th className="px-3 py-2 font-medium">ราคาซื้อ</th>
              <th className="px-3 py-2 font-medium">ราคาขาย</th>
              <th className="px-3 py-2 font-medium">คงเหลือ</th>
              {isAdmin && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const editing = isAdmin && editingId === p.id && editForm
              if (editing) {
                return (
                  <tr key={p.id} className="border-b border-sand-100 bg-teal-50/40">
                    <td className="px-3 py-2">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                        className="w-32 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editForm.category}
                        list="category-list"
                        onChange={(e) => setEditForm((f) => f && { ...f, category: e.target.value })}
                        className="w-24 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editForm.unit}
                        onChange={(e) => setEditForm((f) => f && { ...f, unit: e.target.value })}
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editForm.buy_price}
                        onChange={(e) => setEditForm((f) => f && { ...f, buy_price: e.target.value })}
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editForm.sell_price}
                        onChange={(e) => setEditForm((f) => f && { ...f, sell_price: e.target.value })}
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editForm.qty}
                        onChange={(e) => setEditForm((f) => f && { ...f, qty: e.target.value })}
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => saveEdit(p)}
                        disabled={saving}
                        className="text-xs rounded-md bg-teal-600 text-white px-2 py-1 mr-1 disabled:opacity-60"
                      >
                        บันทึก
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditForm(null)
                        }}
                        className="text-xs rounded-md border border-sand-200 px-2 py-1"
                      >
                        ยกเลิก
                      </button>
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={p.id} className={`border-b border-sand-100 last:border-0 ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.category}</td>
                  <td className="px-3 py-2">{p.unit}</td>
                  <td className="px-3 py-2 tabular">{fmtMoney(p.buy_price)}</td>
                  <td className="px-3 py-2 tabular">{fmtMoney(p.sell_price)}</td>
                  <td className="px-3 py-2 tabular">{p.qty}</td>
                  {isAdmin && (
                    <td className="px-3 py-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs rounded-md border border-sand-200 px-2 py-1"
                      >
                        แก้ไข
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
