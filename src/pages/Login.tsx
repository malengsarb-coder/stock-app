import { useState, type FormEvent } from 'react'
import { Anchor } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError('เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมล/รหัสผ่านอีกครั้ง')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-sand-200 rounded-2xl p-8 shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
          <Anchor size={20} className="text-teal-800" />
        </div>
        <p className="font-medium text-sand-900 mb-0.5">แพกุ้งโชคศิริวัฒน์ฟาร์ม</p>
        <h1 className="text-sm text-sand-700 mb-6">ระบบจัดการสต็อก — เข้าสู่ระบบ</h1>

        <label className="block text-sm text-sand-700 mb-1">อีเมล</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />

        <label className="block text-sm text-sand-700 mb-1">รหัสผ่าน</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
