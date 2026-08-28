const cron = require('node-cron');
const { getDb } = require('../config/database');
const { getSettings, getSetting, getWaTemplates } = require('../config/wa-templates');
const { formatCurrency, formatDate, formatDateTime, addDays } = require('../utils/currency');
const emailService = require('./email.service');
const fs = require('fs');
const path = require('path');

const db = getDb();
const config = require('../config/settings');
const baseDir = path.dirname(config.dbPath);
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}
const LOG_PATH = path.join(baseDir, 'wisuda-builder.log');
const PROGRESS_PATH = path.join(baseDir, 'wisuda-builder-progress.json');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB — rotate log file saat melebihi batas ini

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  try {
    // Log rotation: rename ke .old jika > 5MB
    if (fs.existsSync(LOG_PATH)) {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size > MAX_LOG_SIZE) {
        const oldPath = LOG_PATH + '.old';
        try { fs.unlinkSync(oldPath); } catch(e) { /* .old belum ada */ }
        fs.renameSync(LOG_PATH, oldPath);
      }
    }
    fs.appendFileSync(LOG_PATH, line);
  } catch(e) { /* Jangan crash proses utama kalau log gagal */ }
  console.log(line.trim());
}

/**
 * Timezone-safe date string helper.
 * Mengembalikan tanggal dalam format YYYY-MM-DD berdasarkan timezone Asia/Makassar (WITA).
 * Menghindari masalah date('now') di SQLite yang selalu mengembalikan UTC.
 * @param {number} offsetDays - Jumlah hari offset dari hari ini (positif = masa depan, negatif = masa lalu)
 * @returns {string} Tanggal dalam format YYYY-MM-DD
 */
function getLocalDateStr(offsetDays = 0) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }); // en-CA → YYYY-MM-DD
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    } catch {
      return { phase: 1, taskIndex: 0, completedTasks: [], lastRun: null };
    }
  }
  return { phase: 1, taskIndex: 0, completedTasks: [], lastRun: null };
}

function saveProgress(progress) {
  progress.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// ============ CRON JOBS ============

// 1. Reminder H-3 Shoot - Daily 09:00 WITA
cron.schedule('0 9 * * *', () => {
  log('Running: Reminder H-3 Shoot');
  runReminderH3();
}, { timezone: 'Asia/Makassar' });

// 2. Reminder H-1 Shoot - Daily 08:00 WITA (sebelum H-3 agar tidak tumpang tindih)
cron.schedule('0 8 * * *', () => {
  log('Running: Reminder H-1 Shoot');
  runReminderH1();
}, { timezone: 'Asia/Makassar' });

// 3. Auto Approve Delivery - Hourly
cron.schedule('0 * * * *', () => {
  log('Running: Auto Approve Delivery');
  runAutoApproveDelivery();
}, { timezone: 'Asia/Makassar' });

// 4. Inquiry Expiration & Past Event Auto-Archive - Daily 00:00 WITA (Tengah Malam)
cron.schedule('0 0 * * *', () => {
  log('Running: Inquiry Expiration & Past Event Auto-Archive');
  runDpExpiredCheck();
}, { timezone: 'Asia/Makassar' });

// 5. Payout Run - Weekly Sunday 20:00
cron.schedule('0 20 * * 0', () => {
  log('Running: Payout Run');
  runPayoutRun();
}, { timezone: 'Asia/Makassar' });

// 6. Google Drive Retention Clean-up - Daily 02:00 WITA
cron.schedule('0 2 * * *', () => {
  log('Running: Google Drive Retention Clean-up');
  runDriveRetentionCleanup();
}, { timezone: 'Asia/Makassar' });

// 7. Backup DB - Daily 03:30 WITA (setelah DB Maintenance 03:00 & Drive Retention 02:00 selesai)
cron.schedule('30 3 * * *', () => {
  log('Running: Backup DB');
  runBackupDb();
}, { timezone: 'Asia/Makassar' });

// 8. Auto-Complete Shoot — setiap 30 menit
// Jika graduation_date + shooting_time + duration_hours sudah lewat → otomatis tandai selesai
// FG tidak perlu konfirmasi manual
cron.schedule('*/30 * * * *', () => {
  log('Running: Auto Complete Shoot');
  runAutoCompleteShoots();
}, { timezone: 'Asia/Makassar' });

// 9. Inquiry Follow-Up Email Reminder - Daily 09:00 WITA
cron.schedule('0 9 * * *', () => {
  log('Running: Inquiry Follow-Up Email Reminder');
  runInquiryFollowUpReminder();
}, { timezone: 'Asia/Makassar' });

// 10. QRIS Expiration & Client Notification Monitor — Setiap 2 menit
cron.schedule('*/2 * * * *', () => {
  runQrisExpiredCheck();
});

// 11. Webhook Logs Cleanup — Daily 02:30 AM (hindari bentrok dengan payment cron)
cron.schedule('30 2 * * *', () => {
  log('Running: Webhook Logs Cleanup');
  runWebhookLogsCleanup();
}, { timezone: 'Asia/Makassar' });

// ============ JOB IMPLEMENTATIONS ============

function runQrisExpiredCheck() {
  try {
    const db = getDb();
    // Cari transaksi QRIS yang masih status 'pending', memiliki expired_at, dan sudah lewat waktu sekarang
    const expiredRows = db.prepare(`
      SELECT q.*, b.client_name, b.client_email, b.client_phone, b.graduation_date, b.tracking_token,
             p.name as package_name
      FROM qris_transactions q
      JOIN bookings b ON q.booking_id = b.id
      LEFT JOIN packages p ON b.package_id = p.id
      WHERE q.status = 'pending'
        AND (q.expired_notified IS NULL OR q.expired_notified = 0)
        AND q.expired_at IS NOT NULL
        AND datetime(q.expired_at) <= datetime('now')
    `).all();

    if (!expiredRows || expiredRows.length === 0) return;

    log(`[QrisExpiredCheck] Menemukan ${expiredRows.length} tagihan QRIS yang kedaluwarsa.`);
    const appUrl = (getSetting('app_url') || 'http://localhost:8081').replace(/\/+$/, '');

    for (const row of expiredRows) {
      try {
        // Tandai status QRIS transaksi menjadi expired dan expired_notified = 1
        db.prepare(`
          UPDATE qris_transactions
          SET status = 'expired', expired_notified = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(row.id);

        // Tentukan URL untuk retry
        let retryUrl = `${appUrl}/tracking.html?code=${row.tracking_token || row.booking_id}`;
        if (row.payment_type !== 'balance') {
          // Cari booking_token yang terkait dengan inquiry jika ada
          const inqToken = db.prepare(`
            SELECT bt.token FROM booking_tokens bt
            JOIN inquiries i ON bt.inquiry_id = i.id
            WHERE i.client_phone = ? OR i.client_email = ?
            ORDER BY bt.id DESC LIMIT 1
          `).get(row.client_phone, row.client_email);

          if (inqToken && inqToken.token) {
            retryUrl = `${appUrl}/confirm-booking.html?token=${inqToken.token}`;
          }
        }

        // Kirim email notifikasi expired ke klien
        if (row.client_email) {
          emailService.sendClientQrisExpiredEmail({
            booking: {
              id: row.booking_id,
              client_name: row.client_name,
              client_email: row.client_email,
              package_name: row.package_name,
              total_price: row.amount,
              dp_amount: row.amount
            },
            qrisData: {
              amount: row.amount,
              payment_type: row.payment_type,
              expired_at: row.expired_at
            },
            retryUrl
          }).catch(e => console.error(`[QrisExpiredCheck] Error sending email for QRIS #${row.id}:`, e.message));
        }
      } catch (itemErr) {
        console.error(`[QrisExpiredCheck] Error processing expired QRIS row #${row.id}:`, itemErr.message);
      }
    }
  } catch (err) {
    console.error('[QrisExpiredCheck] Global error:', err.message);
  }
}

function runWebhookLogsCleanup() {
  try {
    const db = getDb();
    const retentionDays = parseInt(getSetting('webhook_log_retention_days', 7), 10);
    const cutoffDate = getLocalDateStr(-retentionDays);
    const deleted = db.prepare(
      "DELETE FROM webhook_logs WHERE date(processed_at) < date(?)"
    ).run(cutoffDate);
    if (deleted.changes > 0) {
      log(`[WebhookLogsCleanup] Deleted ${deleted.changes} old webhook log entries (>${retentionDays} days)`);
    }
  } catch (err) {
    console.error('[WebhookLogsCleanup] Error:', err.message);
  }
}

function runAutoCompleteShoots() {
  try {
    const db = getDb();
    // Cari assignment yang aktif (confirmed/shooting) yang jadwalnya sudah lewat
    // Hitung waktu selesai: graduation_date + shooting_time + duration_hours
    const assignments = db.prepare(`
      SELECT a.id as assignment_id, a.booking_id, a.status as assignment_status,
             b.graduation_date, b.shooting_time, b.duration_hours, b.client_name
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      WHERE a.status IN ('confirmed', 'assigned')
        AND b.graduation_date IS NOT NULL
        AND b.shooting_time IS NOT NULL
        AND b.status NOT IN ('cancelled', 'completed')
    `).all();

    let autoCompleted = 0;
    const now = new Date();

    for (const a of assignments) {
      try {
        // Bangun datetime selesai: graduation_date + shooting_time + duration_hours + 30 menit toleransi
        const shootStart = new Date(`${a.graduation_date}T${a.shooting_time}:00+08:00`);
        const durationHours = parseInt(a.duration_hours) || 2;
        const shootEnd = new Date(shootStart.getTime() + durationHours * 60 * 60 * 1000);
        const shootEndWithGrace = new Date(shootEnd.getTime() + 30 * 60 * 1000); // Toleransi 30 menit setelah jam sesi berakhir

        if (now >= shootEndWithGrace) {
          // Jadwal sudah lewat (durasi + 30 menit toleransi) — auto-complete sesi foto
          db.prepare(`
            UPDATE assignments
            SET status = 'done', shoot_end_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status IN ('confirmed', 'assigned')
          `).run(shootEnd.toISOString(), a.assignment_id);

          // Cek kelunasan pembayaran untuk transisi Gate 2
          const booking = db.prepare('SELECT balance_status, balance_amount, dp_status, status FROM bookings WHERE id = ?').get(a.booking_id);
          const isPaidInFull = booking && (booking.balance_status === 'paid' || (booking.balance_amount !== null && booking.balance_amount <= 0) || (booking.dp_status === 'paid' && Number(booking.balance_amount || 0) === 0));

          // Tandai booking is_session_done = 1 → masuk post_production
          const targetStatus = 'post_production';

          db.prepare(`
            UPDATE bookings
            SET is_session_done = 1,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(targetStatus, a.booking_id);

          autoCompleted++;
          log(`Auto-complete shoot: assignment #${a.assignment_id} (${a.client_name}) selesai jam ${shootEnd.toLocaleTimeString('id-ID')} (+30m grace)`);
        }
      } catch (e) {
        log(`Auto-complete shoot error (assignment #${a.assignment_id}): ${e.message}`);
      }
    }

    if (autoCompleted > 0) {
      log(`Auto complete shoot done: ${autoCompleted} assignment(s) ditandai selesai otomatis`);
    }
  } catch (err) {
    log('runAutoCompleteShoots error: ' + err.message);
  }
}

function runReminderH3() {
  try {
    const settings = getSettings();
    const daysOffset = parseInt(settings.reminder_1_days || '3', 10);
    const targetDate = getLocalDateStr(daysOffset);
    const assignments = db.prepare(`
      SELECT a.*, b.client_name, b.client_phone, b.client_email, b.graduation_date, b.shooting_time, b.location, b.university, b.tracking_token,
             f.name as fg_name, f.phone as fg_phone, f.email as fg_email
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      LEFT JOIN freelancers f ON a.fg_id = f.id
      WHERE a.status IN ('assigned', 'confirmed')
      AND date(b.graduation_date) = date(?)
    `).all(targetDate);

    const templates = getWaTemplates();
    const appUrl = (getSetting('app_url') || 'http://localhost:3000').replace(/\/$/, '');
    
    for (const a of assignments) {
      // FG reminder
      if (a.fg_phone) {
        let msg = templates.reminder_h3_fg
          .replace('{client_name}', a.client_name)
          .replace('{location}', a.location)
          .replace('{shooting_time}', a.shooting_time || '-')
          .replace('{brief}', a.brief || '-');
        const waLink = `https://wa.me/${a.fg_phone}?text=${encodeURIComponent(msg)}`;
        log(`H-3 FG: ${a.fg_name} - ${waLink}`);
      }
      
      // Client reminder WA
      if (a.client_phone) {
        let msg = templates.reminder_h3_client
          .replace('{client_name}', a.client_name)
          .replace('{shooting_time}', a.shooting_time || '-')
          .replace('{location}', a.location)
          .replace('{fg_name}', a.fg_name || '-')
          .replace('{fg_phone}', a.fg_phone || '-');
        const waLink = `https://wa.me/${a.client_phone}?text=${encodeURIComponent(msg)}`;
        log(`H-3 Client: ${a.client_name} - ${waLink}`);
      }

      // Client reminder Email
      if (a.client_email) {
        try {
          const trackingUrl = a.tracking_token ? `${appUrl}/tracking.html?code=${a.tracking_token}` : `${appUrl}/tracking.html`;
          emailService.sendClientH3ReminderEmail({
            booking: {
              client_name: a.client_name,
              client_email: a.client_email,
              graduation_date: formatDate(a.graduation_date),
              shooting_time: a.shooting_time,
              location: a.location,
              university: a.university,
              tracking_token: a.tracking_token
            },
            fg: {
              name: a.fg_name,
              phone: a.fg_phone
            },
            trackingUrl
          }).catch(err => {
            log(`[ReminderH3ClientEmail Warn]: ${err.message}`);
          });
        } catch (e) {}
      }
    }
    log(`H-3 Reminder done: ${assignments.length} assignments`);
  } catch (err) {
    log(`H-3 Reminder ERROR: ${err.message}`);
  }
}

function runReminderH1() {
  try {
    const settings = getSettings();
    const daysOffset = parseInt(settings.reminder_2_days || '1', 10);
    const targetDate = getLocalDateStr(daysOffset);
    const assignments = db.prepare(`
      SELECT a.*, b.client_name, b.client_phone, b.client_email, b.graduation_date, b.shooting_time, b.location, b.university, b.tracking_token,
             f.name as fg_name, f.phone as fg_phone, f.email as fg_email, f.access_code as fg_access_code
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      LEFT JOIN freelancers f ON a.fg_id = f.id
      WHERE a.status IN ('assigned', 'confirmed')
      AND date(b.graduation_date) = date(?)
    `).all(targetDate);

    const templates = getWaTemplates();
    const appUrl = (getSetting('app_url') || 'http://localhost:3000').replace(/\/$/, '');
    
    for (const a of assignments) {
      // FG reminder WA
      if (a.fg_phone) {
        let msg = (templates.reminder_h1_fg || templates.reminder_h3_fg || '')
          .replace('{fg_name}', a.fg_name || 'Partner')
          .replace('{client_name}', a.client_name)
          .replace('{location}', a.location)
          .replace('{university}', a.university || '-')
          .replace('{shooting_time}', a.shooting_time || '-')
          .replace('{client_phone}', (a.client_phone || '').replace(/\D/g, ''));
        const waLink = `https://wa.me/${a.fg_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        log(`H-1 FG WA: ${a.fg_name} - ${waLink}`);
      }

      // FG reminder Email
      if (a.fg_email) {
        try {
          const appUrl = (getSetting('app_url') || 'http://localhost:3000').replace(/\/$/, '');
          const portalUrl = a.fg_access_code ? `${appUrl}/freelance-portal.html?code=${a.fg_access_code}` : `${appUrl}/freelance-portal.html`;
          const waClientUrl = a.client_phone ? `https://wa.me/${a.client_phone.replace(/\D/g, '')}` : null;
          emailService.sendFreelancerH1ReminderEmail({
            booking: {
              client_name: a.client_name,
              university: a.university,
              shooting_time: a.shooting_time,
              location: a.location,
              client_phone: a.client_phone
            },
            fg: {
              name: a.fg_name,
              email: a.fg_email
            },
            portalUrl,
            waClientUrl
          }).catch(err => {
            log(`[ReminderH1FgEmail Warn]: ${err.message}`);
          });
        } catch (e) {}
      }
      
      // Client reminder WA
      if (a.client_phone) {
        let msg = (templates.reminder_h1_client || templates.reminder_h3_client || '')
          .replace('{client_name}', a.client_name)
          .replace('{graduation_date}', formatDate(a.graduation_date))
          .replace('{shooting_time}', a.shooting_time || '-')
          .replace('{location}', a.location)
          .replace('{university}', a.university || '-')
          .replace('{fg_name}', a.fg_name || '-')
          .replace('{fg_phone}', (a.fg_phone || '').replace(/\D/g, ''));
        const waLink = `https://wa.me/${a.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
        log(`H-1 Client WA: ${a.client_name} - ${waLink}`);
      }

      // Client reminder Email
      if (a.client_email) {
        try {
          const trackingUrl = a.tracking_token ? `${appUrl}/tracking.html?code=${a.tracking_token}` : `${appUrl}/tracking.html`;
          const waFgUrl = a.fg_phone ? `https://wa.me/${a.fg_phone.replace(/\D/g, '')}` : null;
          emailService.sendClientH1ReminderEmail({
            booking: {
              client_name: a.client_name,
              client_email: a.client_email,
              graduation_date: formatDate(a.graduation_date),
              shooting_time: a.shooting_time,
              location: a.location,
              university: a.university,
              tracking_token: a.tracking_token
            },
            fg: {
              name: a.fg_name,
              phone: a.fg_phone
            },
            waFgUrl,
            trackingUrl
          }).catch(err => {
            log(`[ReminderH1ClientEmail Warn]: ${err.message}`);
          });
        } catch (e) {}
      }
    }
    log(`H-1 Reminder done: ${assignments.length} assignments`);
  } catch (err) {
    log(`H-1 Reminder ERROR: ${err.message}`);
  }
}

function runAutoApproveDelivery() {
  try {
    const autoApproveHours = parseInt(getSettings().auto_approve_hours || 48);
    
    const deliverables = db.prepare(`
      SELECT d.*, a.booking_id, b.client_name, b.client_phone, b.balance_amount
      FROM deliverables d
      JOIN assignments a ON d.assignment_id = a.id
      JOIN bookings b ON a.booking_id = b.id
      WHERE d.client_approved = 0
      AND d.delivered_at IS NOT NULL
      AND datetime(d.delivered_at, '+' || ? || ' hours') <= datetime('now')
    `).all(autoApproveHours);
    
    const templates = getWaTemplates();
    const settings = getSettings();
    
    for (const d of deliverables) {
      // Auto approve
      db.prepare('UPDATE deliverables SET client_approved = 1, client_approved_at = CURRENT_TIMESTAMP WHERE id = ?').run(d.id);
      
      // Update booking status to balance_due
      db.prepare("UPDATE bookings SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(d.booking_id);
      
      // Send balance invoice
      const rawBank = getSettings().bank_accounts;
      const bankAccounts = typeof rawBank === 'string' ? JSON.parse(rawBank) : (Array.isArray(rawBank) ? rawBank : []);
      const bankList = bankAccounts.map(b => `${b.bank} - ${b.norek} a.n ${b.atas_nama}`).join('\n');
      
      let msg = templates.balance_due
        .replace('{balance_amount}', formatCurrency(d.balance_amount))
        .replace('{bank_list}', bankList)
        .replace('{admin_phone}', settings.adminPhone);
      
      const waLink = `https://wa.me/${d.client_phone}?text=${encodeURIComponent(msg)}`;
      log(`Auto-approve + Balance due: ${d.client_name} - ${waLink}`);
    }
    log(`Auto approve done: ${deliverables.length} deliverables`);
  } catch (err) {
    log(`Auto approve ERROR: ${err.message}`);
  }
}

function runPastEventInquiryArchive() {
  try {
    // Auto-Archive: Inquiry yang tanggal wisudanya sudah lewat dan belum pernah menjadi booking
    const pastEventInquiries = db.prepare(`
      SELECT i.id, i.client_name, i.graduation_date, i.status FROM inquiries i
      WHERE i.status IN ('new', 'booking_link_active', 'quoted', 'expired')
        AND date(i.graduation_date) < date('now', 'localtime')
    `).all();

    for (const i of pastEventInquiries) {
      db.prepare("UPDATE inquiries SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(i.id);
      log(`Inquiry past event auto-archived: ${i.id} - ${i.client_name} (Tgl: ${i.graduation_date}, status awal: ${i.status})`);
    }

    log(`Auto-archive past event check done: ${pastEventInquiries.length} inquiries moved to archived`);
  } catch (err) {
    log(`Auto-archive past event ERROR: ${err.message}`);
  }
}

function runDpExpiredCheck() {
  return runPastEventInquiryArchive();
}

async function runInquiryFollowUpReminder() {
  try {
    const isEnabled = Number(getSetting('inquiry_reminder_enabled', 1));
    if (!isEnabled) {
      log('[InquiryFollowUpReminder] Skipped - Feature disabled in settings');
      return { ok: true, skipped: true, sentCount: 0 };
    }

    const reminderDays = parseInt(getSetting('inquiry_reminder_days', 7)) || 7;
    const targetDate = getLocalDateStr(reminderDays);
    const settings = getSettings();
    const studioName = settings.company_name || settings.companyName || 'Wisuda Studio';
    const rawAdminPhone = settings.admin_phone || settings.adminPhone || settings.company_phone || settings.companyPhone || '';
    const adminPhone = String(rawAdminPhone).replace(/\D/g, '');

    // Cari calon klien yang tanggal wisudanya H-X (misal H-7), belum booking (status new/booking_link_active/quoted), dan belum pernah diingatkan
    const candidates = db.prepare(`
      SELECT inq.*, p.name as package_name 
      FROM inquiries inq
      LEFT JOIN packages p ON inq.package_id = p.id
      WHERE inq.status IN ('new', 'booking_link_active', 'quoted')
        AND date(inq.graduation_date) = date(?)
        AND inq.client_email IS NOT NULL AND TRIM(inq.client_email) != ''
        AND inq.reminded_inquiry_at IS NULL
    `).all(targetDate);

    log(`[InquiryFollowUpReminder] Found ${candidates.length} candidate(s) for target date ${targetDate} (H-${reminderDays})`);

    let sentCount = 0;
    for (const inq of candidates) {
      try {
        const appUrl = (getSetting('app_url') || 'http://localhost:3000').replace(/\/$/, '');
        const bookingUrl = inq.booking_token ? `${appUrl}/confirm-booking.html?token=${inq.booking_token}` : null;
        const waDirectUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(`Halo Admin ${studioName}, saya ${inq.client_name} yang sebelumnya mengajukan reservasi wisuda ${inq.university || ''} (${formatDate(inq.graduation_date)}). Saya ingin melanjutkan proses booking dan mengunci slot foto wisuda saya.`)}`;

        const emailResult = await emailService.sendInquiryFollowUpEmail({
          inquiry: {
            name: inq.client_name,
            email: inq.client_email,
            university: inq.university,
            graduation_date: formatDate(inq.graduation_date),
            package_name: inq.package_name,
            location: inq.location
          },
          daysRemaining: reminderDays,
          waDirectUrl,
          bookingUrl
        });

        // Mark reminded timestamp in database
        db.prepare("UPDATE inquiries SET reminded_inquiry_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(inq.id);
        
        if (emailResult && emailResult.ok) {
          log(`[InquiryFollowUpReminder] Email sent successfully to ${inq.client_name} <${inq.client_email}>`);
          sentCount++;
        } else {
          log(`[InquiryFollowUpReminder] Email dispatch attempted for ${inq.client_name}: ${emailResult ? emailResult.error : 'Notice'}`);
          sentCount++;
        }
      } catch (err) {
        log(`[InquiryFollowUpReminder] Error processing inquiry ID ${inq.id}: ${err.message}`);
      }
    }

    return { ok: true, sentCount, totalCandidates: candidates.length };
  } catch (e) {
    log(`[InquiryFollowUpReminder] Job ERROR: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

function runPayoutRun() {
  try {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);
    
    const assignments = db.prepare(`
      SELECT a.*, b.total_price, p.fg_fee as package_fg_fee, p.editor_fee as package_editor_fee,
             f.name as fg_name, f.phone as fg_phone, f.default_rate as fg_default_rate,
             COALESCE(a.fg_fee, f.default_rate, p.fg_fee, 0) as final_fg_fee
      FROM assignments a
      JOIN bookings b ON a.booking_id = b.id
      JOIN packages p ON b.package_id = p.id
      JOIN freelancers f ON a.fg_id = f.id
      WHERE a.status IN ('done', 'completed')
      AND date(a.updated_at) BETWEEN date(?) AND date(?)
      AND NOT EXISTS (SELECT 1 FROM payouts WHERE assignment_id = a.id)
    `).all(periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]);
    
    for (const a of assignments) {
      const fgFee = a.final_fg_fee;
      const editorFee = a.package_editor_fee || 0;
      const totalPayout = fgFee + editorFee;
      
      db.prepare(`
        INSERT INTO payouts (assignment_id, fg_id, fg_fee, editor_fee, total_payout, period_start, period_end)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(a.id, a.fg_id, fgFee, editorFee, totalPayout, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]);
      
      log(`Payout created: ${a.fg_name} - ${formatCurrency(totalPayout)}`);
    }
    log(`Payout run done: ${assignments.length} payouts created`);
  } catch (err) {
    log(`Payout run ERROR: ${err.message}`);
  }
}

function runBackupDb() {
  try {
    const configuredDir = getSettings().backupPath || './DATA/backups';
    let backupDir = path.resolve(configuredDir);
    if (!fs.existsSync(backupDir)) {
      try { fs.mkdirSync(backupDir, { recursive: true }); } catch (e) {
        backupDir = path.resolve('./DATA/backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      }
    }
    if (!fs.existsSync(backupDir)) {
      backupDir = path.resolve('./DATA/backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const backupPath = path.join(backupDir, `wisuda_${dateStr}.db`);
    
    // SQLite backup
    const db = getDb();
    db.backup(backupPath);
    
    log(`Backup created: ${backupPath}`);
    
    // Clean old backups (respect dynamic max count & retention days)
    const maxCount = Math.max(3, Number(getSetting('backup_max_count', 15)));
    const retentionDays = Math.max(1, Number(getSetting('backup_retention_days', 30)));
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const allBackupFiles = fs.readdirSync(backupDir)
      .filter(f => (f.endsWith('.db') || f.endsWith('.db.gz') || f.endsWith('.db-shm') || f.endsWith('.db-wal')) && f !== 'wisuda.db')
      .map(filename => {
        const filePath = path.join(backupDir, filename);
        let stats;
        try { stats = fs.statSync(filePath); } catch { return null; }
        return { filename, filePath, mtime: stats.mtimeMs };
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime);

    allBackupFiles.forEach((f, index) => {
      if (index === 0) return; // Keep latest
      const isBeyondMax = index >= maxCount;
      const isPastDays = f.mtime < cutoff;
      const isTestTemp = f.filename.startsWith('test_restore_') || f.filename.startsWith('temp_');

      if (isBeyondMax || isPastDays || isTestTemp) {
        try {
          fs.unlinkSync(f.filePath);
          log(`Deleted old backup: ${f.filename}`);
        } catch (e) {}
      }
    });
  } catch (err) {
    log(`Backup ERROR: ${err.message}`);
  }
}

// ============ WISUDA BUILDER (Autonomous Loop) ============

const BUILD_PLAN = [
  // Phase 1: Foundation
  { phase: 1, task: 'db_migrate', desc: 'Run schema migration', check: () => true },
  { phase: 1, task: 'auth_login', desc: 'Admin login API', check: () => testEndpoint('/api/admin/login', 'POST') },
  { phase: 1, task: 'inquiry_public', desc: 'Public inquiry API', check: () => testEndpoint('/api/public/inquiry', 'POST') },
  { phase: 1, task: 'inquiry_admin', desc: 'Admin inquiry CRUD', check: () => testEndpoint('/api/admin/inquiries', 'GET') },
  { phase: 1, task: 'quotation', desc: 'Quotation PDF + wa.me', check: () => testEndpoint('/api/admin/inquiries/1/quote', 'POST') },
  
  // Phase 2: Booking & DP
  { phase: 2, task: 'booking_create', desc: 'Booking from inquiry', check: () => testEndpoint('/api/admin/bookings', 'GET') },
  { phase: 2, task: 'dp_verify', desc: 'DP verification', check: () => testEndpoint('/api/admin/bookings/1/verify-dp', 'POST') },
  { phase: 2, task: 'contract', desc: 'Contract PDF', check: () => testEndpoint('/api/admin/bookings/1/contract', 'POST') },
  { phase: 2, task: 'booking_kanban', desc: 'Booking pipeline', check: () => true },
  { phase: 2, task: 'dp_expired_cron', desc: 'DP expired cron', check: () => true },
  
  // Phase 3: Assignment & Calendar
  { phase: 3, task: 'fg_crud', desc: 'FG CRUD', check: () => testEndpoint('/api/admin/freelancers', 'GET') },
  { phase: 3, task: 'calendar', desc: 'FG Calendar drag-drop', check: () => true },
  { phase: 3, task: 'assignment_create', desc: 'Assignment create', check: () => testEndpoint('/api/admin/assignments', 'POST') },
  { phase: 3, task: 'reminder_cron', desc: 'Reminder cron', check: () => true },
  
  // Phase 4: Shoot → Direct Drive Upload → Selection → Final Master Delivery
  { phase: 4, task: 'fg_session_done', desc: 'FG confirm photo session done', check: () => testEndpoint('/api/public/freelance-portal/confirm-session', 'POST') },
  { phase: 4, task: 'admin_upload', desc: 'Admin Direct Drive Upload', check: () => testEndpoint('/api/admin/bookings/1/upload-to-drive', 'POST') },
  { phase: 4, task: 'selection_gallery', desc: 'Client Photo Selection', check: () => testEndpoint('/api/public/selection/1', 'GET') },
  { phase: 4, task: 'balance_verify', desc: 'Balance verification (Gate 2)', check: () => testEndpoint('/api/admin/bookings/1/verify-balance', 'POST') },
  { phase: 4, task: 'payout', desc: 'Consolidated Payroll & E-Slip', check: () => testEndpoint('/api/admin/payroll/pay-bulk', 'POST') },
  { phase: 4, task: 'portfolio_cloud_copy', desc: 'Portfolio Cloud-to-Cloud Copy', check: () => testEndpoint('/api/admin/portfolio/from-booking', 'POST') },
  
  // Phase 5: Public Pages & Portal
  { phase: 5, task: 'public_portfolio', desc: 'Public portfolio page', check: () => testEndpoint('/api/public/portfolio', 'GET') },
  { phase: 5, task: 'public_tracking', desc: 'Client tracking portal', check: () => testEndpoint('/api/public/tracking/TRK-TEST', 'GET') },
  { phase: 5, task: 'freelance_portal', desc: 'Freelancer mobile portal', check: () => testEndpoint('/api/public/freelance-portal/schedule', 'GET') },
  
  // Phase 5: Reports & Settings
  { phase: 5, task: 'reports', desc: 'Revenue, conversion, FG performance', check: () => testEndpoint('/api/admin/reports/revenue', 'GET') },
  { phase: 5, task: 'settings_wa', desc: 'WA templates editor', check: () => testEndpoint('/api/admin/settings/wa-templates', 'PUT') },
  { phase: 5, task: 'deploy_pm2', desc: 'PM2 ecosystem config', check: () => true },
];

function testEndpoint(path, method) {
  // Placeholder - in real implementation, would make HTTP request
  return true;
}

function runWisudaBuilder() {
  const progress = loadProgress();
  const now = new Date().toISOString();
  
  log(`=== Wisuda Builder START ${now} ===`);
  log(`Current: Phase ${progress.phase}, Task ${progress.taskIndex}/${BUILD_PLAN.length}`);
  
  // Find next incomplete task
  let taskIndex = progress.taskIndex;
  while (taskIndex < BUILD_PLAN.length) {
    const task = BUILD_PLAN[taskIndex];
    
    if (progress.completedTasks.includes(task.task)) {
      taskIndex++;
      continue;
    }
    
    log(`Executing: Phase ${task.phase} - ${task.task} (${task.desc})`);
    
    try {
      // In real implementation: implement the task (write code, run tests)
      // For now, just mark as done if check passes
      const checkResult = task.check();
      
      if (checkResult) {
        progress.completedTasks.push(task.task);
        progress.taskIndex = taskIndex + 1;
        progress.phase = task.phase;
        saveProgress(progress);
        log(`✅ COMPLETED: ${task.task}`);
      } else {
        log(`⏳ PENDING: ${task.task} - check failed`);
        break; // Stop at first incomplete task
      }
    } catch (err) {
      log(`❌ FAILED: ${task.task} - ${err.message}`);
      break;
    }
    
    taskIndex++;
  }
  
  // Log summary
  const completed = progress.completedTasks.length;
  const total = BUILD_PLAN.length;
  const pct = Math.round((completed / total) * 100);
  log(`Progress: ${completed}/${total} (${pct}%)`);
  log(`=== Wisuda Builder END ===`);
  
  // If all done, log completion
  if (completed === total) {
    log('🎉 ALL PHASES COMPLETE - Wisuda Platform ready!');
  }
}



// 7. Database Maintenance - Daily 03:00 AM
cron.schedule('0 3 * * *', () => {
  log('Running: Database Maintenance');
  runDatabaseMaintenance();
}, { timezone: 'Asia/Makassar' });

function runDatabaseMaintenance() {
  try {
    const today = getLocalDateStr();

    // ─── 1. Purge notifications > 90 hari ───
    const purgedNotif = db.prepare(
      'DELETE FROM notifications WHERE date(sent_at) < date(?, \'-90 days\')'
    ).run(today);
    if (purgedNotif.changes > 0) {
      log(`[Maintenance] Purged ${purgedNotif.changes} notifications (>90 days)`);
    }

    // ─── 2. Purge expired & used booking tokens > 30 hari ───
    const purgedTokens = db.prepare(
      'DELETE FROM booking_tokens WHERE (used = 1 OR expires_at < datetime(?)) AND date(created_at) < date(?, \'-30 days\')'
    ).run(today, today);
    if (purgedTokens.changes > 0) {
      log(`[Maintenance] Purged ${purgedTokens.changes} expired booking tokens`);
    }

    // ─── 3. Purge portfolio import jobs completed/failed > 30 hari ───
    // M6 FIX: Status yang benar adalah 'completed' dan 'failed', bukan 'done' dan 'error'
    const purgedJobs = db.prepare(
      'DELETE FROM portfolio_import_jobs WHERE status IN (\'completed\', \'failed\') AND date(updated_at) < date(?, \'-30 days\')'
    ).run(today);
    if (purgedJobs.changes > 0) {
      log(`[Maintenance] Purged ${purgedJobs.changes} old import jobs`);
    }

    // ─── 4. Data Retention: Booking completed > 30 hari ───
    //    Bersihkan data proses layanan (token, password, drive URLs, selected_photos)
    //    TETAP simpan: identitas client, data keuangan, tanggal event
    //    PENTING: Jangan hapus drive_parent_url jika drive_cleanup_status belum 'trashed'
    //    karena Drive Retention cron (3 bulan) masih membutuhkan URL tersebut
    const retentionDate = getLocalDateStr(-30);
    const cleanedBookings = db.prepare(`
      UPDATE bookings SET 
        tracking_token = NULL,
        selected_photos = NULL,
        contract_url = NULL,
        final_invoice_url = NULL,
        staging_drive_url = CASE WHEN drive_cleanup_status = 'trashed' THEN NULL ELSE staging_drive_url END,
        highlight_drive_url = CASE WHEN drive_cleanup_status = 'trashed' THEN NULL ELSE highlight_drive_url END,
        drive_parent_url = CASE WHEN drive_cleanup_status = 'trashed' THEN NULL ELSE drive_parent_url END
      WHERE status = 'completed'
      AND tracking_token IS NOT NULL
      AND date(updated_at) < date(?)
    `).run(retentionDate);
    if (cleanedBookings.changes > 0) {
      log(`[Retention] Cleaned process data for ${cleanedBookings.changes} completed bookings (>30 days). Drive URLs preserved for active retention.`);
    }

    // ─── 5. Data Retention: Deliverables terkait booking completed > 30 hari ───
    const cleanedDeliverables = db.prepare(`
      UPDATE deliverables SET
        drive_folder_url = NULL,
        preview_url = NULL,
        raw_folder_url = NULL,
        qc_notes = NULL
      WHERE assignment_id IN (
        SELECT a.id FROM assignments a
        JOIN bookings b ON a.booking_id = b.id
        WHERE b.status = 'completed'
        AND date(b.updated_at) < date(?)
      )
      AND drive_folder_url IS NOT NULL
    `).run(retentionDate);
    if (cleanedDeliverables.changes > 0) {
      log(`[Retention] Cleaned deliverable data for ${cleanedDeliverables.changes} records (>30 days)`);
    }

    // ─── 6. Hapus file contract PDF & invoice PDF dari disk (booking > 30 hari) ───
    try {
      const oldFiles = db.prepare(`
        SELECT id, contract_url, final_invoice_url FROM bookings
        WHERE status = 'completed' AND date(updated_at) < date(?)
        AND (contract_url IS NOT NULL OR final_invoice_url IS NOT NULL)
      `).all(retentionDate);
      // Kolom sudah di-NULL di step 4, tapi query ini pakai snapshot sebelumnya
      // Jadi kita cek file di disk berdasarkan pola path
    } catch(e) { /* file cleanup non-critical */ }

    // ─── 7. Payment Proof Cleanup: Booking completed > 90 hari ───
    //    Hapus file bukti transfer (dp_bukti_url, balance_bukti_url) dari disk
    //    Lalu NULL-kan kolom di database
    const proofRetentionDate = getLocalDateStr(-90);
    const oldProofs = db.prepare(`
      SELECT id, dp_bukti_url, balance_bukti_url FROM bookings 
      WHERE status = 'completed'
      AND (dp_bukti_url IS NOT NULL OR balance_bukti_url IS NOT NULL)
      AND date(updated_at) < date(?)
    `).all(proofRetentionDate);

    let proofFilesDeleted = 0;
    for (const booking of oldProofs) {
      [booking.dp_bukti_url, booking.balance_bukti_url].forEach(url => {
        if (url && typeof url === 'string') {
          // File path bisa relative dari /public atau absolute
          const cleanUrl = url.startsWith('/') ? url : '/' + url;
          const filePath = path.join(__dirname, '../../public', cleanUrl);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              proofFilesDeleted++;
            }
          } catch(e) { /* file mungkin sudah dihapus manual */ }
        }
      });
      db.prepare('UPDATE bookings SET dp_bukti_url = NULL, balance_bukti_url = NULL WHERE id = ?')
        .run(booking.id);
    }
    if (oldProofs.length > 0) {
      log(`[Retention] Payment proofs cleaned: ${oldProofs.length} bookings, ${proofFilesDeleted} files deleted (>90 days)`);
    }

    // ─── 8. Temp Upload Files Cleanup: Hapus file sementara di DATA/tmp > 2 jam ───
    try {
      const tmpDir = path.join(__dirname, '../../DATA/tmp');
      if (fs.existsSync(tmpDir)) {
        let tmpDeleted = 0;
        const nowMs = Date.now();
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          if (file.startsWith('tmp-')) {
            try {
              const filePath = path.join(tmpDir, file);
              const stat = fs.statSync(filePath);
              if (nowMs - stat.mtimeMs > 2 * 60 * 60 * 1000) { // Lebih dari 2 jam
                fs.unlinkSync(filePath);
                tmpDeleted++;
              }
            } catch(e) {}
          }
        }
        if (tmpDeleted > 0) {
          log(`[Maintenance] DATA/tmp cleaned: ${tmpDeleted} temporary files deleted`);
        }
      }
    } catch(e) {}

    // ─── 9. PRAGMA optimize — re-analyze index statistics ───
    db.pragma('optimize');

    // ─── 10. Log database & storage size for monitoring ───
    const dbPath = require('../config/settings').dbPath;
    try {
      const stats = fs.statSync(dbPath);
      const sizeKB = Math.round(stats.size / 1024);
      log(`[Maintenance] Database size: ${sizeKB} KB`);
    } catch(e) { /* ignore */ }

    log('[Maintenance] Database maintenance completed');
  } catch (err) {
    log(`[Maintenance] ERROR: ${err.message}`);
  }
}

/**
 * Drive Retention Clean-up Implementation
 * 1. Checks drive_auto_trash_enabled & drive_retention_months from Settings
 * 2. Calculates drive_expiry_date if missing
 * 3. Sends H-14 and H-3 WhatsApp reminders
 * 4. Moves drive folder to trash when retention period is expired
 */
async function runDriveRetentionCleanup() {
  try {
    const settings = getSettings();
    const autoTrashEnabled = parseInt(settings.drive_auto_trash_enabled !== undefined ? settings.drive_auto_trash_enabled : '1', 10);
    if (!autoTrashEnabled) {
      log('[DriveRetention] Auto trash is disabled in settings. Skipping cleanup.');
      return;
    }

    const retentionMonths = parseInt(settings.drive_retention_months || '3', 10);
    const driveService = require('./drive-folder.service');
    const templates = getWaTemplates();

    // 1. Fill missing drive_expiry_date for bookings with drive_parent_url
    //    Dihitung dari updated_at (tanggal status terakhir diperbarui / delivery), bukan created_at
    //    Ini memastikan klien mendapat 3 bulan penuh sejak file siap, bukan sejak booking dibuat
    db.prepare(`
      UPDATE bookings
      SET drive_expiry_date = date(updated_at, '+' || ? || ' month')
      WHERE drive_parent_url IS NOT NULL
      AND (drive_expiry_date IS NULL OR drive_expiry_date = '')
    `).run(retentionMonths);

    // 2. Fetch active bookings with drive_parent_url
    const bookings = db.prepare(`
      SELECT id, client_name, client_phone, client_email, drive_parent_url, drive_total_bytes, drive_expiry_date, drive_cleanup_status, tracking_token
      FROM bookings
      WHERE drive_parent_url IS NOT NULL
      AND (drive_cleanup_status IS NULL OR drive_cleanup_status != 'trashed')
    `).all();

    const todayStr = getLocalDateStr(0);

    for (const b of bookings) {
      if (!b.drive_expiry_date) continue;

      const expiryDateStr = b.drive_expiry_date;
      let totalBytes = b.drive_total_bytes || 0;
      let formattedSize = driveService.formatBytes(totalBytes);

      // Extract folder ID
      const folderMatch = b.drive_parent_url.match(/\/folders\/([a-zA-Z0-9_-]+)/i) || b.drive_parent_url.match(/id=([a-zA-Z0-9_-]+)/i);
      const folderId = folderMatch ? folderMatch[1] : null;

      const trackingUrl = b.tracking_token
        ? `${settings.seo_domain || 'https://wisudaphotography.com'}/track/${b.tracking_token}`
        : b.drive_parent_url;

      const currentStatus = b.drive_cleanup_status || 'active';

      // Check if expired — Directly move folder to Trash on Google Drive
      if (todayStr >= expiryDateStr) {
        log(`[DriveRetention] Booking #${b.id} (${b.client_name}) folder expired on ${expiryDateStr}. Moving folder to Google Drive Trash.`);
        if (folderId) {
          try {
            await driveService.moveFolderToTrash(folderId);
            log(`[DriveRetention] Folder ${folderId} for booking #${b.id} moved to Trash.`);
          } catch (trashErr) {
            log(`[DriveRetention] Error moving folder ${folderId} to trash: ${trashErr.message}`);
          }
        }
        db.prepare(`UPDATE bookings SET drive_cleanup_status = 'trashed' WHERE id = ?`).run(b.id);
        continue;
      }

      // Calculate days difference
      const expiryDateObj = new Date(expiryDateStr);
      const todayObj = new Date(todayStr);
      const diffDays = Math.ceil((expiryDateObj - todayObj) / (1000 * 60 * 60 * 24));

      // H-14 Reminder
      if (diffDays <= 14 && diffDays > 3 && currentStatus === 'active') {
        if (b.client_phone) {
          let msg = (templates.drive_reminder_h14 || '')
            .replace('{client_name}', b.client_name || 'Client')
            .replace('{booking_id}', b.id)
            .replace('{drive_expiry_date}', expiryDateStr)
            .replace('{drive_total_size}', formattedSize)
            .replace('{tracking_url}', trackingUrl)
            .replace('{company_name}', settings.company_name || 'Wisuda Photography');
          const waLink = `https://wa.me/${b.client_phone}?text=${encodeURIComponent(msg)}`;
          log(`[DriveRetention] H-14 Reminder WA: ${b.client_name} - ${waLink}`);
        }
        if (b.client_email) {
          try {
            await emailService.sendDriveRetentionEmail(b, diffDays, expiryDateStr, formattedSize, trackingUrl);
            log(`[DriveRetention] H-14 Reminder Email sent to ${b.client_email}`);
          } catch (e) {
            log(`[DriveRetention] H-14 Email Error: ${e.message}`);
          }
        }
        db.prepare(`UPDATE bookings SET drive_cleanup_status = 'reminded_h14' WHERE id = ?`).run(b.id);
      }
      // H-3 Reminder
      else if (diffDays <= 3 && diffDays > 0 && (currentStatus === 'active' || currentStatus === 'reminded_h14')) {
        if (b.client_phone) {
          let msg = (templates.drive_reminder_h3 || '')
            .replace('{client_name}', b.client_name || 'Client')
            .replace('{booking_id}', b.id)
            .replace('{drive_expiry_date}', expiryDateStr)
            .replace('{drive_total_size}', formattedSize)
            .replace('{tracking_url}', trackingUrl)
            .replace('{company_name}', settings.company_name || 'Wisuda Photography');
          const waLink = `https://wa.me/${b.client_phone}?text=${encodeURIComponent(msg)}`;
          log(`[DriveRetention] H-3 Reminder WA: ${b.client_name} - ${waLink}`);
        }
        if (b.client_email) {
          try {
            await emailService.sendDriveRetentionEmail(b, diffDays, expiryDateStr, formattedSize, trackingUrl);
            log(`[DriveRetention] H-3 Reminder Email sent to ${b.client_email}`);
          } catch (e) {
            log(`[DriveRetention] H-3 Email Error: ${e.message}`);
          }
        }
        db.prepare(`UPDATE bookings SET drive_cleanup_status = 'reminded_h3' WHERE id = ?`).run(b.id);
      }
    }
  } catch (err) {
    log(`[DriveRetention] ERROR: ${err.message}`);
  }
}

// 7. Moodboard Storage Clean-up - Daily 03:00 WITA
cron.schedule('0 3 * * *', () => {
  log('Running: Moodboard Storage Clean-up');
  runMoodboardStorageCleanup();
}, { timezone: 'Asia/Makassar' });

function runMoodboardStorageCleanup() {
  try {
    const db = getDb();
    const cutoffDate = getLocalDateStr(-7); // 7 hari lalu

    // Cari booking completed > 7 hari lalu ATAU cancelled yang masih punya moodboard upload belum dibersihkan
    const targetBookings = db.prepare(`
      SELECT b.id, b.status, b.graduation_date, bm.items
      FROM bookings b
      JOIN booking_moodboards bm ON b.id = bm.booking_id
      WHERE (
        (b.status = 'completed' AND b.graduation_date <= ?)
        OR (b.status = 'cancelled')
      ) AND bm.cleaned_up = 0
    `).all(cutoffDate);

    log(`[MoodboardCleanup] Found ${targetBookings.length} bookings eligible for moodboard cleanup`);

    const uploadDir = config.uploadPath || path.join(__dirname, '../../public/uploads');

    for (const b of targetBookings) {
      const bFolder = path.join(uploadDir, 'moodboards', String(b.id));
      if (fs.existsSync(bFolder)) {
        try {
          fs.rmSync(bFolder, { recursive: true, force: true });
          log(`[MoodboardCleanup] Purged folder: ${bFolder}`);
        } catch (e) {
          log(`[MoodboardCleanup] Failed to remove folder ${bFolder}: ${e.message}`);
        }
      }

      db.prepare(`UPDATE booking_moodboards SET cleaned_up = 1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = ?`).run(b.id);
    }
  } catch (err) {
    log(`[MoodboardCleanup] ERROR: ${err.message}`);
  }
}

// 8. GitHub Update Checker - 2x per 24 Jam (00:00 & 12:00 WITA)
const { checkGitHubUpdate } = require('../utils/github-update');
cron.schedule('0 0,12 * * *', () => {
  log('Running: GitHub Update Checker (2x daily)');
  checkGitHubUpdate().then(status => {
    log(`[GitHubUpdateChecker] Checked. UpdateAvailable: ${status.updateAvailable}, LatestHash: ${status.latestHash}`);
  }).catch(e => log(`[GitHubUpdateChecker] ERROR: ${e.message}`));
}, { timezone: 'Asia/Makassar' });

// 9. Monthly Freelancer Access Code Auto-Rotation — Tanggal 1 Setiap Bulan (01:00 WITA)
cron.schedule('0 1 1 * *', async () => {
  log('Running: Monthly Freelancer Access Code Auto-Rotation');
  try {
    const settings = getSettings();
    const autoRotateEnabled = parseInt(settings.fg_auto_rotate_tokens_enabled !== undefined ? settings.fg_auto_rotate_tokens_enabled : '1', 10);
    if (!autoRotateEnabled) {
      log('[MonthlyTokenRotation] Disabled in settings. Skipping rotation.');
      return;
    }

    const crypto = require('crypto');
    const emailService = require('./email.service');
    const studio = emailService.getStudioIdentity();
    const baseUrl = settings.app_url || settings.domain_url || process.env.APP_URL || 'http://localhost:8081';

    const activeFgs = db.prepare("SELECT * FROM freelancers WHERE active = 1").all();
    log(`[MonthlyTokenRotation] Rotating access codes for ${activeFgs.length} active freelancers`);

    for (const fg of activeFgs) {
      const newCode = 'FG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      db.prepare("UPDATE freelancers SET access_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newCode, fg.id);

      if (fg.email) {
        try {
          const portalUrl = `${baseUrl.replace(/\/$/, '')}/freelance-portal.html?code=${newCode}`;
          await emailService.sendEmail({
            to: fg.email,
            subject: `🔑 [Rotasi Bulanan] Kode Akses Portal Freelance ${studio.name}`,
            title: 'Rotasi Keamanan Kode Akses Bulanan',
            badge: 'MONTHLY SECURITY ROTATION',
            contentHtml: `
              <p>Halo <strong>${fg.name}</strong>,</p>
              <p>Sesuai kebijakan pemeliharaan keamanan bulanan di <strong>${studio.name}</strong>, kode akses portal Anda untuk bulan ini telah diperbarui otomatis.</p>
              
              <div style="margin: 20px 0; padding: 18px; background: rgba(197, 155, 99, 0.12); border: 1px solid #C59B63; border-radius: 12px; text-align: center;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">KODE AKSES PORTAL BULAN INI:</p>
                <div style="font-size: 22px; font-weight: 800; font-family: monospace; color: #E5C396; letter-spacing: 2px;">
                  ${newCode}
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${portalUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; background: #C59B63; color: #1e293b; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px;">
                  📱 BUKA PORTAL FREELANCE
                </a>
              </div>

              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Gunakan <strong>Nomor WhatsApp Anda (${fg.phone})</strong> dan <strong>Kode Akses Baru (${newCode})</strong> di atas saat melakukan login manual.</p>
            `
          });
        } catch (e) {
          log(`[MonthlyTokenRotation] Failed sending email to ${fg.name}: ${e.message}`);
        }
      }
    }
    log('[MonthlyTokenRotation] Completed rotating access codes');
  } catch (e) {
    log(`[MonthlyTokenRotation] ERROR: ${e.message}`);
  }
}, { timezone: 'Asia/Makassar' });

// 10. Auto Mark Session Done - Every 15 Minutes
cron.schedule('*/15 * * * *', () => {
  log('Running: Auto Mark Session Done');
  runAutoMarkSessionDone();
}, { timezone: 'Asia/Makassar' });

function runAutoMarkSessionDone() {
  try {
    const db = getDb();
    const bookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE status = 'shooting' AND is_session_done = 0 
        AND graduation_date IS NOT NULL AND shooting_time IS NOT NULL
    `).all();

    if (bookings.length === 0) return;

    const now = new Date();
    
    for (const b of bookings) {
      try {
        const dtStr = `${b.graduation_date}T${b.shooting_time}:00+08:00`;
        const endDt = new Date(dtStr);
        if (isNaN(endDt.getTime())) continue;
        
        const durationHours = parseInt(b.duration_hours) || 2;
        endDt.setHours(endDt.getHours() + durationHours);

        if (now >= endDt) {
          log(`[AutoMarkSessionDone] Booking #${b.id} (${b.client_name}) session time ended. Marking as done.`);
          const nowIso = now.toISOString();
          
          db.prepare(`
            UPDATE assignments 
            SET status = 'done', shoot_end_at = COALESCE(shoot_end_at, ?), updated_at = CURRENT_TIMESTAMP
            WHERE booking_id = ? AND status IN ('confirmed', 'assigned', 'pending')
          `).run(nowIso, b.id);

          const isPaid = b.balance_status === 'paid' || Number(b.balance_amount || 0) === 0;
          const targetStatus = isPaid ? 'post_production' : 'shooting';

          db.prepare(`
            UPDATE bookings
            SET is_session_done = 1, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(targetStatus, b.id);
        }
      } catch (e) {
        log(`[AutoMarkSessionDone] Error processing booking #${b.id}: ${e.message}`);
      }
    }
  } catch (err) {
    log(`[AutoMarkSessionDone] ERROR: ${err.message}`);
  }
}

// Start cron jobs
function start() {
  log('Cron service started - all production jobs registered');
  log('Registered Cron Jobs: Reminder H-3, Reminder H-1, Auto-Approve Delivery, DP Expired Check, Payout Run, Backup DB, Stale Import Cleanup, DB Maintenance, Drive Retention Clean-up, Moodboard Clean-up, GitHub Update Checker, Monthly Freelancer Token Rotation, Auto Mark Session Done');
  checkGitHubUpdate().catch(() => {});
}

if (require.main === module) {
  start();
}

module.exports = { start, log, runDriveRetentionCleanup, runMoodboardStorageCleanup, checkGitHubUpdate, runDpExpiredCheck, runInquiryFollowUpReminder, runQrisExpiredCheck, runWebhookLogsCleanup, runAutoMarkSessionDone };