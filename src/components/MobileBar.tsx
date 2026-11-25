import { Bell, ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useUnread, usePush } from '../lib/hooks'
import { Logo } from './ui'

// แถบหัวบนมือถือ (ซ่อนบนเดสก์ท็อป)
export default function MobileBar({ title, subtitle, back, right, logo = true }: {
  title: string; subtitle?: string; back?: string; right?: ReactNode; logo?: boolean
}) {
  const { profile } = useAuth()
  const unread = useUnread(profile?.id)
  const push = usePush()
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-navy px-4 py-3 text-white lg:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      {back ? (
        <Link to={back} aria-label="กลับ" className="-ml-1 rounded-lg p-1"><ChevronLeft size={26} /></Link>
      ) : logo ? <Logo size={36} /> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-bold leading-tight">{title}</div>
        {subtitle && <div className="truncate text-sm text-white/70">{subtitle}</div>}
      </div>
      {right ?? (
        <div className="flex items-center gap-3">
          {push.state === 'off' && (
            <button onClick={push.enable} disabled={push.busy} className="flex items-center gap-1.5 text-sm font-medium">
              <Bell size={18} />เปิดแจ้งเตือน
            </button>
          )}
          {push.state !== 'off' && (
            <Link to="/notifications" className="relative p-1" aria-label="การแจ้งเตือน">
              <Bell size={22} />
              {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-amber px-1.5 text-[11px] font-bold text-navy">{unread}</span>}
            </Link>
          )}
        </div>
      )}
    </header>
  )
}
