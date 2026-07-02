# Wisuda Platform — Build Tasks (Wisuda Builder)

Source of truth for autonomous build loop. Updated manually or by builder on completion.

## Week 1: Foundation

- [ ] src/config/database.js — better-sqlite3 + WAL + FK + migrations runner
- [ ] src/migrations/001_initial_schema.sql — all 13 tables + indexes
- [ ] src/migrations/002_seed_packages.sql — 4 packages
- [ ] src/migrations/003_seed_admin.sql — admin user (bcrypt)
- [ ] scripts/seed.js — sample FG + schedules
- [ ] Run migration, verify 13 tables created
- [ ] src/config/settings.js — load settings from DB, cache
- [ ] src/config/wa-templates.js — load WA templates from settings
- [ ] src/middleware/auth.js — session (express-session + SQLite store), bcrypt, login/out
- [ ] src/middleware/validation.js — express-validator rules
- [ ] src/middleware/rate-limit.js — 5 req/min for public inquiry
- [ ] POST /api/admin/login → HttpOnly cookie wisuda_sess
- [ ] POST /api/admin/logout
- [ ] src/routes/health.js — /health endpoint (DB, WAL, FK, tables, disk)
- [ ] src/utils/date.js — WITA timezone, formatters
- [ ] src/utils/currency.js — IDR format, calc DP/balance
- [ ] src/utils/slug.js — token generator for booking links
- [ ] src/main.js — Express setup, middleware order, route mounting
- [ ] src/routes/admin.js — all admin routes stubbed with 501
- [ ] src/services/inquiry.service.js — CRUD inquiries
- [ ] src/services/booking.service.js — CRUD bookings
- [ ] src/services/assignment.service.js — CRUD assignments
- [ ] GET/PUT /api/admin/settings
- [ ] GET/PUT /api/admin/wa-templates
- [ ] Default templates inserted in settings
- [ ] npm test — unit tests for services (Jest)
- [ ] curl /health → 200 healthy=true
- [ ] curl -X POST /api/admin/login → cookie set
- [ ] PM2 wisuda-api online
- [ ] Checkpoint: Demo admin login + health

## Week 2: Core Flow

- [ ] POST /api/public/inquiry — validation, rate limit, create inquiry + WA link
- [ ] src/services/wa.service.js — wa.me link generator (no Baileys)
- [ ] public/inquiry.html — Alpine.js form → POST → thank you page
- [ ] POST /api/admin/inquiries/:id/quote — select package → calc price/DP → PDF
- [ ] src/services/pdf.service.js — PDFKit quotation template
- [ ] Save PDF to /DATA/AppData/wisuda-uploads/quotations/INQ-{id}.pdf
- [ ] Return wa.me link for admin to send to client
- [ ] POST /api/admin/bookings/:id/verify-dp — admin upload bukti, input amount
- [ ] Update booking: dp_status=paid, dp_verified_at, dp_bukti_url
- [ ] Generate contract PDF → save → return wa.me link for client digital sign
- [ ] POST /api/admin/bookings/:id/contract — client replies "OK" via wa.me
- [ ] Update: contract_signed=true, status=booked
- [ ] Trigger FG assignment flow
- [ ] GET /api/admin/bookings — kanban data
- [ ] GET /api/admin/bookings/:id — full detail with relations
- [ ] Status transitions enforced
- [ ] Integration test: Inquiry → Quote → DP Verify → Contract → Booked
- [ ] Verify PDFs generated correctly
- [ ] Verify wa.me links open correctly
- [ ] Checkpoint: Demo full flow

## Week 3: Operations

- [ ] GET /api/admin/calendar?month=2026-07 — bookings + FG schedules
- [ ] POST /api/admin/assignments — drag-drop: booking_id + fg_id + date → conflict check
- [ ] Conflict rules: FG max 2/day, no double-book same date
- [ ] Update fg_schedules status=booked + booking_id
- [ ] Return wa.me link for FG brief
- [ ] POST /api/admin/assignments/:id/brief — send detailed brief to FG
- [ ] FG confirms via wa.me link: KONFIRMASI {assignment_id}
- [ ] Webhook handler (or admin manual) → fg_confirmed_at, status=confirmed
- [ ] GET /api/fg/assignments — upcoming + stats
- [ ] GET /api/fg/assignments/:id — full brief, checklist, client contact
- [ ] Token auth via wa.me login link
- [ ] POST /api/fg/assignments/:id/checkin → shoot_start_at, status=shooting
- [ ] POST /api/fg/assignments/:id/checkout → shoot_end_at, status=uploaded
- [ ] POST /api/fg/assignments/:id/upload — paste Drive link → upload_deadline = H+1 23:59
- [ ] GET /api/admin/deliverables — queue: pending, approved, revision, rejected
- [ ] POST /api/admin/deliverables/:id/qc — approve/revision/reject + notes
- [ ] POST /api/admin/deliverables/:id/deliver — generate password, preview link, wa.me to client
- [ ] Client clicks "OK" via wa.me → client_approved=true, client_approved_at
- [ ] Cron: hourly check delivered_at > 48h & not approved → auto approve + trigger balance invoice
- [ ] Balance invoice wa.me sent to client
- [ ] Integration test: Assign → FG confirm → Shoot → Upload → QC → Deliver → Client approve
- [ ] Checkpoint: Demo to user

## Week 4: Finance, Public, Cron, Deploy

- [ ] POST /api/admin/bookings/:id/verify-balance — admin verify pelunasan
- [ ] Update: balance_status=paid, status=completed
- [ ] Wa.me to client: "Pelunasan Terverifikasi"
- [ ] POST /api/admin/payouts/run — weekly: filter assignments done last week
- [ ] Calculate: fg_fee + editor_fee + bonus - deduction = total_payout
- [ ] Generate slip PDF → save → return payout queue
- [ ] POST /api/admin/payouts/:id/complete — admin upload transfer ref + slip → wa.me to FG
- [ ] GET /api/fg/payouts — list with slip PDF links
- [ ] Summary: pending, paid total
- [ ] POST /api/admin/portfolio/from-booking — kurasi from completed booking
- [ ] Upload cover + max 10 highlights → publish/featured
- [ ] GET /api/public/portfolio — masonry grid, filter tahun/univ, pagination
- [ ] GET /api/public/portfolio/:id — modal carousel data
- [ ] public/portfolio.html — Alpine.js grid + modal + CTA to inquiry
- [ ] GET /api/public/booking/:token — timeline + download link
- [ ] public/booking.html — timeline visualization
- [ ] src/services/cron.service.js — node-cron scheduler
- [ ] Job: Reminder H-3 (daily 09:00) — scan assignments date+3
- [ ] Job: Reminder H-1 (daily 09:00) — scan assignments date+1
- [ ] Job: Auto Approve Delivery (hourly) — delivered > 48h
- [ ] Job: DP Expired Check (daily 00:00) — quoted > 7 days
- [ ] Job: Payout Run (weekly Sun 20:00)
- [ ] Job: Backup DB (daily 02:00)
- [ ] Job: Wisuda Builder (every 15 min) — autonomous build loop
- [ ] PM2 ecosystem.config.js production
- [ ] Nginx config + reload
- [ ] Cloudflare Tunnel test
- [ ] All health checks pass
- [ ] Final Checkpoint: Full end-to-end demo

## Infrastructure & Docs

- [ ] ecosystem.config.js — PM2 config for wisuda-api + wisuda-cron
- [ ] nginx config — /etc/nginx/sites-available/wisuda
- [ ] cloudflared config — ~/.cloudflared/config.yml
- [ ] /root/scripts/backup-wisuda.sh — daily backup script
- [ ] /root/scripts/deploy-wisuda.sh — deploy automation
- [ ] /etc/logrotate.d/wisuda — log rotation
- [ ] docs/WISUDA_FLOW.md — created
- [ ] docs/WISUDA_API.md — created
- [ ] docs/WISUDA_DB.md — created
- [ ] docs/WISUDA_DEPLOY.md — created
- [ ] docs/WISUDA_WORKFLOW.md — created
- [ ] skills/wisuda-platform-ops — updated
- [ ] skills/wisuda-deploy — created
- [ ] src/services/builder.service.js — created