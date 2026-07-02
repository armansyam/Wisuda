# Wisuda Platform — 4-Week Build Workflow

**Version:** 1.0  
**Author:** Farah  
**Date:** 2026-07-02  
**Method:** Autonomous "Wisuda Builder" cron (every 15 min) + manual checkpoints

---

## Sprint Overview

| Week | Focus | Deliverable | Success Criteria |
|------|-------|-------------|------------------|
| 1 | Foundation | DB, Auth, Config, Migration, Health | All tables created, admin login works, health check 200 |
| 2 | Core Flow | Inquiry → Quotation → Booking → DP Verify → Contract | Full inquiry-to-booked flow works end-to-end |
| 3 | Operations | Calendar Assign, FG Portal, Shoot, Upload, QC, Delivery | FG assigned, shoots, uploads, admin QC, client receives |
| 4 | Finance & Public | Balance, Payout, Portfolio Public, Cron Jobs, Deploy | Revenue flow complete, public pages live, all cron running |

---

## Week 1: Foundation (Days 1-7)

### Day 1-2: Database & Migration System
- [ ] `src/config/database.js` — better-sqlite3 + WAL + FK + migrations runner
- [ ] `src/migrations/001_initial_schema.sql` — all 13 tables + indexes
- [ ] `src/migrations/002_seed_packages.sql` — 4 packages
- [ ] `src/migrations/003_seed_admin.sql` — admin user (bcrypt)
- [ ] `scripts/seed.js` — sample FG + schedules
- [ ] Run migration, verify `sqlite3 wisuda.db ".schema"` → 13 tables

### Day 3: Auth & Config
- [ ] `src/config/settings.js` — load settings from DB, cache
- [ ] `src/config/wa-templates.js` — load WA templates from settings
- [ ] `src/middleware/auth.js` — session (express-session + SQLite store), bcrypt, login/out
- [ ] `src/middleware/validation.js` — express-validator rules
- [ ] `src/middleware/rate-limit.js` — 5 req/min for public inquiry
- [ ] `POST /api/admin/login` → HttpOnly cookie `wisuda_sess`
- [ ] `POST /api/admin/logout`

### Day 4: Health & Core Utils
- [ ] `src/routes/health.js` — `/health` endpoint (DB, WAL, FK, tables, disk)
- [ ] `src/utils/date.js` — WITA timezone, formatters
- [ ] `src/utils/currency.js` — IDR format, calc DP/balance
- [ ] `src/utils/slug.js` — token generator for booking links
- [ ] `src/main.js` — Express setup, middleware order, route mounting

### Day 5: Admin Dashboard API Skeleton
- [ ] `src/routes/admin.js` — all admin routes stubbed with 501
- [ ] `src/services/inquiry.service.js` — CRUD inquiries
- [ ] `src/services/booking.service.js` — CRUD bookings
- [ ] `src/services/assignment.service.js` — CRUD assignments

### Day 6: Settings & WA Templates API
- [ ] `GET/PUT /api/admin/settings`
- [ ] `GET/PUT /api/admin/wa-templates`
- [ ] Default templates inserted in settings

### Day 7: Test & Verify
- [ ] `npm test` — unit tests for services (Jest)
- [ ] `curl /health` → 200 healthy=true
- [ ] `curl -X POST /api/admin/login` → cookie set
- [ ] PM2 `wisuda-api` online
- [ ] **Checkpoint**: Demo admin login + health to user

---

## Week 2: Core Flow (Days 8-14)

### Day 8: Public Inquiry API
- [ ] `POST /api/public/inquiry` — validation, rate limit, create inquiry + WA link
- [ ] `src/services/wa.service.js` — wa.me link generator (no Baileys)
- [ ] `public/inquiry.html` — Alpine.js form → POST → thank you page

### Day 9: Quotation System
- [ ] `POST /api/admin/inquiries/:id/quote` — select package → calc price/DP → PDF
- [ ] `src/services/pdf.service.js` — PDFKit quotation template
- [ ] Save PDF to `/DATA/AppData/wisuda-uploads/quotations/INQ-{id}.pdf`
- [ ] Return wa.me link for admin to send to client

### Day 10: DP Verification & Contract
- [ ] `POST /api/admin/bookings/:id/verify-dp` — admin upload bukti, input amount
- [ ] Update booking: `dp_status=paid`, `dp_verified_at`, `dp_bukti_url`
- [ ] Generate contract PDF → save → return wa.me link for client digital sign

### Day 11: Digital Contract Sign
- [ ] `POST /api/admin/bookings/:id/contract` — client replies "OK" via wa.me
- [ ] Update: `contract_signed=true`, `status=booked`
- [ ] Trigger FG assignment flow

### Day 12: Booking Pipeline API
- [ ] `GET /api/admin/bookings` — kanban data (quoted, booked, shooting, delivered, completed)
- [ ] `GET /api/admin/bookings/:id` — full detail with relations
- [ ] Status transitions enforced

### Day 13: Integration Test
- [ ] Full flow: Inquiry → Quote → DP Verify → Contract → Booked
- [ ] Verify PDFs generated correctly
- [ ] Verify wa.me links open correctly
- [ ] **Checkpoint**: Demo full flow to user

### Day 14: Bug Fix & Polish
- [ ] Fix any issues from integration test
- [ ] Add input validation edge cases
- [ ] Write integration tests for core flow

---

## Week 3: Operations (Days 15-21)

### Day 15: Calendar & FG Assignment
- [ ] `GET /api/admin/calendar?month=2026-07` — bookings + FG schedules
- [ ] `POST /api/admin/assignments` — drag-drop: booking_id + fg_id + date → conflict check
- [ ] Conflict rules: FG max 2/day, no double-book same date
- [ ] Update `fg_schedules` status=booked + booking_id
- [ ] Return wa.me link for FG brief

### Day 16: FG Brief & Confirmation
- [ ] `POST /api/admin/assignments/:id/brief` — send detailed brief to FG
- [ ] FG confirms via wa.me link: `KONFIRMASI {assignment_id}`
- [ ] Webhook handler (or admin manual) → `fg_confirmed_at`, `status=confirmed`

### Day 17: FG Portal — Dashboard & Assignment Detail
- [ ] `GET /api/fg/assignments` — upcoming + stats
- [ ] `GET /api/fg/assignments/:id` — full brief, checklist, client contact
- [ ] Token auth via wa.me login link

### Day 18: FG Check-in/Out & Upload
- [ ] `POST /api/fg/assignments/:id/checkin` → `shoot_start_at`, `status=shooting`
- [ ] `POST /api/fg/assignments/:id/checkout` → `shoot_end_at`, `status=uploaded`
- [ ] `POST /api/fg/assignments/:id/upload` — paste Drive link → `upload_deadline` = H+1 23:59

### Day 19: Admin QC & Delivery
- [ ] `GET /api/admin/deliverables` — queue: pending, approved, revision, rejected
- [ ] `POST /api/admin/deliverables/:id/qc` — approve/revision/reject + notes
- [ ] `POST /api/admin/deliverables/:id/deliver` — generate password, preview link, wa.me to client

### Day 20: Client Approval & Auto-Approve
- [ ] Client clicks "OK" via wa.me → `client_approved=true`, `client_approved_at`
- [ ] Cron: hourly check `delivered_at > 48h` & not approved → auto approve + trigger balance invoice
- [ ] Balance invoice wa.me sent to client

### Day 21: Integration Test Week 3
- [ ] Full flow: Assign → FG confirm → Shoot → Upload → QC → Deliver → Client approve
- [ ] **Checkpoint**: Demo to user

---

## Week 4: Finance, Public, Cron, Deploy (Days 22-28)

### Day 22: Balance Verification
- [ ] `POST /api/admin/bookings/:id/verify-balance` — admin verify pelunasan
- [ ] Update: `balance_status=paid`, `status=completed`
- [ ] Wa.me to client: "Pelunasan Terverifikasi"

### Day 23: Payout System
- [ ] `POST /api/admin/payouts/run` — weekly: filter assignments done last week
- [ ] Calculate: `fg_fee + editor_fee + bonus - deduction = total_payout`
- [ ] Generate slip PDF → save → return payout queue
- [ ] `POST /api/admin/payouts/:id/complete` — admin upload transfer ref + slip → wa.me to FG

### Day 24: FG Payout History
- [ ] `GET /api/fg/payouts` — list with slip PDF links
- [ ] Summary: pending, paid total

### Day 25: Portfolio Public
- [ ] `POST /api/admin/portfolio/from-booking` — kurasi from completed booking
- [ ] Upload cover + max 10 highlights → publish/featured
- [ ] `GET /api/public/portfolio` — masonry grid, filter tahun/univ, pagination
- [ ] `GET /api/public/portfolio/:id` — modal carousel data
- [ ] `public/portfolio.html` — Alpine.js grid + modal + CTA to inquiry

### Day 26: Booking Status Public Page
- [ ] `GET /api/public/booking/:token` — timeline + download link
- [ ] `public/booking.html` — timeline visualization

### Day 27: Cron Jobs (All 7 + Wisuda Builder)
- [ ] `src/services/cron.service.js` — node-cron scheduler
- [ ] Jobs:
  - Reminder H-3 (daily 09:00) — scan assignments date+3
  - Reminder H-1 (daily 09:00) — scan assignments date+1
  - Auto Approve Delivery (hourly) — delivered > 48h
  - DP Expired Check (daily 00:00) — quoted > 7 days
  - Payout Run (weekly Sun 20:00)
  - Backup DB (daily 02:00)
  - **Wisuda Builder (every 15 min)** — autonomous build loop

### Day 28: Deploy & Final Verify
- [ ] PM2 ecosystem.config.js production
- [ ] Nginx config + reload
- [ ] Cloudflare Tunnel test
- [ ] All health checks pass
- [ ] **Final Checkpoint**: Full end-to-end demo to user

---

## Wisuda Builder — Autonomous Cron (Every 15 Min)

### Logic Flow
```
┌─────────────────┐
│  Read TODO list │  (from .hermes/todo.json or WISUDA_WORKFLOW.md)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Pick next task │  (priority: in_progress > pending, dependencies met)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Research       │  (web_search, read_file, search_files)
│  - Best practice│
│  - Existing code│
└────────┬────────┘
         ▼
┌─────────────────┐
│  Implement      │  (write_file, patch, terminal npm install)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Test           │  (terminal npm test, curl health, curl API)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Verify         │  (browser_vision screenshot of working feature)
└────────┬────────┘
         ▼
┌─────────────────┐
│  Report         │  (append to build log, update TODO status)
└────────┬────────┘
         ▼
    [Loop or Done]
```

### Report Format (every run)
```markdown
## Wisuda Builder Run — 2026-07-02 14:30 WITA

**Task:** POST /api/public/inquiry
**Status:** COMPLETED

**Research:** Found existing inquiry.service.js, added validation + rate limit
**Implementation:** 3 files changed (routes/public.js, services/inquiry.service.js, middleware/rate-limit.js)
**Test:** 
- curl POST /api/public/inquiry → 201 created
- Rate limit: 6th request → 429
- DB: inquiry created with status=new

**Verification:** Browser screenshot of inquiry form submit → thank you page
**Next Task:** Quotation PDF generation
---
```

### Cron Config
```js
// In cron.service.js
cron.schedule('*/15 * * * *', async () => {
  await runWisudaBuilder();
}, { timezone: 'Asia/Makassar' });
```

---

## Task Dependencies Graph

```
Week 1                    Week 2                      Week 3                    Week 4
────────                  ────────                    ────────                  ────────
DB & Migration    ────▶   Public Inquiry        ────▶   Calendar Assign    ────▶   Balance Verify
Auth & Config     ────▶   Quotation PDF         ────▶   FG Portal          ────▶   Payout Run
Health & Utils    ────▶   DP Verify             ────▶   Check-in/Out       ────▶   Portfolio
Settings API      ────▶   Contract Sign         ────▶   Upload + QC        ────▶   Booking Status
Admin Skeleton    ────▶   Booking Pipeline      ────▶   Delivery           ────▶   All Cron Jobs
                                                ────▶   Auto-Approve       ────▶   Deploy
```

---

## Definition of Done per Module

| Module | Done When |
|--------|-----------|
| DB & Migrations | All 13 tables + indexes, seed data, integrity check pass |
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

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SQLite WAL lock contention | busy_timeout=5000, short transactions, WAL mode |
| WA.me link broken on mobile | Test on Android/iOS, fallback to copy-text |
| FG no-show shoot | H-3 + H-1 reminders, backup FG in calendar |
| Client ghost after delivery | 48h auto-approve → balance invoice |
| Deploy port conflict | Port 8081 only, Nginx on 80, verify with `ss -tlnp` |
| Data loss | Daily backup + integrity check, 30-day retention |

---

## Communication Protocol

- **Wisuda Builder** runs every 15 min, appends to `/var/log/wisuda-builder.log`
- **Checkpoints** (end of each week): Demo to user via this channel
- **Blockers**: Builder logs error, pauses, alerts via cron log
- **User feedback**: Relay to builder via updated TODO or direct instruction