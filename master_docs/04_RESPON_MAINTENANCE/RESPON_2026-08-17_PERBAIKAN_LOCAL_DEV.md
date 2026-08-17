# RESPON MAINTENANCE AUDIT — LOCAL DEV
**Tanggal:** 2026-08-17  
**Berdasarkan Audit:** `AUDIT/AUDIT_2026-08-17_LOCAL_DEV.md`  
**Status:** ✅ SELESAI — 24/24 Test Suite PASS

---

## Ringkasan Eksekusi

Semua temuan dari audit lokal 17 Agustus 2026 telah dipatch dan diverifikasi.

---

## P0 — Critical (Semua Selesai)

### SEC-260817-01 & SEC-260817-02 — IDOR: tracking_token Bocor ke Klien
**File:** `src/routes/public.js`

| Titik Bocor | Lokasi | Patch |
|-------------|--------|-------|
| GET /booking/:id → `safeBooking` spread | :487 | `delete safeBooking.tracking_token` |
| GET /tracking?phone= → `formattedBooking` spread | :1726 | `delete formattedBooking.tracking_token` |

**Dampak:** Token internal tidak lagi terekspos di response JSON publik.

---

### SEC-260817-05 — 401 Saat Submit Foto (selection.js)
**File:** `src/routes/selection.js`

**Root Cause:** Query SELECT tidak menyertakan `b.tracking_token`, sehingga middleware `validateTrackingToken` selalu gagal meskipun token benar.

**Patch:**
```sql
-- Sebelum:
SELECT b.id, b.client_name, b.status, ...
-- Sesudah:
SELECT b.id, b.client_name, b.status, b.tracking_token, ...
```

---

### SEC-260817-06 — ReferenceError: `studio` is not defined (email.service.js)
**File:** `src/services/email.service.js`

**Root Cause:** `sendEmail()` mereferensikan `studio.name` di `fromName` assignment tapi `studio` tidak ada di scope tersebut.

**Patch:** Ganti ke `cfg.fromName` yang sudah di-resolve oleh `getSmtpConfig()`.

---

## P1 — High (Selesai)

### SEC-260817-04 — CORS allowedHeaders Tidak Lengkap
**File:** `src/main.js`

**Patch:** Tambah header custom ke `allowedHeaders`:
```
X-Tracking-Token, X-FG-Token, X-Cron-Secret, Signature
```

**Dampak:** Browser tidak lagi mem-block preflight request dari klien/portal FG.

---

## P2 — Medium (Selesai)

### SEC-260817-03 — HTML Injection Risk di Email Templates
**File:** `src/services/email.service.js`

`escapeHtml()` sudah ada sejak patch BUG-04 tapi **tidak digunakan** di 40+ template interpolasi.

**Patch:** Apply `escapeHtml()` ke semua field user-controlled:
- `booking.client_name` — 14 titik
- `booking.university` — 7 titik (termasuk di dalam ternary expression)
- `booking.location` — 5 titik
- `booking.client_phone` — 1 titik
- `inquiry.name`, `inquiry.university`, `inquiry.location` — 9 titik
- `fg.name`, `clientName` — 6 titik

**Total:** 42 titik interpolasi diamankan.

---

### VAL-260817-01 — Phone Format 08xxx Ditolak di webhook.js
**File:** `src/routes/webhook.js`

**Patch:** Tambah `customSanitizer` yang sama dengan `public.js` dan `freelance-portal.js` untuk normalisasi `08xxx → 628xxx` sebelum validasi regex.

---

### TST-260817-01 — Test Suite Tidak Sync dengan Arsitektur SEC-08
**File:** `src/__tests__/complete_e2e_booking_lifecycle.test.js`

**Patch:** Step 7 (submit foto) dan Step 9 (confirm delivery) tambah header dan payload `tracking_token`.

---

### TST-260817-02 — fg_availability_flow.test.js: Dead Endpoint + Legacy Auth
**File:** `src/__tests__/fg_availability_flow.test.js`

**Patch:**
1. Skip 2 test `/availability` yang endpoint-nya sudah dihapus (`test.skip`)
2. `confirm-session`: ganti `access_code` langsung → login FG dulu untuk dapat `session_token` (SEC-08)

---

### TST-260817-03 — qris_payment_flow.test.js: SMTP Timeout + Missing Mock
**File:** `src/__tests__/qris_payment_flow.test.js`

**Patch:** Tambah `jest.mock('../services/email.service')` dengan semua 14 fungsi email yang dipakai `public.js`, mencegah koneksi TCP SMTP nyata saat test.

---

## Performa — tracking.html

**Sebelum:** 141,098 bytes (CSS inline di 3 blok `<style>`)  
**Sesudah:** 137,241 bytes (−4KB dari HTML; CSS di-cache browser terpisah)

**Patch:**
- Buat `public/css/tracking.css` (6,055 bytes) — CSS design system tracking page
- Ganti 3 blok `<style>` dengan `<link rel="stylesheet" href="/css/tracking.css">`
- Pertahankan 1 inline style minimal (critical FOUC prevention, 60 bytes)

---

## Hasil Verifikasi Test Suite

```
Test Suites: 24 passed, 24 total
Tests:       109 passed, 2 skipped, 0 failed
Time:        21.78s
```

**2 test diskip:** Dead endpoint `/availability` yang sengaja dihapus (bukan regresi).

---

## Status Temuan Audit 2026-08-17

| ID | Severity | Deskripsi | Status |
|----|----------|-----------|--------|
| SEC-260817-01 | P0 | IDOR tracking_token bocor di GET /booking/:id | ✅ RESOLVED |
| SEC-260817-02 | P0 | IDOR tracking_token bocor di GET /tracking | ✅ RESOLVED |
| SEC-260817-03 | P2 | HTML injection di email templates | ✅ RESOLVED |
| SEC-260817-04 | P1 | CORS allowedHeaders tidak lengkap | ✅ RESOLVED |
| SEC-260817-05 | P0 | selection.js: 401 karena tracking_token tidak di-SELECT | ✅ RESOLVED |
| SEC-260817-06 | P0 | email.service.js ReferenceError: studio | ✅ RESOLVED |
| VAL-260817-01 | P2 | webhook.js: phone 08xxx ditolak | ✅ RESOLVED |
| TST-260817-01 | P2 | e2e test tidak sync tracking_token | ✅ RESOLVED |
| TST-260817-02 | P2 | fg test: dead endpoint + legacy access_code auth | ✅ RESOLVED |
| TST-260817-03 | P2 | qris test: SMTP timeout + incomplete mock | ✅ RESOLVED |
| PERF-260817-01 | P3 | tracking.html: CSS inline tidak ter-cache | ✅ RESOLVED |

---

## Langkah Selanjutnya

- [ ] **Deploy ke Hermes** — push semua patch ke server produksi
- [ ] **Verifikasi visual BUG-001** (inquiry date picker) di `Luxenary.sorehari.my.id`
- [ ] **Verifikasi visual BUG-002** (tracking progress steps) di production
- [ ] **Catatan:** Root cause BUG-001 & BUG-002 dari laporan Hermes tidak sesuai kode saat ini — verifikasi dulu sebelum patch

> File ini merupakan bukti resmi perbaikan sistem. Disimpan di `MAINTENANCE_AUDIT/` sesuai standar dokumentasi proyek.
