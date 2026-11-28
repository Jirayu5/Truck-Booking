import type { Booking } from './types'

export interface ListFilter { q: string; from: string; to: string }
export const EMPTY_FILTER: ListFilter = { q: '', from: '', to: '' }
export const hasFilter = (f: ListFilter) => Boolean(f.q.trim() || f.from || f.to)

// ค้นหาจากชื่อลูกค้า ที่อยู่ ผู้ส่งคำขอ และหมายเหตุ + กรองช่วงวันที่ส่งสินค้า
export function matchesFilter(b: Booking, f: ListFilter): boolean {
  if (f.from && b.delivery_date < f.from) return false
  if (f.to && b.delivery_date > f.to) return false
  const q = f.q.trim().toLowerCase()
  if (!q) return true
  return [b.customer_name, b.destination, b.creator?.full_name, b.note, b.arrive_time]
    .some((v) => (v ?? '').toLowerCase().includes(q))
}
