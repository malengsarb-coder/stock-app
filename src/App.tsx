import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './views/Home'
import ProductsView from './views/ProductsView'
import TradeHistoryView from './views/TradeHistoryView'
import BuyView from './views/BuyView'
import SellView from './views/SellView'
import ReceivableView from './views/ReceivableView'
import PayableView from './views/PayableView'
import MasterProductView from './views/MasterProductView'
import MasterPartnerView from './views/MasterPartnerView'

export type View =
  | 'home'
  | 'products'
  | 'history'
  | 'buy'
  | 'sell'
  | 'receivable'
  | 'payable'
  | 'master-product'
  | 'master-partner'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()
  const [view, setView] = useState<View>('home')
  const [focusSupplierId, setFocusSupplierId] = useState<string | null>(null)
  const [focusCustomerId, setFocusCustomerId] = useState<string | null>(null)
  const [focusCustomerName, setFocusCustomerName] = useState<string | null>(null)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sand-700 text-sm">กำลังโหลด...</div>
  }

  if (!session) return <Login />

  function goHome() {
    setView('home')
    setFocusSupplierId(null)
    setFocusCustomerId(null)
    setFocusCustomerName(null)
  }

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
        {view === 'products' && <ProductsView onBack={goHome} />}
        {view === 'history' && <TradeHistoryView onBack={goHome} />}
        {view === 'buy' && (
          <BuyView
            onBack={goHome}
            onGotoPayable={(supplierId) => {
              setFocusSupplierId(supplierId)
              setView('payable')
            }}
          />
        )}
        {view === 'sell' && (
          <SellView
            onBack={goHome}
            onGotoReceivable={(customerId, name) => {
              setFocusCustomerId(customerId)
              setFocusCustomerName(name)
              setView('receivable')
            }}
          />
        )}
        {view === 'receivable' && (
          <ReceivableView
            onBack={goHome}
            onGotoHistory={() => setView('history')}
            focusCustomerId={focusCustomerId}
            focusCustomerName={focusCustomerName}
          />
        )}
        {view === 'payable' && (
          <PayableView onBack={goHome} onGotoHistory={() => setView('history')} focusSupplierId={focusSupplierId} />
        )}
        {view === 'master-product' && <MasterProductView onBack={goHome} />}
        {view === 'master-partner' && <MasterPartnerView onBack={goHome} />}
      </main>
    </div>
  )
}
