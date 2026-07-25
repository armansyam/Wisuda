# 🔄 Wisuda Platform — Workflow & Flow Overview

**Version:** 1.3
**Last Updated:** 2026-07-25
**Master Document:** Referensi lengkap alur kerja & diagram state machine tersedia di [`WISUDA_WORKFLOW.md`](./WISUDA_WORKFLOW.md).

---

## 🎯 Ringkasan Alur Utama

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  INQUIRY    │────▶│  QUOTATION  │────▶│   BOOKING   │────▶│  ⚡ AUTO    │
│  (Lead)     │     │  (Manual)   │     │  (DP 50%)   │     │ Drive Folder│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Public Form         Admin buat Quote    Client transfer     Service Account
  → DB: inquiries     + link WA           DP → Verifikasi     buat 4 folder Drive
  → Badge Notif       → status=quoted     Token TRK-xxx       otomatis di background
```

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ ASSIGNMENT  │────▶│   SELEKSI   │────▶│  HIGHLIGHT  │────▶│   PAYOUT    │
│  (FG Shoot) │     │  (Client)   │     │  (Deliver)  │     │  (Payroll)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Check-in/out        Proxy thumbnail     Upload highlight    Payroll Summary
  Setor link Drive    w400 (cached)       → auto portfolio    Bayar Payout FG
  → foto diolah       Popup w800 HD       import + compress   → Terbit Slip PDF
                      Auto-retry 3x
```

---

## 🗂️ Komponen Sistem

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Backend API** | Node.js + Express | REST API utama |
| **Database** | SQLite (better-sqlite3) | WAL mode, auto-backup |
| **Auth Admin** | Session-based | Cookie HttpOnly |
| **Auth Client** | Tracking Token (`TRK-xxx`) | Via WA link, tanpa PIN |
| **Auth FG** | JWT (`access_code`) | Portal Freelancer |
| **Drive Automation** | Google Drive API v3 | Service Account credentials |
| **Image Proxy** | Built-in proxy route | Cache disk 7 hari |
| **Portfolio Compress** | Sharp (WebP) | Otomatis saat highlight import |
| **Cron Jobs** | node-cron | Backup DB, retention, cleanup |

---

## 📁 Struktur Folder Drive (Auto-generated)

```
📁 WISUDA CLIENTS/              ← Master folder (di-share ke service account)
  └── 📁 Wisuda_NamaClient_YYYY-MM-DD/
        ├── 📁 JPG/             ← staging_drive_url  → galeri seleksi client
        ├── 📁 Highlight/       ← highlight_drive_url → hasil edit + portfolio import
        └── 📁 All File Edited/ ← download_url       → link final untuk client
```

Semua folder dibuat **otomatis saat DP terverifikasi** — admin tidak perlu buat manual.

---

## 🔐 Sistem Keamanan Akses

| Akses | Metode | Catatan |
|---|---|---|
| **Admin** | Username + Password (bcrypt) | Session cookie, role-based |
| **Client Tracking** | Token `TRK-{id}-{hex}` via URL | Tidak ada PIN — token only |
| **Client Galeri Seleksi** | bookingId + token | Validasi di setiap endpoint |
| **Portal FG** | `access_code` + JWT | Expire 24 jam, refresh manual |
| **Drive Folder** | Service Account JSON | Simpan di `DATA/` (tidak di git) |

---

## 🖼️ Alur Galeri Seleksi (Zero-Storage Architecture)

```
Admin klik "Upload Staging"
  ↓ Scan file dari folder JPG Drive (tanpa download file)
  ↓ Simpan [{fileId, filename}] ke DB (staging_files)

Client buka galeri → request /api/proxy/thumb/:fileId
  ├── Cache HIT  → serve dari DATA/uploads/gallery_cache/ (instan)
  └── Cache MISS → fetch CDN Google → cache → serve

Popup lightbox → request /api/proxy/thumb/:fileId?sz=w800 (kualitas lebih baik, on-demand)

Auto-retry jika gambar gagal: 3x percobaan (0.8s / 2.5s / 5s) — silent, tanpa visual dim

Cache dihapus otomatis saat:
  ① Admin upload highlight link
  ② Admin deliver file final
  ③ Admin klik "Clean Staging"
  ④ Client konfirmasi terima (completed)
```

---

*Wisuda Platform Flow Overview v1.3 — Updated 2026-07-25*