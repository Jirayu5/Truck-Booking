import { Ban, Bell, Clock, Check, KeyRound, List, LogOut, Plus, User, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { usePush, useUnread } from '../lib/hooks'
import { Logo } from './ui'

function SideItem({ to, icon, label, badge, active }: { to: string; icon: ReactNode; label: string; badge?: number; active: boolean }) {
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors ${active ? 'bg-navy-2 text-white' : 'text-white/80 hover:bg-white/5'}`}>
      {icon}
      <span className="flex-1">{label}</span>
      {!!badge && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber px-1.5 text-sm font-bold text-navy">{badge}</span>}
    </Link>
  )
}

function TabItem({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link to={to} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-sm font-medium ${active ? 'font-bold text-brand' : 'text-muted'}`}>
      {icon}{label}
    </Link>
  )
}

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { counts } = useBookings()
  const loc = useLocation()
  const [params] = useSearchParams()
  const unread = useUnread(profile?.id)
  const push = usePush()
  const isDispatch = profile?.role === 'dispatch'
  const path = loc.pathname
  const inList = path === '/' || path.startsWith('/bookings')
  const cur = params.get('s') ?? 'pending'

  const sideDispatch = (
    <>
      <SideItem to="/?s=pending" icon={<Clock size={20} />} label="รอยืนยัน" badge={counts.pending} active={inList && cur === 'pending'} />
      <SideItem to="/?s=approved" icon={<Check size={20} />} label="ยืนยันแล้ว" active={inList && cur === 'approved'} />
      <SideItem to="/?s=rejected" icon={<X size={20} />} label="ปฏิเสธแล้ว" active={inList && cur === 'rejected'} />
      <SideItem to="/?s=cancelled" icon={<Ban size={20} />} label="ยกเลิกแล้ว" active={inList && cur === 'cancelled'} />
    </>
  )
  const sideSales = (
    <>
      <SideItem to="/new" icon={<Plus size={20} />} label="สร้างคำขอจอง" active={path === '/new'} />
      <SideItem to="/" icon={<List size={20} />} label="รายการของฉัน" badge={counts.pending} active={inList} />
    </>
  )

  // มือถือ: แถบล่างซ่อนในหน้าที่มีปุ่มบันทึก/ส่งติดล่างอยู่แล้ว
  const hideTabs = path === '/new' || (isDispatch && path.startsWith('/bookings'))

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-navy p-4 text-white lg:flex">
        <div className="flex items-center gap-3 px-2 py-3">
          <Logo size={44} />
          <div>
            <div className="text-lg font-bold leading-tight">จองรถขนส่ง</div>
            <div className="text-sm text-white/70">{isDispatch ? 'แผนกจัดส่ง' : 'ฝ่ายขาย'}</div>
          </div>
        </div>
        <nav className="mt-6 space-y-1.5">{isDispatch ? sideDispatch : sideSales}</nav>
        <div className="mt-auto space-y-2">
          {push.state === 'off' && (
            <button onClick={push.enable} disabled={push.busy} className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5">
              <Bell size={18} />เปิดแจ้งเตือนบนเครื่องนี้
            </button>
          )}
          <Link to="/notifications" className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${path === '/notifications' ? 'bg-navy-2 text-white' : 'text-white/80 hover:bg-white/5'}`}>
            <Bell size={18} />การแจ้งเตือน
            {unread > 0 && <span className="ml-auto rounded-full bg-amber px-2 text-xs font-bold text-navy">{unread}</span>}
          </Link>
          <Link to="/password" className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${path === '/password' ? 'bg-navy-2 text-white' : 'text-white/80 hover:bg-white/5'}`}>
            <KeyRound size={18} />เปลี่ยนรหัสผ่าน
          </Link>
          <div className="flex items-center gap-3 border-t border-white/10 pt-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-2"><User size={20} /></span>
            <span className="min-w-0 flex-1 truncate font-medium">{profile?.full_name || 'ผู้ใช้'}</span>
            <button onClick={signOut} aria-label="ออกจากระบบ" className="rounded-lg p-2 text-white/70 hover:bg-white/10"><LogOut size={18} /></button>
          </div>
        </div>
      </aside>

      <main className={`lg:ml-64 ${hideTabs ? '' : 'pb-20'} lg:pb-0`}>
        <Outlet />
      </main>

      {!hideTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {isDispatch ? (
            <>
              <TabItem to="/?s=pending" icon={<Clock size={24} />} label="รอยืนยัน" active={inList && cur === 'pending'} />
              <TabItem to="/?s=all" icon={<List size={24} />} label="ทั้งหมด" active={inList && cur !== 'pending'} />
            </>
          ) : (
            <>
              <TabItem to="/new" icon={<Plus size={24} />} label="สร้างคำขอ" active={false} />
              <TabItem to="/" icon={<List size={24} />} label="รายการของฉัน" active={inList} />
            </>
          )}
        </nav>
      )}
    </div>
  )
}
