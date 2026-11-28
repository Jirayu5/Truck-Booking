import { fmtTime } from './format'
import { confirmationOf, STATUS_LABEL, VEHICLE_LABEL, type Booking } from './types'

// กัน CSV injection (เซลล์ที่ขึ้นต้นด้วย = + - @ จะถูก Excel ตีเป็นสูตร) และห่อด้วยเครื่องหมายคำพูด
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s.replace(/"/g, '""')}"`
}
const stamp = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', hour12: false }) : ''

export function exportBookingsCsv(rows: Booking[], name: string) {
  const head = ['เลขที่คำขอ', 'วันที่ส่งสินค้า', 'เวลารถออก', 'ลูกค้า', 'สถานที่ส่งสินค้า', 'เวลาถึงปลายทาง', 'หมายเหตุ',
    'สถานะ', 'ผู้ส่งคำขอ', 'ส่งคำขอเมื่อ', 'ตัดสินเมื่อ', 'ประเภทรถ', 'เวลาถึงโรงงาน', 'เหตุผลที่ไม่อนุมัติ', 'หมายเหตุจากจัดส่ง', 'ยกเลิกเมื่อ', 'เหตุผลที่ยกเลิก', 'แก้ไขล่าสุด']
  const lines = rows.map((b) => {
    const c = confirmationOf(b)
    return [b.id, b.delivery_date, fmtTime(b.depart_time), b.customer_name, b.destination, b.arrive_time, b.note,
      STATUS_LABEL[b.status], b.creator?.full_name, stamp(b.created_at), stamp(c?.decided_at),
      c?.vehicle_type ? VEHICLE_LABEL[c.vehicle_type] : '', fmtTime(c?.factory_arrival_time), c?.reject_reason, c?.note, stamp(b.cancelled_at), b.cancel_reason, stamp(b.edited_at)]
      .map(cell).join(',')
  })
  // BOM ให้ Excel อ่านภาษาไทยถูกต้อง
  const blob = new Blob(['﻿' + [head.map(cell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${new Date().toLocaleDateString('en-CA')}.csv`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
