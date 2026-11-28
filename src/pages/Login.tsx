import { useState, type FormEvent } from 'react'
import { Briefcase, Truck } from 'lucide-react'
import { Button, Card, ErrorBox, Field, Logo, inputCls } from '../components/ui'
import { DEPT_LABEL, setIntentRole, useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Role } from '../lib/types'

const DEPTS: { role: Role; sub: string; icon: typeof Truck }[] = [
  { role: 'sales', sub: 'ส่งคำขอจองรถ', icon: Briefcase },
  { role: 'dispatch', sub: 'ยืนยันและจัดรถ', icon: Truck },
]

export default function Login() {
  const { notice, clearNotice } = useAuth()
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in')
  const [dept, setDept] = useState<Role>('sales')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => { setErr(null); setInfo(null); clearNotice() }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); reset()
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.href.split('#')[0] })
      setBusy(false)
      if (error) setErr(/rate limit/i.test(error.message) ? 'ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' : error.message)
      else setInfo('ถ้าอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้ (ตรวจกล่องสแปมด้วย)')
      return
    }
    setIntentRole(dept)
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setIntentRole(null)
        const m = error.message
        setErr(
          /not confirmed/i.test(m) ? 'อีเมลนี้ยังไม่ได้ยืนยัน กรุณากดลิงก์ในอีเมลที่ได้รับ (ดูในกล่องสแปมด้วย)'
          : /invalid login/i.test(m) ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (หรือยังไม่ได้สมัครบัญชีนี้)'
          : /api key|apikey|failed to fetch/i.test(m) ? 'เชื่อมต่อ Supabase ไม่ได้: ตรวจ URL และคีย์ในไฟล์ .env แล้วรีสตาร์ต npm run dev'
          : m,
        )
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.href.split('#')[0], data: { full_name: name.trim(), ...(dept === 'dispatch' ? { dispatch_code: code.trim() } : { sales_code: code.trim() }) } },
      })
      if (error) {
        setIntentRole(null)
        // รหัสผิด → ฐานข้อมูลปฏิเสธการสร้างบัญชี Supabase จะตอบเป็น "Database error saving new user"
        setErr(/database error|invalid (dispatch|sales) code/i.test(error.message)
          ? (dept === 'dispatch' ? 'รหัสแผนกจัดส่งไม่ถูกต้อง กรุณาขอรหัสจากผู้ดูแลระบบ' : 'รหัสบริษัทไม่ถูกต้อง กรุณาขอรหัสจากผู้ดูแลระบบ')
          : error.message)
      } else if (!data.session) {
        setIntentRole(null)
        setInfo('สมัครแล้ว กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ')
      }
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={72} />
        <h1 className="text-2xl font-bold">ระบบจองรถขนส่งสินค้า</h1>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'forgot' && <h2 className="text-lg font-bold">ลืมรหัสผ่าน</h2>}
          {mode !== 'forgot' && <div>
            <div className="mb-2 font-semibold">{mode === 'in' ? 'เข้าสู่ระบบในฐานะ' : 'สมัครเป็น'}</div>
            <div role="radiogroup" aria-label="เลือกแผนก" className="grid grid-cols-2 gap-3">
              {DEPTS.map(({ role, sub, icon: Icon }) => {
                const on = dept === role
                return (
                  <button
                    key={role} type="button" role="radio" aria-checked={on}
                    onClick={() => { setDept(role); reset() }}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3.5 text-center transition ${on ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-white text-navy'}`}
                  >
                    <Icon size={24} />
                    <span className="font-bold">{DEPT_LABEL[role]}</span>
                    <span className={`text-xs ${on ? 'text-brand' : 'text-muted'}`}>{sub}</span>
                  </button>
                )
              })}
            </div>
          </div>}

          {mode === 'up' && (
            <Field label="ชื่อ-นามสกุล" required htmlFor="f-name">
              <input id="f-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          )}
          <Field label="อีเมล" required htmlFor="f-email">
            <input id="f-email" className={inputCls} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          {mode !== 'forgot' && <Field label="รหัสผ่าน" required htmlFor="f-password">
            <input id="f-password" className={inputCls} type="password" minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>}
          {mode === 'in' && (
            <button type="button" className="-mt-2 text-sm text-brand underline" onClick={() => { setMode('forgot'); reset() }}>ลืมรหัสผ่าน?</button>
          )}
          {mode === 'up' && (
            <Field label={dept === 'dispatch' ? 'รหัสแผนกจัดส่ง' : 'รหัสบริษัท'} required hint="ขอรหัสจากผู้ดูแลระบบ (ใช้ยืนยันว่าเป็นพนักงานจริง)" htmlFor="f-code">
              <input id="f-code" className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" required />
            </Field>
          )}

          <ErrorBox msg={err ?? notice} />
          {info && <p className="rounded-xl bg-okay-soft px-4 py-3 text-sm text-okay">{info}</p>}
          <Button disabled={busy} className="w-full">
            {mode === 'forgot' ? 'ส่งลิงก์ตั้งรหัสผ่านใหม่' : mode === 'in' ? `เข้าสู่ระบบ (${DEPT_LABEL[dept]})` : `สมัครสมาชิก (${DEPT_LABEL[dept]})`}
          </Button>
        </form>
      </Card>
      <button className="text-brand underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); reset() }}>
        {mode === 'in' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : mode === 'forgot' ? 'กลับไปหน้าเข้าสู่ระบบ' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
      </button>
    </div>
  )
}
