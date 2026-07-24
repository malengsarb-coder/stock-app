import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile, Role } from '../lib/types'

const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  staff: 'Staff คลัง',
  viewer: 'Viewer',
}

export default function Users() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function changeRole(id: string, role: Role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    load()
  }

  return (
    <div>
      <span className="inline-block text-xs bg-grain-50 text-grain-600 px-3 py-1 rounded-full mb-4">
        เฉพาะสิทธิ์ Admin
      </span>

      <div className="rounded-xl border border-sand-200 bg-white p-4 mb-4 text-sm text-sand-700">
        การสร้างบัญชีผู้ใช้ใหม่ทำผ่าน Supabase Dashboard → Authentication → Users → Invite.
        เมื่อผู้ใช้ยืนยันอีเมลแล้ว ชื่อจะปรากฏในตารางด้านล่างโดยอัตโนมัติ (บทบาทเริ่มต้นคือ Staff)
        จากนั้น Admin ค่อยปรับสิทธิ์ที่นี่
      </div>

      {loading ? (
        <p className="text-sm text-sand-700">กำลังโหลด...</p>
      ) : (
        <div className="rounded-xl border border-sand-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sand-700 border-b border-sand-200">
                <th className="px-3 py-2">ชื่อผู้ใช้</th>
                <th className="px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-sand-100">
                  <td className="px-3 py-2">{p.full_name}</td>
                  <td className="px-3 py-2">
                    <select
                      value={p.role}
                      onChange={(e) => changeRole(p.id, e.target.value as Role)}
                      className="rounded-lg border border-sand-200 px-2 py-1 text-sm"
                    >
                      {(Object.keys(roleLabel) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {roleLabel[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
