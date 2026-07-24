import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fmtMoney } from '../lib/format';
import type { Product } from '../lib/types';

function ProductForm({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: '',
    unit: '',
    buy_price: '',
    sell_price: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.code.trim() || !form.name.trim()) {
      setErr('กรุณาใส่รหัสสินค้าและชื่อสินค้าให้ครบ');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      name: form.name.trim(),
      code: form.code.trim(),
      category: form.category.trim() || 'ทั่วไป',
      unit: form.unit.trim(),
      buy_price: parseFloat(form.buy_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      active: form.active,
      qty: 0,
    });
    setSaving(false);
    if (error) {
      setErr('เพิ่มสินค้าไม่สำเร็จ (รหัสสินค้าอาจซ้ำ)');
      return;
    }
    setForm({
      name: '',
      code: '',
      category: '',
      unit: '',
      buy_price: '',
      sell_price: '',
      active: true,
    });
    onAdded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-sand-200 bg-white p-4"
    >
      <p className="font-medium mb-3">เพิ่มสินค้า</p>
      {(
        [
          ['ชื่อสินค้า', 'name', 'text'],
          ['รหัสสินค้า', 'code', 'text'],
          ['หมวด', 'category', 'text'],
          ['หน่วย', 'unit', 'text'],
          ['ราคาซื้อ (ต่อหน่วย)', 'buy_price', 'number'],
          ['ราคาขาย (ต่อหน่วย)', 'sell_price', 'number'],
        ] as const
      ).map(([label, key, type]) => (
        <div key={key} className="mb-2.5">
          <label className="block text-xs text-sand-700 mb-1">{label}</label>
          <input
            type={type}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
          />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm mb-3">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
        />
        เปิดใช้งาน (Active)
      </label>
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-pond-600 text-white py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? 'กำลังบันทึก...' : 'เพิ่มสินค้า'}
      </button>
    </form>
  );
}

function PartnerForm({
  title,
  table,
  onAdded,
}: {
  title: string;
  table: 'customers' | 'suppliers';
  onAdded: () => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from(table).insert(form);
    setSaving(false);
    setForm({ name: '', phone: '', address: '' });
    onAdded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-sand-200 bg-white p-4"
    >
      <p className="font-medium mb-3">{title}</p>
      <div className="mb-2.5">
        <label className="block text-xs text-sand-700 mb-1">ชื่อ</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="mb-2.5">
        <label className="block text-xs text-sand-700 mb-1">เบอร์โทร</label>
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="mb-3">
        <label className="block text-xs text-sand-700 mb-1">ที่อยู่</label>
        <input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="w-full rounded-lg border border-sand-200 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-pond-600 text-white py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? 'กำลังบันทึก...' : `เพิ่ม${title.replace('เพิ่ม', '')}`}
      </button>
    </form>
  );
}

interface EditState {
  code: string;
  name: string;
  category: string;
  unit: string;
  buy_price: string;
  sell_price: string;
}

function toEditState(p: Product): EditState {
  return {
    code: p.code,
    name: p.name,
    category: p.category,
    unit: p.unit,
    buy_price: String(p.buy_price),
    sell_price: String(p.sell_price),
  };
}

export default function MasterData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('code');
    setProducts((data as Product[]) ?? []);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function toggleActive(p: Product) {
    await supabase
      .from('products')
      .update({ active: !p.active })
      .eq('id', p.id);
    loadProducts();
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditForm(toEditState(p));
    setErr(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setErr(null);
  }

  async function saveEdit(p: Product) {
    if (!editForm) return;
    if (!editForm.code.trim() || !editForm.name.trim()) {
      setErr('กรุณาใส่รหัสสินค้าและชื่อสินค้าให้ครบ');
      return;
    }
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from('products')
      .update({
        code: editForm.code.trim(),
        name: editForm.name.trim(),
        category: editForm.category.trim() || 'ทั่วไป',
        unit: editForm.unit.trim(),
        buy_price: parseFloat(editForm.buy_price) || 0,
        sell_price: parseFloat(editForm.sell_price) || 0,
      })
      .eq('id', p.id);
    setSaving(false);
    if (error) {
      setErr('บันทึกไม่สำเร็จ (รหัสสินค้าอาจซ้ำกับรายการอื่น)');
      return;
    }
    setEditingId(null);
    setEditForm(null);
    loadProducts();
  }

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <ProductForm onAdded={loadProducts} />
        <PartnerForm
          title="เพิ่มผู้ซื้อ (Customer)"
          table="customers"
          onAdded={loadProducts}
        />
        <PartnerForm
          title="เพิ่มผู้ขาย (Supplier)"
          table="suppliers"
          onAdded={loadProducts}
        />
      </div>

      <p className="text-sm text-sand-700 mb-2">รายการสินค้าทั้งหมด</p>
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
      <div className="rounded-xl border border-sand-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-sand-700 border-b border-sand-200">
              <th className="px-3 py-2">รหัส</th>
              <th className="px-3 py-2">ชื่อสินค้า</th>
              <th className="px-3 py-2">หมวด</th>
              <th className="px-3 py-2">หน่วย</th>
              <th className="px-3 py-2">ราคาซื้อ</th>
              <th className="px-3 py-2">ราคาขาย</th>
              <th className="px-3 py-2">สถานะ</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isEditing = editingId === p.id;
              if (isEditing && editForm) {
                return (
                  <tr
                    key={p.id}
                    className="border-b border-sand-100 bg-pond-50/40"
                  >
                    <td className="px-3 py-2">
                      <input
                        value={editForm.code}
                        onChange={(e) =>
                          setEditForm(
                            (f) => f && { ...f, code: e.target.value }
                          )
                        }
                        className="w-24 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm(
                            (f) => f && { ...f, name: e.target.value }
                          )
                        }
                        className="w-full min-w-40 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm(
                            (f) => f && { ...f, category: e.target.value }
                          )
                        }
                        className="w-24 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editForm.unit}
                        onChange={(e) =>
                          setEditForm(
                            (f) => f && { ...f, unit: e.target.value }
                          )
                        }
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editForm.buy_price}
                        onChange={(e) =>
                          setEditForm(
                            (f) => f && { ...f, buy_price: e.target.value }
                          )
                        }
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={editForm.sell_price}
                        onChange={(e) =>
                          setEditForm(
                            (f) => f && { ...f, sell_price: e.target.value }
                          )
                        }
                        className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.active
                            ? 'bg-pond-50 text-pond-600'
                            : 'bg-sand-100 text-sand-700'
                        }`}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => saveEdit(p)}
                        disabled={saving}
                        className="text-xs rounded-md bg-pond-600 text-white px-2 py-1 mr-1 disabled:opacity-60"
                      >
                        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs rounded-md border border-sand-200 px-2 py-1"
                      >
                        ยกเลิก
                      </button>
                    </td>
                  </tr>
                );
              }
              return (
                <tr
                  key={p.id}
                  className={`border-b border-sand-100 ${
                    !p.active ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-3 py-2">{p.code}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.category}</td>
                  <td className="px-3 py-2">{p.unit}</td>
                  <td className="px-3 py-2 tabular">{fmtMoney(p.buy_price)}</td>
                  <td className="px-3 py-2 tabular">
                    {fmtMoney(p.sell_price)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.active
                          ? 'bg-pond-50 text-pond-600'
                          : 'bg-sand-100 text-sand-700'
                      }`}
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-xs rounded-md border border-sand-200 px-2 py-1 mr-1"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => toggleActive(p)}
                      className="text-xs rounded-md border border-sand-200 px-2 py-1"
                    >
                      {p.active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
