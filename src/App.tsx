import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import MasterData from './pages/MasterData'
import Adjustment from './pages/Adjustment'
import Users from './pages/Users'

type Tab = 'home' | 'tx' | 'adj' | 'users' | 'master'

const TABS: { key: Tab; label: string; adminOnly?: boolean }[] = [
  { key: 'home', label: 'หน้าหลัก' },
  { key: 'tx', label: 'หน้ารายการ' },
  { key: 'adj', label: 'ปรับยอด', adminOnly: true },
  { key: 'users', label: 'ผู้ใช้งาน', adminOnly: true },
  { key: 'master', label: 'เพิ่มสินค้า/ผู้ซื้อ/ผู้ขาย' },
]

export default function App() {
  const { session, profile, loading, isAdmin, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('home')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sand-700 text-sm">
        กำลังโหลด...
      </div>
    )
  }

  if (!session) return <Login />

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin)
  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : 'home'

  return (
    <div className="min-h-screen">
      <header className="border-b border-sand-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-pond-600 font-medium">
              ระบบรับ-จ่ายสต็อกสินค้า
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-sand-700">
            <span>
              {profile?.full_name} ({profile?.role})
            </span>
            <button onClick={() => signOut()} className="text-pond-600 font-medium">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <nav className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-1 border-b border-sand-200 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 ${
                activeTab === t.key
                  ? 'border-pond-600 text-sand-900 font-medium'
                  : 'border-transparent text-sand-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'home' && <Home />}
        {activeTab === 'tx' && <Transactions />}
        {activeTab === 'adj' && isAdmin && <Adjustment />}
        {activeTab === 'users' && isAdmin && <Users />}
        {activeTab === 'master' && <MasterData />}
      </main>
    </div>
  )
}
