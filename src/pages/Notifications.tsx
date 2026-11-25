import { LogOut } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MobileBar from '../components/MobileBar'
import PushBanner from '../components/PushToggle'
import { useAuth } from '../lib/auth'
import { fmtStamp } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { AppNotification } from '../lib/types'

export default function Notifications() {
  const { profile, signOut } = useAuth()
  const [rows, setRows] = useState<AppNotification[] | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)
    setRows((data ?? []) as AppNotification[])
  }, [])

  useEffect(() => {
    load()
    if (!profile) return
    const ch = supabase.channel('notif-page-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, profile])

  const markAll = async () => {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
    load()
  }
  const markOne = (id: number) => supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).then(() => {})

  return (
    <div>
      <MobileBar title="การแจ้งเตือน" subtitle={profile?.full_name} right={<span />} />
      <div className="mx-auto max-w-2xl space-y-3 p-4 lg:p-8">
        <div className="hidden items-center justify-between lg:flex">
          <h1 className="text-3xl font-bold">การแจ้งเตือน</h1>
        </div>
        <div className="flex justify-end">
          {rows?.some((r) => !r.read_at) && <button onClick={markAll} className="text-sm font-medium text-brand underline">อ่านทั้งหมดแล้ว</button>}
        </div>
        <PushBanner />
        {rows?.length === 0 && <p className="py-12 text-center text-muted">ยังไม่มีการแจ้งเตือน</p>}
        {rows?.map((n) => {
          const body = (
            <div className={`rounded-2xl border p-4 ${n.read_at ? 'border-line bg-white' : 'border-brand/40 bg-brand-soft/60'}`}>
              <div className="font-bold">{n.title}</div>
              <div className="text-slate-700">{n.body}</div>
              <div className="mt-1 text-sm text-muted">{fmtStamp(n.created_at)}</div>
            </div>
          )
          return n.booking_id
            ? <Link key={n.id} to={`/bookings/${n.booking_id}`} onClick={() => markOne(n.id)} className="block">{body}</Link>
            : <div key={n.id}>{body}</div>
        })}
        <button onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-3 font-medium text-slate-700 lg:hidden">
          <LogOut size={18} />ออกจากระบบ
        </button>
      </div>
    </div>
  )
}
