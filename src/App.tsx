import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './lib/auth'
import { BookingsProvider } from './lib/bookings'
import { isConfigured } from './lib/supabase'
import Login from './pages/Login'
import MyBookings from './pages/MyBookings'
import NewBooking from './pages/NewBooking'
import Notifications from './pages/Notifications'
import Queue from './pages/Queue'

function Gate() {
  const { session, profile, loading } = useAuth()
  if (loading) return <p className="p-8 text-center text-muted">กำลังโหลด…</p>
  if (!session) return <Login />
  if (!profile) return <p className="p-8 text-center text-bad">ไม่พบโปรไฟล์ผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ</p>
  const List = profile.role === 'dispatch' ? Queue : MyBookings
  return (
    <BookingsProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<List />} />
          <Route path="bookings/:id" element={<List />} />
          <Route path="notifications" element={<Notifications />} />
          {profile.role === 'sales' && <Route path="new" element={<NewBooking />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BookingsProvider>
  )
}

export default function App() {
  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-lg font-bold">ยังไม่ได้ตั้งค่า Supabase</h1>
        <p className="mt-2 text-sm text-muted">
          สร้างไฟล์ <code>.env</code> จาก <code>.env.example</code> แล้วใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY (ดูขั้นตอนใน README)
        </p>
      </div>
    )
  }
  return (
    <HashRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </HashRouter>
  )
}
