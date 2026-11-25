import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile, Role } from './types'

export const DEPT_LABEL: Record<Role, string> = { sales: 'ฝ่ายขาย', dispatch: 'แผนกจัดส่ง' }
const INTENT_KEY = 'intent_role'

// แผนกที่ผู้ใช้เลือกไว้ตอนกดเข้าสู่ระบบ/สมัคร (จำไว้ข้ามการโหลดสถานะล็อกอิน)
export const setIntentRole = (r: Role | null) => {
  try { r ? sessionStorage.setItem(INTENT_KEY, r) : sessionStorage.removeItem(INTENT_KEY) } catch { /* ไม่มี storage ก็ข้าม */ }
}
const takeIntentRole = (): Role | null => {
  try {
    const v = sessionStorage.getItem(INTENT_KEY)
    sessionStorage.removeItem(INTENT_KEY)
    return v === 'sales' || v === 'dispatch' ? v : null
  } catch { return null }
}

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  notice: string | null
  clearNotice: () => void
  signOut: () => Promise<void>
}
const Ctx = createContext<AuthCtx>(null!)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const clearNotice = useCallback(() => setNotice(null), [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) { setProfile(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase.from('profiles').select('id, full_name, role').eq('id', userId).single()
      .then(async ({ data }) => {
        const p = data as Profile | null
        const intent = takeIntentRole()
        // เลือกแผนกไม่ตรงกับบัญชี → ออกจากระบบแล้วแจ้งเหตุผลที่หน้าล็อกอิน
        if (p && intent && p.role !== intent) {
          setNotice(`บัญชีนี้เป็นของ${DEPT_LABEL[p.role]} ไม่ใช่${DEPT_LABEL[intent]} กรุณาเลือกแผนกให้ตรงกับบัญชี`)
          setProfile(null)
          await supabase.auth.signOut()
          return
        }
        setProfile(p)
        setLoading(false)
      })
  }, [userId])

  return (
    <Ctx.Provider value={{ session, profile, loading, notice, clearNotice, signOut: async () => { await supabase.auth.signOut() } }}>
      {children}
    </Ctx.Provider>
  )
}
