/**
 * Time-Slot Overlap Engine & Conflict Detection Helper
 * Digunakan untuk menghitung bentrok jam kerja fotografer (freelancer)
 * berdasarkan waktu mulai (shooting_time) dan durasi sesi foto (duration_hours).
 */

/**
 * Mengonversi string jam "09:30" atau "14:00" menjadi menit sejak awal hari.
 * Contoh: "09:30" -> 570 menit.
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 540; // Default 09:00 jika kosong (540 menit)
  const cleanTime = timeStr.trim().split(' ')[0]; // Ambil bagian HH:MM
  const parts = cleanTime.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Memeriksa apakah 2 rentang waktu tumpang tindih (overlap).
 * Formula: StartA < EndB AND StartB < EndA
 */
function checkTimeOverlap(timeA, durationHoursA, timeB, durationHoursB) {
  const startMinA = parseTimeToMinutes(timeA);
  const durationMinA = (parseInt(durationHoursA, 10) || 2) * 60;
  const endMinA = startMinA + durationMinA;

  const startMinB = parseTimeToMinutes(timeB);
  const durationMinB = (parseInt(durationHoursB, 10) || 2) * 60;
  const endMinB = startMinB + durationMinB;

  return startMinA < endMinB && startMinB < endMinA;
}

/**
 * Mengecek apakah fotografer (fgId) memiliki jadwal bentrok pada tanggal & jam tertentu.
 * @param {object} db - Koneksi SQLite database
 * @param {number} fgId - ID Fotografer
 * @param {string} targetDate - Tanggal YYYY-MM-DD
 * @param {string} targetTime - Jam "09:00"
 * @param {number} targetDurationHours - Durasi dalam jam
 * @param {number|null} excludeBookingId - ID Booking yang diabaikan (saat mengecek booking itu sendiri)
 * @returns {object} { hasConflict: boolean, conflictingBooking: object|null }
 */
function checkFgConflict(db, fgId, targetDate, targetTime, targetDurationHours, excludeBookingId = null) {
  if (!fgId) return { hasConflict: false, conflictingBooking: null };

  // 1. Cek apakah fotografer sedang izin/libur manual di fg_schedules pada tanggal tersebut
  const unavailableSchedule = db.prepare(`
    SELECT * FROM fg_schedules 
    WHERE fg_id = ? AND date = ? AND status = 'unavailable'
  `).get(fgId, targetDate);

  if (unavailableSchedule) {
    return {
      hasConflict: true,
      conflictingBooking: {
        id: null,
        client_name: 'Libur/Izin Manual (FG Unavailable)',
        graduation_date: targetDate,
        shooting_time: '00:00',
        duration_hours: 24,
        notes: unavailableSchedule.notes || 'Status: Unavailable'
      }
    };
  }

  let query = `
    SELECT b.id, b.client_name, b.graduation_date, b.shooting_time, b.duration_hours, a.id as assignment_id
    FROM assignments a
    JOIN bookings b ON a.booking_id = b.id
    WHERE a.fg_id = ? AND b.graduation_date = ? AND a.status != 'cancelled'
  `;
  const params = [fgId, targetDate];

  if (excludeBookingId) {
    query += ` AND b.id != ?`;
    params.push(excludeBookingId);
  }

  const existingBookings = db.prepare(query).all(...params);

  for (const existing of existingBookings) {
    const isOverlap = checkTimeOverlap(
      targetTime,
      targetDurationHours,
      existing.shooting_time || '09:00',
      existing.duration_hours || 2
    );

    if (isOverlap) {
      return {
        hasConflict: true,
        conflictingBooking: existing
      };
    }
  }

  return { hasConflict: false, conflictingBooking: null };
}

/**
 * Mencari fotografer yang tersedia (bebas bentrok) di tanggal & jam tertentu.
 */
function findAvailableFreelancers(db, targetDate, targetTime, targetDurationHours, city = null, excludeBookingId = null) {
  let fgQuery = `SELECT id, name, phone, city, rating FROM freelancers WHERE active = 1`;
  const fgParams = [];

  if (city) {
    fgQuery += ` AND (city IS NULL OR city = '' OR LOWER(city) = LOWER(?))`;
    fgParams.push(city);
  }

  const freelancers = db.prepare(fgQuery).all(...fgParams);

  return freelancers.filter(fg => {
    const conflict = checkFgConflict(db, fg.id, targetDate, targetTime, targetDurationHours, excludeBookingId);
    return !conflict.hasConflict;
  });
}

module.exports = {
  parseTimeToMinutes,
  checkTimeOverlap,
  checkFgConflict,
  findAvailableFreelancers
};
