# ระบบรับ-จ่ายสต็อกสินค้า (Stock In/Out System)

React + TypeScript + Tailwind + Supabase

## 1. สร้าง Supabase Project

1. ไปที่ https://supabase.com -> Sign in / Sign up -> **New project**
2. ตั้งชื่อ Project, เลือก Region ใกล้ที่สุด (Southeast Asia - Singapore), ตั้งรหัสผ่าน Database
   แล้วกด Create -- รอสัก 1-2 นาทีให้ Project พร้อม
3. ไปที่เมนู **Project Settings -> API** จะเห็น
   - **Project URL** (เช่น `https://xxxx.supabase.co`)
   - **anon public** key
   เก็บสองค่านี้ไว้ ใช้ในขั้นตอนถัดไป

## 2. สร้างตารางฐานข้อมูล

1. ไปที่เมนู **SQL Editor** ในแดชบอร์ด
2. เปิดไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ คัดลอกทั้งหมด แล้ววางรัน (Run)
3. จะได้ตาราง: `profiles`, `products`, `suppliers`, `customers`,
   `transactions`, `transaction_items`, `stock_adjustments` พร้อม Row Level
   Security ตามสิทธิ์ Admin / Staff / Viewer

## 3. สร้างผู้ใช้คนแรก (Admin)

1. ไปที่เมนู **Authentication -> Users -> Add user -> Create new user**
   ใส่อีเมล/รหัสผ่านสำหรับตัวเอง (เลือก Auto Confirm User ให้ติ๊กถูก จะได้ไม่ต้องยืนยันอีเมล)
2. เมื่อสร้างเสร็จ ระบบจะสร้างแถวใน `profiles` ให้อัตโนมัติ (role เริ่มต้น = staff)
3. กลับไปที่ **SQL Editor** รันคำสั่งนี้ (แทน UUID ด้วย id ของ user ที่เพิ่งสร้าง
   ดูได้จากหน้า Authentication -> Users):

   ```sql
   update profiles set role = 'admin' where id = '<วาง UUID ตรงนี้>';
   ```

   ทำแบบนี้กับบัญชีที่ต้องการให้เป็น Admin (จัดการหน้า "ปรับยอด" และ "ผู้ใช้งาน" ได้)
   ผู้ใช้คนอื่นที่สร้างทีหลังจะเป็น role `staff` โดยอัตโนมัติ -- Admin ปรับ role
   ให้ใครก็ได้ภายหลังจากหน้า "ผู้ใช้งาน" ในเว็บแอป

## 4. ตั้งค่าโปรเจกต์นี้

```bash
cp .env.example .env
```

เปิดไฟล์ `.env` แล้วใส่ค่า Project URL และ anon key จากขั้นตอนที่ 1:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
```

## 5. รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิด http://localhost:5173 แล้วเข้าสู่ระบบด้วยบัญชีที่สร้างไว้ในขั้นตอนที่ 3

## 6. Deploy จริง

สร้างไฟล์ production ด้วย `npm run build` จะได้โฟลเดอร์ `dist/`
นำไป deploy กับ Vercel / Netlify / Cloudflare Pages ได้เลย (อย่าลืมตั้งค่า
environment variable `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
ในระบบ deploy ด้วย)

## โครงสร้างหน้าในแอป

- **หน้าหลัก** -- สรุปสินค้าคงเหลือแยกหมวด, ปุ่มรับเข้า/จ่ายออก (เลือกได้หลาย
  รายการสินค้าต่อ 1 ครั้ง), คลิกชื่อสินค้า + เลือกวันที่ดู Supplier/Customer
  ที่มีรายการวันนั้น
- **หน้ารายการ** -- แยกซื้อเข้า/ขายออก จัดกลุ่มตาม Supplier/Customer พร้อมยอด
  ค้างชำระ, เลือกรายการที่จะจ่ายแล้วกดยืนยัน (มี popup ยืนยันซ้ำก่อนตัดยอดจริง)
- **ปรับยอด** *(Admin เท่านั้น)* -- ปรับยอดสต็อกเมื่อของจริงไม่ตรงกับระบบ
- **ผู้ใช้งาน** *(Admin เท่านั้น)* -- กำหนด role ให้แต่ละบัญชี
- **เพิ่มสินค้า/ผู้ซื้อ/ผู้ขาย** -- จัดการ Master data พร้อมสถานะ
  Active/Inactive ต่อสินค้า

## หมายเหตุด้านความปลอดภัย

Row Level Security ที่ให้มาเป็นจุดเริ่มต้นที่เหมาะสม (อ่านได้ทุกคนที่ login,
เขียนได้เฉพาะ staff/admin, หน้า Adjustment เฉพาะ admin) แนะนำให้ทบทวนอีกครั้ง
ก่อนใช้งานจริงกับข้อมูลสำคัญ โดยเฉพาะถ้ามีจำนวนผู้ใช้เพิ่มขึ้นหรือมีข้อกำหนด
เรื่องสิทธิ์ที่ละเอียดกว่านี้
