# Wisuda.md
## Product Requirements Document - Graduation Photography Agency Platform
**Version:** 1.0  
**Date:** 2026-06-28  
**Author:** Hermes Agent  
**Status:** Draft for Review

---

## 1. Executive Summary

### 1.1 Product Vision
Platform manajemen operasional untuk bisnis jasa fotografi wisuda (graduation photography) berbasis **model agency**. Platform ini menghubungkan wisudawan (client) dengan freelance photographer (FG) melalui admin/operator yang mengontrol seluruh proses: inquiry, quotation, booking, assign FG, shoot, QC, delivery, hingga payout.

### 1.2 Key Differentiator
- **Bukan marketplace** — client tidak pilih FG, admin assign berdasarkan jadwal & skill
- **Harga paket tetap** — admin set harga, margin terkendali
- **Payment manual verification** — zero fee payment gateway, verifikasi bukti transfer manual seperti sistem wedding (Sorehari)
- **Quality gate** — admin QC hasil foto sebelum delivery ke client
- **Portfolio kurasi** — admin pilih hasil terbaik untuk marketing

### 1.3 Target Users
| User | Role |
|------|------|
| Admin/Operator | Kelola end-to-end operasional |
| Freelance FG (Photographer) | Terima tugas, shoot, upload hasil |
| Wisudawan/Client | Inquiry, bayar DP/pelunasan, terima foto |

---

## 2. User Stories & Acceptance Criteria

### 2.1 Inquiry & Quotation

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-01 | Sebagai calon client, saya ingin mengisi form inquiry di website agar admin bisa menghubungi saya | Form: nama, WA, email, tanggal wisuda, lokasi, universitas, paket minat, catatan. Submit → masuk DB `inquiries` status='new', notif WA ke admin |
| US-02 | Sebagai admin, saya ingin membuat quotation PDF berdasarkan paket yang dipilih client | Pilih paket → auto-hitung harga → generate PDF template → kirim via WA/email dengan nomor rekening pembayaran DP |
| US-03 | Sebagai admin, saya ingin menandai inquiry sebagai quoted/expired/lost | Dropdown status inquiry: new, quoted, booked, expired, lost, archived |

### 2.2 Booking & DP Verification (Manual)

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-04 | Sebagai client, saya ingin bayar DP via transfer manual dan kirim bukti WA | Client transfer → kirim foto bukti WA → admin verifikasi di dashboard |
| US-05 | Sebagai admin, saya ingin verifikasi DP manual tanpa payment gateway | Dashboard tab "DP Pending": lihat bukti, input nominal, klik "Verifikasi" → `dp_status`='paid', generate kontrak, notif client |
| US-06 | Sebagai client, saya ingin sign kontrak digital setelah DP verified | Kontrak PDF dikirim WA → client reply "OK" / ttd digital sederhana → status booking='booked' |

### 2.3 Assignment & Scheduling

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-07 | Sebagai admin, saya ingin assign FG ke booking via drag-drop kalender | Kalender view: booking kiri, FG kanan. Drag booking ke slot FG → cek conflict (FG sudah booked tanggal tsb, max 2/hari) → simpan |
| US-08 | Sebagai admin, saya ingin mengirim brief detail ke FG | Form brief: lokasi detail, jam, contact person, request khusus, catatan → kirim WA ke FG |
| US-09 | Sebagai FG, saya ingin konfirmasi tugas via WA | WA reply "KONFIRMASI [ID]" atau klik link konfirmasi → `assignments.fg_confirmed_at` terisi |

### 2.4 Shoot Day & Upload

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-10 | Sebagai FG, saya ingin check-in/out di hari shoot | Buka assignment → klik "Mulai Shoot" (timestamp) → klik "Selesai" (timestamp) |
| US-11 | Sebagai FG, saya ingin upload foto hasil shoot | Upload ke Google Drive / local storage → paste link di assignment → deadline H+1 |
| US-12 | Sebagai admin, saya ingin review (QC) hasil upload FG | Buka folder → status QC: approved / revision (catatan) / rejected → notif FG otomatis |

### 2.5 Delivery & Pelunasan

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-13 | Sebagai admin, saya ingin kirim link download ke client | Generate link album (Drive/Pixieset) + password → kirim WA/email |
| US-14 | Sebagai client, saya ingin approve hasil foto dalam 48 jam | Link download → review → klik "Saya Puas" / auto-approve setelah 48 jam |
| US-15 | Sebagai admin, saya ingin verifikasi pelunasan manual | Setelah client approve → kirim tagihan sisa → client bayar → admin verifikasi bukti → `balance_status`='paid', booking='completed' |

### 2.6 Payout FG

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-16 | Sebagai admin, saya ingin jalankan payout mingguan/bulanan ke FG | Filter assignment done & payout pending → hitung `package.fg_fee` + bonus - potongan → generate slip PDF → transfer manual → klik "Selesai" |
| US-17 | Sebagai FG, saya ingin menerima notif payout dengan slip gaji | WA notif: "Payout [periode] dikirim: Rp [total]" + attachment slip PDF |

### 2.7 Portfolio Public

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-18 | Sebagai admin, saya ingin kurasi portfolio dari booking completed | Pilih booking completed → klik "Tambah ke Portfolio" → auto-fill data client (inisial, tahun, univ, FG) → upload 1 cover + max 10 highlight → publish |
| US-19 | Sebagai visitor, saya ingin melihat portfolio di halaman publik | Grid masonry, filter tahun/universitas, klik card → modal fullscreen carousel (swipe/arrow), info: inisial, tahun, universitas, FG |
| US-20 | Sebagai visitor, saya ingin CTA booking dari portfolio | Tombol "Booking Paket Sama" → redirect ke inquiry form dengan paket pre-filled |

### 2.8 Notifikasi Otomatis (WA)

| ID | Trigger | Penerima | Template |
|----|---------|----------|----------|
| NT-01 | Inquiry baru | Admin | `admin_new_inquiry` |
| NT-02 | Quotation dikirim | Client | `client_quotation_manual` (include rekening) |
| NT-03 | DP verified | Client | `client_dp_verified` (include kontrak link) |
| NT-04 | FG assigned | FG | `fg_assigned` (detail brief) |
| NT-05 | FG confirm | Admin | `fg_confirmed` |
| NT-06 | H-3 shoot | FG + Client | `reminder_shoot_fg`, `reminder_shoot_client` |
| NT-07 | Upload ready | Admin | `fg_upload_ready` |
| NT-08 | QC approved → delivery | Client | `delivery_ready` (link download + password) |
| NT-09 | Balance due | Client | `balance_due` (tagihan sisa + rekening) |
| NT-10 | Pelunasan verified | Client + Admin | `client_fully_paid`, `booking_completed` |
| NT-11 | Payout sent | FG | `fg_payout_sent` (slip PDF) |

---

## 3. Database Schema (SQLite)

```sql
-- ============================================
-- MASTER DATA
-- ============================================

-- Paket Harga (Admin set)
CREATE TABLE packages (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,                    -- "Paket Hemat", "Paket Lengkap"
  description TEXT,
  price INTEGER NOT NULL,                -- Harga jual ke client
  fg_fee INTEGER NOT NULL,               -- Fee FG (flat per paket)
  editor_fee INTEGER DEFAULT 0,          -- Fee editor (optional)
  includes TEXT,                         -- JSON: {"prints": 10, "digital": 50, "album": 1}
  duration_hours INTEGER,
  active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Freelance FG / Photographer
CREATE TABLE freelancers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  portfolio_url TEXT,                    -- Link Drive/Instagram
  specialties TEXT,                      -- JSON: ["wisuda", "prewisuda", "studio"]
  rating REAL DEFAULT 5.0,
  active BOOLEAN DEFAULT 1,
  bank_account TEXT,                     -- JSON: {"bank": "BCA", "norek": "123", "atas_nama": "Budi"}
  id_card TEXT,                          -- Path KTP
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Kalender FG (Availability)
CREATE TABLE fg_schedules (
  id INTEGER PRIMARY KEY,
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'available',       -- 'available', 'booked', 'blocked'
  booking_id INTEGER REFERENCES bookings(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fg_id, date)
);

-- Admin Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',             -- 'admin', 'operator'
  active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRANSACTIONAL DATA
-- ============================================

-- Inquiry / Lead
CREATE TABLE inquiries (
  id INTEGER PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  location TEXT,
  university TEXT,
  package_id INTEGER REFERENCES packages(id),
  source TEXT DEFAULT 'web',             -- 'web', 'wa', 'referral', 'walkin'
  status TEXT DEFAULT 'new',             -- new, quoted, booked, expired, lost, archived
  notes TEXT,
  assigned_admin_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Booking (Confirmed)
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  inquiry_id INTEGER REFERENCES inquiries(id),
  package_id INTEGER NOT NULL REFERENCES packages(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  graduation_date DATE NOT NULL,
  location TEXT,
  shooting_time TEXT,                    -- "08:00-12:00"
  total_price INTEGER NOT NULL,
  dp_amount INTEGER NOT NULL,
  dp_status TEXT DEFAULT 'unpaid',       -- unpaid, paid, refunded
  dp_verified_by INTEGER REFERENCES users(id),
  dp_verified_at DATETIME,
  dp_bukti_url TEXT,
  balance_amount INTEGER NOT NULL,
  balance_status TEXT DEFAULT 'unpaid',  -- unpaid, paid
  balance_verified_by INTEGER REFERENCES users(id),
  balance_verified_at DATETIME,
  balance_bukti_url TEXT,
  contract_signed BOOLEAN DEFAULT 0,
  contract_url TEXT,
  status TEXT DEFAULT 'confirmed',       -- confirmed, shooting, delivered, completed, cancelled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assignment (FG + Editor)
CREATE TABLE assignments (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  editor_id INTEGER REFERENCES freelancers(id),
  status TEXT DEFAULT 'assigned',        -- assigned, confirmed, shooting, uploaded, qc, done
  brief TEXT,                            -- Instruksi khusus client
  fg_confirmed_at DATETIME,
  shoot_start_at DATETIME,
  shoot_end_at DATETIME,
  upload_deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deliverables (Hasil Foto)
CREATE TABLE deliverables (
  id INTEGER PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  drive_folder_url TEXT,                 -- Link Google Drive/OneDrive
  preview_url TEXT,                      -- Link preview (Pixieset/Drive)
  total_photos INTEGER DEFAULT 0,
  selected_photos INTEGER DEFAULT 0,
  qc_status TEXT DEFAULT 'pending',      -- pending, approved, revision, rejected
  qc_notes TEXT,
  client_approved BOOLEAN DEFAULT 0,
  client_approved_at DATETIME,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payout ke FG
CREATE TABLE payouts (
  id INTEGER PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id),
  fg_id INTEGER NOT NULL REFERENCES freelancers(id),
  fg_fee INTEGER NOT NULL,
  editor_fee INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  deduction INTEGER DEFAULT 0,
  total_payout INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',         -- pending, paid, failed
  paid_at DATETIME,
  transfer_ref TEXT,                     -- Nomor referensi transfer manual
  slip_url TEXT,                         -- Path slip PDF
  period_start DATE,
  period_end DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio Public
CREATE TABLE portfolio_items (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  client_initial TEXT NOT NULL,          -- "A.S."
  graduation_year INTEGER NOT NULL,      -- 2024
  university TEXT,                       -- "Unhas", "UNM", "Poltek"
  cover_photo_url TEXT NOT NULL,         -- Thumbnail utama
  highlight_photos TEXT NOT NULL,        -- JSON array max 10 URL
  fg_name TEXT,                          -- Credit FG
  featured BOOLEAN DEFAULT 0,
  published BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifikasi Log
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_type TEXT NOT NULL,               -- 'admin', 'fg', 'client'
  user_id INTEGER,                       -- fg_id atau client phone hash
  type TEXT NOT NULL,                    -- 'new_inquiry', 'booking_confirmed', etc
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings / Config
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT
);

-- Default settings
INSERT INTO settings (key, value, description) VALUES
  ('dp_percentage', '50', 'Persentase DP dari total harga'),
  ('upload_deadline_days', '1', 'Deadline upload foto setelah shoot (hari)'),
  ('auto_approve_hours', '48', 'Auto approve delivery setelah X jam'),
  ('max_photos_per_fg_per_day', '2', 'Max booking per FG per hari'),
  ('company_name', 'Sorehari Wisuda', 'Nama perusahaan di kontrak/invoice'),
  ('company_address', '', 'Alamat perusahaan'),
  ('company_phone', '', 'Telepon perusahaan'),
  ('bank_accounts', '[]', 'JSON array rekening pembayaran'),
  ('wa_templates', '{}', 'JSON template WA per trigger');
```

---

## 4. Admin Dashboard Modules

### 4.1 Sidebar Navigation
```
📊 Dashboard
📥 Inquiry / Leads
📋 Bookings
👥 Freelancers (FG)
📅 Jadwal FG (Calendar)
🎓 Paket & Harga
💰 Keuangan
📁 Deliverables & QC
🖼️ Portfolio
📈 Laporan
⚙️ Settings
```

### 4.2 Module Details

| Module | Key Features |
|--------|--------------|
| **Dashboard** | Stats cards: inquiry bulan ini, conversion rate, revenue, FG workload, pending DP/pelunasan/payout |
| **Inquiry/Leads** | Table: filter status, search, pagination. Actions: view, quote, mark lost/expired, WA reply |
| **Bookings** | Pipeline view (kanban): quoted → booked → shooting → delivered → completed. Calendar view. Detail modal: client info, DP status, assignment, deliverables |
| **Freelancers** | CRUD FG: nama, WA, portfolio, spesialisasi, rating, bank, KTP. Toggle active. View workload & rating |
| **Jadwal FG** | Monthly calendar per FG. Drag-drop booking ke slot. Conflict detection. Color coding: available/booked/blocked |
| **Paket & Harga** | CRUD paket: nama, harga, fee FG, fee editor, inclusions JSON, durasi. Margin calculator |
| **Keuangan** | 3 sub-tab: DP Pending Verifikasi, Pelunasan Pending, Payout Queue. Manual verify buttons. Laporan revenue |
| **Deliverables & QC** | Queue: uploaded → review → approve/revision/reject. Client delivery links. Password generator |
| **Portfolio** | Kurasi dari booking completed. Upload cover + highlights. Publish/unpublish. Featured toggle. Public preview |
| **Laporan** | Revenue bulanan, conversion funnel, FG performance (booking count, rating, payout), utilization |
| **Settings** | WA templates (editor), contract template, company info, bank accounts, notification config |

---

## 5. Public Pages

### 5.1 Inquiry Form (`/inquiry`)
- Fields: nama, WA, email, tanggal wisuda, lokasi, universitas, paket minat (dropdown), catatan
- Submit → redirect ke "Terima kasih, admin akan menghubungi via WA 1x24 jam"
- Auto-create inquiry record + notif admin

### 5.2 Portfolio Public (`/portfolio`)
- Grid masonry 4 kolom desktop, 2 mobile
- Card: cover photo, overlay inisial + tahun + universitas
- Filter toolbar: Tahun (dropdown), Universitas (dropdown), Search inisial
- Infinite scroll / load more
- Click card → Modal fullscreen:
  - Carousel swipe/arrow (max 10 foto)
  - Info bar: inisial • tahun • universitas • FG: nama
  - Thumbnail strip di bawah
  - CTA: "Booking Paket Sama" → redirect `/inquiry?package=...`
  - Share WA button

### 5.3 Booking Status Check (`/booking/:token`)
- Client cek status booking dengan token (7 hari expiry)
- Timeline: Inquiry → Quotation → DP Verified → FG Assigned → Shoot → QC → Delivery → Completed
- Download link jika sudah delivered

---

## 6. FG Portal (Minimal - Web View)

| Page | Features |
|------|----------|
| **Dashboard** | Upcoming assignments, stats (bulan ini, total, rating) |
| **Assignment Detail** | Brief lengkap, lokasi, jam, contact client, checklist gear |
| **Check-in/Out** | Tombol "Mulai Shoot" / "Selesai Shoot" (timestamp GPS optional) |
| **Upload Hasil** | Paste link Drive, deadline counter, status QC |
| **Payout History** | List payout: periode, fee, bonus, potongan, total, status, slip PDF |
| **Portfolio Saya** | Foto hasil shoot yang sudah approved (private, untuk CV FG) |

---

## 7. Automation & Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| **Reminder H-3 Shoot** | Daily 09:00 | Cek assignment tanggal+3 → kirim WA ke FG & Client |
| **Reminder H-1 Shoot** | Daily 09:00 | Cek assignment tanggal+1 → kirim WA checklist ke FG |
| **Auto Approve Delivery** | Hourly | Cek deliverables client_approved=0 & delivered_at > 48 jam → auto approve, trigger balance invoice |
| **DP Expired Check** | Daily 00:00 | Inquiry quoted > 7 hari & dp_unpaid → status 'expired', slot dibuka |
| **Payout Run** | Weekly (Minggu 20:00) | Generate payout queue untuk assignment done minggu lalu |
| **Backup DB** | Daily 02:00 | SQLite backup ke `/DATA/backups/` |

---

## 8. WA Gateway Integration

### 8.1 Architecture
```
Baileys (self-hosted di 192.168.100.83) 
    │
    ├── HTTP Bridge Port 3001 → REST API
    │   ├── POST /send-message {to, message, media?}
    │   ├── POST /send-template {to, template_name, params[]}
    │   └── Webhook /incoming → handle reply (FG confirm, client OK)
    │
    └── Session: 6285813999513 (bot), Admin: 6282333333420
```

### 8.2 Template System (Settings → WA Templates)
```json
{
  "admin_new_inquiry": "🔔 Inquiry Baru\nNama: {client_name}\nTanggal: {graduation_date}\nLokasi: {location}\nPaket: {package_name}\nWA: {client_phone}",
  "client_quotation_manual": "Halo {client_name},\n\nTerima kasih untuk inquiry wisuda {graduation_date}.\n\nPaket: {package_name}\nHarga: Rp {total_price}\nDP (50%): Rp {dp_amount}\n\nSilakan transfer ke:\n{bank_list}\n\nKirim bukti ke WA ini. Quotation berlaku 7 hari.",
  "client_dp_verified": "DP Terverifikasi ✅\n\nKontrak digital: {contract_url}\nBalas 'OK' untuk setuju.\n\nFG akan diassign H-3 sebelum shoot.",
  "fg_assigned": "📋 TUGAS BARU\nTanggal: {graduation_date}\nJam: {shooting_time}\nLokasi: {location}\nClient: {client_name} ({client_phone})\nPaket: {package_name}\n\nBrief: {brief}\n\nBalas 'KONFIRMASI' untuk menerima.",
  "reminder_shoot_fg": "⏰ BESOK SHOOT\n{client_name} - {location}\nJam: {shooting_time}\nChecklist: Kamera, Battery, Flash, Card, Lens\nBrief: {brief}",
  "reminder_shoot_client": "⏰ BESOK HARI SHOOT\n{client_name}, jangan lupa:\n- Outfit sesuai paket\n- Datang tepat waktu {shooting_time}\n- Lokasi: {location}\n\nFG: {fg_name} ({fg_phone})",
  "fg_upload_ready": "FG {fg_name} sudah upload hasil shoot.\nSilakan QC: {admin_url}",
  "delivery_ready": "🎉 Foto Wisuda Siap!\n\nLink download: {download_url}\nPassword: {password}\nBerlaku 7 hari.\n\nReview 48 jam. Balas 'OK' jika puas.",
  "balance_due": "Tagihan Pelunasan\nSisa: Rp {balance_amount}\nTransfer ke:\n{bank_list}\nKirim bukti ke WA ini.",
  "client_fully_paid": "✅ Pelunasan Terverifikasi\nBooking {booking_id} SELESAI.\nTerima kasih telah percaya ke {company_name}!",
  "fg_payout_sent": "💰 Payout Dikirim\nPeriode: {period_start} - {period_end}\nTotal: Rp {total_payout}\nSlip: {slip_url}"
}
```

---

## 9. Technical Architecture

### 9.1 Stack
| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 20+ (Express.js) |
| **Database** | SQLite (better-sqlite3) + WAL mode |
| **Auth** | Session-based (admin), OTP WA (client/FG) |
| **File Storage** | Local `/DATA/AppData/uploads/` + Google Drive API optional |
| **Payment** | Manual verification (transfer bank/QRIS) |
| **WA Gateway** | Baileys di 192.168.100.83 + HTTP bridge :3001 |
| **Frontend Admin** | Vue 3 + Tailwind CSS + Pinia + Vue Router |
| **Frontend Public** | Static HTML + Alpine.js (portfolio, inquiry) |
| **Scheduler** | node-cron |
| **Process Manager** | PM2 |
| **Public Access** | Cloudflare Tunnel (sorehari.ammang.my.id) |
| **Local Access** | Tailscale mesh VPN |

### 9.2 Project Structure
```
/root/wisuda-platform/
├── src/
│   ├── main.js                 # Entry point
│   ├── config/
│   │   ├── database.js         # SQLite connection + migrations
│   │   ├── settings.js         # Load settings from DB
│   │   └── wa-templates.js     # Template loader
│   ├── routes/
│   │   ├── admin.js            # Admin API + pages
│   │   ├── public.js           # Public pages (inquiry, portfolio)
│   │   ├── fg.js               # FG portal API
│   │   └── webhook.js          # WA webhook, payment callback (none)
│   ├── services/
│   │   ├── inquiry.service.js
│   │   ├── booking.service.js
│   │   ├── assignment.service.js
│   │   ├── deliverable.service.js
│   │   ├── payout.service.js
│   │   ├── portfolio.service.js
│   │   ├── wa.service.js       # BAILEYS HTTP client
│   │   ├── pdf.service.js      # PDFKit: quotation, contract, slip
│   │   └── cron.service.js     # Scheduled jobs
│   ├── middleware/
│   │   ├── auth.js             # Session auth
│   │   ├── validation.js
│   │   └── rate-limit.js
│   └── utils/
│       ├── date.js
│       ├── currency.js
│       └── slug.js
├── public/
│   ├── admin/                  # Vue build output
│   ├── portfolio.html          # Static portfolio page
│   ├── inquiry.html            # Static inquiry form
│   └── assets/
├── templates/
│   ├── quotation.pdf.template
│   ├── contract.pdf.template
│   └── payout_slip.pdf.template
├── ecosystem.config.js         # PM2 config
├── package.json
└── .env                        # Config (not committed)
```

### 9.3 Key API Endpoints

#### Admin (require auth)
```
GET    /api/admin/dashboard/stats
GET    /api/admin/inquiries?status=&page=
POST   /api/admin/inquiries/:id/quote
POST   /api/admin/inquiries/:id/status

GET    /api/admin/bookings?status=&page=
GET    /api/admin/bookings/:id
POST   /api/admin/bookings/:id/verify-dp
POST   /api/admin/bookings/:id/verify-balance
POST   /api/admin/bookings/:id/contract

GET    /api/admin/assignments?date=&fg_id=
POST   /api/admin/assignments              # Create assign
PUT    /api/admin/assignments/:id          # Update (drag-drop)
POST   /api/admin/assignments/:id/brief

GET    /api/admin/freelancers
POST   /api/admin/freelancers
PUT    /api/admin/freelancers/:id

GET    /api/admin/deliverables?qc_status=
POST   /api/admin/deliverables/:id/qc
POST   /api/admin/deliverables/:id/deliver

GET    /api/admin/payouts?status=
POST   /api/admin/payouts/run              # Generate payout queue
POST   /api/admin/payouts/:id/complete

GET    /api/admin/portfolio
POST   /api/admin/portfolio/from-booking
PUT    /api/admin/portfolio/:id
```

#### Public
```
POST   /api/public/inquiry
GET    /api/public/portfolio?year=&univ=
GET    /api/public/portfolio/:id
GET    /api/public/booking/:token
```

#### FG Portal
```
GET    /api/fg/assignments?status=
GET    /api/fg/assignments/:id
POST   /api/fg/assignments/:id/checkin
POST   /api/fg/assignments/:id/checkout
POST   /api/fg/assignments/:id/upload
GET    /api/fg/payouts
GET    /api/fg/portfolio
```

---

## 10. Security & Privacy

| Aspect | Implementation |
|--------|----------------|
| **Admin Auth** | Session + HttpOnly cookie, bcrypt password, 5 attempt lockout 15min, 24hr timeout |
| **Client/FG Access** | Token-based (booking token 7 hari expiry, FG assignment link) |
| **File Upload** | Validasi MIME, max size 50MB, rename ke UUID, simpan di `/DATA/AppData/uploads/` |
| **Data Privacy** | Client WA/email tidak tampil di portfolio, nama di-inisialisasi |
| **SQL Injection** | Parameterized queries (better-sqlite3 prepared statements) |
| **Rate Limit** | 10 req/min per IP untuk public endpoints |
| **HTTPS** | Cloudflare Tunnel (TLS terminated at edge) |
| **Internal Network** | Tailscale untuk akses admin/FG portal |

---

## 11. Deployment

### 11.1 Server (192.168.100.254)
- **Port 80**: CasaOS Gateway (existing)
- **Port 8080**: Sorehari Wedding App (existing)
- **Port 8081**: Wisuda Platform (new)
- **Port 3001**: WA Bridge (existing, di .83)

### 11.2 PM2 Config (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'wisuda-api',
      script: 'src/main.js',
      cwd: '/root/wisuda-platform',
      env: {
        NODE_ENV: 'production',
        PORT: 8081,
        DB_PATH: '/DATA/AppData/wisuda.db',
        UPLOAD_PATH: '/DATA/AppData/wisuda-uploads',
        WA_BRIDGE_URL: 'http://192.168.100.83:3001',
        SESSION_SECRET: '...',
        TZ: 'Asia/Makassar'
      },
      log_file: '/var/log/wisuda-api.log',
      error_file: '/var/log/wisuda-api-error.log',
      out_file: '/var/log/wisuda-api-out.log',
      max_memory_restart: '500M',
      restart_delay: 5000
    }
  ]
};
```

### 11.3 Cloudflare Tunnel Config
```yaml
# config.yml di cloudflared container
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/creds.json
ingress:
  - hostname: wisuda.ammang.my.id
    service: http://192.168.100.254:8081
  - service: http_status:404
```

---

## 12. Timeline & Milestones (4 Weeks)

| Week | Focus | Deliverables |
|------|-------|--------------|
| **1** | Foundation & Inquiry→Booking | DB schema, migrations, auth, inquiry form, quotation PDF, DP manual verify, kontrak digital, WA notif basic |
| **2** | Assignment & Shoot | FG CRUD, calendar drag-drop assign, conflict check, FG portal (view task, check-in, upload), QC workflow, reminders cron |
| **3** | Delivery & Finance | Client delivery link + password, auto-approve 48h, balance manual verify, payout run + slip PDF, finance dashboard |
| **4** | Portfolio & Polish | Portfolio public (grid, modal, filter), admin kurasi from booking, FG portfolio, testing, deploy, documentation |

### Effort Estimate
- **Week 1:** ~35 jam
- **Week 2:** ~40 jam  
- **Week 3:** ~35 jam
- **Week 4:** ~25 jam
- **Total:** ~135 jam (solo dev)

---

## 13. Success Metrics (KPI)

| Metric | Target MVP |
|--------|------------|
| Inquiry → Booking Conversion | > 30% |
| DP Verification Time (admin) | < 1 jam jam kerja |
| Assignment → FG Confirm | < 2 jam |
| Shoot → Upload Complete | < 24 jam |
| QC → Delivery | < 4 jam |
| Client Approve Rate | > 90% |
| Payout Accuracy | 100% |
| Portfolio Items / Bulan | > 5 |

---

## 14. Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FG no-show H-1 | Medium | High | Penalty fee, blacklist 3x, backup FG pool, auto-reassign |
| Client cancel < 7 hari | Medium | Medium | DP non-refund, reschedule 1x allowed |
| Foto corrupt/missing | Low | High | FG re-shoot gratis / potong fee 50%, backup RAW mandatory |
| WA gateway down | Low | High | Fallback: manual WA broadcast, email notif |
| DB corruption | Very Low | Critical | Daily backup, WAL mode, SQLite integrity check cron |
| Seasonal demand spike | High | Medium | FG pool scaling, part-time FG recruitment |

---

## 15. Future Enhancements (Post-MVP)

| Phase | Features |
|-------|----------|
| **Phase 2** | Editor assignment & fee split, contract e-sign (TTD digital), client portal (login, history), analytics dashboard, multi-location |
| **Phase 3** | Inventory album/cetak fisik, pre-wisuda package, alumni/corporate headshot, mobile app FG, AI-assisted photo selection |
| **Phase 4** | Franchise/cabang management, white-label untuk photographer lain, marketplace FG (opsional) |

---

## 16. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | Ammang | | |
| Technical Lead | Hermes Agent | | |

---

**End of Document**  
*Wisuda.md v1.0 - Graduation Photography Agency Platform PRD*