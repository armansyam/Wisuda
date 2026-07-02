# Wisuda Platform — API Specification

**Version:** 1.0  
**Author:** Farah  
**Date:** 2026-07-02  
**Base URL:** `http://192.168.100.254:8081` (local) / `https://wisuda.ammang.my.id` (Cloudflare)

---

## Authentication

### Admin (Session-based)
- Login: `POST /api/admin/login` → sets HttpOnly cookie `wisuda_sess`
- All admin routes require valid session
- Logout: `POST /api/admin/logout`

### Public (No Auth)
- Inquiry form, portfolio, booking status check

### FG Portal (Token-based)
- Token via WA link: `wa.me/6285813999513?text=FG_LOGIN%20{fg_id}`
- Header: `Authorization: Bearer {fg_token}`

---

## Admin API

### Auth
```
POST   /api/admin/login
Body: { username, password }
Response: { success: true, user: { id, username, name, role } }

POST   /api/admin/logout
Response: { success: true }

GET    /api/admin/me
Response: { user: {...} }
```

### Dashboard
```
GET    /api/admin/dashboard/stats
Response: {
  inquiries_this_month: 42,
  conversion_rate: 0.38,
  revenue_this_month: 84500000,
  fg_workload: [{ fg_id, name, booked_days_this_month }],
  pending_dp: 5,
  pending_balance: 3,
  pending_payout: 2
}
```

### Inquiries
```
GET    /api/admin/inquiries?status=&search=&page=1&limit=20
Response: { data: [...], total, page, totalPages }

GET    /api/admin/inquiries/:id
Response: { inquiry, package, assigned_admin }

POST   /api/admin/inquiries/:id/quote
Body: { package_id, custom_price?, notes? }
Response: { inquiry, quotation_pdf_url, wa_link }

POST   /api/admin/inquiries/:id/status
Body: { status }  // quoted, booked, expired, lost, archived
Response: { inquiry }

POST   /api/admin/inquiries/:id/wa-reply
Body: { message }
Response: { sent: true }
```

### Bookings
```
GET    /api/admin/bookings?status=&page=1&limit=20
Response: { data: [...], total }

GET    /api/admin/bookings/:id
Response: { booking, inquiry, package, assignment, deliverable, payments }

POST   /api/admin/bookings/:id/verify-dp
Body: { amount, bukti_url, verified_by }
Response: { booking, contract_pdf_url, wa_link_client }

POST   /api/admin/bookings/:id/verify-balance
Body: { amount, bukti_url, verified_by }
Response: { booking, wa_link_client }

POST   /api/admin/bookings/:id/contract
Body: { signed: true }
Response: { booking, contract_pdf_url }
```

### Assignments & Calendar
```
GET    /api/admin/assignments?status=&fg_id=&date_from=&date_to=
Response: { data: [...] }

POST   /api/admin/assignments
Body: { booking_id, fg_id, editor_id?, brief, shooting_time }
Response: { assignment, wa_link_fg }

PUT    /api/admin/assignments/:id
Body: { fg_id?, editor_id?, brief?, status?, shooting_time? }
Response: { assignment }

POST   /api/admin/assignments/:id/brief
Body: { brief }
Response: { assignment, wa_link_fg }

GET    /api/admin/calendar?month=2026-07&fg_id=
Response: { 
  bookings: [{ id, client_name, graduation_date, fg_id, status }],
  fg_schedules: [{ fg_id, date, status, booking_id }]
}
```

### Freelancers (FG)
```
GET    /api/admin/freelancers?active=
Response: { data: [...] }

POST   /api/admin/freelancers
Body: { name, phone, email, portfolio_url, specialties, bank_account, id_card }
Response: { freelancer }

PUT    /api/admin/freelancers/:id
Body: { ... }
Response: { freelancer }

DELETE /api/admin/freelancers/:id
Response: { success: true }
```

### Deliverables & QC
```
GET    /api/admin/deliverables?status=&assignment_id=
Response: { data: [...] }

POST   /api/admin/deliverables/:id/qc
Body: { status, notes }  // approved, revision, rejected
Response: { deliverable, wa_link_fg? }

POST   /api/admin/deliverables/:id/deliver
Body: { password?, expiry_days? }
Response: { deliverable, download_url, wa_link_client }
```

### Payouts
```
GET    /api/admin/payouts?status=&period_start=&period_end=
Response: { data: [...] }

POST   /api/admin/payouts/run
Body: { period_start, period_end }
Response: { payouts: [...], total_amount }

POST   /api/admin/payouts/:id/complete
Body: { transfer_ref, slip_url }
Response: { payout, wa_link_fg }
```

### Portfolio
```
GET    /api/admin/portfolio?published=&featured=
Response: { data: [...] }

POST   /api/admin/portfolio/from-booking
Body: { booking_id, cover_photo_url, highlight_photos[], fg_name, featured? }
Response: { portfolio_item }

PUT    /api/admin/portfolio/:id
Body: { cover_photo_url?, highlight_photos?, published?, featured?, sort_order? }
Response: { portfolio_item }
```

### Settings
```
GET    /api/admin/settings
Response: { settings: {...} }

PUT    /api/admin/settings
Body: { key, value }  // or bulk: { dp_percentage, upload_deadline_days, ... }
Response: { settings }

GET    /api/admin/wa-templates
Response: { templates: {...} }

PUT    /api/admin/wa-templates
Body: { key, template }
Response: { templates }
```

### Reports
```
GET    /api/admin/reports/revenue?month=2026-07
Response: { monthly, by_package, by_fg }

GET    /api/admin/reports/conversion?month=2026-07
Response: { funnel: { inquiry, quoted, booked, completed }, rates }

GET    /api/admin/reports/fg-performance?month=2026-07
Response: { data: [{ fg_id, name, bookings, rating, payout_total, utilization }] }
```

---

## Public API (No Auth)

### Inquiry Form
```
POST   /api/public/inquiry
Body: { 
  client_name, client_phone, client_email, 
  graduation_date, location, university, 
  package_id, notes, source: "web"
}
Response: { 
  success: true, 
  inquiry_id, 
  message: "Admin akan menghubungi via WA 1x24 jam",
  wa_link_admin  // for admin notification
}
Rate limit: 5 req/min per IP
```

### Portfolio
```
GET    /api/public/portfolio?year=&university=&page=1&limit=12
Response: { 
  data: [{ id, client_initial, graduation_year, university, cover_photo_url, fg_name, featured }],
  total, page, totalPages
}

GET    /api/public/portfolio/:id
Response: { 
  id, client_initial, graduation_year, university, 
  cover_photo_url, highlight_photos[], fg_name 
}
```

### Booking Status Check
```
GET    /api/public/booking/:token
Response: {
  booking: { id, client_name, graduation_date, package_name, status },
  timeline: [
    { step: "inquiry", label: "Inquiry Diterima", done: true, at: "2026-06-15T10:00" },
    { step: "quotation", label: "Quotation Dikirim", done: true, at: "2026-06-15T14:00" },
    { step: "dp", label: "DP Verified", done: true, at: "2026-06-16T09:00" },
    { step: "contract", label: "Kontrak Ditandatangani", done: true, at: "2026-06-16T10:00" },
    { step: "assignment", label: "FG Diassign", done: true, at: "2026-06-20T09:00" },
    { step: "shoot", label: "Shoot Selesai", done: false },
    { step: "qc", label: "QC Approved", done: false },
    { step: "delivery", label: "Foto Dikirim", done: false },
    { step: "completed", label: "Selesai", done: false }
  ],
  download_url: null,  // only if delivered
  password: null
}
Token expiry: 7 days from generation
```

---

## FG Portal API (Token Auth)

```
GET    /api/fg/assignments?status=&upcoming=
Response: { data: [...], stats: { this_month, total, rating } }

GET    /api/fg/assignments/:id
Response: { 
  assignment, booking, client, brief, 
  checklist: ["Kamera", "Battery", "Flash", "Card", "Lens"],
  fg_fee, editor_fee
}

POST   /api/fg/assignments/:id/checkin
Response: { assignment, shoot_start_at: "2026-06-25T08:00:00" }

POST   /api/fg/assignments/:id/checkout
Response: { assignment, shoot_end_at: "2026-06-25T12:00:00" }

POST   /api/fg/assignments/:id/upload
Body: { drive_folder_url }
Response: { deliverable, upload_deadline: "2026-06-26T23:59:59" }

GET    /api/fg/payouts
#G/payouts
Response: { 
  data: [{ id, period_start, period_end, fg_fee, editor_fee, bonus, deduction, total_payout, status, paid_at, slip_url }],
  summary: { pending, paid_total }
}

GET    /api/fg/portfolio
Response: { data: [{ assignment_id, cover_photo_url, highlight_photos[], client_initial, graduation_year, university }] }
```

---

## WA.me Link Generation (All Notifications)

Format: `https://wa.me/{phone}?text={urlencoded_message}`

### Template Variables
| Template | Variables |
|----------|-----------|
| `admin_new_inquiry` | client_name, graduation_date, location, package_name, client_phone |
| `client_quotation` | client_name, graduation_date, package_name, total_price, dp_amount, bank_list, admin_phone |
| `client_dp_verified` | client_name, contract_url, admin_phone |
| `fg_assigned` | graduation_date, shooting_time, location, client_name, package_name, brief, admin_phone, assignment_id |
| `reminder_h3_fg` | client_name, location, shooting_time, brief |
| `reminder_h3_client` | client_name, shooting_time, location, fg_name, fg_phone |
| `fg_upload_ready` | fg_name, admin_url, assignment_id |
| `delivery_ready` | download_url, password, admin_phone, booking_id |
| `balance_due` | balance_amount, bank_list, admin_phone |
| `client_fully_paid` | booking_id, company_name |
| `fg_payout_sent` | period_start, period_end, total_payout, slip_url |

### Example Generation (Node.js)
```js
function waLink(phone, template, vars) {
  let msg = templates[template];
  Object.entries(vars).forEach(([k, v]) => {
    msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  });
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
```

---

## Error Responses
```json
{ "success": false, "error": "VALIDATION_ERROR", "message": "Field X required", "details": [...] }
{ "success": false, "error": "UNAUTHORIZED", "message": "Session expired" }
{ "success": false, "error": "NOT_FOUND", "message": "Booking not found" }
{ "success": false, "error": "CONFLICT", "message": "FG already booked on this date" }
{ "success": false, "error": "RATE_LIMITED", "message": "Too many requests" }
```

HTTP Status: 400, 401, 404, 409, 429, 500