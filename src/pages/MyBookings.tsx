import { ChevronRight, Calendar, MapPin, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SalesDetail } from '../components/details'
import FilterBar from '../components/FilterBar'
import MobileBar from '../components/MobileBar'
import PushBanner from '../components/PushToggle'
import { StatusBadge } from '../components/ui'
import { useBookings } from '../lib/bookings'
import { exportBookingsCsv } from '../lib/export'
import { matchesFilter } from '../lib/filter'
import { fmtDateShort, fmtDayMonth, fmtRelative, fmtTime, provinceOf } from '../lib/format'
import { useIsDesktop } from '../lib/hooks'
import type { Status } from '../lib/types'

type F = Status | 'all'

export default function MyBookings() {
  const { rows, error, counts, filter: flt } = useBookings()
  const { id } = useParams()
  const nav = useNavigate()
  const desktop = useIsDesktop()
  const [params, setParams] = useSearchParams()
  const filter = (params.get('s') as F) ?? 'all'
  const list = (rows ?? []).filter((r) => (filter === 'all' || r.status === filter) && matchesFilter(r, flt))
  const selected = (rows ?? []).find((r) => String(r.id) === id)

  // เดสก์ท็อป: เลือกรายการแรกให้อัตโนมัติ
  useEffect(() => {
    if (desktop && !id && list.length) nav(`/bookings/${list[0].id}?s=${filter}`, { replace: true })
  }, [desktop, id, list, filter, nav])

  const chips: [F, string][] = [['all', 'ทั้งหมด'], ['pending', 'รอการยืนยัน'], ['approved', 'อนุมัติแล้ว'], ['rejected', 'ปฏิเสธ'], ['cancelled', 'ยกเลิก']]
  const open = (rid: number) => `/bookings/${rid}?s=${filter}`

  return (
    <div>
      {id ? <MobileBar title="ผลการจองรถ" back={`/?s=${filter}`} logo={false} /> : <MobileBar title="รายการของฉัน" subtitle="ฝ่ายขาย" />}

      <div className="mx-auto max-w-7xl p-4 lg:p-8">
        <div className={`${id ? 'hidden lg:flex' : 'hidden lg:flex'} mb-6 items-start justify-between`}>
          <div>
            <h1 className="text-3xl font-bold">รายการของฉัน</h1>
            <p className="mt-1 text-muted">ติดตามสถานะคำขอจองรถทั้งหมด</p>
          </div>
          <Link to="/new" className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark"><Plus size={20} />สร้างคำขอใหม่</Link>
        </div>

        <div className={id ? 'hidden lg:block' : ''}>
          <PushBanner />
          <div className="mb-4 mt-2 flex gap-2 overflow-x-auto pb-1 lg:mt-0">
            {chips.map(([k, label]) => (
              <button key={k} onClick={() => setParams({ s: k })}
                className={`whitespace-nowrap rounded-full border px-4 py-2 font-medium ${filter === k ? 'border-brand bg-brand text-white' : 'border-slate-400/60 bg-white'}`}>
                {label} <span className="ml-0.5">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="mb-4"><FilterBar total={list.length} onExport={() => exportBookingsCsv(list, 'คำขอจองรถของฉัน')} /></div>
        </div>

        {error && <p className="text-bad">{error}</p>}
        {rows === null && !error && <p className="text-muted">กำลังโหลด…</p>}

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_26rem]">
          <div className={id ? 'hidden lg:block' : ''}>
            {rows && list.length === 0 && <p className="py-12 text-center text-muted">ไม่มีรายการ</p>}

            {/* เดสก์ท็อป: ตาราง */}
            {list.length > 0 && (
              <div className="hidden overflow-hidden rounded-2xl border border-line bg-white lg:block">
                <table className="w-full text-left">
                  <thead className="bg-page/60 text-sm text-muted">
                    <tr><th className="px-6 py-3 font-medium">วันที่ส่ง</th><th className="px-3 py-3 font-medium">ลูกค้า</th><th className="px-3 py-3 font-medium">รถออก</th><th className="px-3 py-3 font-medium">สถานะ</th></tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} onClick={() => nav(open(r.id))} className={`cursor-pointer border-t border-line ${String(r.id) === id ? 'bg-brand-soft/60' : 'hover:bg-page/50'}`}>
                        <td className="px-6 py-4 font-bold">{fmtDayMonth(r.delivery_date)}</td>
                        <td className="px-3 py-4">{r.customer_name}</td>
                        <td className="px-3 py-4">{fmtTime(r.depart_time)}</td>
                        <td className="px-3 py-4"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* มือถือ: การ์ด */}
            <div className="space-y-3 lg:hidden">
              {list.map((r) => (
                <Link key={r.id} to={open(r.id)} className="flex items-center gap-2 rounded-2xl border border-line bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate text-lg font-bold">{r.customer_name}</div>
                      <span className="shrink-0 text-sm text-muted">{fmtRelative(r.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-muted"><Calendar size={16} />{fmtDateShort(r.delivery_date)} · รถออก {fmtTime(r.depart_time)}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted"><MapPin size={16} /><span className="truncate">{provinceOf(r.destination)}</span></div>
                    <div className="mt-2"><StatusBadge status={r.status} /></div>
                  </div>
                  <ChevronRight className="shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>

          <div className={id ? '' : 'hidden lg:block'}>
            {selected ? <div className="pb-4"><SalesDetail b={selected} /></div>
              : id && rows ? <p className="text-muted">ไม่พบคำขอนี้</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
