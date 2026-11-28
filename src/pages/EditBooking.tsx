import { Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import MobileBar from '../components/MobileBar'
import { Button, Card, DateField, ErrorBox, Field, TimeField, inputCls } from '../components/ui'
import { useBookings } from '../lib/bookings'
import { fmtTime } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Booking } from '../lib/types'

function Form({ b }: { b: Booking }) {
  const nav = useNavigate()
  const { reload } = useBookings()
  const today = new Date().toLocaleDateString('en-CA')
  const [f, setF] = useState({
    delivery_date: b.delivery_date, depart_time: fmtTime(b.depart_time), customer_name: b.customer_name,
    destination: b.destination, arrive_time: b.arrive_time ?? '', note: b.note ?? '',
  })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    const { error } = await supabase.rpc('update_booking', {
      p_id: b.id, p_delivery_date: f.delivery_date, p_destination: f.destination.trim(), p_customer_name: f.customer_name.trim(),
      p_depart_time: f.depart_time, p_arrive_time: f.arrive_time.trim() || null, p_note: f.note.trim() || null,
    })
    setBusy(false)
    if (error) return setErr(error.message || 'บันทึกไม่สำเร็จ')
    await reload()
    nav(`/bookings/${b.id}`, { replace: true })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="วันที่ส่งสินค้า" required htmlFor="e-date">
          <DateField id="e-date" min={b.delivery_date < today ? b.delivery_date : today} value={f.delivery_date} onChange={(v) => setF((p) => ({ ...p, delivery_date: v }))} required />
        </Field>
        <Field label="เวลารถออกต้นทาง" required htmlFor="e-depart">
          <TimeField id="e-depart" value={f.depart_time} onChange={(v) => setF((p) => ({ ...p, depart_time: v }))} required />
        </Field>
      </div>
      <Field label="ชื่อลูกค้า" required htmlFor="e-cust">
        <input id="e-cust" className={inputCls} maxLength={200} value={f.customer_name} onChange={set('customer_name')} required />
      </Field>
      <Field label="สถานที่ส่งสินค้า" required htmlFor="e-dest">
        <textarea id="e-dest" className={inputCls} rows={4} maxLength={500} value={f.destination} onChange={set('destination')} required />
      </Field>
      <Field label="เวลาถึงปลายทาง" htmlFor="e-arrive">
        <input id="e-arrive" className={inputCls} maxLength={100} value={f.arrive_time} onChange={set('arrive_time')} />
      </Field>
      <Field label="หมายเหตุ" htmlFor="e-note">
        <textarea id="e-note" className={inputCls} rows={3} maxLength={1000} value={f.note} onChange={set('note')} />
      </Field>
      <p className="text-sm text-muted">เอกสารที่แนบไว้เดิมจะไม่เปลี่ยน หากต้องเปลี่ยนไฟล์ ให้ยกเลิกคำขอนี้แล้วสร้างใหม่</p>
      <ErrorBox msg={err} />
      <div className="flex gap-3">
        <Link to={`/bookings/${b.id}`} className="flex flex-1 items-center justify-center rounded-xl border border-line bg-white py-3 font-medium">ยกเลิก</Link>
        <Button disabled={busy} className="flex-1"><Save size={18} />{busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</Button>
      </div>
    </form>
  )
}

// หน้าแก้ไขคำขอ (ฝ่ายขายเท่านั้น, ใช้ได้เฉพาะสถานะรอยืนยัน)
export default function EditBooking() {
  const { id } = useParams()
  const { rows } = useBookings()
  const b = (rows ?? []).find((r) => String(r.id) === id)
  return (
    <div>
      <MobileBar title="แก้ไขคำขอ" back={`/bookings/${id}`} logo={false} />
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24 lg:p-8">
        <h1 className="hidden text-3xl font-bold lg:block">แก้ไขคำขอจองรถ</h1>
        {rows === null && <p className="text-muted">กำลังโหลด…</p>}
        {rows && !b && <p className="text-muted">ไม่พบคำขอนี้</p>}
        {b && b.status !== 'pending' && <p className="rounded-xl bg-wait-soft px-4 py-3 text-wait">คำขอนี้ถูกดำเนินการไปแล้ว แก้ไขไม่ได้</p>}
        {b && b.status === 'pending' && <Card><Form b={b} /></Card>}
      </div>
    </div>
  )
}
