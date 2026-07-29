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

  // Apply cache-busting for logo_url and seo_og_image dynamically based on file system mtime
  const fs = require('fs');
  const path = require('path');

  ['logo_url', 'seo_og_image'].forEach(key => {
    if (settingsCache[key] && typeof settingsCache[key] === 'string' && settingsCache[key].startsWith('/')) {
      try {
        const cleanPath = settingsCache[key].split('?')[0];
        const filePath = path.join(__dirname, '../../public', cleanPath);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          settingsCache[key] = `${cleanPath}?t=${stats.mtimeMs}`;
        }
      } catch (e) {
        console.error(`Error adding cache buster to ${key}:`, e);
      }
    }
  });

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

Silakan upload bukti transfer DP & konfirmasi booking melalui link berikut:
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

Silakan upload bukti transfer DP melalui link konfirmasi berikut:
{booking_url}
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

Halo {client_name}, foto wisuda kamu (#BKG-{booking_id}) sudah selesai dan siap diakses!

🔍 Halaman Akses Dokumentasi & Tracking:
{tracking_url}

🔗 Kode Tracking Client: {password}

Ada pertanyaan? Hubungi admin: wa.me/{admin_phone}`,

    balance_due: `Tagihan Pelunasan — {company_name}
Sisa Pelunasan: Rp {balance_amount}
Silakan transfer ke:
{bank_list}
Kirim bukti: wa.me/{admin_phone}`,

    fg_payout_sent: `💰 Payout Freelance Dikirim — {company_name}
Periode: {period_start} - {period_end}
Total: Rp {total_payout}
Slip: {slip_url}`,

    drive_reminder_h14: `⏰ PENGINGAT MASA SIMPAN DRIVE (H-14) — {company_name}

Halo {client_name}, pengingat bahwa folder foto wisuda kamu (#BKG-{booking_id}) di Google Drive akan dibersihkan dalam 14 hari (Tanggal Expired: {drive_expiry_date}).

📊 Total Ukuran File: {drive_total_size}
🔗 Lacak & Unduh File: {tracking_url}

Mohon pastikan file sudah di-download atau ruang Google Drive kamu mencukupi ya!`,

    drive_reminder_h3: `⏰ PENGINGAT AKHIR MASA SIMPAN DRIVE (H-3) — {company_name}

Halo {client_name}, folder foto wisuda kamu (#BKG-{booking_id}) di Google Drive akan dibersihkan dalam 3 HARI LAGI (Tanggal Expired: {drive_expiry_date}).

📊 Total Ukuran File: {drive_total_size}
🔗 Unduh File Sekarang: {tracking_url}

Segera amankan file foto/video kamu sebelum tanggal expired ya Kak!`,

    drive_expired_cleanup: `ℹ️ MASA SIMPAN GOOGLE DRIVE EXPIRATION — {company_name}

Halo {client_name}, masa simpan temporary folder foto wisuda kamu (#BKG-{booking_id}) di Google Drive kami telah berakhir pada {drive_expiry_date}.

Kepemilikan folder & file telah ditransfer ke email Google Drive terdaftar Kakak ({client_email}). Terima kasih telah dipercayakan bersama {company_name}! ❤️`,

    drive_manual_transfer: `✅ TRANSFER KEPEMILIKAN FOLDER GOOGLE DRIVE — {company_name}

Halo {client_name}! Kepemilikan folder foto wisuda kamu (#BKG-{booking_id}) telah berhasil ditransfer ke email Google Drive Kakak ({client_email}).

Semua file di dalam folder kini sepenuhnya milik Kakak dan tersimpan permanen di Google Drive Kakak. Terima kasih telah mempercayakan momen berharga Anda bersama {company_name}! 🎓❤️`,

    client_rekap: `Halo Kak {client_name}! 👋
Berikut informasi lengkap & akses berkas foto wisuda Anda dari {company_name}:

📋 No. Invoice: {invoice_no}
🎓 Universitas: {university}
📦 Paket: {package_name}

🔍 HALAMAN AKSES DOKUMEN & TRACKING:
{tracking_url}

🔗 KODE TRACKING CLIENT: {password}
*(Gunakan kode tracking di atas untuk memantau progres & mengakses hasil foto di halaman tracking)*

📁 LINK GOOGLE DRIVE (FOLDER INDUK CLIENT):
{drive_parent_url}

Terima kasih banyak telah mempercayakan momen bahagia Anda bersama kami! ✨`,

    fg_recruitment_approved: `Selamat! Pendaftaran Anda sebagai partner freelance di {company_name} telah DISETUJUI. Domisili: {city}.

Silakan akses Portal Freelance Anda melalui link berikut:
{portal_url}

Kode Akses Anda: {access_code}

Mohon masuk dan segera update ketersediaan jadwal Anda.`,

    fg_recruitment_rejected: `Halo {client_name},

Terima kasih atas ketertarikan Anda untuk bergabung sebagai partner freelance di {company_name}.

Saat ini kuota pendaftaran untuk spesialisasi {specialty} di domisili {city} sedang penuh. Kami akan menyimpan data portofolio Anda dan menghubungi Anda jika ada kebutuhan di masa mendatang.`
  };
}

module.exports = { loadSettings, loadWaTemplates, getSettings, getWaTemplates, getSetting, setSetting, getDefaultWaTemplates };