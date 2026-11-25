// Supabase Edge Function: ส่ง Web Push เมื่อมีแถวใหม่ในตาราง notifications
// ถูกเรียกโดย Database Webhook (ดู README ขั้นตอนที่ 5)
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามใส่ในหน้าเว็บ
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async (req) => {
  // ตรวจรหัสลับ กันคนนอกเรียกฟังก์ชันตรงๆ
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('unauthorized', { status: 401 })
  }

  const payload = await req.json()
  if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
    return new Response('ignored', { status: 200 })
  }
  const n = payload.record as { user_id: string; booking_id: number | null; title: string; body: string }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', n.user_id)
  if (error) return new Response(error.message, { status: 500 })

  const message = JSON.stringify({
    title: n.title,
    body: n.body,
    url: n.booking_id ? `./#/bookings/${n.booking_id}` : './#/notifications',
  })

  let sent = 0
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message)
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      // อุปกรณ์เลิกสมัครหรือ subscription หมดอายุ → ลบทิ้ง
      if (code === 404 || code === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
      else console.error('push failed', code)
    }
  }))

  return new Response(JSON.stringify({ sent }), { headers: { 'content-type': 'application/json' } })
})
