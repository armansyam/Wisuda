# 🔄 Wisuda Platform — Workflow & Flow Overview

**Version:** 1.2  
**Last Updated:** 2026-07-25  
**Master Document:** Referensi lengkap alur kerja & diagram state machine tersedia di [`WISUDA_WORKFLOW.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/WISUDA_WORKFLOW.md).

---

## 🎯 Ringkasan Alur Utama

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  INQUIRY    │────▶│  QUOTATION  │────▶│   BOOKING   │────▶│ ASSIGNMENT  │
│  (Lead)     │     │  (Manual)   │     │  (DP 50%)   │     │  (FG + Cal) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Public Form         Admin buat Quote    Client transfer     Admin assign FG
  → DB: inquiries     + link WA           DP → Verifikasi     → FG konfirmasi
  → Badge Notif       → status=quoted     → status=booked     via Portal FG
```

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   SHOOT     │────▶│   SELEKSI   │────▶│ DELIVERABLES│────▶│   PAYOUT    │
│  (FG Portal)│     │  (Client)   │     │  (Drive)    │     │  (Payroll)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  Check-in/out        Lightbox swipe      Status 'editing'    Payroll Summary
  Setor link Drive    pilih foto          / 'delivered'       Bayar Payout FG
  → foto diolah       → submit editor     → PIN unlock        → Terbit Slip PDF
```

---
*Wisuda Platform Flow Overview v1.2*