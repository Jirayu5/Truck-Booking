-- ============================================================
-- ระบบจองรถขนส่งสินค้า — สคีมาฐานข้อมูล Supabase
-- วางทั้งไฟล์ใน Supabase Dashboard > SQL Editor แล้วกด Run
-- ============================================================

-- ---------- ประเภทข้อมูล ----------
create type user_role as enum ('sales', 'dispatch');
create type booking_status as enum ('pending', 'approved', 'rejected');
create type vehicle_type as enum ('4_wheel', '6_wheel');

-- ---------- โปรไฟล์ผู้ใช้ ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'sales',
  created_at timestamptz not null default now()
);

-- ---------- สมัครสมาชิก: สร้างโปรไฟล์อัตโนมัติ + เลือกแผนก ----------
-- role เริ่มต้น = sales; จะเป็น dispatch ได้ก็ต่อเมื่อสมัครพร้อมรหัสแผนกจัดส่งที่ถูกต้อง
-- ที่เก็บรหัสลับ: เปิด RLS และไม่มีนโยบายใดๆ + ถอนสิทธิ์ → เรียกผ่าน API จากหน้าเว็บไม่ได้เลย
create table if not exists app_settings (
  key text primary key,
  value text not null
);
alter table app_settings enable row level security;
revoke all on app_settings from anon, authenticated;

-- สร้างรหัสแผนกจัดส่งแบบสุ่มให้ก่อน (ดู/เปลี่ยนได้ที่ Table Editor > app_settings)
insert into app_settings (key, value)
values ('dispatch_code', replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- สมัครพร้อมรหัสถูก → เป็นแผนกจัดส่ง / ไม่ใส่รหัส → ฝ่ายขาย / ใส่รหัสผิด → สมัครไม่ผ่าน
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  code text := coalesce(new.raw_user_meta_data->>'dispatch_code', '');
  r user_role := 'sales';
begin
  if code <> '' then
    if code = (select value from app_settings where key = 'dispatch_code') then
      r := 'dispatch';
    else
      raise exception 'invalid dispatch code';
    end if;
  end if;
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), r);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ตัวช่วยตรวจ role (security definer เพื่อไม่ให้ RLS วนซ้ำ)
create function is_dispatch() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'dispatch');
$$;

-- ---------- คำขอจองรถ ----------
create table bookings (
  id bigint generated always as identity primary key,
  delivery_date date not null,
  destination text not null check (length(trim(destination)) > 0),
  customer_name text not null check (length(trim(customer_name)) > 0),
  depart_time time not null,
  arrive_time text,                 -- ข้อความหรือเวลา (ไม่จำเป็น)
  note text,
  status booking_status not null default 'pending',
  created_by uuid not null default auth.uid() references profiles(id),
  created_at timestamptz not null default now()
);
create index on bookings (status, created_at desc);
create index on bookings (created_by, created_at desc);

-- เอกสารประกอบ (เก็บ path ใน Storage)
create table booking_files (
  id bigint generated always as identity primary key,
  booking_id bigint not null references bookings(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);
create index on booking_files (booking_id);

-- ผลการยืนยันจากแผนกจัดส่ง (1 คำขอ = 1 ผล)
create table confirmations (
  id bigint generated always as identity primary key,
  booking_id bigint not null unique references bookings(id) on delete cascade,
  decision booking_status not null check (decision in ('approved', 'rejected')),
  reject_reason text,
  vehicle_type vehicle_type,
  factory_arrival_time time,
  driver_photo_path text,
  note text,
  decided_by uuid not null references profiles(id),
  decided_at timestamptz not null default now(),
  -- ถ้าปฏิเสธต้องมีเหตุผล / ถ้าอนุมัติต้องมีประเภทรถ เวลา และรูปคนขับ
  check (
    (decision = 'rejected' and length(trim(coalesce(reject_reason, ''))) > 0)
    or
    (decision = 'approved' and vehicle_type is not null
       and factory_arrival_time is not null and driver_photo_path is not null)
  )
);

-- การแจ้งเตือนในระบบ (และเป็นตัวกระตุ้น Web Push)
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  booking_id bigint references bookings(id) on delete cascade,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

-- อุปกรณ์ที่สมัครรับ Web Push
create table push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — ต้องเปิดทุกตาราง
-- ============================================================
alter table profiles enable row level security;
alter table bookings enable row level security;
alter table booking_files enable row level security;
alter table confirmations enable row level security;
alter table notifications enable row level security;
alter table push_subscriptions enable row level security;

-- profiles: เห็นของตัวเอง, แผนกจัดส่งเห็นทุกคน (ใช้แสดงชื่อ), แก้ได้เฉพาะชื่อของตัวเอง
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_dispatch());
create policy profiles_update_own on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- กันไม่ให้เปลี่ยน role ผ่าน API: ให้สิทธิ์ update เฉพาะคอลัมน์ full_name
revoke update on profiles from authenticated, anon;
grant update (full_name) on profiles to authenticated;

-- bookings: ฝ่ายขายเห็นของตัวเอง, แผนกจัดส่งเห็นทั้งหมด
-- สร้างได้เฉพาะสถานะ pending เป็นของตัวเอง; ไม่มี update/delete (แก้ผ่านฟังก์ชันเท่านั้น)
create policy bookings_select on bookings for select
  using (created_by = auth.uid() or is_dispatch());
create policy bookings_insert on bookings for insert
  with check (created_by = auth.uid() and status = 'pending');

-- booking_files
create policy booking_files_select on booking_files for select
  using (exists (select 1 from bookings b where b.id = booking_id
                 and (b.created_by = auth.uid() or is_dispatch())));
create policy booking_files_insert on booking_files for insert
  with check (exists (select 1 from bookings b where b.id = booking_id and b.created_by = auth.uid()));

-- confirmations: อ่านได้ถ้าเห็นคำขอนั้น; เขียนผ่านฟังก์ชัน decide_booking เท่านั้น
create policy confirmations_select on confirmations for select
  using (exists (select 1 from bookings b where b.id = booking_id
                 and (b.created_by = auth.uid() or is_dispatch())));

-- notifications: เห็นและแก้ (อ่านแล้ว) ของตัวเอง
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on notifications from authenticated, anon;
grant update (read_at) on notifications to authenticated;

-- push_subscriptions: จัดการของตัวเองเท่านั้น
create policy push_select on push_subscriptions for select using (user_id = auth.uid());
create policy push_insert on push_subscriptions for insert with check (user_id = auth.uid());
create policy push_delete on push_subscriptions for delete using (user_id = auth.uid());

-- ============================================================
-- แจ้งเตือนอัตโนมัติ
-- ============================================================

-- มีคำขอใหม่ → แจ้งแผนกจัดส่งทุกคน
create function notify_dispatch_new_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, booking_id, title, body)
  select p.id, new.id,
         'มีคำขอจองรถใหม่',
         'ลูกค้า ' || new.customer_name || ' ส่ง ' || to_char(new.delivery_date, 'DD/MM/YYYY')
           || ' ออก ' || to_char(new.depart_time, 'HH24:MI')
  from profiles p where p.role = 'dispatch';
  return new;
end $$;

create trigger trg_notify_dispatch
  after insert on bookings
  for each row execute function notify_dispatch_new_booking();

-- ============================================================
-- ฟังก์ชันบันทึกการยืนยัน (อะตอมมิก: ผลยืนยัน + เปลี่ยนสถานะ + แจ้งเตือนฝ่ายขาย)
-- ============================================================
create function decide_booking(
  p_booking_id bigint,
  p_decision booking_status,
  p_reject_reason text default null,
  p_vehicle_type vehicle_type default null,
  p_factory_arrival_time time default null,
  p_driver_photo_path text default null,
  p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
  msg text;
begin
  if not is_dispatch() then
    raise exception 'เฉพาะแผนกจัดส่งเท่านั้น' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'ผลการยืนยันไม่ถูกต้อง';
  end if;

  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'ไม่พบคำขอ'; end if;
  if b.status <> 'pending' then raise exception 'คำขอนี้ถูกดำเนินการไปแล้ว'; end if;

  insert into confirmations (booking_id, decision, reject_reason, vehicle_type,
                             factory_arrival_time, driver_photo_path, note, decided_by)
  values (p_booking_id, p_decision, p_reject_reason,
          case when p_decision = 'approved' then p_vehicle_type end,
          case when p_decision = 'approved' then p_factory_arrival_time end,
          case when p_decision = 'approved' then p_driver_photo_path end,
          p_note, auth.uid());

  update bookings set status = p_decision where id = p_booking_id;

  if p_decision = 'approved' then
    msg := 'รับจองแล้ว: ' || case p_vehicle_type when '4_wheel' then 'รถ 4 ล้อ' else 'รถ 6 ล้อ' end
           || ' ถึงโรงงาน ' || to_char(p_factory_arrival_time, 'HH24:MI');
  else
    msg := 'ไม่อนุมัติ: ' || p_reject_reason;
  end if;

  insert into notifications (user_id, booking_id, title, body)
  values (b.created_by, b.id, 'ผลการจอง ' || b.customer_name, msg);
end $$;

revoke all on function decide_booking from public, anon;
grant execute on function decide_booking to authenticated;

-- ============================================================
-- Storage: bucket ส่วนตัวสำหรับเอกสารและรูปคนขับ
-- โครงสร้างไฟล์: <user_id>/<ชื่อไฟล์>
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- อัปโหลดได้เฉพาะในโฟลเดอร์ของตัวเอง
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- อ่านได้ถ้า: ไฟล์ของตัวเอง / เป็นแผนกจัดส่ง / เป็นรูปคนขับของคำขอที่ตัวเองสร้าง
create policy attachments_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_dispatch()
      or exists (select 1 from confirmations c join bookings b on b.id = c.booking_id
                 where c.driver_photo_path = storage.objects.name and b.created_by = auth.uid())
    )
  );

-- ============================================================
-- Realtime: ให้หน้าเว็บเห็นการเปลี่ยนแปลงทันที
-- ============================================================
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table confirmations;
alter publication supabase_realtime add table notifications;

-- ============================================================
-- สิทธิ์เข้าถึงตารางผ่าน Data API
-- Supabase รุ่นใหม่ไม่ให้สิทธิ์ตารางที่สร้างด้วย SQL อัตโนมัติ จึงต้องให้เอง
-- (ให้เท่าที่จำเป็น ส่วนการกรองว่าใครเห็นแถวไหนอยู่ที่ RLS ด้านบน)
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on profiles to authenticated;
grant update (full_name) on profiles to authenticated;
grant select, insert on bookings to authenticated;
grant select, insert on booking_files to authenticated;
grant select on confirmations to authenticated;
grant select on notifications to authenticated;
grant update (read_at) on notifications to authenticated;
grant select, insert, delete on push_subscriptions to authenticated;
grant execute on function decide_booking(bigint, booking_status, text, vehicle_type, time, text, text) to authenticated;
