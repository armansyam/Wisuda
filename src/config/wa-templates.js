const { getDb } = require('./database');
const config = require('./settings');

let settingsCache = null;
let waTemplatesCache = null;

function loadSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  settingsCache = {};
  rows.forEach(row => {
    try {
      settingsCache[row.key] = JSON.parse(row.value);
    } catch {
      settingsCache[row.key] = row.value;
    }
  });
  // Merge with config defaults
  return { ...config, ...settingsCache };
}

function loadWaTemplates() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('wa_templates');
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      // If empty object, use defaults
      waTemplatesCache = Object.keys(parsed).length > 0 ? parsed : getDefaultWaTemplates();
    } catch {
      waTemplatesCache = getDefaultWaTemplates();
    }
  } else {
    waTemplatesCache = getDefaultWaTemplates();
  }
  return waTemplatesCache;
}

function getSettings() {
  if (!settingsCache) loadSettings();
  return settingsCache;
}

function getWaTemplates() {
  if (!waTemplatesCache) loadWaTemplates();
  return waTemplatesCache;
}

function getSetting(key, defaultValue = null) {
  const settings = getSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

function setSetting(key, value, description = '') {
  const db = getDb();
  const jsonValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  db.prepare(`
    INSERT INTO settings (key, value, description) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = excluded.description
  `).run(key, jsonValue, description);
  
  // Invalidate cache
  settingsCache = null;
  if (key === 'wa_templates') waTemplatesCache = null;
  
  return getSettings();
}

function getDefaultWaTemplates() {
  return {
    admin_new_inquiry: `🔔 Inquiry Baru
Nama: {client_name}
Tanggal: {graduation_date}
Lokasi: {location}
Paket: {package_name}
WA: wa.me/{client_phone}`,
    client_quotation: `Halo {client_name},

Terima kasih untuk inquiry wisuda {graduation_date}.

Paket: {package_name}
Harga: Rp {total_price}
DP (50%): Rp {dp_amount}

Silakan transfer ke:
{bank_list}

Kirim bukti ke: wa.me/{admin_phone}
Quotation berlaku 7 hari.`,
    client_dp_verified: `DP Terverifikasi ✅

Kontrak: {contract_url}
Balas 'OK' ke wa.me/{admin_phone} untuk setuju.

FG akan diassign H-3 sebelum shoot.`,
    fg_assigned: `📋 TUGAS BARU
Tanggal: {graduation_date}
Jam: {shooting_time}
Lokasi: {location}
Client: {client_name}
Paket: {package_name}

Brief: {brief}

Konfirmasi: wa.me/{admin_phone}?text=KONFIRMASI%20{assignment_id}`,
    reminder_h3_fg: `⏰ H-3 SHOOT
{client_name} - {location}
Jam: {shooting_time}
Checklist: Kamera, Battery, Flash, Card, Lens
Brief: {brief}`,
    reminder_h3_client: `⏰ H-3 HARI SHOOT
{client_name}, persiapan:
- Outfit sesuai paket
- Datang tepat waktu {shooting_time}
- Lokasi: {location}

FG: {fg_name} (wa.me/{fg_phone})`,
    fg_upload_ready: `FG {fg_name} sudah upload hasil shoot.
QC: {admin_url}/deliverables/{assignment_id}`,
    delivery_ready: `🎉 Foto Wisuda Siap!

Link download: {download_url}
Password: {password}
Berlaku 7 hari.
Review 48 jam. OK? wa.me/{admin_phone}?text=OK%20{booking_id}`,
    balance_due: `Tagihan Pelunasan
Sisa: Rp {balance_amount}
Transfer ke:
{bank_list}
Kirim bukti: wa.me/{admin_phone}`,
    client_fully_paid: `✅ Pelunasan Terverifikasi
Booking {booking_id} SELESAI.
Terima kasih percaya ke {company_name}!`,
    fg_payout_sent: `💰 Payout Dikirim
Periode: {period_start} - {period_end}
Total: Rp {total_payout}
Slip: {slip_url}`
  };
}

module.exports = { loadSettings, loadWaTemplates, getSettings, getWaTemplates, getSetting, setSetting, getDefaultWaTemplates };