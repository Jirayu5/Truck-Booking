export type Role = 'sales' | 'dispatch'
export type Status = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type VehicleType = '4_wheel' | '6_wheel'

export interface Profile { id: string; full_name: string; role: Role }

export interface Confirmation {
  id: number
  booking_id: number
  decision: Status
  reject_reason: string | null
  vehicle_type: VehicleType | null
  factory_arrival_time: string | null
  driver_photo_path: string | null
  note: string | null
  decided_at: string
  updated_at?: string | null
}

export interface BookingFile { id: number; file_path: string; file_name: string }

export interface Booking {
  id: number
  delivery_date: string
  destination: string
  customer_name: string
  depart_time: string
  arrive_time: string | null
  note: string | null
  status: Status
  created_by: string
  created_at: string
  edited_at?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  confirmations?: Confirmation[] | Confirmation | null
  booking_files?: BookingFile[]
  creator?: { full_name: string } | null
}

export interface AppNotification {
  id: number
  booking_id: number | null
  title: string
  body: string
  read_at: string | null
  created_at: string
}

export const STATUS_LABEL: Record<Status, string> = {
  pending: 'รอการยืนยัน',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิกแล้ว',
}
export const VEHICLE_LABEL: Record<VehicleType, string> = {
  '4_wheel': 'รถ 4 ล้อ',
  '6_wheel': 'รถ 6 ล้อ',
}
export const VEHICLE_SIZE: Record<VehicleType, string> = {
  '4_wheel': 'ขนาดเล็ก',
  '6_wheel': 'ขนาดกลาง',
}

export const confirmationOf = (b: Booking): Confirmation | null =>
  Array.isArray(b.confirmations) ? (b.confirmations[0] ?? null) : (b.confirmations ?? null)
