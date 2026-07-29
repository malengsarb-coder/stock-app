import { useEffect, useState, useCallback, Fragment } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Product } from '../lib/types'
import BackButton from '../components/BackButton'

export default function ProductsView({ onBack }: { onBack: () => void }) {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

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
                    <th className="px-3 py-2 font-medium">จำนวน</th>
                    <th className="px-3 py-2 font-medium">สถานะ</th>
                    {isAdmin && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <tr key={p.id} className={`border-b border-sand-100 last:border-0 ${!p.active ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2">{p.name}</td>
                        <td className="px-3 py-2">{p.unit}</td>
                        <td className="px-3 py-2 tabular">{p.qty}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              p.active ? 'bg-teal-50 text-teal-800' : 'bg-sand-100 text-sand-700'
                            }`}
                          >
                            {p.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2">
                            <button
                              onClick={() => toggleActive(p)}
                              className="text-xs rounded-md border border-sand-200 px-2 py-1"
                            >
                              {p.active ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                            </button>
                          </td>
                        )}
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
