import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { enablePush, getPushState, syncPush, type PushState } from './push'

export function useUnread(userId: string | undefined) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!userId) return
    const load = () =>
      supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)
        .then(({ count }) => setN(count ?? 0))
    load()
    // ชื่อช่องต้องไม่ซ้ำ เพราะ hook นี้ถูกเรียกจากหลายคอมโพเนนต์พร้อมกัน
    const ch = supabase.channel(`unread-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])
  return n
}

export function usePush() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { getPushState().then((s) => { setState(s); if (s === 'on') void syncPush() }) }, [])
  const enable = useCallback(async () => {
    setBusy(true); setErr(null)
    try { await enablePush() } catch (e) { setErr((e as Error).message) }
    setState(await getPushState()); setBusy(false)
  }, [])
  return { state, busy, err, enable }
}

export function useIsDesktop() {
  const q = '(min-width: 1024px)'
  const [v, setV] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setV(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return v
}
