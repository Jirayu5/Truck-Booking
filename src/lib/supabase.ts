import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// ลิงก์จากอีเมล (กู้รหัสผ่าน/ยืนยันอีเมล) ส่งผลมาที่ hash ของ URL — จับไว้ก่อน supabase-js จะล้างทิ้ง
const startHash = typeof window !== 'undefined' ? window.location.hash : ''
export const startedInRecovery = /(^|[#&])type=recovery(&|$)/.test(startHash)
export const authLinkError: string | null = /error=|error_code=/.test(startHash)
  ? (/otp_expired|expired/i.test(startHash)
      ? 'ลิงก์ในอีเมลหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่'
      : 'ลิงก์ในอีเมลไม่ถูกต้อง กรุณาขอลิงก์ใหม่')
  : null

export const isConfigured = Boolean(url && key)

// anon key เปิดเผยได้ ความปลอดภัยอยู่ที่ Row Level Security ใน schema.sql
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
})
