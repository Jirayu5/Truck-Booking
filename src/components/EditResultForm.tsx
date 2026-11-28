import { Camera, Pencil, Save, Truck, User } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { uploadFile } from '../lib/files'
import { fmtTime } from '../lib/format'
import { supabase } from '../lib/supabase'
import { VEHICLE_LABEL, VEHICLE_SIZE, confirmationOf, type Booking, type VehicleType } from '../lib/types'
import { DriverPhoto } from './shared'
import { Button, ErrorBox, Field, TimeField, inputCls } from './ui'

const VEHICLES: VehicleType[] = ['4_wheel', '6_wheel']

function Form({ b, userId, onClose, onDone }: { b: Booking; userId: string; onClose: () => void; onDone: () => void }) {
  const c = confirmationOf(b)
  const [vehicle, setVehicle] = useState<VehicleType | ''>(c?.vehicle_type ?? '')
  const [arrival, setArrival] = useState(fmtTime(c?.factory_arrival_time))
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState(c?.note ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pick = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photo) { setPreview(null); return }
    const u = URL.createObjectURL(photo)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [photo])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!vehicle || !/^([01]\d|2[0-3]):[0-5]\d$/.test(arrival)) return setErr('กรุณาเลือกประเภทรถและใส่เวลาถึงโรงงาน (เช่น 08:30)')
    setBusy(true)
    try {
      const up = photo ? await uploadFile(userId, photo) : null
      const { error } = await supabase.rpc('update_confirmation', {
        p_booking_id: b.id, p_vehicle_type: vehicle, p_factory_arrival_time: arrival,
        p_driver_photo_path: up?.path ?? null, p_note: note.trim() || null,
      })
      if (error) throw error
      onDone()
    } catch (e) {
      setErr((e as Error).message || 'บันทึกไม่สำเร็จ')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border-2 border-brand/40 bg-white p-5">
      <h2 className="text-lg font-bold">แก้ไขผลการอนุมัติ</h2>
      <Field label="ประเภทรถที่ใช้" required>
        <div className="grid grid-cols-2 gap-3">
          {VEHICLES.map((v) => (
            <button key={v} type="button" onClick={() => setVehicle(v)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-4 ${vehicle === v ? 'border-brand bg-brand-soft text-brand-dark' : 'border-slate-400/60 bg-white'}`}>
              <Truck size={v === '4_wheel' ? 26 : 30} />
              <span className="text-lg font-bold">{VEHICLE_LABEL[v]}</span>
              <span className="text-sm text-muted">{VEHICLE_SIZE[v]}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="เวลารถมาถึงโรงงาน" required htmlFor="er-arrival">
        <TimeField id="er-arrival" value={arrival} onChange={setArrival} required />
      </Field>
      <Field label="รูปภาพพนักงานขับรถ" hint="ไม่เลือก = ใช้รูปเดิม">
        <input ref={pick} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        <div className="flex items-center gap-3">
          {preview
            ? <img src={preview} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            : c?.driver_photo_path
              ? <DriverPhoto path={c.driver_photo_path} size={80} />
              : <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500"><User size={28} /></span>}
          <button type="button" onClick={() => pick.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-brand/60 bg-white px-4 py-3 font-semibold text-brand">
            <Camera size={20} />เปลี่ยนรูป
          </button>
        </div>
      </Field>
      <Field label="หมายเหตุเพิ่มเติม" htmlFor="er-note">
        <textarea id="er-note" className={inputCls} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ErrorBox msg={err} />
      <p className="text-sm text-muted">บันทึกแล้วระบบจะแจ้งฝ่ายขายว่ามีการเปลี่ยนแปลง</p>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line bg-white py-3 font-medium">ยกเลิก</button>
        <Button disabled={busy} className="flex-1"><Save size={18} />{busy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}</Button>
      </div>
    </form>
  )
}

// ปุ่ม + ฟอร์มแก้ผลสำหรับคำขอที่อนุมัติแล้ว (แผนกจัดส่ง)
export default function ApprovedEditor({ b, userId, onDone }: { b: Booking; userId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  if (b.status !== 'approved') return null
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand py-3 font-semibold text-brand">
        <Pencil size={18} />แก้ไขผลการอนุมัติ (เปลี่ยนรถ / เวลา / รูปคนขับ)
      </button>
    )
  }
  return <Form b={b} userId={userId} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onDone() }} />
}
