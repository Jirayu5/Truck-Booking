import { Bell, FileText, ImageIcon, Send, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import MobileBar from '../components/MobileBar'
import { Button, Card, ErrorBox, DateField, Field, TimeField, inputCls } from '../components/ui'
import { useAuth } from '../lib/auth'
import { uploadFile } from '../lib/files'
import { useBookings } from '../lib/bookings'
import { fmtTime } from '../lib/format'
import { supabase } from '../lib/supabase'

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

export default function NewBooking() {
  const { session } = useAuth()
  const { reload, rows } = useBookings()
  const [params] = useSearchParams()
  const src = (rows ?? []).find((r) => String(r.id) === params.get('from'))
  const prefilled = useRef(false)
  const nav = useNavigate()
  const today = new Date().toLocaleDateString('en-CA')
  const [f, setF] = useState({ delivery_date: today, destination: '', customer_name: '', depart_time: '', arrive_time: '', note: '' })
  useEffect(() => {
    if (!src || prefilled.current) return
    prefilled.current = true
    // คัดลอกข้อมูลจากคำขอเดิม (ยกเว้นวันที่และไฟล์แนบ ให้ผู้ใช้กรอก/แนบใหม่)
    setF((p) => ({ ...p, customer_name: src.customer_name, destination: src.destination, depart_time: fmtTime(src.depart_time), arrive_time: src.arrive_time ?? '', note: src.note ?? '' }))
  }, [src])
  const [files, setFiles] = useState<File[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const pick = useRef<HTMLInputElement>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }))
  const add = (list: FileList | null) => {
    const picked = list ? Array.from(list) : []
    if (!picked.length) return
    const ok = picked.filter((x) => x.size <= 5 * 1024 * 1024 && (x.type.startsWith('image/') || x.type === 'application/pdf'))
    const msgs: string[] = []
    if (ok.length < picked.length) msgs.push('บางไฟล์ถูกข้าม: รับเฉพาะรูปภาพหรือ PDF ขนาดไม่เกิน 5 MB')
    setFiles((p) => {
      const next = [...p, ...ok].slice(0, 10)
      if (p.length + ok.length > 10) msgs.push('แนบได้ไม่เกิน 10 ไฟล์ต่อคำขอ')
      return next
    })
    setErr(msgs.length ? msgs.join(' / ') : null)
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!session) return
    setBusy(true); setErr(null)
    try {
      const uploaded = await Promise.all(files.map((x) => uploadFile(session.user.id, x)))
      const { data, error } = await supabase.from('bookings').insert({
        delivery_date: f.delivery_date,
        destination: f.destination.trim(),
        customer_name: f.customer_name.trim(),
        depart_time: f.depart_time,
        arrive_time: f.arrive_time.trim() || null,
        note: f.note.trim() || null,
      }).select('id').single()
      if (error) throw error
      if (uploaded.length) {
        const { error: e2 } = await supabase.from('booking_files')
          .insert(uploaded.map((u) => ({ booking_id: data.id, file_path: u.path, file_name: u.name })))
        if (e2) throw e2
      }
      await reload()
      nav(`/bookings/${data.id}`, { replace: true })
    } catch (e) {
      const m = (e as Error).message || ''
      setErr(/daily booking limit/i.test(m) ? 'ส่งคำขอครบ 30 รายการใน 24 ชั่วโมงแล้ว กรุณาลองใหม่ภายหลัง'
        : /too many files/i.test(m) ? 'แนบไฟล์ได้ไม่เกิน 10 ไฟล์ต่อคำขอ'
        : m || 'ส่งคำขอไม่สำเร็จ')
      setBusy(false)
    }
  }

  const steps = [
    <>คำขอถูกส่งไปแผนกจัดส่ง สถานะ <b>รอการยืนยัน</b></>,
    'แผนกจัดส่งอนุมัติ ระบุประเภทรถ เวลาถึงโรงงาน และรูปพนักงานขับรถ',
    'คุณได้รับแจ้งเตือนและเห็นข้อมูลทันที',
  ]
  const send = (
    <Button disabled={busy} className="w-full py-3.5 text-lg"><Send size={20} />{busy ? 'กำลังส่ง…' : 'ส่งคำขอจองรถ'}</Button>
  )

  return (
    <form onSubmit={submit}>
      <MobileBar title="สร้างคำขอจองรถ" />
      <div className="mx-auto max-w-6xl p-4 pb-32 lg:p-8 lg:pb-8">
        <div className="mb-6 hidden items-start justify-between lg:flex">
          <div>
            <h1 className="text-3xl font-bold">สร้างคำขอจองรถ</h1>
            <p className="mt-1 text-muted">กรอกรายละเอียดการส่งสินค้า แล้วส่งให้แผนกจัดส่งยืนยัน</p>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted"><Bell size={16} />ระบบจะแจ้งเตือนเมื่อแผนกจัดส่งตอบกลับ</p>
        </div>
        {src && <p className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-brand-dark">คัดลอกจากคำขอเดิมของ {src.customer_name} กรุณาเลือกวันที่ส่งใหม่และตรวจข้อมูลก่อนส่ง (ไม่คัดลอกไฟล์แนบ)</p>}
        <p className="mb-4 text-muted lg:hidden">กรอกแล้วส่งให้แผนกจัดส่งยืนยัน ระบบจะแจ้งเตือนเมื่อมีผล</p>

        <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
          <div className="space-y-6">
            <Card className="space-y-5 p-6">
              <h2 className="hidden text-xl font-bold lg:block">ข้อมูลการส่งสินค้า</h2>
              <div className="grid gap-5 lg:grid-cols-2">
                <Field label="วันที่ส่งสินค้า" required htmlFor="f-date">
                  <DateField id="f-date" min={today} value={f.delivery_date} onChange={(v) => setF((p) => ({ ...p, delivery_date: v }))} required />
                </Field>
                <Field label="เวลารถออกต้นทาง" required htmlFor="f-depart">
                  <TimeField id="f-depart" value={f.depart_time} onChange={(v) => setF((p) => ({ ...p, depart_time: v }))} required />
                </Field>
              </div>
              <Field label="ชื่อลูกค้า" htmlFor="f-cust" required>
                <input className={inputCls} id="f-cust" maxLength={200} placeholder="บริษัท [ชื่อลูกค้า] จำกัด" value={f.customer_name} onChange={set('customer_name')} required />
              </Field>
              <Field label="สถานที่ส่งสินค้า" htmlFor="f-dest" required>
                <textarea className={inputCls} id="f-dest" maxLength={500} rows={4} placeholder="ที่อยู่ปลายทาง เช่น เลขที่ ถนน ตำบล อำเภอ จังหวัด" value={f.destination} onChange={set('destination')} required />
              </Field>
            </Card>

            <Card className="space-y-5 p-6">
              <h2 className="text-lg font-bold text-slate-700 lg:text-xl lg:text-inherit">ข้อมูลเพิ่มเติม <span className="text-sm font-normal text-muted lg:hidden">(ไม่บังคับ)</span></h2>
              <Field label="เวลาถึงปลายทาง" htmlFor="f-arrive">
                <input className={`${inputCls} lg:max-w-sm`} id="f-arrive" maxLength={100} placeholder="เช่น 11:00 หรือ ก่อนเที่ยง" value={f.arrive_time} onChange={set('arrive_time')} />
              </Field>
              <Field label="เอกสารประกอบ" hint="รูปภาพหรือ PDF">
                <input ref={pick} type="file" multiple accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => { add(e.target.files); e.target.value = '' }} />
                <button type="button" onClick={() => pick.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-brand lg:py-9 ${drag ? 'border-brand bg-brand-soft' : 'border-slate-400/70 bg-white'}`}>
                  <Upload size={20} />
                  <span><b className="font-semibold"><span className="lg:hidden">ถ่ายรูป / เลือกไฟล์</span><span className="hidden lg:inline">เลือกไฟล์</span></b>
                    <span className="hidden text-slate-700 lg:inline"> หรือลากมาวางที่นี่</span></span>
                </button>
                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((x, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
                          {x.type === 'application/pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{x.name}</span>
                        <span className="text-sm text-muted">{kb(x.size)}</span>
                        <button type="button" aria-label="ลบไฟล์" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
              <Field label="หมายเหตุ" htmlFor="f-note">
                <textarea className={inputCls} id="f-note" maxLength={1000} rows={3} placeholder="เช่น ติดต่อผู้รับก่อนเข้าส่ง" value={f.note} onChange={set('note')} />
              </Field>
            </Card>
            <div className="lg:hidden"><ErrorBox msg={err} /></div>
          </div>

          <aside className="hidden lg:block">
            <Card className="sticky top-8 p-6">
              <h2 className="text-xl font-bold">หลังกดส่ง</h2>
              <ol className="mt-4 space-y-4">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 space-y-3">
                <ErrorBox msg={err} />
                {send}
                <p className="text-center text-sm text-muted">ช่อง “จำเป็น” ต้องกรอกครบก่อนส่ง</p>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white p-4 lg:hidden" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {send}
      </div>
    </form>
  )
}
