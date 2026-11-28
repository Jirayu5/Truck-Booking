import { Calendar, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ConfirmForm from '../components/ConfirmForm'
import ApprovedEditor from '../components/EditResultForm'
import { CancelNote, RequestCard, ResultCard } from '../components/details'
import FilterBar from '../components/FilterBar'
import MobileBar from '../components/MobileBar'
import PushBanner from '../components/PushToggle'
import { Timeline } from '../components/shared'
import { StatusBadge } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useBookings } from '../lib/bookings'
import { exportBookingsCsv } from '../lib/export'
import { matchesFilter } from '../lib/filter'
import { fmtDateShort, fmtRelative, fmtStamp, fmtTime, provinceOf } from '../lib/format'
import { useIsDesktop } from '../lib/hooks'
import { confirmationOf, type Booking, type Status } from '../lib/types'

type F = Status | 'all'
const TITLE: Record<F, string> = { pending: 'รอยืนยัน', approved: 'ยืนยันแล้ว', rejected: 'ปฏิเสธแล้ว', cancelled: 'ยกเลิกแล้ว', all: 'ทั้งหมด' }

const CHIP: Record<F, string> = { pending: 'รอยืนยัน', approved: 'ยืนยันแล้ว', rejected: 'ปฏิเสธ', cancelled: 'ยกเลิก', all: 'ทั้งหมด' }

// "ใหม่" = คำขอที่ยังรอยืนยันและส่งมาภายใน 1 ชั่วโมง
const isNew = (b: Booking) => b.status === 'pending' && Date.now() - new Date(b.created_at).getTime() < 3600 * 1000

export default function Queue() {
  const { rows, error, counts, reload, filter: flt } = useBookings()
  const { session } = useAuth()
  const { id } = useParams()
  const nav = useNavigate()
  const desktop = useIsDesktop()
  const [params] = useSearchParams()
  const filter = (params.get('s') as F) ?? 'pending'

  const list = (rows ?? []).filter((r) => (filter === 'all' || r.status === filter) && matchesFilter(r, flt))
  if (filter === 'pending') list.sort((a, b) => a.delivery_date.localeCompare(b.delivery_date) || a.depart_time.localeCompare(b.depart_time))
  const selected = (rows ?? []).find((r) => String(r.id) === id)

  useEffect(() => {
    if (desktop && !id && list.length) nav(`/bookings/${list[0].id}?s=${filter}`, { replace: true })
  }, [desktop, id, list, filter, nav])

  const chips: F[] = ['pending', 'approved', 'rejected']
  const open = (rid: number) => `/bookings/${rid}?s=${filter}`

  const detail = selected && session && (
    <div className="space-y-4 pb-36 lg:pb-8">
      <div className="hidden items-start justify-between gap-4 lg:flex">
        <div>
          <h1 className="text-3xl font-bold">{selected.customer_name}</h1>
          <p className="mt-1 text-muted">ส่งคำขอโดย {selected.creator?.full_name || '-'} · {fmtStamp(selected.created_at)}</p>
        </div>
        <StatusBadge status={selected.status} />
      </div>
      <RequestCard b={selected} withHeader />
      {selected.status === 'pending'
        ? <ConfirmForm key={selected.id} bookingId={selected.id} userId={session.user.id} onDone={reload} />
        : (
          <div className="space-y-4">
            <CancelNote b={selected} />
            <ResultCard b={selected} />
            <ApprovedEditor key={selected.id + '-' + (confirmationOf(selected)?.updated_at ?? '')} b={selected} userId={session.user.id} onDone={reload} />
            <div className="rounded-2xl border border-line bg-white p-5"><h2 className="mb-3 text-lg font-bold">ความคืบหน้า</h2><Timeline b={selected} /></div>
          </div>
        )}
    </div>
  )

  return (
    <div>
      {id
        ? <MobileBar title="ยืนยันการจอง" back={`/?s=${filter}`} logo={false}
            right={selected && <StatusBadge status={selected.status} icon={false} />} />
        : <MobileBar title="รายการจอง" subtitle="แผนกจัดส่ง" />}

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[23rem_1fr]">
        {/* รายการ */}
        <section className={`${id ? 'hidden lg:block' : ''} bg-page lg:border-r lg:border-line lg:bg-white`}>
          <div className="border-b border-line bg-white px-4 py-3 lg:hidden">
            <div className="grid grid-cols-3 gap-2">
              {chips.map((k) => (
                <Link key={k} to={`/?s=${k}`} className={`whitespace-nowrap rounded-full border px-2 py-2 text-center text-base font-semibold ${filter === k ? 'border-brand bg-brand text-white' : 'border-slate-400/60 bg-white'}`}>
                  {CHIP[k]}{k === 'pending' ? ` ${counts.pending}` : ''}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden px-6 pb-3 pt-8 lg:block">
            <h1 className="text-3xl font-bold">{TITLE[filter]}</h1>
            <p className="mt-1 text-muted">{list.length} รายการ · {filter === 'pending' ? 'เรียงตามวันที่ส่งใกล้สุด' : 'ล่าสุดก่อน'}</p>
          </div>
          <div className="space-y-3 p-4 lg:px-5 lg:pb-8">
            <PushBanner />
            <FilterBar total={list.length} onExport={() => exportBookingsCsv(list, `คำขอจองรถ-${TITLE[filter]}`)} />
            {error && <p className="text-bad">{error}</p>}
            {rows === null && !error && <p className="text-muted">กำลังโหลด…</p>}
            {rows && list.length === 0 && <p className="py-12 text-center text-muted">ไม่มีรายการ</p>}
            {list.map((r) => {
              const on = String(r.id) === id
              return (
                <Link key={r.id} to={open(r.id)}
                  className={`flex items-center gap-2 rounded-2xl border bg-white p-4 ${on ? 'border-2 border-brand bg-brand-soft/50 lg:border-brand' : 'border-line'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-lg font-bold">{r.customer_name}</div>
                      <span className="shrink-0 text-sm text-muted">{fmtRelative(r.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-muted"><Calendar size={16} className="shrink-0" />{fmtDateShort(r.delivery_date)} · รถออก {fmtTime(r.depart_time)}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted"><MapPin size={16} className="shrink-0" /><span className="truncate">{provinceOf(r.destination)}</span></div>
                    {isNew(r) && <span className="mt-2 inline-block rounded-full bg-wait-soft px-3 py-1 text-sm font-semibold text-wait lg:hidden">รอการยืนยัน · ใหม่</span>}
                    {filter === 'all' && !isNew(r) && <div className="mt-2 lg:hidden"><StatusBadge status={r.status} /></div>}
                  </div>
                  <ChevronRight className="shrink-0 text-slate-400 lg:hidden" />
                </Link>
              )
            })}
          </div>
        </section>

        {/* รายละเอียด */}
        <section className={`${id ? '' : 'hidden lg:block'} p-4 lg:p-8`}>
          <Link to={`/?s=${filter}`} className="hidden"><ChevronLeft /></Link>
          {detail || (id && rows ? <p className="text-muted">ไม่พบคำขอนี้</p> : null)}
        </section>
      </div>
    </div>
  )
}
