import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { EMPTY_FILTER, type ListFilter } from './filter'
import type { Booking, Status } from './types'

interface Ctx {
  rows: Booking[] | null
  error: string | null
  counts: Record<Status | 'all', number>
  reload: () => void
  filter: ListFilter
  setFilter: (p: Partial<ListFilter>) => void
  clearFilter: () => void
}
const C = createContext<Ctx>(null!)
export const useBookings = () => useContext(C)

const SELECT = '*, confirmations(*), booking_files(*), creator:profiles!created_by(full_name)'

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilterState] = useState<ListFilter>(EMPTY_FILTER)
  const setFilter = useCallback((p: Partial<ListFilter>) => setFilterState((f) => ({ ...f, ...p })), [])
  const clearFilter = useCallback(() => setFilterState(EMPTY_FILTER), [])

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('bookings').select(SELECT).order('created_at', { ascending: false }).limit(500)
    if (error) setError(error.message)
    else { setRows(data as unknown as Booking[]); setError(null) }
  }, [])

  useEffect(() => {
    reload()
    // เห็นการเปลี่ยนแปลงทันทีโดยไม่ต้องรีเฟรช
    const ch = supabase.channel('bookings-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confirmations' }, reload)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [reload])

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, rejected: 0 }
    for (const r of rows ?? []) { c.all++; c[r.status]++ }
    return c
  }, [rows])

  return <C.Provider value={{ rows, error, counts, reload, filter, setFilter, clearFilter }}>{children}</C.Provider>
}
