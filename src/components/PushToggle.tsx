import { usePush } from '../lib/hooks'

// ข้อความแนะนำเมื่อรับ Push ไม่ได้ (ปุ่ม "เปิดแจ้งเตือน" อยู่ที่แถบหัว/แถบข้าง)
export default function PushBanner() {
  const { state, err } = usePush()
  if (!state || state === 'on' || state === 'off' || state === 'unconfigured') return null
  return (
    <div className="rounded-2xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-slate-800">
      {state === 'ios-needs-install' && <p>📲 บน iPhone ต้องติดตั้งแอปก่อนจึงจะรับแจ้งเตือนได้: กดปุ่มแชร์ใน Safari แล้วเลือก <b>“เพิ่มไปยังหน้าจอโฮม”</b> จากนั้นเปิดจากไอคอนบนหน้าจอ</p>}
      {state === 'unsupported' && <p>เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Push (ยังเห็นการแจ้งเตือนในแอปได้)</p>}
      {state === 'denied' && <p>คุณปิดสิทธิ์แจ้งเตือนไว้ เปิดได้ที่การตั้งค่าของเบราว์เซอร์/มือถือ</p>}
      {err && <p className="mt-1 text-bad">{err}</p>}
    </div>
  )
}
