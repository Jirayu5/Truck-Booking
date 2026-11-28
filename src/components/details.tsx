import { Ban, Check, Clock, Copy, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBookings } from '../lib/bookings'
import { fmtDate, fmtStamp, fmtTime } from '../lib/format'
import { supabase } from '../lib/supabase'
import { VEHICLE_LABEL, confirmationOf, type Booking } from '../lib/types'
import { DriverPhoto, FileLinks, Timeline } from './shared'
import { ErrorBox, KV, StatusBadge, inputCls } from './ui'

const box = 'rounded-2xl border border-line bg-white p-5'

// ข้อมูลคำขอ (แผนกจัดส่งเห็นเป็นการ์ดหลัก, ฝ่ายขายเห็นเป็น "คำขอของคุณ")
export function RequestCard({ b, title, withHeader }: { b: Booking; title?: string; withHeader?: boolean }) {
  return (
    <div className={box}>
      {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
      {withHeader && (
        <div className="mb-4 lg:hidden">
          <div className="text-xl font-bold">{b.customer_name}</div>
          <div className="text-muted">ส่งโดย {b.creator?.full_name || '-'} · {fmtStamp(b.created_at)}</div>
        </div>
      )}
      {title && !withHeader && <div className="mb-3 text-lg font-bold lg:hidden">{b.customer_name}</div>}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <KV k={<><span className="lg:hidden">วันที่ส่ง</span><span className="hidden lg:inline">วันที่ส่งสินค้า</span></>}>{fmtDate(b.delivery_date)}</KV>
        <KV k={<><span className="lg:hidden">รถออกต้นทาง</span><span className="hidden lg:inline">เวลารถออกต้นทาง</span></>}>{fmtTime(b.depart_time)}</KV>
        <KV k={<><span className="lg:hidden">ถึงปลายทาง</span><span className="hidden lg:inline">เวลาถึงปลายทาง</span></>}>{b.arrive_time}</KV>
        <KV k={<><span className="lg:hidden">เอกสาร</span><span className="hidden lg:inline">เอกสารประกอบ</span></>}><FileLinks files={b.booking_files} /></KV>
        <KV k="สถานที่ส่งสินค้า" className="col-span-2">{b.destination}</KV>
        <KV k="หมายเหตุจากฝ่ายขาย" className="col-span-2">{b.note}</KV>
      </div>
    </div>
  )
}

// ผลจากแผนกจัดส่ง
export function ResultCard({ b }: { b: Booking }) {
  const c = confirmationOf(b)
  const wrap = 'rounded-2xl border border-line bg-white p-5 lg:border-0 lg:bg-page'
  if (!c && b.status === 'cancelled') return null
  if (!c) {
    return (
      <div className={wrap}>
        <h2 className="mb-1 text-lg font-bold lg:text-base">ข้อมูลจากแผนกจัดส่ง</h2>
        <p className="flex items-center gap-2 text-muted"><Clock size={16} />รอแผนกจัดส่งยืนยัน คุณจะได้รับแจ้งเตือนเมื่อมีผล</p>
      </div>
    )
  }
  return (
    <div className={wrap}>
      <h2 className="mb-3 text-lg font-bold lg:text-base">ข้อมูลจากแผนกจัดส่ง</h2>
      {c.decision === 'approved' ? (
        <>
          <div className="flex items-center gap-4">
            <DriverPhoto path={c.driver_photo_path} size={96} />
            <div className="space-y-3">
              <KV k="ประเภทรถ">{c.vehicle_type && VEHICLE_LABEL[c.vehicle_type]}</KV>
              <KV k="รถถึงโรงงาน">{fmtTime(c.factory_arrival_time)}</KV>
            </div>
          </div>
          <KV k="หมายเหตุจากจัดส่ง" className="mt-4">{c.note || '–'}</KV>
        </>
      ) : (
        <div className="space-y-3">
          <KV k="เหตุผลที่ไม่อนุมัติ">{c.reject_reason}</KV>
          <KV k="หมายเหตุจากจัดส่ง">{c.note || '–'}</KV>
        </div>
      )}
    </div>
  )
}

export function StatusBanner({ b }: { b: Booking }) {
  const c = confirmationOf(b)
  const cfg = {
    approved: { cls: 'bg-okay-soft text-okay', dot: 'bg-okay text-white', icon: <Check size={28} strokeWidth={3} />, title: 'อนุมัติแล้ว', sub: `แผนกจัดส่งยืนยันรับจอง${c ? ' · ' + fmtStamp(c.decided_at) : ''}` },
    rejected: { cls: 'bg-bad-soft text-bad', dot: 'bg-bad text-white', icon: <X size={28} strokeWidth={3} />, title: 'ไม่อนุมัติ', sub: c?.reject_reason ?? '' },
    pending: { cls: 'bg-wait-soft text-wait', dot: 'bg-amber text-navy', icon: <Clock size={26} />, title: 'รอการยืนยัน', sub: 'แผนกจัดส่งกำลังตรวจสอบคำขอของคุณ' },
    cancelled: { cls: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500 text-white', icon: <Ban size={26} />, title: 'ยกเลิกแล้ว', sub: `คุณยกเลิกคำขอนี้${b.cancelled_at ? ' · ' + fmtStamp(b.cancelled_at) : ''}` },
  }[b.status]
  return (
    <div className={`flex items-center gap-4 rounded-2xl px-4 py-4 lg:hidden ${cfg.cls}`}>
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${cfg.dot}`}>{cfg.icon}</span>
      <div>
        <div className="text-xl font-bold">{cfg.title}</div>
        <div className="text-sm opacity-90">{cfg.sub}</div>
      </div>
    </div>
  )
}

// หน้ารายละเอียดฝ่ายขาย (เดสก์ท็อป = แผงขวา, มือถือ = เต็มหน้า)
export function SalesDetail({ b }: { b: Booking }) {
  return (
    <div className="space-y-4 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-5">
      <div className="hidden items-start justify-between gap-3 lg:flex">
        <div>
          <div className="text-xl font-bold">{b.customer_name}</div>
          <div className="text-muted">ส่ง {fmtDate(b.delivery_date).replace(/^\S+\s/, '')} · รถออก {fmtTime(b.depart_time)}</div>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <StatusBanner b={b} />
      <SalesActions b={b} />
      <CancelNote b={b} />
      <ResultCard b={b} />
      <div className="lg:hidden"><RequestCard b={b} title="คำขอของคุณ" /></div>
      <div className="hidden lg:block">
        <h3 className="mb-2 font-bold">รายละเอียดคำขอ</h3>
        <RequestCardBare b={b} />
      </div>
      <div className="rounded-2xl border border-line bg-white p-5 lg:border-0 lg:p-0">
        <h2 className="mb-3 text-lg font-bold lg:text-base">ความคืบหน้า</h2>
        <Timeline b={b} />
      </div>
    </div>
  )
}

function RequestCardBare({ b }: { b: Booking }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <KV k="เวลาถึงปลายทาง">{b.arrive_time}</KV>
      <KV k="เอกสารประกอบ"><FileLinks files={b.booking_files} /></KV>
      <KV k="สถานที่ส่งสินค้า" className="col-span-2">{b.destination}</KV>
      <KV k="หมายเหตุ" className="col-span-2">{b.note}</KV>
    </div>
  )
}

// กล่องแจ้งว่าคำขอถูกยกเลิก (ทั้งฝ่ายขายและแผนกจัดส่งเห็น)
export function CancelNote({ b }: { b: Booking }) {
  if (b.status !== 'cancelled') return null
  return (
    <div className="rounded-2xl border border-line bg-slate-100 p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-700"><Ban size={18} />ยกเลิกโดยฝ่ายขาย</h2>
      <p className="text-sm text-muted">{b.cancelled_at ? fmtStamp(b.cancelled_at) : ''}</p>
      <KV k="เหตุผล" className="mt-3">{b.cancel_reason || 'ไม่ได้ระบุ'}</KV>
    </div>
  )
}

// ปุ่มแก้ไข/ยกเลิกของฝ่ายขาย: แก้ได้เฉพาะ "รอยืนยัน", ยกเลิกได้ทั้ง "รอยืนยัน" และ "อนุมัติแล้ว"
export function SalesActions({ b }: { b: Booking }) {
  const { reload } = useBookings()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const canAct = b.status === 'pending' || b.status === 'approved'

  async function cancel() {
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('cancel_booking', { p_id: b.id, p_reason: reason.trim() || null })
    setBusy(false)
    if (error) return setErr(error.message)
    setOpen(false); setReason(''); reload()
  }

  const copy = (
    <Link to={`/new?from=${b.id}`} className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white py-3 font-semibold text-slate-700">
      <Copy size={18} />สร้างใหม่จากรายการนี้
    </Link>
  )
  if (!canAct) return copy

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {b.status === 'pending' && (
          <Link to={`/bookings/${b.id}/edit`} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-brand py-3 font-semibold text-brand">
            <Pencil size={18} />แก้ไขคำขอ
          </Link>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-bad py-3 font-semibold text-bad">
          <Ban size={18} />ยกเลิกคำขอ
        </button>
      </div>
      {copy}
      {open && (
        <div className="space-y-3 rounded-2xl border border-bad/40 bg-bad-soft/40 p-4">
          <p className="font-semibold">
            {b.status === 'approved' ? 'คำขอนี้อนุมัติแล้ว แผนกจัดส่งจะได้รับแจ้งว่ายกเลิก ยืนยันที่จะยกเลิก?' : 'ยืนยันที่จะยกเลิกคำขอนี้? ยกเลิกแล้วย้อนกลับไม่ได้'}
          </p>
          <textarea className={inputCls} rows={2} maxLength={500} placeholder="เหตุผลที่ยกเลิก (ไม่บังคับ)" aria-label="เหตุผลที่ยกเลิก" value={reason} onChange={(e) => setReason(e.target.value)} />
          <ErrorBox msg={err} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-line bg-white py-2.5 font-medium">ไม่ยกเลิก</button>
            <button type="button" onClick={cancel} disabled={busy} className="flex-1 rounded-xl bg-bad py-2.5 font-semibold text-white disabled:opacity-50">{busy ? 'กำลังยกเลิก…' : 'ยืนยันยกเลิก'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
