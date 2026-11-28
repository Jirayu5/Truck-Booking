const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const d0 = (d: string) => new Date(d + 'T00:00:00')

// ตัวย่อวันตายตัว (ผลลัพธ์ของเบราว์เซอร์แต่ละตัวไม่เหมือนกัน บางตัวได้ "อังคาร" บางตัวได้ "อ.")
const WEEKDAY = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
const dm = (x: Date) => x.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

// "จ. 23 พ.ย. 2569"
export const fmtDate = (d: string) => {
  const x = d0(d)
  return `${WEEKDAY[x.getDay()]} ${dm(x)} ${x.getFullYear() + 543}` // ปี พ.ศ.
}
// "จ. 23 พ.ย."
export const fmtDateShort = (d: string) => {
  const x = d0(d)
  return `${WEEKDAY[x.getDay()]} ${dm(x)}`
}
// "23 พ.ย."
export const fmtDayMonth = (d: string) => d0(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

// "08:30:00" -> "08:30"
export const fmtTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : '-')

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

const dayLabel = (iso: string): string => {
  const x = new Date(iso), now = new Date()
  if (sameDay(x, now)) return 'วันนี้'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (sameDay(x, y)) return 'เมื่อวาน'
  return x.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// "วันนี้ 22:10" / "เมื่อวาน 22:10" / "22 พ.ย. 22:10"
export const fmtStamp = (iso: string) => `${dayLabel(iso)} ${clock(iso)}`

// ในการ์ดรายการ: วันนี้ -> "22:10", อื่นๆ -> "เมื่อวาน" / "22 พ.ย."
export const fmtRelative = (iso: string) => (sameDay(new Date(iso), new Date()) ? clock(iso) : dayLabel(iso))

// ดึงชื่อจังหวัดจากที่อยู่ เช่น "... จ.นนทบุรี 11120" -> "นนทบุรี" (หาไม่เจอให้ใช้ที่อยู่เต็ม)
export function provinceOf(addr: string): string {
  const a = addr.replace(/\s+/g, ' ').trim()
  if (/กรุงเทพ|กทม/.test(a)) return 'กรุงเทพมหานคร'
  const m = a.match(/(?:จังหวัด|จ\.)\s*([ก-๙]+)/)
  return m ? m[1] : a
}
