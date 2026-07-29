import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './views/Home'
import ProductsView from './views/ProductsView'
import TradeView from './views/TradeView'
import FinanceView from './views/FinanceView'
import MasterProductView from './views/MasterProductView'
import MasterPartnerView from './views/MasterPartnerView'

export type View = 'home' | 'products' | 'trade' | 'finance' | 'master-product' | 'master-partner'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()
  const [view, setView] = useState<View>('home')

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sand-700 text-sm">กำลังโหลด...</div>
  }

  if (!session) return <Login />

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 pt-3 flex justify-end">
        <div className="flex items-center gap-3 text-xs text-sand-700">
          <span>
            {profile?.full_name} ({profile?.role})
          </span>
          <button onClick={() => signOut()} className="text-teal-800 font-medium">
            ออกจากระบบ
          </button>
        </div>
      </div>

      <main className="px-4 py-6">
        {view === 'home' && <Home onNavigate={setView} />}
        {view === 'products' && <ProductsView onBack={() => setView('home')} />}
        {view === 'trade' && <TradeView onBack={() => setView('home')} />}
        {view === 'finance' && <FinanceView onBack={() => setView('home')} />}
        {view === 'master-product' && <MasterProductView onBack={() => setView('home')} />}
        {view === 'master-partner' && <MasterPartnerView onBack={() => setView('home')} />}
      </main>
    </div>
  )
}
