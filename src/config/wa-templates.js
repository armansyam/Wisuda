const { getDb } = require('./database');
const config = require('./settings');

let settingsCache = null;
let waTemplatesCache = null;

function loadSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const dbSettings = {};
  rows.forEach(row => {
    let val = row.value;
    try {
      val = JSON.parse(row.value);
    } catch {
      val = row.value;
    }
    dbSettings[row.key] = val;
  });

  // Map alias keys for 100% camelCase and snake_case compatibility
  if (dbSettings.company_name !== undefined) dbSettings.companyName = dbSettings.company_name;
  if (dbSettings.companyName !== undefined) dbSettings.company_name = dbSettings.companyName;
  if (dbSettings.company_phone !== undefined) dbSettings.companyPhone = dbSettings.company_phone;
  if (dbSettings.companyPhone !== undefined) dbSettings.company_phone = dbSettings.companyPhone;
  if (dbSettings.company_address !== undefined) dbSettings.companyAddress = dbSettings.company_address;
  if (dbSettings.companyAddress !== undefined) dbSettings.company_address = dbSettings.companyAddress;
  if (dbSettings.admin_phone !== undefined) dbSettings.adminPhone = dbSettings.admin_phone;
  if (dbSettings.adminPhone !== undefined) dbSettings.admin_phone = dbSettings.adminPhone;

  // Merge with config defaults and cache the merged object
  settingsCache = { ...config, ...dbSettings };
  return settingsCache;
}

function loadWaTemplates() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('wa_templates');
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      waTemplatesCache = { ...getDefaultWaTemplates(), ...parsed };
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

  // Also set alias key in database
  let aliasKey = null;
  if (key === 'company_name') aliasKey = 'companyName';
  else if (key === 'companyName') aliasKey = 'company_name';
  else if (key === 'company_phone') aliasKey = 'companyPhone';
  else if (key === 'companyPhone') aliasKey = 'company_phone';
  else if (key === 'company_address') aliasKey = 'companyAddress';
  else if (key === 'companyAddress') aliasKey = 'company_address';
  else if (key === 'admin_phone') aliasKey = 'adminPhone';
  else if (key === 'adminPhone') aliasKey = 'admin_phone';

  if (aliasKey) {
    db.prepare(`
      INSERT INTO settings (key, value, description) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, description = excluded.description
    `).run(aliasKey, jsonValue, description);
  }
  
  // Invalidate cache
  settingsCache = null;
  if (key === 'wa_templates') waTemplatesCache = null;
  
  return getSettings();
}

function getDefaultWaTemplates() {
  return {
    client_new_inquiry: `Halo Admin {company_name}, saya baru saja mengisi formulir reservasi foto wisuda atas nama {client_name} (Tgl: {graduation_date}, Lokasi: {location}, Kampus: {university}). Mohon konfirmasi ketersediaan kuota & info pilihan paketnya ya, terima kasih! 😊`,

    admin_new_inquiry: `🔔 Inquiry Baru — {company_name}
Nama: {client_name}
Tanggal: {graduation_date}
Lokasi: {location}
Kampus: {university}
Paket: {package_name}
Catatan: {notes}
WA Client: wa.me/{client_phone}`,

    client_auto_book: `Halo {client_name}, terima kasih telah reservasi booking foto wisuda bersama {company_name}!

Paket: {package_name}
Total Harga: Rp {total_price}
DP Wajib (50%): Rp {dp_amount}

Silakan transfer ke rekening resmi:
{bank_list}

Kirim bukti transfer ke Admin:
https://wa.me/{admin_phone}

Lacak Status Booking:
{booking_url}

Terima kasih!`,

    client_booking_token: `Halo {client_name}, silakan pilih paket foto wisuda kamu dari {company_name} dan selesaikan booking melalui link berikut ini:
{booking_url}`,

    client_quotation: `Halo {client_name},

Terima kasih atas minat kamu di {company_name}! Berikut rincian penawaran foto wisuda tanggal {graduation_date}:

Paket: {package_name}
Harga: Rp {total_price}
DP (50%): Rp {dp_amount}

Silakan transfer ke:
{bank_list}

Kirim bukti transfer ke: wa.me/{admin_phone}
Quotation berlaku 7 hari.`,

    client_dp_uploaded: `💰 Bukti Transfer DP Terkirim
Client: {client_name}
Booking #{booking_id}
Cek & Verifikasi Admin: {admin_url}`,

    client_dp_verified: `✅ DP Terverifikasi — {company_name}

Halo {client_name}, pembayaran DP foto wisuda kamu (#BKG-{booking_id}) telah terverifikasi sah!

📄 Invoice & Kontrak Pemotretan:
{contract_url}

📷 Fotografer (FG) akan ditugaskan H-3 sebelum jadwal pemotretan.

🔍 Lacak status & progres foto wisuda kamu di sini:
{tracking_url}

Ada pertanyaan? Hubungi admin: wa.me/{admin_phone}`,

    client_balance_uploaded: `💰 Bukti Pelunasan Terkirim
Client: {client_name}
Booking #{booking_id}
Cek & Verifikasi Admin: {admin_url}`,

    client_fully_paid: `✅ Pelunasan Terverifikasi — {company_name}

Halo {client_name}, pembayaran pelunasan foto wisuda kamu (#BKG-{booking_id}) telah diverifikasi sah!

🔍 Lacak status & progres foto wisuda kamu di sini:
{tracking_url}

Terima kasih telah mempercayakan momen kelulusan kamu kepada {company_name}!`,

    fg_assigned: `📋 JOB PEMOTRETAN BARU — {company_name}
Client: {client_name}
Lokasi: {location}
Kampus: {university}
Waktu: {shooting_time} ({duration_hours} jam)

Silakan masuk ke portal & terima job ini:
{portal_url}`,

    fg_confirm_job: `👍 Konfirmasi Job FG
FG {fg_name} telah menerima job pemotretan Client {client_name} (Booking #{booking_id}).`,

    reminder_h3_fg: `⏰ H-3 PEMOTRETAN — {company_name}
Client: {client_name} - {location}
Jam: {shooting_time}
Checklist: Kamera, Battery, Flash, Card, Lens
Brief: {brief}`,

    reminder_h3_client: `⏰ H-3 PEMOTRETAN — {company_name}
Halo {client_name}, persiapan sesi foto wisuda kamu bersama {company_name}:
- Outfit sesuai paket
- Datang tepat waktu {shooting_time}
- Lokasi: {location}

FG: {fg_name} (wa.me/{fg_phone})`,

    fg_file_submitted: `📁 FG Setor File Foto
FG {fg_name} menyerahkan file pemotretan Client {client_name} (Booking #{booking_id}).`,

    fg_upload_ready: `FG {fg_name} sudah mengunggah hasil pemotretan ke {company_name}.
QC: {admin_url}/deliverables/{assignment_id}`,

    delivery_ready: `🎉 Foto Wisuda Siap! — {company_name}

Tautan Google Drive dapat diakses di Halaman Tracking:
{tracking_url}

🔑 PIN Privasi Tracking Kamu: {password}
(Masukkan PIN di atas pada halaman tracking untuk mengakses tautan Google Drive)

Ada pertanyaan? wa.me/{admin_phone}`,

    balance_due: `Tagihan Pelunasan — {company_name}
Sisa Pelunasan: Rp {balance_amount}
Silakan transfer ke:
{bank_list}
Kirim bukti: wa.me/{admin_phone}`,

    fg_payout_sent: `💰 Payout Freelance Dikirim — {company_name}
Periode: {period_start} - {period_end}
Total: Rp {total_payout}
Slip: {slip_url}`
  };
}

module.exports = { loadSettings, loadWaTemplates, getSettings, getWaTemplates, getSetting, setSetting, getDefaultWaTemplates };