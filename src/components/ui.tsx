import { Ban, Calendar, Check, Clock, X } from 'lucide-react'
import { fmtDateShort } from '../lib/format'
import type { ReactNode } from 'react'
import { STATUS_LABEL, type Status } from '../lib/types'

const BADGE: Record<Status, string> = {
  pending: 'bg-wait-soft text-wait',
  approved: 'bg-okay-soft text-okay',
  rejected: 'bg-bad-soft text-bad',
  cancelled: 'bg-slate-200 text-slate-600',
}
const ICON = { pending: Clock, approved: Check, rejected: X, cancelled: Ban }

export function StatusBadge({ status, label, icon = true }: { status: Status; label?: string; icon?: boolean }) {
  const I = ICON[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${BADGE[status]}`}>
      {icon && <I size={15} strokeWidth={2.4} />}
      {label ?? STATUS_LABEL[status]}
    </span>
  )
}

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">{children}</span>
)

export function Field({ label, required, hint, htmlFor, children }: { label: string; required?: boolean; hint?: string; htmlFor?: string; children: ReactNode }) {
  const text = htmlFor
    ? <label htmlFor={htmlFor} className="font-semibold text-slate-800">{label}</label>
    : <span className="font-semibold text-slate-800">{label}</span>
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        {text}
        {required ? <Tag>จำเป็น</Tag> : <span className="text-sm text-muted">ไม่บังคับ{hint ? ` · ${hint}` : ''}</span>}
      </div>
      {children}
      {required && hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  )
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(16,36,44,0.04)] ${className}`}>{children}</div>
)

export const Button = ({ className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...p}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-dark active:bg-brand-dark disabled:opacity-50 ${className}`}
  />
)

export const ErrorBox = ({ msg }: { msg: string | null }) =>
  msg ? <p className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">{msg}</p> : null

export const KV = ({ k, children, className = '' }: { k: ReactNode; children: ReactNode; className?: string }) => (
  <div className={className}>
    <div className="text-sm text-muted">{k}</div>
    <div className="mt-0.5 font-semibold text-slate-900">{children || '-'}</div>
  </div>
)

export const Logo = ({ size = 40 }: { size?: number }) => (
  <img src="./icon-192.png" alt="" width={size} height={size} className="rounded-xl" />
)

// ช่องเวลาแบบ 24 ชั่วโมงตายตัว (ช่อง type="time" ของเบราว์เซอร์บางเครื่องขึ้น AM/PM)
// พิมพ์ "0745" แล้วเติมเป็น "07:45" ให้เอง
export function TimeField({ id, value, onChange, required }: { id?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const fmt = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 4)
    return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
  }
  return (
    <div className="relative">
      <input
        id={id} className={`${inputCls} pr-12`} inputMode="numeric" autoComplete="off" maxLength={5}
        placeholder="HH:MM เช่น 07:45" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" title="เวลา 24 ชั่วโมง เช่น 07:45"
        value={value} onChange={(e) => onChange(fmt(e.target.value))} required={required}
      />
      <Clock size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-navy" />
    </div>
  )
}

export function DateField({ id, value, onChange, min, required }: { id?: string; value: string; onChange: (v: string) => void; min?: string; required?: boolean }) {
  return (
    <div className="relative">
      <div className={`${inputCls} pr-12`} aria-hidden>{value ? `${fmtDateShort(value)} ${new Date(value + "T00:00:00").getFullYear() + 543}` : <span className="text-slate-400">เลือกวันที่</span>}</div>
      <Calendar size={20} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-navy" />
      <input
        id={id} type="date" min={min} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        onClick={(e) => { try { e.currentTarget.showPicker() } catch { /* not supported */ } }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}
