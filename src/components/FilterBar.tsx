import { Download, Search, X } from 'lucide-react'
import { DateField, inputCls } from './ui'
import { hasFilter } from '../lib/filter'
import { useBookings } from '../lib/bookings'

// แถบค้นหา + กรองช่วงวันที่ + ส่งออก CSV (ส่งออกเฉพาะรายการที่กรองอยู่)
export default function FilterBar({ total, onExport }: { total: number; onExport: () => void }) {
  const { filter, setFilter, clearFilter } = useBookings()
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-white p-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className={`${inputCls} pl-10`} placeholder="ค้นหาชื่อลูกค้า ที่อยู่ ผู้ส่งคำขอ" maxLength={100} aria-label="ค้นหา"
          value={filter.q} onChange={(e) => setFilter({ q: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><div className="mb-1 text-sm text-muted">ส่งสินค้าตั้งแต่</div><DateField id="flt-from" value={filter.from} onChange={(v) => setFilter({ from: v })} /></div>
        <div><div className="mb-1 text-sm text-muted">ถึงวันที่</div><DateField id="flt-to" value={filter.to} onChange={(v) => setFilter({ to: v })} /></div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        {hasFilter(filter)
          ? <button type="button" onClick={clearFilter} className="flex items-center gap-1 text-sm font-medium text-brand underline"><X size={16} />ล้างตัวกรอง</button>
          : <span className="text-sm text-muted">{total} รายการ</span>}
        <button type="button" onClick={onExport} disabled={total === 0}
          className="flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand disabled:opacity-40">
          <Download size={16} />ส่งออก CSV ({total})
        </button>
      </div>
    </div>
  )
}
