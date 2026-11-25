# ระบบจองรถขนส่งสินค้า (PWA)

เว็บแอปติดตั้งลงมือถือได้ (PWA) สำหรับฝ่ายขายและแผนกจัดส่ง
สแต็ก: Vite + React + TypeScript + Tailwind · Supabase (ฐานข้อมูล/ล็อกอิน/ไฟล์/Realtime) · GitHub Pages · Web Push — ฟรีทั้งหมด

## ทำงานอย่างไร
1. ฝ่ายขายกรอก **ฟอร์มจองรถ** → ส่ง → แผนกจัดส่งได้รับแจ้งเตือน
2. แผนกจัดส่งเปิดคำขอ → **อนุมัติ** (เลือกรถ 4/6 ล้อ + เวลาถึงโรงงาน + รูปคนขับ) หรือ **ปฏิเสธ** (ระบุเหตุผล)
3. ฝ่ายขายเห็นสถานะทันที (Realtime) และได้รับแจ้งเตือน

หลังส่งคำขอแล้วฝ่ายขายแก้ไขเองไม่ได้ และคำขอที่ถูกตัดสินแล้วตัดสินซ้ำไม่ได้
(ถ้าถูกปฏิเสธ ให้สร้างคำขอใหม่)

## ตั้งค่าครั้งแรก

### 1) สร้างโปรเจค Supabase (ฟรี)
- สมัครที่ supabase.com → New project
- เปิด **SQL Editor** → วางไฟล์ `supabase/schema.sql` ทั้งไฟล์ → Run
- ที่ **Project Settings → API** คัดลอก `Project URL` และ `anon public key`
- ที่ **Authentication → Providers → Email** ถ้าไม่อยากต้องยืนยันอีเมลตอนทดสอบ ให้ปิด “Confirm email”

### 2) เลือกแผนกตอนสมัคร + รหัสแผนกจัดส่ง
หน้าเข้าสู่ระบบ/สมัครมีปุ่มเลือก **ฝ่ายขาย** หรือ **แผนกจัดส่ง**
- **ฝ่ายขาย** สมัครได้เลย
- **แผนกจัดส่ง** ต้องกรอก **รหัสแผนกจัดส่ง** ตอนสมัคร (กันคนนอกสมัครเป็นแผนกจัดส่งแล้วอนุมัติ/ปฏิเสธคำขอเอง) ถ้ารหัสผิด สมัครไม่ผ่าน
- ตอนเข้าสู่ระบบ ถ้าเลือกแผนกไม่ตรงกับบัญชี ระบบจะแจ้งและให้เลือกใหม่

`schema.sql` สร้างรหัสสุ่มให้แล้ว ดู/เปลี่ยนได้ที่ **Table Editor → app_settings → แถว `dispatch_code`** (ตารางนี้หน้าเว็บอ่านไม่ได้) หรือรัน:

```sql
update app_settings set value = 'ตั้งรหัสยาวๆ เดาไม่ได้' where key = 'dispatch_code';
```
แล้วแจ้งรหัสให้พนักงานแผนกจัดส่งทางช่องทางส่วนตัว ถ้ารหัสรั่ว ให้เปลี่ยนด้วยคำสั่งเดียวกัน (บัญชีที่สมัครไปแล้วไม่ได้รับผลกระทบ)

**ถ้าเคยรัน `schema.sql` ไปก่อนหน้านี้แล้ว** ให้รันไฟล์ `supabase/patch-department.sql` เพิ่มอีกหนึ่งไฟล์ (ไม่ต้องรัน schema.sql ซ้ำ)

เปลี่ยนสิทธิ์บัญชีที่มีอยู่แล้วด้วยมือ (กรณีฉุกเฉิน):
```sql
update profiles set role = 'dispatch'
where id = (select id from auth.users where email = 'dispatch@example.com');
```

### 3) สร้างคีย์ Web Push
```bash
npx web-push generate-vapid-keys
```
จะได้ Public key และ Private key — **Private key ห้ามใส่ในโค้ดหน้าเว็บ**

### 4) รันในเครื่อง
```bash
cp .env.example .env     # ใส่ค่า URL, anon key และ VAPID public key
npm install
npm run dev
```
แจ้งเตือน Push ต้องใช้ HTTPS (localhost ใช้ได้) จึงทดสอบบนมือถือจริงหลัง deploy

### 5) ติดตั้งระบบแจ้งเตือน Push (Edge Function)
ต้องมี [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` หรือใช้ `npx supabase`)

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com WEBHOOK_SECRET=<สุ่มข้อความยาวๆ>
npx supabase functions deploy send-push --no-verify-jwt
```
จากนั้นใน Supabase Dashboard → **Database → Webhooks → Create a new hook**
- Table: `notifications` · Events: **Insert**
- Type: **Supabase Edge Functions** → เลือก `send-push`
- เพิ่ม HTTP Header: `x-webhook-secret` = ค่า WEBHOOK_SECRET ที่ตั้งไว้

### 6) Deploy ขึ้น GitHub Pages
1. สร้าง repo **public** บน GitHub แล้ว push โค้ดขึ้น branch `main`
2. Settings → Pages → Source เลือก **GitHub Actions**
3. Settings → Secrets and variables → Actions → เพิ่ม secrets:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`
4. Push อีกครั้ง (หรือสั่งรัน workflow เอง) เว็บจะอยู่ที่ `https://<ชื่อผู้ใช้>.github.io/<ชื่อ repo>/`

## ติดตั้งลงมือถือ
- **Android (Chrome):** เปิดเว็บ → เมนู ⋮ → “ติดตั้งแอป” / “เพิ่มลงหน้าจอหลัก”
- **iPhone (Safari, iOS 16.4 ขึ้นไป):** ปุ่มแชร์ → “เพิ่มไปยังหน้าจอโฮม” → **เปิดจากไอคอนบนหน้าจอ** แล้วกด “เปิดแจ้งเตือน”
  (ถ้าเปิดจาก Safari ตรงๆ iPhone จะไม่ให้รับ Push)

## ความปลอดภัย
- ทุกตารางเปิด Row Level Security: ฝ่ายขายเห็นเฉพาะคำขอตัวเอง, แผนกจัดส่งเห็นทั้งหมด
- ตัดสินคำขอได้ทางฟังก์ชัน `decide_booking` เท่านั้น ซึ่งตรวจสิทธิ์แผนกจัดส่งในฐานข้อมูล
- ไฟล์อยู่ใน bucket ส่วนตัว เปิดดูผ่านลิงก์ชั่วคราว 1 ชั่วโมง
- anon key อยู่ในหน้าเว็บได้ ส่วน `service_role` key และ VAPID private key ห้ามอยู่ในโค้ดหน้าเว็บ
- repo เป็น public จึงห้ามคอมมิตไฟล์ `.env`

## ข้อจำกัดของแพ็กเกจฟรี
- Supabase ฟรีจะพักโปรเจคถ้าไม่มีการใช้งานราว 1 สัปดาห์ (กดกลับมาใช้ได้ ข้อมูลไม่หาย)
- พื้นที่เก็บไฟล์ฟรีมีจำกัด ระบบย่อรูปก่อนอัปโหลดให้แล้ว
- แจ้งเตือน LINE ยังไม่รวมในเวอร์ชันนี้ (เพิ่มภายหลังได้ผ่าน Edge Function ตัวเดียวกัน)
