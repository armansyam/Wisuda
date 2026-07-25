# 📡 Wisuda Platform — Complete REST API Specification

**Version:** 1.2  
**Last Updated:** 2026-07-25  
**Base URL:** `http://localhost:8081` (Development / LAN) / `https://wisuda.domain.com` (Production)

---

## 🔐 Authentication & Security Architecture

### 1. Admin Authentication (Session Cookie)
- **Login:** `POST /api/admin/login` → Menerbitkan cookie `wisuda.sid` (`HttpOnly`, `SameSite=Lax`).
- **Check Auth:** `GET /api/admin/me`
- **Logout:** `POST /api/admin/logout`
- **Protection:** Seluruh route `/api/admin/*` melacak validasi session aktif via [`auth.js`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/src/middleware/auth.js).

### 2. Freelance Portal Authentication (Access Code)
- **Portal Access:** `POST /api/freelance-portal/login` dengan `access_code` (contoh: `FG-A1B2C3D4`).
- **Protection:** Mengembalikan token akses freelancer untuk verifikasi tugas & upload hasil foto.

### 3. Public API & Client Protection
- **Tracking Client:** Menggunakan `tracking_token` (contoh: `TRK-1-AB12CD`) dan PIN password.
- **Form Reservasi:** Terproteksi `express-rate-limit` (Max 200 request / 15 menit per IP).

---

## 📋 Complete Endpoint Reference

### 1. System & Health Endpoints
```http
GET /api/health
```
**Response (200 OK):**
```json
{
  "status": "ok",
  "environment": "production",
  "database": "connected (WAL mode)",
  "timestamp": "2026-07-25T10:48:31.000Z"
}
```

```http
POST /api/admin/system/reset (Auth Required)
```
Mengosongkan database ke kondisi awal (membutuhkan otentikasi admin).

---

### 2. Public Endpoints (`src/routes/public.js`)

```http
GET /api/public/packages
```
Mengambil daftar paket foto aktif beserta urutan dan rincian fasilitasnya.

```http
POST /api/public/inquiry
Body: { client_name, client_phone, client_email, graduation_date, location, university, package_id, notes }
```
Menginput formulir reservasi inquiry baru dari calon klien.

```http
GET /api/public/booking-token/:token
```
Validasi token pemilihan paket dari tautan unik WhatsApp.

```http
POST /api/public/booking-token/:token/confirm
Body: { package_id, shooting_time, duration_hours }
```
Konfirmasi paket foto yang dipilih oleh klien.

```http
POST /api/public/booking/:id/upload-dp
Content-Type: multipart/form-data (File: dp_bukti)
```
Unggah bukti transfer DP oleh klien.

```http
POST /api/public/booking/:id/upload-balance
Content-Type: multipart/form-data (File: balance_bukti)
```
Unggah bukti transfer pelunasan oleh klien.

```http
GET /api/public/tracking/:token
```
Mengambil status progres foto wisuda (Inquiry ➔ DP Verified ➔ FG Assigned ➔ Shoot Done ➔ Editing ➔ Delivery).

```http
POST /api/public/tracking/:token/verify-password
Body: { password }
```
Verifikasi PIN unduh berkas hasil foto wisuda.

```http
POST /api/public/tracking/:id/portfolio-consent
Body: { consent: "approved" | "rejected" }
```
Konfirmasi izin publikasi foto ke galeri portofolio dari klien.

```http
GET /api/public/portfolio?university=&year=&featured=
```
Mengambil daftar item portofolio publik yang berstatus `published = 1` dengan urutan acak / *featured priority*.

```http
POST /api/public/freelancer-recruitment
Body: { name, phone, email, portfolio_url, specialties, city, gear_info }
```
Pendaftaran mitra freelancer baru.

---

### 3. Selection Lightbox Endpoints (`src/routes/selection.js`)

```http
GET /api/public/selection/:booking_id
```
Mengambil daftar foto staging & batas jumlah foto yang boleh dipilih oleh klien.

```http
POST /api/public/selection/:booking_id/submit
Body: { selected_photos: ["photo1.webp", "photo2.webp"] }
```
Mengirimkan daftar foto pilihan klien ke tim editor.

---

### 4. Admin Management Endpoints (`src/routes/admin.js`)

#### Dashboard & Analytics
```http
GET /api/admin/dashboard/stats
```
Mengembalikan statistik omzet bulan ini, total booking, perbandingan bulan lalu, status DP/Pelunasan pending, upcoming shoots, dan log aktivitas terbaru.

#### Inquiries & Lead Management
```http
GET /api/admin/inquiries?status=&search=&page=1&limit=20
GET /api/admin/inquiries/:id
POST /api/admin/inquiries/:id/quote (Body: { package_id, custom_price, notes })
POST /api/admin/inquiries/:id/status (Body: { status })
DELETE /api/admin/inquiries/:id
```

#### Booking Operations
```http
GET /api/admin/bookings?status=&search=&page=1&limit=20
GET /api/admin/bookings/:id
POST /api/admin/bookings/:id/verify-dp (Body: { amount, verified_by })
POST /api/admin/bookings/:id/verify-balance (Body: { amount, verified_by })
POST /api/admin/bookings/:id/contract (Body: { contract_url })
POST /api/admin/bookings/:id/cancel
DELETE /api/admin/bookings/:id
```

#### Assignment & Schedule (FG Assignment)
```http
GET /api/admin/assignments?status=&fg_id=&date_from=&date_to=
POST /api/admin/assignments (Body: { booking_id, fg_id, editor_id, brief, fg_fee })
PUT /api/admin/assignments/:id (Body: { fg_id, editor_id, status, fg_fee, brief })
DELETE /api/admin/assignments/:id
GET /api/admin/calendar?month=2026-07
```

#### Deliverables & QC Management
```http
GET /api/admin/deliverables?qc_status=
POST /api/admin/deliverables/:id/qc (Body: { qc_status, qc_notes })
POST /api/admin/deliverables/:id/deliver (Body: { download_url, download_password })
```

#### Payouts & Payroll Management
```http
GET /api/admin/payouts?status=&fg_id=
POST /api/admin/payouts/:id/pay (Body: { transfer_ref, bonus, deduction })
GET /api/admin/payroll/summary
```

#### Portfolio Management & GDrive Import
```http
GET /api/admin/portfolio
POST /api/admin/portfolio (Body: { client_initial, graduation_year, university, cover_photo_url, highlight_photos, featured })
PUT /api/admin/portfolio/:id
DELETE /api/admin/portfolio/:id
POST /api/admin/portfolio/import-drive (Body: { drive_url, client_initial, graduation_year, university })
GET /api/admin/portfolio/import-jobs
```

#### Master Packages & Freelancers
```http
GET /api/admin/packages
POST /api/admin/packages
PUT /api/admin/packages/:id
GET /api/admin/freelancers
POST /api/admin/freelancers
PUT /api/admin/freelancers/:id
GET /api/admin/recruitment/applications
POST /api/admin/recruitment/applications/:id/review (Body: { status: "approved" | "rejected" })
```

---

### 5. Freelance Portal Endpoints (`src/routes/freelance-portal.js` & `src/routes/fg.js`)

```http
POST /api/freelance-portal/login
Body: { access_code }
```

```http
GET /api/freelance-portal/my-assignments
Header: Authorization: Bearer {token} / Session Access Code
```

```http
POST /api/freelance-portal/assignments/:id/confirm
```
Fotografer mengonfirmasi kesediaan mengambil job pemotretan.

```http
POST /api/freelance-portal/assignments/:id/upload
Content-Type: multipart/form-data (File photos/drive_url)
```
Setor berkas foto / link Google Drive hasil pemotretan.

```http
GET /api/freelance-portal/my-payouts
```
Melihat riwayat fee payout & slip pembayaran.

---

### 6. Webhook & Cron Trigger Endpoints (`src/routes/webhook.js`)

```http
POST /api/webhook/backup-cron
```
Trigger manual pembuatan backup database SQLite.

```http
POST /api/webhook/payout-run
```
Trigger manual perhitungan payout mingguan freelancer.

---

*Wisuda Platform REST API Reference v1.2*