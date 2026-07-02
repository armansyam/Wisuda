# Wisuda Platform — End-to-End Flow

**Version:** 1.0  
**Author:** Farah  
**Date:** 2026-07-02

---

## 1. Flow Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  INQUIRY    │────▶│  QUOTATION  │────▶│   BOOKING   │────▶│ ASSIGNMENT  │
│  (Lead)     │     │  (Manual)   │     │  (DP 50%)   │     │  (FG + Cal) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Public Form         Admin creates       Client transfers    Admin drag-drop
  → DB: inquiries     PDF + wa.me link    DP → admin verify   booking to FG
  → WA notif          → status=quoted     → status=booked     → FG confirm
                                                                  via wa.me
```

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SHOOT     │────▶│   UPLOAD    │────▶│     QC      │────▶│  DELIVERY   │
│  (FG)       │     │  (FG→Drive) │     │  (Admin)    │     │  (Client)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Check-in/out        Paste Drive link    Approve/Revision/    Download link
  timestamps          → deadline H+1      Reject               + password
                                                                    → 48h auto-approve
                                                                    → balance invoice
```

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PAYOUT     │────▶│  PORTFOLIO  │────▶│  COMPLETED  │
│  (Admin)    │     │  (Public)   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Weekly run         Kurasi dari         Archive booking
  FG fee + bonus     booking completed   Mark completed
  Manual transfer    ▶ transfer    1 cover + 10 hi-    Generate metrics
  PDF slip → wa.me   lights              Feed portfolio
```

---

## 2. State Machines

### 2.1 Inquiry Status
```
new ──▶ quoted ──▶ booked ──▶ expired/lost
  │         │         │
  │         │         └──▶ archived
  │         └──▶ (timeout 7h) ──▶ expired
  └──▶ (admin mark) ──▶ lost
```

### 2.2 Booking Status
```
confirmed ──▶ shooting ──▶ delivered ──▶ completed
    │           │            │             │
    │           │            │             └──▶ (auto after balance paid)
    │           │            └──▶ (auto 48h) ──▶ balance_due
    │           └──▶ (FG check-in) ──▶ uploaded ──▶ qc
    └──▶ (DP verified) ──▶ contract_signed
```

### 2.3 Assignment Status
```
assigned ──▶ confirmed ──▶ shooting ──▶ uploaded ──▶ qc ──▶ done
    │           │            │            │           │
    │           │            │            │           └──▶ approved/revision/rejected
    │           │            │            └──▶ (FG upload Drive link)
    │           │            └──▶ (FG check-in)
    │           └──▶ (FG reply "KONFIRMASI" via wa.me)
    └──▶ (Admin drag-drop calendar)
```

### 2.4 Deliverable QC Status
```
pending ──▶ approved ──▶ delivered ──▶ client_approved ──▶ balance_due
    │         │           │                │
    │         │           │                └──▶ (48h auto) ──▶ balance_due
    │         │           └──▶ (Admin generate link + password)
    │         └──▶ (Admin review)
    └──▶ revision ──▶ (FG re-upload) ──▶ pending
    └──▶ rejected ──▶ (reassign FG)
```

### 2.5 Payout Status
```
pending ──▶ paid ──▶ failed
    │
    └──▶ (Admin manual transfer → upload slip PDF)
```

---

## 3. WA.me Notification Triggers (No Baileys)

All notifications use `wa.me/62XXXXXXXXXXX?text=<encoded_message>` links.
Admin/FG/Client clicks link → opens WhatsApp with pre-filled message.

| Trigger | Recipient | Template Key | Auto/Manual |
|---------|-----------|--------------|-------------|
| Inquiry baru | Admin | `admin_new_inquiry` | Auto (dashboard badge + wa.me link) |
| Quotation ready | Client | `client_quotation` | Admin clicks "Kirim WA" |
| DP verified | Client | `client_dp_verified` | Admin clicks "Kirim WA" |
| FG assigned | FG | `fg_assigned` | Admin clicks "Kirim WA" |
| FG confirm | Admin | `fg_confirmed` | FG clicks wa.me link |
| H-3 shoot | FG + Client | `reminder_h3_fg`, `reminder_h3_client` | Cron daily 09:00 |
| H-1 shoot | FG + Client | `reminder_h1_fg`, `reminder_h1_client` | Cron daily 09:00 |
| Upload ready | Admin | `fg_upload_ready` | Auto (FG upload) |
| QC approved | Client | `delivery_ready` | Admin clicks "Kirim Link" |
| Balance due | Client | `balance_due` | Auto (48h after delivery) |
| Balance verified | Client + Admin | `client_fully_paid` | Admin clicks "Verifikasi" |
| Payout sent | FG | `fg_payout_sent` | Admin clicks "Kirim Slip" |

**WA Template Format (stored in `settings.wa_templates` JSON):**
```json
{
  "admin_new_inquiry": "🔔 Inquiry Baru\\nNama: {client_name}\\nTanggal: {graduation_date}\\nLokasi: {location}\\nPaket: {package_name}\\nWA: wa.me/{client_phone}",
  "client_quotation": "Halo {client_name},\\n\\nTerima kasih untuk inquiry wisuda {graduation_date}.\\n\\nPaket: {package_name}\\nHarga: Rp {total_price}\\nDP (50%): Rp {dp_amount}\\n\\nTransfer ke:\\n{bank_list}\\n\\nKirim bukti ke: wa.me/{admin_phone}",
  "client_dp_verified": "DP Terverifikasi ✅\\n\\nKontrak: {contract_url}\\nBalas 'OK' ke wa.me/{admin_phone} untuk setuju.\\n\\nFG diassign H-3 sebelum shoot.",
  "fg_assigned": "📋 TUGAS BARU\\nTanggal: {graduation_date}\\nJam: {shooting_time}\\nLokasi: {location}\\nClient: {client_name}\\nPaket: {package_name}\\n\\nBrief: {brief}\\n\\nKonfirmasi: wa.me/{admin_phone}?text=KONFIRMASI%20{assignment_id}",
  "reminder_h3_fg": "⏰ H-3 SHOOT\\n{client_name} - {location}\\nJam: {shooting_time}\\nChecklist: Kamera, Battery, Flash, Card, Lens\\nBrief: {brief}",
  "reminder_h3_client": "⏰ H-3 HARI SHOOT\\n{client_name}, persiapan:\\n- Outfit sesuai paket\\n- Datang tepat waktu {shooting_time}\\n- Lokasi: {location}\\n\\nFG: {fg_name} (wa.me/{fg_phone})",
  "fg_upload_ready": "FG {fg_name} sudah upload hasil.\\nQC: {admin_url}/deliverables/{assignment_id}",
  "delivery_ready": "🎉 Foto Wisuda Siap!\\n\\nLink: {download_url}\\nPassword: {password}\\nBerlaku 7 hari.\\nReview 48 jam. OK? wa.me/{admin_phone}?text=OK%20{booking_id}",
  "balance_due": "Tagihan Pelunasan\\nSisa: Rp {balance_amount}\\nTransfer ke:\\n{bank_list}\\nKirim bukti: wa.me/{admin_phone}",
  "client_fully_paid": "✅ Pelunasan Terverifikasi\\nBooking {booking_id} SELESAI.\\nTerima kasih percaya ke {company_name}!",
  "fg_payout_sent": "💰 Payout Dikirim\\nPeriode: {period_start} - {period_end}\\nTotal: Rp {total_payout}\\nSlip: {slip_url}"
}
```

---

## 4. Cron Jobs Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| **Reminder H-3** | Daily 09:00 WITA | Scan assignments date+3 → generate wa.me links for FG & Client |
| **Reminder H-1** | Daily 09:00 WITA | Scan assignments date+1 → generate wa.me links + checklist |
| **Auto Approve Delivery** | Hourly | Deliverables delivered >48h & not approved → auto approve, create balance invoice |
| **DP Expired Check** | Daily 00:00 | Inquiries quoted >7 days & DP unpaid → status=expired, release slot |
| **Payout Run** | Weekly (Sun 20:00) | Generate payout queue for completed assignments last week |
| **Backup DB** | Daily 02:00 | SQLite backup to `/DATA/backups/wisuda_YYYYMMDD.db` |
| **Wisuda Builder** | **Every 15 min** | Autonomous build loop: implement next task → test → report progress |

---

## 5. Public Pages (Static + Alpine.js)

| Page | Route | Features |
|------|-------|----------|
| Inquiry Form | `/inquiry` | Form → POST /api/public/inquiry → redirect thank you |
| Portfolio | `/portfolio` | Masonry grid, filter tahun/univ, modal carousel, CTA booking |
| Booking Status | `/booking/:token` | Timeline, download link (token expiry 7 hari) |

---

## 6. Admin Dashboard Modules (Vue 3 + Tailwind)

| Module | Key Features |
|--------|--------------|
| Dashboard | Stats cards, conversion funnel, revenue, FG workload |
| Inquiry/Leads | Table filter status, search, pagination, actions: quote, mark, WA |
| Bookings | Kanban pipeline + calendar view, detail modal |
| Freelancers | CRUD FG, workload, rating, bank, KTP |
| Jadwal FG | Monthly calendar per FG, drag-drop, conflict detection |
| Paket & Harga | CRUD paket, margin calculator |
| Keuangan | 3 tabs: DP Pending, Pelunasan Pending, Payout Queue |
| Deliverables & QC | Queue review, approve/revision/reject, generate delivery link |
| Portfolio | Kurasi from booking, upload cover+highlights, publish/featured |
| Laporan | Revenue, conversion, FG performance, utilization |
| Settings | WA templates editor, contract template, company info, bank accounts |

---

## 7. FG Portal (Minimal Web View)

| Page | Features |
|------|----------|
| Dashboard | Upcoming assignments, stats |
| Assignment Detail | Brief lengkap, lokasi, jam, contact client, checklist |
| Check-in/Out | Tombol "Mulai Shoot" / "Selesai" (timestamp) |
| Upload Hasil | Paste Drive link, deadline counter, QC status |
| Payout History | List: periode, fee, bonus, potongan, total, status, slip PDF |
| Portfolio Saya | Foto approved (private, untuk CV) |

---

## 8. API Endpoints Summary

### Admin (require session auth)
```
GET    /api/admin/dashboard/stats
GET    /api/admin/inquiries
POST   /api/admin/inquiries/:id/quote
POST   /api/admin/inquiries/:id/status
GET    /api/admin/bookings
POST   /api/admin/bookings/:id/verify-dp
POST   /api/admin/bookings/:id/verify-balance
POST   /api/admin/bookings/:id/contract
GET    /api/admin/assignments
POST   /api/admin/assignments
PUT    /api/admin/assignments/:id
POST   /api/admin/assignments/:id/brief
GET    /api/admin/freelancers
POST   /api/admin/freelancers
PUT    /api/admin/freelancers/:id
GET    /api/admin/deliverables
POST   /api/admin/deliverables/:id/qc
POST   /api/admin/deliverables/:id/deliver
GET    /api/admin/payouts
POST   /api/admin/payouts/run
POST   /api/admin/payouts/:id/complete
GET    /api/admin/portfolio
POST   /api/admin/portfolio/from-booking
PUT    /api/admin/portfolio/:id
```

### Public (no auth)
```
POST   /api/public/inquiry
GET    /api/public/portfolio
GET    /api/public/portfolio/:id
GET    /api/public/booking/:token
```

### FG Portal (token auth)
```
GET    /api/fg/assignments
GET    /api/fg/assignments/:id
POST   /api/fg/assignments/:id/checkin
POST   /api/fg/assignments/:id/checkout
POST   /api/fg/assignments/:id/upload
GET    /api/fg/payouts
GET    /api/fg/portfolio
```

---

## 9. File Storage Structure

```
/DATA/AppData/
├── wisuda.db                    # SQLite DB
├── wisuda-uploads/
│   ├── contracts/               # PDF kontrak per booking
│   ├── quotations/              # PDF quotation per inquiry
│   ├── payouts/                 # PDF slip per payout
│   ├── portfolio/               # Cover + highlights (web-optimized)
│   └── temp/                    # Temporary uploads
└── backups/
    └── wisuda_YYYYMMDD.db       # Daily backups
```

---

## 10. Deployment Config

| Component | Value |
|-----------|-------|
| **PM2 Name** | `wisuda-api` |
| **Port** | `8081` |
| **DB Path** | `/DATA/AppData/wisuda.db` |
| **Upload Path** | `/DATA/AppData/wisuda-uploads` |
| **WA Bridge** | `wa.me` links only (no Baileys) |
| **Cloudflare** | `wisuda.ammang.my.id` → `http://192.168.100.254:8081` |
| **Nginx** | Reverse proxy port 8081, static files for portfolio/inquiry |
| **TZ** | `Asia/Makassar` |
| **Node** | 20+ |

---

## 11. Success Criteria per Module

| Module | Done When |
|--------|-----------|
| DB & Migrations | All tables created, seed data inserted, integrity check pass |
| Auth | Admin login/logout, session HttpOnly, bcrypt, lockout 5/15min |
| Inquiry → Quotation | Form works, PDF generated, wa.me link works, status flows |
| Booking & DP | DP verify manual, contract PDF, digital sign "OK" via wa.me |
| Calendar Assign | Drag-drop works, conflict detection, FG confirm via wa.me |
| FG Portal | Check-in/out, upload Drive link, deadline, QC status |
| QC & Delivery | Approve/revision/reject, password link, 48h auto-approve |
| Balance & Payout | Manual verify, slip PDF, weekly run, wa.me notif |
| Portfolio Public | Grid, filter, modal carousel, CTA to inquiry |
| Cron Jobs | All 7 jobs registered, tested, logging to `/var/log/wisuda-cron.log` |
| Deploy | PM2 online, Nginx proxy works, Cloudflare accessible, health check 200 |

---

*End of WISUDA_FLOW.md*