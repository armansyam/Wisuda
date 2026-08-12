/**
 * booking.service.js
 * Service layer untuk state machine Booking & Audit Logging.
 * Sesuai MASTER_FLOW.md: Gate 1 (verify-dp), Gate 2 (verify-balance), state transitions.
 */

'use strict';

// ─── STATE MACHINE GATES ──────────────────────────────────────────────────────

/**
 * Cek apakah booking bisa lulus Gate 1 (DP Verified → Confirmed)
 * @param {object} booking - Row dari tabel bookings
 */
function canPassGate1(booking) {
  if (!booking) return { ok: false, reason: 'Booking tidak ditemukan' };
  if (booking.dp_status === 'paid') return { ok: false, reason: 'Gate 1 sudah dilalui sebelumnya' };
  if (booking.dp_status !== 'uploaded') return { ok: false, reason: 'Bukti DP belum diunggah oleh client' };
  return { ok: true };
}

/**
 * Cek apakah booking bisa lulus Gate 2 (Balance Verified → Unlock Final)
 * @param {object} booking - Row dari tabel bookings
 */
function canPassGate2(booking) {
  if (!booking) return { ok: false, reason: 'Booking tidak ditemukan' };
  if (booking.dp_status !== 'paid') return { ok: false, reason: 'DP belum diverifikasi (Gate 1 belum lulus)' };
  if (booking.balance_amount === 0) return { ok: true }; // Full payment, no balance needed
  if (booking.balance_status === 'paid') return { ok: false, reason: 'Gate 2 sudah dilalui sebelumnya' };
  if (booking.balance_status !== 'uploaded') return { ok: false, reason: 'Bukti pelunasan belum diunggah oleh client' };
  return { ok: true };
}

// ─── STATE TRANSITIONS ────────────────────────────────────────────────────────

/**
 * Transisi ke status 'confirmed' setelah Gate 1 lulus.
 * @param {object} db - Better-sqlite3 DB instance
 * @param {number} bookingId
 * @param {number} adminId - User ID yang melakukan verifikasi
 * @param {object} dpData - { dp_bukti_url, dp_amount }
 */
function transitionToConfirmed(db, bookingId, adminId, dpData = {}) {
  const { dp_bukti_url = '', dp_amount = null } = dpData;

  db.transaction(() => {
    if (dp_amount !== null) {
      db.prepare(`
        UPDATE bookings
        SET dp_status = 'paid',
            dp_verified_by = ?,
            dp_verified_at = CURRENT_TIMESTAMP,
            dp_bukti_url = ?,
            status = 'confirmed',
            gate1_passed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(adminId, dp_bukti_url, bookingId);
    } else {
      db.prepare(`
        UPDATE bookings
        SET dp_status = 'paid',
            dp_verified_by = ?,
            dp_verified_at = CURRENT_TIMESTAMP,
            dp_bukti_url = ?,
            status = 'confirmed',
            gate1_passed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(adminId, dp_bukti_url, bookingId);
    }

    logAudit(db, {
      bookingId,
      action: 'gate1_passed',
      actorType: 'admin',
      actorId: adminId,
      oldValue: 'dp_status=uploaded',
      newValue: 'dp_status=paid, status=confirmed'
    });
  })();
}

/**
 * Transisi ke status 'post_production' setelah sesi foto selesai.
 * @param {object} db
 * @param {number} bookingId
 * @param {number} adminId
 */
function transitionToPostProduction(db, bookingId, adminId) {
  db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET status = 'post_production', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bookingId);

    logAudit(db, {
      bookingId,
      action: 'session_done',
      actorType: 'admin',
      actorId: adminId,
      oldValue: 'status=shooting',
      newValue: 'status=post_production'
    });
  })();
}

/**
 * Transisi ke status 'delivered' setelah Gate 2 lulus & link final dikirim.
 * @param {object} db
 * @param {number} bookingId
 * @param {number} adminId
 * @param {object} deliveryData - { download_url, download_password }
 */
function transitionToDelivered(db, bookingId, adminId, deliveryData = {}) {
  const { download_url = '', download_password = '' } = deliveryData;

  db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET status = 'delivered',
          download_url = ?,
          download_password = ?,
          gate2_passed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(download_url, download_password, bookingId);

    logAudit(db, {
      bookingId,
      action: 'gate2_passed',
      actorType: 'admin',
      actorId: adminId,
      oldValue: 'status=post_production',
      newValue: 'status=delivered'
    });
  })();
}

/**
 * Transisi ke status 'completed'.
 * @param {object} db
 * @param {number} bookingId
 * @param {string} actorType - 'admin' | 'client' | 'cron'
 * @param {number|null} actorId
 */
function transitionToCompleted(db, bookingId, actorType = 'admin', actorId = null) {
  db.transaction(() => {
    db.prepare(`
      UPDATE bookings
      SET status = 'completed',
          selection_status = 'cleaned',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(bookingId);

    logAudit(db, {
      bookingId,
      action: 'completed',
      actorType,
      actorId,
      oldValue: 'status=delivered',
      newValue: 'status=completed'
    });
  })();
}

// ─── AUDIT LOGGING ────────────────────────────────────────────────────────────

/**
 * Tambahkan entry ke tabel audit_logs.
 * @param {object} db
 * @param {object} params
 * @param {number} [params.bookingId]
 * @param {number} [params.inquiryId]
 * @param {string} params.action
 * @param {string} params.actorType - 'admin' | 'client' | 'cron'
 * @param {number} [params.actorId]
 * @param {string} [params.oldValue]
 * @param {string} [params.newValue]
 * @param {string} [params.notes]
 */
function logAudit(db, { bookingId = null, inquiryId = null, action, actorType, actorId = null, oldValue = null, newValue = null, notes = null }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (booking_id, inquiry_id, action, actor_type, actor_id, old_value, new_value, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bookingId, inquiryId, action, actorType, actorId, oldValue, newValue, notes);
  } catch (e) {
    console.warn('[AuditLog] Gagal catat audit log:', e.message);
  }
}

module.exports = {
  canPassGate1,
  canPassGate2,
  transitionToConfirmed,
  transitionToPostProduction,
  transitionToDelivered,
  transitionToCompleted,
  logAudit
};
