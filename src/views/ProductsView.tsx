import { useEffect, useState, useCallback, Fragment } from 'react'
import { Sliders, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Product } from '../lib/types'
import BackButton from '../components/BackButton'

export default function ProductsView({ onBack }: { onBack: () => void }) {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('category').order('name')
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(p: Product) {
    if (!isAdmin) return
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    load()
  }

  function startEdit(p: Product) {
    setEditingId(p.id)
    setEditQty(String(p.qty))
  }

  async function saveEdit(p: Product) {
    const newQty = parseFloat(editQty)
    if (Number.isNaN(newQty)) return
    await supabase.from('products').update({ qty: newQty }).eq('id', p.id)
    setEditingId(null)
    load()
  }

  const categories = Array.from(new Set(products.map((p) => p.category)))

  return (
    <div className="max-w-2xl mx-auto">
      <BackButton onClick={onBack} />
      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        categories.map((cat) => (
          <Fragment key={cat}>
            <p className="text-xs text-sand-700 mb-1.5 mt-4 first:mt-0">{cat}</p>
            <div className="rounded-xl border border-sand-200 bg-white overflow-hidden mb-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sand-700 border-b border-sand-200">
                    <th className="px-3 py-2 font-medium">ชื่อ</th>
                    <th className="px-3 py-2 font-medium">หน่วย</th>
                    <th className="px-3 py-2 font-medium">คงเหลือ</th>
                    <th className="px-3 py-2 font-medium">สถานะ</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <tr key={p.id} className={`border-b border-sand-100 last:border-0 ${!p.active ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2">{p.unit}</td>
                        <td className="px-3 py-2 tabular">
                          {editingId === p.id ? (
                            <input
                              type="number"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              className="w-20 rounded-lg border border-sand-200 px-2 py-1 text-sm"
                              autoFocus
                            />
                          ) : (
                            p.qty
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              p.active ? 'bg-teal-50 text-teal-800' : 'bg-sand-100 text-sand-700'
                            }`}
                          >
                            {p.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isAdmin &&
                            (editingId === p.id ? (
                              <>
                                <button onClick={() => saveEdit(p)} className="p-1 text-teal-700" aria-label="บันทึก">
                                  <Check size={16} />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-sand-700" aria-label="ยกเลิก">
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(p)}
                                  className="p-1 text-sand-700 mr-1"
                                  aria-label="ปรับยอด"
                                  title="ปรับยอด"
                                >
                                  <Sliders size={16} />
                                </button>
                                <button
                                  onClick={() => toggleActive(p)}
                                  className="text-xs rounded-md border border-sand-200 px-2 py-1"
                                >
                                  {p.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                </button>
                              </>
                            ))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Fragment>
        ))
      )}
    </div>
  )
}
