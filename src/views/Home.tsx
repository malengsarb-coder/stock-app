import { Package, History, ShoppingCart, Truck, ArrowDownCircle, ArrowUpCircle, PackagePlus, Users, Anchor } from 'lucide-react'
import type { View } from '../App'

const TILES: { view: View; label: string; icon: typeof Package; bg: string; fg: string }[] = [
  { view: 'products', label: 'สินค้า', icon: Package, bg: 'bg-teal-50', fg: 'text-teal-800' },
  { view: 'history', label: 'ประวัติซื้อขาย', icon: History, bg: 'bg-slate-50', fg: 'text-slate-800' },
  { view: 'buy', label: 'ซื้อ', icon: ShoppingCart, bg: 'bg-amber-50', fg: 'text-amber-800' },
  { view: 'sell', label: 'ขาย', icon: Truck, bg: 'bg-amber-50', fg: 'text-amber-800' },
  { view: 'receivable', label: 'รายรับ', icon: ArrowDownCircle, bg: 'bg-teal-50', fg: 'text-teal-800' },
  { view: 'payable', label: 'รายจ่าย', icon: ArrowUpCircle, bg: 'bg-coral-50', fg: 'text-coral-800' },
  { view: 'master-product', label: 'เพิ่มสินค้า', icon: PackagePlus, bg: 'bg-purple-50', fg: 'text-purple-800' },
  { view: 'master-partner', label: 'เพิ่มผู้ซื้อ/ผู้ขาย', icon: Users, bg: 'bg-pink-50', fg: 'text-pink-800' },
]

export default function Home({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
          <Anchor size={20} className="text-teal-800" />
        </div>
        <div>
          <p className="font-medium text-sand-900">แพกุ้งโชคศิริวัฒน์ฟาร์ม</p>
          <p className="text-xs text-sand-700">ระบบจัดการสต็อก</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {TILES.map((t) => (
          <button
            key={t.view}
            onClick={() => onNavigate(t.view)}
            className="bg-white border border-sand-200 rounded-2xl py-5 px-2 text-center hover:border-sand-700/30"
          >
            <div className={`w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center mx-auto mb-2`}>
              <t.icon size={22} className={t.fg} />
            </div>
            <p className="text-sm text-sand-900">{t.label}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
