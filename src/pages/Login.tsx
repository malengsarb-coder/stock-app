import { useState, type FormEvent } from 'react'
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
        <p className="text-xs uppercase tracking-wide text-pond-600 font-medium mb-1">
          ระบบรับ-จ่ายสต็อกสินค้า
        </p>
        <h1 className="text-xl font-semibold text-sand-900 mb-6">เข้าสู่ระบบ</h1>

        <label className="block text-sm text-sand-700 mb-1">อีเมล</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pond-500"
          placeholder="you@example.com"
        />

        <label className="block text-sm text-sand-700 mb-1">รหัสผ่าน</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-lg border border-sand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pond-500"
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-pond-600 text-white py-2.5 text-sm font-medium hover:bg-pond-700 disabled:opacity-60"
        >
          {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <p className="text-xs text-sand-700 mt-4">
          ยังไม่มีบัญชี? ให้ Admin สร้างบัญชีให้ผ่านหน้า Authentication ใน Supabase Dashboard
          หรือใช้ลิงก์เชิญที่ Admin ส่งให้
        </p>
      </form>
    </div>
  )
}
