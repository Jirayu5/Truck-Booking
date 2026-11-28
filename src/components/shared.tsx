import { Check, Clock, FileText, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { signedUrl } from '../lib/files'
import { fmtStamp } from '../lib/format'
import { confirmationOf, type Booking } from '../lib/types'

export function DriverPhoto({ path, size = 64 }: { path: string | null | undefined; size?: number }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { setUrl(null); if (path) signedUrl(path).then(setUrl) }, [path])
  const box = { width: size, height: size }
  if (url) return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="พนักงานขับรถ" style={box} className="rounded-xl border border-line object-cover" /></a>
  return (
    <div style={box} className="flex items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
      <User size={size * 0.42} />
    </div>
  )
}

export function FileLinks({ files }: { files: Booking['booking_files'] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    let live = true
    ;(files ?? []).forEach((f) => signedUrl(f.file_path).then((u) => live && u && setUrls((p) => ({ ...p, [f.file_path]: u }))))
    return () => { live = false }
  }, [files])
  if (!files?.length) return <>-</>
  return (
    <div className="space-y-1">
      {files.map((f) => (
        <a key={f.id} href={urls[f.file_path]} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 break-all font-semibold text-brand underline">
          <FileText size={16} className="shrink-0" />{f.file_name}
        </a>
      ))}
    </div>
  )
}

export function Timeline({ b }: { b: Booking }) {
  const c = confirmationOf(b)
  const Dot = ({ ok, bad }: { ok?: boolean; bad?: boolean }) => (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-okay text-white' : bad ? 'bg-bad text-white' : 'border-2 border-slate-300 text-slate-400'}`}>
      {ok ? <Check size={18} strokeWidth={3} /> : bad ? <X size={18} strokeWidth={3} /> : <Clock size={16} />}
    </span>
  )
  const Row = ({ dot, text, at, dim }: { dot: React.ReactNode; text: string; at?: string; dim?: boolean }) => (
    <div className="flex items-center gap-3">
      {dot}
      <span className={`flex-1 ${dim ? 'text-muted' : 'font-medium'}`}>{text}</span>
      {at && <span className="text-sm text-muted">{at}</span>}
    </div>
  )
  return (
    <div className="space-y-3">
      <Row dot={<Dot ok />} text="ส่งคำขอ" at={fmtStamp(b.created_at)} />
      {b.edited_at && <Row dot={<Dot ok />} text="ฝ่ายขายแก้ไขคำขอ" at={fmtStamp(b.edited_at)} />}
      {c
        ? <Row dot={<Dot ok={c.decision === 'approved'} bad={c.decision === 'rejected'} />}
            text={c.decision === 'approved' ? 'แผนกจัดส่งอนุมัติ' : 'แผนกจัดส่งปฏิเสธ'} at={fmtStamp(c.decided_at)} />
        : b.status !== 'cancelled' && <Row dot={<Dot />} text="รอแผนกจัดส่งยืนยัน" dim />}
      {c?.updated_at && <Row dot={<Dot ok />} text="แผนกจัดส่งแก้ไขผลการจอง" at={fmtStamp(c.updated_at)} />}
      {b.status === 'cancelled' && <Row dot={<Dot bad />} text="ฝ่ายขายยกเลิกคำขอ" at={b.cancelled_at ? fmtStamp(b.cancelled_at) : undefined} />}
    </div>
  )
}
