# 🔧 Rencana Rekonstruksi Backend & Frontend — Studio Wisuda
## _Reconstruction Plan v2.0 | 13 Agustus 2026_

> [!IMPORTANT]
> **Status Dokumen**: PLAN ONLY — Belum ada eksekusi. Dokumen ini adalah panduan rekonstruksi lengkap yang harus di-review dan disetujui sebelum implementasi dimulai.

---

## 📊 Ringkasan Eksekutif: Gap Audit (Backend + Frontend)

| # | Area | Status | File Terdampak | Urgensi |
| :--- | :--- | :---: | :--- | :---: |
| 1 | Dua endpoint duplikat untuk Link Booking | 🔴 | `admin.js` + `InquiriesView.vue` | Tinggi |
| 2 | Booking record dibuat prematur (sebelum Gate 1) | 🔴 | `admin.js` + `InquiriesView.vue` | Tinggi |
| 3 | Status `'pending'` & `'editing'` tidak ada di state resmi | 🔴 | `admin.js` + **5 Vue views** | Tinggi |
| 4 | `selection_status` enum liar tidak terdokumentasi | 🔴 | `admin.js` | Tinggi |
| 5 | `catch (e) { }` kosong di `clearGalleryCache` (error-swallowing) | 🟠 | `admin.js` + `public.js` | Sedang |
| 6 | Default timer token 24 jam (harusnya 3 jam) | 🔴 | `admin.js` + `InquiriesView.vue` | Tinggi |
| 7 | Route naming tidak konsisten (`/post-production/` vs `/bookings/`) | 🟠 | `admin.js` + `DeliverablesView.vue` | Sedang |
| 8 | `admin.js` monolitik 5.491 baris | 🔴 | `admin.js` | Tinggi |
| 9 | Tidak ada `booking.service.js` & `drive.service.js` | 🟠 | `src/services/` | Sedang |
| 10 | Tidak ada tabel `audit_logs` | 🟠 | Database schema | Sedang |
| 11 | Cron retention: reminder H-14/H-7/H-3 perlu verifikasi kolom DB | 🟠 | `cron.service.js` + `bookings` table | Sedang |
| 12 | `InquiriesView.vue` panggil 2 endpoint berbeda untuk 1 aksi | 🔴 | `InquiriesView.vue` baris 685 & 716 | Tinggi |
| 13 | `BookingsView.vue` masih set status `'editing'` via UI button | 🔴 | `BookingsView.vue` baris 122, 227, 330 | Tinggi |
| 14 | `MonitorView.vue` hardcode handle `'editing'` & `'pending'` | 🟠 | `MonitorView.vue` | Sedang |

---

## 🔍 Bagian 1: Audit Detail — Backend

---

### 🔴 MASALAH 1: Dua Endpoint Duplikat — Link Booking

**Kondisi Aktual:**
```
POST /api/admin/inquiries/:id/quote          ← admin.js baris 746
POST /api/admin/inquiries/:id/generate-token ← admin.js baris 670
```

**Yang Dilakukan Keduanya:**
- `/quote` (baris 776): Set `inquiries.status = 'quoted'` → langsung INSERT ke tabel `bookings` dengan `status = 'pending'` → return WA link
- `/generate-token` (baris 688): Set `inquiries.status = 'converted'` → INSERT ke `booking_tokens` → return WA link

**Masalah Inti:**
- `/quote` membuat booking record **sebelum** client bayar DP — melanggar prinsip Gate 1
- `/generate-token` set status `'converted'` padahal client belum deal — isolasi state bocor
- `InquiriesView.vue` memanggil KEDUANYA: baris 685 → `/quote`, baris 716 → `/generate-token`

**Target Rekonstruksi:**
```
POST /api/admin/inquiries/:id/create-booking-link  ← SATU endpoint pengganti
  Input : package_id, transport_charge, discount_amount, payment_type, duration_hours
  Proses:
    1. Update inquiries: package_id, transport_charge, discount_amount, payment_type
    2. Hapus booking_tokens lama (unused) untuk inquiry ini
    3. INSERT booking_tokens: token baru + expires_at (dari setting, default 3 jam)
    4. SET inquiries.status = 'booking_link_active'
    5. TIDAK INSERT ke tabel bookings
  Output: { token, confirm_booking_url, expires_at, wa_link }
```

---

### 🔴 MASALAH 2: Booking Record Dibuat Sebelum Gate 1

**Kondisi Aktual (admin.js baris 779–782):**
```js
const r = db.prepare(`INSERT INTO bookings
  (..., status)
  VALUES (..., 'pending')`).run(...);
// ↑ Dibuat saat admin klik "Buat Link Booking", padahal client belum bayar DP
```

**Konsekuensi:**
- `bookings` table penuh record `status = 'pending'` yang bukan client deal sebenarnya
- Query `GET /bookings` (baris 836) harus filter manual: `dp_status = 'paid' AND status NOT IN (...)`
- BookingsView.vue baris 310: `item.status === 'pending'` dihandle khusus di UI

**Target Rekonstruksi:**
Pembuatan `bookings` record dipindahkan ke **endpoint verify-dp** (Gate 1):
```
POST /api/admin/inquiries/:id/verify-dp  ← LOCUS BARU pembuatan booking
  1. Cek booking_token valid & belum expired
  2. INSERT bookings (status = 'confirmed', dp_status = 'paid')
  3. UPDATE inquiries SET status = 'converted'
  4. UPDATE booking_tokens SET used = 1
  5. Background: create 4-subfolder Drive
  6. INSERT audit_logs (action = 'gate1_passed')
  7. Return booking + wa_link
```

---

### 🔴 MASALAH 3: Status `'editing'` & `'pending'` — Sisa Kode Lama

**Tabel: Status vs Spesifikasi**

| Nilai Status | Ada di MASTER_FLOW? | Dipakai di Kode Backend | Dipakai di Frontend Vue |
| :--- | :---: | :--- | :--- |
| `'pending'` (booking) | ❌ | `admin.js:781` insert | `BookingsView:310`, `MonitorView:561`, `BookingsView:1598` |
| `'editing'` | ❌ | Query filter baris 836 | `BookingsView:122,227,330`, `MonitorView:569,632`, `PayrollView:536`, `DeliverablesView:1811` |
| `'confirmed'` | ✅ | Benar | Benar |
| `'shooting'` | ✅ | Benar | Benar |
| `'post_production'` | ✅ | Benar (jarang dipakai) | Jarang dipakai |
| `'delivered'` | ✅ | Benar | Benar |
| `'completed'` | ✅ | Benar | Benar |

**Target Backend:**
```sql
-- Migration awal (run sekali)
UPDATE bookings SET status = 'post_production' WHERE status = 'editing';
-- Orphan pending (booking tanpa DP yang dibuat dari /quote):
-- Hati-hati: verifikasi dulu dengan SELECT sebelum DELETE
SELECT id, client_name, status, dp_status, created_at FROM bookings WHERE status = 'pending';
DELETE FROM bookings WHERE status = 'pending' AND dp_status = 'unpaid'
  AND created_at < datetime('now', '-3 days');
```

**Target Frontend — Penggantian Status `'editing'` → `'post_production'`:**
- `BookingsView.vue`: Ganti semua `setStatus(item, 'editing')` → `setStatus(item, 'post_production')`
- `BookingsView.vue`: Ganti semua `item.status === 'editing'` → `item.status === 'post_production'`
- `MonitorView.vue`: Ganti `'editing'` → `'post_production'`
- `PayrollView.vue`: Ganti filter array `'editing'` → `'post_production'`
- `DeliverablesView.vue`: Ganti label status `'editing'` → `'post_production'`

---

### 🔴 MASALAH 4: `selection_status` Enum Tidak Terdokumentasi

**Nilai yang ada di kode (admin.js baris 2586–2596) vs spesifikasi:**

| Nilai | Ada di Spesifikasi? | Keterangan |
| :--- | :---: | :--- |
| `'ready'` | ✅ | Galeri siap untuk dipilih client |
| `'submitted'` | ✅ | Client submit pilihan |
| `'cleaned'` | ⚠️ | Tidak di spesifikasi, tapi logis (post-cleanup) — PERTAHANKAN |
| `'staged'` | ❌ | Tidak terdokumentasi — EVALUASI |
| `'scanning'` | ❌ | Tidak terdokumentasi — EVALUASI |
| `'importing'` | ❌ | Tidak terdokumentasi — EVALUASI |
| `'failed'` | ❌ | Tidak terdokumentasi — EVALUASI |

**Target:** Dokumentasikan atau konsolidasikan nilai `staged/scanning/importing/failed`. Enum resmi yang dibakukan:
```
NULL       → Belum ada galeri
'ready'    → Admin aktifkan galeri
'submitted'→ Client submit pilihan
'cleaned'  → Staging dibersihkan pasca editing (internal state, dipertahankan)
```

---

### 🟠 MASALAH 5: Empty `catch` — Error-Swallowing di Dua File

**Lokasi:**

1. `admin.js` baris 35: `catch (e) { }` dalam `clearGalleryCache`
2. `admin.js` baris 37: `catch (e) { }` outer dalam `clearGalleryCache`
3. `admin.js` baris 2667: `catch (e) { }` saat clear staging setelah deliver
4. `admin.js` baris 2931: `catch (e) { }` di `clean-staging` endpoint
5. `public.js` baris 883, 888: `catch (e) {}` di confirm-receipt cleanup

**Note tentang `clearGalleryCache`:**
- Fungsi ini masih relevan — cache thumbnail VPS disk untuk proxy galeri seleksi
- Bukan sisa kode lama; masih dibutuhkan untuk performance galeri seleksi klien
- Yang perlu diperbaiki: ganti `catch (e) { }` → `catch (e) { console.warn('[GalleryCache]', e.message); }`

---

### 🔴 MASALAH 6: Default Timer Token 24 Jam, Bukan 3 Jam

**admin.js baris 677:**
```js
const durationHours = req.body.duration_hours || 24; // ← SALAH
```

**Target:**
```js
const defaultHours = parseInt(getSetting('booking_link_expiry_hours', 3));
const durationHours = parseInt(req.body.duration_hours) || defaultHours;
```

**Frontend (InquiriesView.vue):** Pastikan form "Buat Link Booking" mengirimkan `duration_hours` dari SettingsView config, bukan hardcoded.

---

### 🟠 MASALAH 7: Route Naming `/post-production/` Tidak Konsisten

**Backend (admin.js):**
```
POST /api/admin/post-production/:id/confirm-done       ← baris 2695
POST /api/admin/post-production/:id/upload-staging     ← baris 2729
POST /api/admin/post-production/:id/publish-staging    ← baris 2767
POST /api/admin/post-production/:id/send-link          ← baris 2791
POST /api/admin/post-production/:id/send-highlight-link← baris 2850
```

**Frontend (DeliverablesView.vue):**
```
fetch(`${API}/post-production/${bookingId}/confirm-done`)     ← baris 978
fetch(`${API}/post-production/${item.booking_id}/publish-staging`) ← baris 1395
fetch(`${API}/post-production/${item.booking_id}/send-highlight-link`) ← baris 1426
fetch(`${API}/post-production/${item.booking_id}/send-link`)  ← baris 1464, 1633
fetch(`${API}/post-production/${stagingItem.value.booking_id}/upload-staging`) ← baris 1552
```

**Target — Konsolidasikan ke `/bookings/:id/`:**

| Endpoint Lama | Endpoint Baru |
| :--- | :--- |
| `/post-production/:id/confirm-done` | `/bookings/:id/activate-gallery` |
| `/post-production/:id/upload-staging` | `/bookings/:id/upload-raw-photos` |
| `/post-production/:id/publish-staging` | `/bookings/:id/activate-gallery` |
| `/post-production/:id/send-link` | `/bookings/:id/unlock-final-editing` |
| `/post-production/:id/send-highlight-link` | `/bookings/:id/upload-highlight-link` |

---

### 🔴 MASALAH 8: `admin.js` Monolitik 5.491 Baris

**Kondisi:** Satu file menampung:
- Auth & sessions
- Inquiry routes (inquiry, quote, token, verify-dp)
- Booking routes (assign-fg, status, deliver, verify-balance, dll.)
- Post-production routes
- Freelancer & payroll routes
- Portfolio routes
- Settings routes
- Google Drive routes
- Report routes

**Target Struktur Baru:**
```
src/routes/
├── admin.js              ← Auth + mount sub-routers SAJA (< 150 baris)
├── admin-inquiry.js      ← /inquiries/** (termasuk create-booking-link baru)
├── admin-booking.js      ← /bookings/** (verify-dp, assign-fg, status, dll.)
├── admin-postprod.js     ← /bookings/:id/activate-gallery, upload-raw-photos, dll.
├── admin-freelance.js    ← /freelancers/** + /payroll/**
├── admin-portfolio.js    ← /portfolio/**
├── admin-settings.js     ← /settings/**
├── admin-reports.js      ← /reports/**
└── admin-drive.js        ← /drive/** (manual drive operations)
```

---

### 🟠 MASALAH 9: Tidak Ada `booking.service.js` & `drive.service.js`

**Kondisi:** Logic bisnis Gate 1/Gate 2 inline di route handlers. Drive operations tersebar.

**Target:**
```
src/services/
├── booking.service.js      ← [BARU] State machine validator + audit logger
├── drive.service.js        ← [BARU] Consolidate dari drive-folder.service.js
├── cron.service.js         ← [ADA] Sudah ada
├── drive-folder.service.js ← [MERGE] Integrasikan ke drive.service.js
├── drive-importer.service.js ← [ADA] Review relevansi
├── email.service.js        ← [ADA]
└── wa.service.js           ← [ADA]
```

**`booking.service.js` Interface:**
```js
module.exports = {
  canPassGate1(booking),
  canPassGate2(booking),
  transitionToConfirmed(db, inquiryId, tokenData, adminId),
  transitionToPostProduction(db, bookingId, adminId),
  transitionToDelivered(db, bookingId),
  transitionToCompleted(db, bookingId, actorType, actorId),
  logAudit(db, { bookingId, inquiryId, action, actorType, actorId, oldValue, newValue })
};
```

---

### 🟠 MASALAH 10: Tidak Ada Tabel `audit_logs`

**SQL Schema Baru:**
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER,
  inquiry_id INTEGER,
  action     TEXT NOT NULL,
  -- Values: 'gate1_passed','gate2_passed','session_done','post_production',
  --         'delivered','completed','cancelled','rescheduled','backup_confirmed'
  actor_type TEXT NOT NULL,  -- 'admin' | 'cron' | 'client'
  actor_id   INTEGER,        -- user.id jika actor_type = 'admin'
  old_value  TEXT,
  new_value  TEXT,
  notes      TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

### 🟠 MASALAH 11: Cron Retention — Verifikasi Kolom DB

**Kondisi:** `cron.service.js` punya `runDriveRetentionCleanup()` tapi perlu verifikasi kolom-kolom ini ada di `bookings`:
- `drive_expiry_date` — tanggal expired cleanup
- `reminded_h14` (atau `reminded_h7`) — flag sudah kirim WA
- `reminded_h3` — flag sudah kirim WA final

**SettingsView.vue** (baris 1777) sudah mendefinisikan cron `drive_retention` dengan deskripsi "Kirim reminder H-14 & H-3" — perlu disesuaikan dengan MASTER_FLOW yang menyebut H-7 & H-3.

---

## 🔍 Bagian 2: Audit Detail — Frontend

---

### 🔴 FRONTEND 1: `InquiriesView.vue` — Dua Endpoint untuk Satu Tombol

**Kondisi Aktual:**
```js
// baris 685: Panggil /quote (membuat booking record)
const res = await fetch(`${API}/inquiries/${quoteItem.value.id}/quote`, { ... })

// baris 716 & 739: Panggil /generate-token (juga untuk link yang sama)
const res = await fetch(`${API}/inquiries/${item.id}/generate-token`, { ... })

// baris 791: verify-dp (masih di InquiriesView, bukan BookingsView)
const r = await fetch(`${API}/bookings/${item.booking_id}/verify-dp`, { ... })
```

**Target:**
```js
// SATU fungsi untuk Buat Link Booking
async function createBookingLink(item, params) {
  const res = await fetch(`${API}/inquiries/${item.id}/create-booking-link`, {
    method: 'POST',
    body: JSON.stringify({
      package_id: params.package_id,
      transport_charge: params.transport_charge,
      discount_amount: params.discount_amount,
      payment_type: params.payment_type,
      duration_hours: params.duration_hours  // dari settings (default 3 jam)
    })
  });
}

// SATU fungsi untuk Re-Generate Link
async function regenerateLink(item) {
  const res = await fetch(`${API}/inquiries/${item.id}/regenerate-link`, {
    method: 'POST'
  });
}
```

---

### 🔴 FRONTEND 2: `BookingsView.vue` — Button Set Status `'editing'`

**Kondisi Aktual (baris 122, 227, 330):**
```html
<button v-if="item.status === 'shooting'" @click="setStatus(item, 'editing')">
  📸 Selesai Sesi
</button>
<a v-if="item.status === 'editing' || item.status === 'uploaded'" href="/admin/deliverables">
```

**Target:**
```html
<button v-if="item.status === 'shooting'" @click="setStatus(item, 'post_production')">
  📸 Selesai Sesi
</button>
<a v-if="item.status === 'post_production'" href="/admin/deliverables">
```

**Juga di `setStatus` helper (baris 1605):**
```js
// Ganti:
if (item.status === 'editing') return 'Post Production (Editing)'
// Menjadi:
if (item.status === 'post_production') return 'Post Production'
```

---

### 🟠 FRONTEND 3: `MonitorView.vue` — Handle Status Lama

**Kondisi (baris 561, 569, 632):**
```js
if (item.status === 'pending') return 'Menunggu DP'
if (item.status === 'editing') return 'Post-Pro'
if (['editing', 'delivered', 'completed'].includes(item.status)) return { icon: '✅', ... }
```

**Target:**
```js
if (item.status === 'post_production') return 'Post-Pro'
if (['post_production', 'delivered', 'completed'].includes(item.status)) return { icon: '✅', ... }
// Hapus handle 'pending' (tidak akan ada lagi setelah migration)
```

---

### 🟠 FRONTEND 4: `PayrollView.vue` — Filter Status Lama

**Kondisi (baris 536):**
```js
['shooting', 'editing', 'delivered', 'completed'].includes(a.booking_status)
```

**Target:**
```js
['shooting', 'post_production', 'delivered', 'completed'].includes(a.booking_status)
```

---

### 🟠 FRONTEND 5: `DeliverablesView.vue` — Route + Status Lama

**Status (baris 1811):**
```js
if (status === 'editing') return 'bg-indigo-100 ...'
// → Ganti menjadi:
if (status === 'post_production') return 'bg-indigo-100 ...'
```

**Route pemanggilan (semua baris 978, 1395, 1426, 1464, 1552, 1633):**
Setelah backend rename, update semua pemanggilan dari `/post-production/` ke endpoint baru.

---

### 🟠 FRONTEND 6: `SettingsView.vue` — Cron Reminder Label

**Kondisi (baris 1775):** Label cron `dp_expired` masih menyebut "quoted" padahal target enum baru adalah `booking_link_active`.

**Kondisi (baris 1777):** Deskripsi drive_retention menyebut "H-14 & H-3" — perlu diselaraskan dengan MASTER_FLOW yang menyebut "H-7 & H-3".

---

## 🗺️ Bagian 3: Peta Rekonstruksi Berurutan

> [!CAUTION]
> **Wajib berurutan Fase 1 → Fase 4.** Jangan loncat fase. Backend & Frontend harus di-deploy bersamaan di Fase 2 dan 3.

---

### 🔴 FASE 1 — Fondasi: Database Migration + Quick Bug Fix
_Backend only. Tidak mengubah behavior UI. Deploy aman._

#### 1.1 Database Migration
```sql
-- LANGKAH 1: Verifikasi dulu sebelum action
SELECT COUNT(*) as total, status, dp_status FROM bookings GROUP BY status, dp_status;

-- LANGKAH 2: Migrate status lama
UPDATE bookings SET status = 'post_production' WHERE status = 'editing';

-- LANGKAH 3: Hapus orphan 'pending' (setelah verifikasi aman)
DELETE FROM bookings
WHERE status = 'pending' AND dp_status = 'unpaid'
  AND created_at < datetime('now', '-3 days');

-- LANGKAH 4: Tambah kolom audit (SQLite: jalankan satu per satu)
ALTER TABLE bookings ADD COLUMN gate1_passed_at TEXT;
ALTER TABLE bookings ADD COLUMN gate2_passed_at TEXT;
ALTER TABLE bookings ADD COLUMN reminded_h7 INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN reminded_h3 INTEGER DEFAULT 0;

-- LANGKAH 5: Buat tabel audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER,
  inquiry_id INTEGER,
  action     TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id   INTEGER,
  old_value  TEXT,
  new_value  TEXT,
  notes      TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### 1.2 Fix Empty Catch (admin.js)
- Ganti semua `catch (e) { }` kosong → `catch (e) { console.warn('[Context]', e.message); }`
- Target: baris 35, 37, 2667, 2931

#### 1.3 Fix Default Timer Token
- `admin.js` baris 677: ubah `|| 24` → `|| parseInt(getSetting('booking_link_expiry_hours', 3))`

---

### 🔴 FASE 2 — Rekonstruksi Alur Inquiry → Gate 1
_Backend + Frontend harus deploy bersamaan._

#### 2.1 Backend: Buat Endpoint `create-booking-link`
File: `admin.js` (atau `admin-inquiry.js` jika sudah dipecah)
```
POST /api/admin/inquiries/:id/create-booking-link
  - Update inquiry: package_id, transport_charge, discount_amount, payment_type
  - Hapus booking_tokens unused untuk inquiry ini
  - Generate token baru + expires_at dari getSetting('booking_link_expiry_hours', 3)
  - SET inquiries.status = 'booking_link_active'
  - Return: { token, confirm_booking_url, expires_at, wa_link }
  - TIDAK INSERT ke bookings table
```

#### 2.2 Backend: Buat Endpoint `regenerate-link`
```
POST /api/admin/inquiries/:id/regenerate-link
  - Hapus token lama
  - Generate token + timer baru
  - inquiries.status tetap 'booking_link_active'
```

#### 2.3 Backend: Refactor `verify-dp` → Gate 1 + Buat Booking Record
```
POST /api/admin/inquiries/:id/verify-dp
  - Validasi token valid & belum expired
  - INSERT bookings (status = 'confirmed', dp_status = 'paid')
  - UPDATE inquiries.status = 'converted'
  - UPDATE booking_tokens.used = 1
  - Background: createBookingFolderStructure(Drive)
  - INSERT audit_logs ('gate1_passed', 'admin', adminId)
  - Return booking + wa_link
```

#### 2.4 Frontend: Update `InquiriesView.vue`
- Hapus panggilan ke `/quote` (baris 685) dan `/generate-token` (baris 716, 739)
- Ganti dengan satu fungsi `createBookingLink()` → `/inquiries/:id/create-booking-link`
- Tambah tombol `regenerateLink()` → `/inquiries/:id/regenerate-link`
- Update label status: handle `'booking_link_active'` (setelah `'quoted'` untuk backward compat)

---

### 🟠 FASE 3 — Standarisasi Status + Route Naming
_Backend + Frontend deploy bersamaan._

#### 3.1 Backend + Frontend: Ganti `'editing'` → `'post_production'`

**Backend (admin.js):**
- Hapus semua referensi `'editing'` dari query filter
- Pastikan status transition `shooting` → `post_production` (bukan `editing`)

**Frontend (5 file Vue):**
- `BookingsView.vue`: 6 lokasi (baris 122, 124, 227, 229, 330, 332, 1605)
- `MonitorView.vue`: 3 lokasi (baris 561, 569, 632)
- `PayrollView.vue`: 1 lokasi (baris 536)
- `DeliverablesView.vue`: 1 lokasi (baris 1811)

#### 3.2 Backend: Rename Route `/post-production/` → `/bookings/:id/`

| Lama | Baru |
| :--- | :--- |
| `POST /post-production/:id/confirm-done` | `POST /bookings/:id/activate-gallery` |
| `POST /post-production/:id/upload-staging` | `POST /bookings/:id/upload-raw-photos` |
| `POST /post-production/:id/publish-staging` | `POST /bookings/:id/activate-gallery` |
| `POST /post-production/:id/send-link` | `POST /bookings/:id/unlock-final-editing` |
| `POST /post-production/:id/send-highlight-link` | `POST /bookings/:id/upload-highlight-link` |

#### 3.3 Frontend: Update `DeliverablesView.vue`
Update semua 6 pemanggilan API (baris 978, 1395, 1426, 1464, 1552, 1633) ke endpoint baru.

#### 3.4 Frontend: Update `SettingsView.vue`
- Baris 1775: Update label cron "quoted" → "booking_link_active"
- Baris 1777: Update deskripsi reminder "H-14" → "H-7" sesuai MASTER_FLOW

---

### 🟡 FASE 4 — Modularisasi Service Layer
_Backend refactoring murni. Tidak mengubah behavior jika dilakukan dengan benar._

#### 4.1 Buat `src/services/booking.service.js`
```js
module.exports = {
  canPassGate1(booking),
  canPassGate2(booking),
  transitionToConfirmed(db, inquiryId, tokenData, adminId),
  transitionToPostProduction(db, bookingId, adminId),
  transitionToDelivered(db, bookingId),
  transitionToCompleted(db, bookingId, actorType, actorId),
  logAudit(db, params)
};
```

#### 4.2 Buat `src/services/drive.service.js`
Pindahkan & konsolidasikan dari `drive-folder.service.js`:
```js
module.exports = {
  createBookingFolderStructure(booking, masterRootId),
  cloudToCloudCopy(sourceFolderId, destRootId, name),
  deleteFolder(folderId),
  getFolderSize(folderId),
  extractFolderIdFromUrl(url)
};
```

#### 4.3 Pecah `admin.js` ke Sub-Router
```
src/routes/
├── admin.js              ← Auth + mount saja (< 150 baris)
├── admin-inquiry.js      ← create-booking-link, regenerate-link, verify-dp baru
├── admin-booking.js      ← assign-fg, verify-balance, status, dll.
├── admin-postprod.js     ← activate-gallery, upload-raw-photos, dll.
├── admin-freelance.js    ← freelancers, payroll
├── admin-portfolio.js    ← portfolio
├── admin-settings.js     ← settings
├── admin-reports.js      ← reports
└── admin-drive.js        ← drive operations
```

#### 4.4 Update `main.js` Mount Sub-Router
```js
const adminInquiry = require('./routes/admin-inquiry');
const adminBooking = require('./routes/admin-booking');
// ... dll.
app.use('/api/admin', requireAuth, adminInquiry);
app.use('/api/admin', requireAuth, adminBooking);
```

---

## 📋 Bagian 4: Checklist Eksekusi Rekonstruksi

```markdown
### FASE 1 — Database & Bug Fix (Backend Only)
- [ ] 1.1 Backup database sebelum migration
- [ ] 1.2 Jalankan SELECT verifikasi: cek jumlah 'pending' & 'editing' records
- [ ] 1.3 Jalankan SQL migration: UPDATE 'editing' → 'post_production'
- [ ] 1.4 Jalankan SQL DELETE orphan 'pending' (setelah verifikasi)
- [ ] 1.5 ALTER TABLE bookings: tambah kolom gate1_passed_at, gate2_passed_at, reminded_h7, reminded_h3
- [ ] 1.6 CREATE TABLE audit_logs
- [ ] 1.7 Fix empty catch di admin.js (baris 35, 37, 2667, 2931)
- [ ] 1.8 Fix empty catch di public.js (baris 883, 888)
- [ ] 1.9 Fix default timer token: || 24 → || getSetting('booking_link_expiry_hours', 3)
- [ ] 1.10 Test: server restart, pastikan endpoint lama masih jalan

### FASE 2 — Alur Inquiry → Gate 1 (Backend + Frontend Deploy Bersamaan)
- [ ] 2.1 Backend: Buat POST /inquiries/:id/create-booking-link
- [ ] 2.2 Backend: Buat POST /inquiries/:id/regenerate-link
- [ ] 2.3 Backend: Refactor verify-dp → pindahkan pembuatan booking record ke sini
- [ ] 2.4 Backend: Tambah INSERT audit_logs di Gate 1 & Gate 2
- [ ] 2.5 Frontend: Update InquiriesView.vue — hapus /quote & /generate-token
- [ ] 2.6 Frontend: InquiriesView.vue — implementasi createBookingLink() + regenerateLink()
- [ ] 2.7 Frontend: Handle status 'booking_link_active' di UI badge/label
- [ ] 2.8 Test end-to-end: Buat link → Timer → Client upload DP → Admin verify → Booking terbuat

### FASE 3 — Standarisasi Status + Route Naming (Backend + Frontend Bersamaan)
- [ ] 3.1 Backend: Hapus semua referensi 'editing' dari admin.js queries
- [ ] 3.2 Backend: Rename endpoint /post-production/ → /bookings/:id/ (5 endpoint)
- [ ] 3.3 Frontend: BookingsView.vue — ganti 'editing' → 'post_production' (6 lokasi)
- [ ] 3.4 Frontend: MonitorView.vue — ganti 'editing' & hapus handle 'pending'
- [ ] 3.5 Frontend: PayrollView.vue — ganti 'editing' → 'post_production'
- [ ] 3.6 Frontend: DeliverablesView.vue — ganti status label + update 6 API calls
- [ ] 3.7 Frontend: SettingsView.vue — update label cron & deskripsi reminder
- [ ] 3.8 Test: Alur booking shooting → session done → post_production → delivered → completed

### FASE 4 — Modularisasi Service (Backend Only)
- [ ] 4.1 Buat src/services/booking.service.js
- [ ] 4.2 Buat src/services/drive.service.js (konsolidasi drive-folder.service.js)
- [ ] 4.3 Buat src/routes/admin-inquiry.js (ekstrak dari admin.js)
- [ ] 4.4 Buat src/routes/admin-booking.js
- [ ] 4.5 Buat src/routes/admin-postprod.js
- [ ] 4.6 Buat src/routes/admin-freelance.js
- [ ] 4.7 Buat src/routes/admin-portfolio.js
- [ ] 4.8 Buat src/routes/admin-settings.js
- [ ] 4.9 Update main.js — mount semua sub-router
- [ ] 4.10 Test: semua endpoint masih berfungsi setelah refactor
```

---

## 🔗 Bagian 5: Pemetaan Lengkap Endpoint Lama → Baru

| Endpoint Lama | Status | Endpoint Baru | Vue File yang Perlu Update |
| :--- | :---: | :--- | :--- |
| `POST /inquiries/:id/quote` | ❌ Hapus | `POST /inquiries/:id/create-booking-link` | `InquiriesView.vue:685` |
| `POST /inquiries/:id/generate-token` | ❌ Hapus | (tercakup di create-booking-link) | `InquiriesView.vue:716,739` |
| `POST /bookings/:id/verify-dp` | ♻️ Refactor | Pindahkan pembuatan booking ke sini | `InquiriesView.vue:791` |
| `POST /post-production/:id/confirm-done` | ❌ Rename | `POST /bookings/:id/activate-gallery` | `DeliverablesView.vue:978` |
| `POST /post-production/:id/upload-staging` | ❌ Rename | `POST /bookings/:id/upload-raw-photos` | `DeliverablesView.vue:1552` |
| `POST /post-production/:id/publish-staging` | ❌ Rename | `POST /bookings/:id/activate-gallery` | `DeliverablesView.vue:1395` |
| `POST /post-production/:id/send-link` | ❌ Rename | `POST /bookings/:id/unlock-final-editing` | `DeliverablesView.vue:1464,1633` |
| `POST /post-production/:id/send-highlight-link` | ❌ Rename | `POST /bookings/:id/upload-highlight-link` | `DeliverablesView.vue:1426` |

---

## ⚠️ Bagian 6: Risiko & Mitigasi

> [!CAUTION]
> **Wajib Backup Database** sebelum menjalankan migration SQL apapun di Fase 1.

> [!WARNING]
> **Backend + Frontend harus deploy bersamaan** di Fase 2 & 3. Jika backend rename endpoint tanpa update Vue, Admin Panel akan broken.

> [!WARNING]
> **`'editing'` → `'post_production'` harus atomic**: Pastikan SQL migration (UPDATE bookings) sudah jalan SEBELUM code backend & frontend di-deploy. Urutan: DB migration → deploy backend → deploy frontend.

> [!NOTE]
> **Backward Compat `'quoted'`**: Nilai lama `'quoted'` di DB tidak perlu di-UPDATE. Frontend cukup handle keduanya:
> `status === 'quoted' || status === 'booking_link_active'` selama masa transisi.

> [!NOTE]
> **`clearGalleryCache` tidak dihapus**: Masih relevan sebagai thumbnail proxy cache untuk Galeri Seleksi. Yang diubah hanya empty catch → proper logging.

---

## 🏁 Bagian 7: Prinsip Rekonstruksi

Rekonstruksi ini berpegang pada **4 prinsip utama** sesuai `MASTER_FLOW.md`:

1. **Satu Pintu, Satu Tujuan** — Satu endpoint per aksi bisnis. Tidak ada duplikasi.
2. **Isolasi State Ketat** — `bookings` record hanya dibuat saat lulus Gate 1. Status `'pending'` dihapus permanen.
3. **Zero Spaghetti Code** — `admin.js` 5.491 baris dipecah jadi modul-modul kecil yang bisa ditest dan dimaintain.
4. **Transparan & Audit-able** — State transitions krusial tercatat di `audit_logs`. Tidak ada `catch (e) { }` kosong.

---

*Dokumen Rekonstruksi Backend & Frontend Plan v2.0 ini dibuat berdasarkan audit langsung kode aktual (backend + Vue) vs. MASTER_FLOW.md. Belum ada eksekusi — menunggu persetujuan.*
