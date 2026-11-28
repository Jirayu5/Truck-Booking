import { Bell, Camera, Check, Clock, Save, Truck, User, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { uploadFile } from '../lib/files'
import { supabase } from '../lib/supabase'
import { VEHICLE_LABEL, VEHICLE_SIZE, type VehicleType } from '../lib/types'
import { ErrorBox, Field, TimeField, inputCls } from './ui'

const VEHICLES: VehicleType[] = ['4_wheel', '6_wheel']

export default function ConfirmForm({ bookingId, userId, onDone }: { bookingId: number; userId: string; onDone: () => void }) {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [vehicle, setVehicle] = useState<VehicleType | ''>('')
  const [arrival, setArrival] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
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
    if (decision === 'approved' && (!vehicle || !photo)) { setErr('กรุณาเลือกประเภทรถและอัปโหลดรูปพนักงานขับรถ'); return }
    if (decision === 'rejected' && !reason.trim()) { setErr('กรุณาระบุเหตุผลที่ไม่อนุมัติ'); return }
    setBusy(true)
    try {
      const up = decision === 'approved' && photo ? await uploadFile(userId, photo) : null
      const { error } = await supabase.rpc('decide_booking', {
        p_booking_id: bookingId,
        p_decision: decision,
        p_reject_reason: decision === 'rejected' ? reason.trim() : null,
        p_vehicle_type: decision === 'approved' ? vehicle : null,
        p_factory_arrival_time: decision === 'approved' ? arrival : null,
        p_driver_photo_path: up?.path ?? null,
        p_note: note.trim() || null,
      })
      if (error) throw error
      onDone()
    } catch (e) {
      setErr((e as Error).message || 'บันทึกไม่สำเร็จ')
    }
    setBusy(false)
  }

  const seg = (on: boolean, tone: 'ok' | 'bad') =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 font-semibold transition-colors ${
      on ? (tone === 'ok' ? 'border-okay bg-okay text-white' : 'border-bad bg-bad text-white') : 'border-slate-400/60 bg-white text-slate-800'}`

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-5 pb-6 lg:p-6">
      <h2 className="text-xl font-bold">ผลการพิจารณา</h2>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => setDecision('approved')} className={seg(decision === 'approved', 'ok')}>
          <Check size={20} /><span><span className="lg:hidden">อนุมัติ</span><span className="hidden lg:inline">อนุมัติ / ยืนยันรับจอง</span></span>
        </button>
        <button type="button" onClick={() => setDecision('rejected')} className={seg(decision === 'rejected', 'bad')}>
          <X size={20} /><span><span className="lg:hidden">ปฏิเสธ</span><span className="hidden lg:inline">ไม่อนุมัติ / ปฏิเสธ</span></span>
        </button>
      </div>

      {decision === 'approved' ? (
        <div className="mt-5 space-y-5">
          <Field label="ประเภทรถที่ใช้" required>
            <div className="grid grid-cols-2 gap-3">
              {VEHICLES.map((v) => (
                <button key={v} type="button" onClick={() => setVehicle(v)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-3 py-4 lg:flex-row lg:justify-start lg:gap-4 lg:px-5 ${vehicle === v ? 'border-brand bg-brand-soft text-brand-dark' : 'border-slate-400/60 bg-white'}`}>
                  <Truck size={v === '4_wheel' ? 26 : 30} />
                  <span className="text-center lg:text-left">
                    <span className="block text-lg font-bold">{VEHICLE_LABEL[v]}</span>
                    <span className="hidden text-sm text-muted lg:block">{VEHICLE_SIZE[v]}</span>
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="เวลารถมาถึงโรงงาน" required htmlFor="f-arrival">
              <TimeField id="f-arrival" value={arrival} onChange={setArrival} required />
            </Field>
            <Field label="รูปภาพพนักงานขับรถ" required>
              <input ref={pick} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              <div className="flex items-center gap-3">
                {preview
                  ? <img src={preview} alt="" className="h-[60px] w-[60px] shrink-0 rounded-xl object-cover lg:h-20 lg:w-20" />
                  : <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500 lg:h-20 lg:w-20"><User size={28} /></span>}
                <button type="button" onClick={() => pick.current?.click()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-brand/60 bg-white px-4 py-3 font-semibold text-brand lg:flex-none">
                  <Camera size={20} />ถ่าย<span className="hidden lg:inline"> / อัปโหลดรูป</span><span className="lg:hidden"> / อัปโหลด</span>
                </button>
              </div>
            </Field>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <Field label="เหตุผลที่ไม่อนุมัติ" required>
            <textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="mt-5">
        <Field label="หมายเหตุเพิ่มเติม">
          <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4"><ErrorBox msg={err} /></div>

      {/* เดสก์ท็อป: ปุ่มอยู่ท้ายการ์ด */}
      <div className="mt-5 hidden items-center justify-between gap-4 border-t border-line pt-5 lg:flex">
        <span className="flex items-center gap-2 text-muted"><Bell size={18} />บันทึกแล้วระบบแจ้งฝ่ายขายทันที</span>
        <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {busy ? <Clock size={20} /> : <Save size={20} />}{busy ? 'กำลังบันทึก…' : 'บันทึกการยืนยัน'}
        </button>
      </div>

      {/* มือถือ: ปุ่มติดล่าง */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 pt-3 lg:hidden" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-lg font-semibold text-white active:bg-brand-dark disabled:opacity-50">
          <Save size={20} />{busy ? 'กำลังบันทึก…' : 'บันทึกการยืนยัน'}
        </button>
        <p className="mt-2 text-center text-sm text-muted">ระบบจะแจ้งฝ่ายขายทันทีที่บันทึก</p>
      </div>
    </form>
  )
}
