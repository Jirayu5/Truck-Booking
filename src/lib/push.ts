import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState = 'unsupported' | 'ios-needs-install' | 'denied' | 'off' | 'on' | 'unconfigured'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

function b64ToUint8(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  }
}

export async function getPushState(): Promise<PushState> {
  // iPhone รองรับ Web Push เฉพาะเมื่อเพิ่มลงหน้าจอหลักแล้วเท่านั้น
  if (isIOS() && !isStandalone()) return 'ios-needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (!VAPID) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

export async function enablePush(): Promise<void> {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('ไม่ได้รับอนุญาตให้แจ้งเตือน')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID!) }))
  const j = sub.toJSON()
  const { error } = await supabase.rpc('register_push', {
    p_endpoint: j.endpoint!, p_p256dh: j.keys!.p256dh, p_auth: j.keys!.auth,
  })
  if (error) throw error
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

// ถ้าเบราว์เซอร์สมัคร Push ไว้แล้วแต่ฐานข้อมูลยังไม่มี (หรือสลับบัญชีในเครื่องเดียวกัน) ให้ลงทะเบียนให้อัตโนมัติ
let lastSynced = ''
export async function syncPush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user.id
    if (!uid || lastSynced === uid) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    const j = sub.toJSON()
    const { error } = await supabase.rpc('register_push', {
      p_endpoint: j.endpoint!, p_p256dh: j.keys!.p256dh, p_auth: j.keys!.auth,
    })
    if (!error) lastSynced = uid
  } catch { /* ลองใหม่ครั้งหน้า */ }
}
