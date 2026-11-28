import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MobileBar from '../components/MobileBar'
import { Button, Card, ErrorBox, Field, Logo, inputCls } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (pw.length < 8) return setErr('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
    if (pw !== pw2) return setErr('รหัสผ่านสองช่องไม่ตรงกัน')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) {
      const m = error.message
      return setErr(
        /different from the old|same password/i.test(m) ? 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม'
        : /weak|at least|characters/i.test(m) ? 'รหัสผ่านง่ายเกินไป กรุณาใช้รหัสที่ยาวและเดายากขึ้น'
        : /session|jwt|not authenticated/i.test(m) ? 'หมดเวลาการยืนยันตัวตน กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่'
        : m,
      )
    }
    setOk(true)
    setTimeout(onDone, 1200)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="รหัสผ่านใหม่" required hint="อย่างน้อย 8 ตัวอักษร" htmlFor="f-newpw">
        <input id="f-newpw" className={inputCls} type="password" minLength={8} maxLength={72} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </Field>
      <Field label="ยืนยันรหัสผ่านใหม่" required htmlFor="f-newpw2">
        <input id="f-newpw2" className={inputCls} type="password" minLength={8} maxLength={72} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      </Field>
      <ErrorBox msg={err} />
      {ok && <p className="rounded-xl bg-okay-soft px-4 py-3 text-sm text-okay">เปลี่ยนรหัสผ่านเรียบร้อยแล้ว</p>}
      <Button disabled={busy || ok} className="w-full"><KeyRound size={18} />{busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}</Button>
    </form>
  )
}

// หน้าเปลี่ยนรหัสผ่านภายในแอป (ล็อกอินอยู่แล้ว)
export default function ChangePassword() {
  const nav = useNavigate()
  const { profile } = useAuth()
  return (
    <div>
      <MobileBar title="เปลี่ยนรหัสผ่าน" subtitle={profile?.full_name} back="/notifications" />
      <div className="mx-auto max-w-md space-y-4 p-4 lg:p-8">
        <h1 className="hidden text-3xl font-bold lg:block">เปลี่ยนรหัสผ่าน</h1>
        <Card><PasswordForm onDone={() => nav('/notifications', { replace: true })} /></Card>
        <Link to="/notifications" className="block text-center text-brand underline lg:hidden">ยกเลิก</Link>
      </div>
    </div>
  )
}

// หน้าเต็มจอ: มาจากลิงก์ "ลืมรหัสผ่าน" ในอีเมล
export function RecoveryPassword() {
  const { endRecovery } = useAuth()
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={72} />
        <h1 className="text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
        <p className="text-muted">กรอกรหัสผ่านใหม่ของคุณ แล้วระบบจะพาเข้าใช้งานต่อ</p>
      </div>
      <Card><PasswordForm onDone={endRecovery} /></Card>
    </div>
  )
}
