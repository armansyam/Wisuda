/**
 * src/services/sse.service.js
 * Server-Sent Events manager untuk real-time update ke tracking page klien.
 *
 * Cara kerja:
 *  - Browser klien buka GET /api/public/booking/stream?token=TRK-xxx
 *  - Server simpan koneksi SSE di Map (bookingId → Set<res>)
 *  - Kapanpun booking berubah, panggil notifyBookingUpdate(bookingId)
 *  - Semua browser yang sedang buka tracking page booking itu langsung dapat event
 *  - Tidak ada polling — efisien & real-time
 */

/** @type {Map<number, Set<import('express').Response>>} */
const bookingStreams = new Map();

/**
 * Daftarkan koneksi SSE baru untuk booking tertentu.
 * Dipanggil dari endpoint GET /api/public/booking/stream
 *
 * @param {number} bookingId
 * @param {import('express').Response} res
 */
function registerStream(bookingId, res) {
  if (!bookingStreams.has(bookingId)) {
    bookingStreams.set(bookingId, new Set());
  }
  bookingStreams.get(bookingId).add(res);
}

/**
 * Hapus koneksi SSE saat browser disconnect.
 *
 * @param {number} bookingId
 * @param {import('express').Response} res
 */
function unregisterStream(bookingId, res) {
  const streams = bookingStreams.get(bookingId);
  if (streams) {
    streams.delete(res);
    if (streams.size === 0) bookingStreams.delete(bookingId);
  }
}

/**
 * Kirim event 'refresh' ke semua browser yang tracking booking ini.
 * Dipanggil dari admin.js, bookings.js, freelance-portal.js, dan webhook iPaymu.
 *
 * @param {number|string} bookingId
 */
function notifyBookingUpdate(bookingId) {
  const id = Number(bookingId);
  const streams = bookingStreams.get(id);
  if (!streams || streams.size === 0) return;

  const payload = `data: refresh\n\n`;
  for (const res of streams) {
    try {
      res.write(payload);
    } catch (e) {
      // Koneksi sudah mati — hapus
      streams.delete(res);
    }
  }
}

/**
 * Jumlah koneksi SSE aktif saat ini (untuk diagnostik/monitoring).
 * @returns {number}
 */
function getActiveStreamCount() {
  let count = 0;
  for (const streams of bookingStreams.values()) count += streams.size;
  return count;
}

module.exports = { registerStream, unregisterStream, notifyBookingUpdate, getActiveStreamCount };
