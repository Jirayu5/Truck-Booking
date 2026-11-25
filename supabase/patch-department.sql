-- ============================================================
-- แพตช์: เลือกแผนกตอนสมัครสมาชิก (แผนกจัดส่งต้องใช้รหัสลับ)
-- ใช้กับฐานข้อมูลที่รัน schema.sql ไปแล้ว: วางทั้งไฟล์ใน SQL Editor แล้ว Run
-- (ถ้าตั้งโปรเจคใหม่ schema.sql มีส่วนนี้รวมอยู่แล้ว ไม่ต้องรันไฟล์นี้)
-- ============================================================

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
