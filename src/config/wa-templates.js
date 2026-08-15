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
  if (dbSettings.upload_path !== undefined) dbSettings.uploadPath = dbSettings.upload_path;
  if (dbSettings.uploadPath !== undefined) dbSettings.upload_path = dbSettings.uploadPath;
  if (dbSettings.backup_path !== undefined) dbSettings.backupPath = dbSettings.backup_path;
  if (dbSettings.backupPath !== undefined) dbSettings.backup_path = dbSettings.backupPath;

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
  loadWaTemplates();
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
    // ── 🎓 KATEGORI 1: ALUR KLIEN WISUDA ──
    client_new_inquiry: `Halo Admin {company_name},

Saya baru saja mengisi formulir reservasi foto wisuda:

- Nama: {client_name}
- Tanggal: {graduation_date}
- Lokasi: {location}
- Kampus: {university}

Mohon konfirmasi ketersediaan kuota dan info pilihan paketnya ya. Terima kasih!`,

    client_quotation: `Halo {client_name},

Terima kasih atas minat kamu di {company_name}! Berikut rincian penawaran foto wisuda tanggal {graduation_date}:

Paket: {package_name}
Harga: Rp {total_price}
DP (50%): Rp {dp_amount}

Silakan transfer ke rekening resmi:
{bank_list}

Silakan upload bukti transfer DP melalui link konfirmasi berikut:
{booking_url}

*(Tautan berlaku selama {expiry_hours} jam. Segera konfirmasi DP untuk mengunci jadwal pemotretan Anda sebelum kuota penuh).*
Terima kasih! ✨`,

    client_dp_verified: `✅ DP Terverifikasi — {company_name}

Halo {client_name}, pembayaran DP foto wisuda kamu (#BKG-{booking_id}) telah terverifikasi sah!

📄 Invoice & Kontrak Pemotretan:
{contract_url}

📷 Fotografer (FG) akan ditugaskan H-3 sebelum jadwal pemotretan.

🔍 Lacak status & progres foto wisuda kamu di sini:
{tracking_url}

Ada pertanyaan? Hubungi admin: wa.me/{admin_phone}`,

    balance_due: `Tagihan Pelunasan — {company_name}
Halo {client_name}, berikut sisa tagihan pelunasan sesi foto wisuda kamu:
Sisa Pelunasan: Rp {balance_amount}

Silakan transfer ke rekening resmi:
{bank_list}

Kirim bukti transfer ke WhatsApp admin: wa.me/{admin_phone}`,

    client_fully_paid: `✅ Pelunasan Terverifikasi — {company_name}

Halo {client_name}, pembayaran pelunasan foto wisuda kamu (#BKG-{booking_id}) telah diverifikasi sah!

🔍 Lacak status & progres foto wisuda kamu di sini:
{tracking_url}

Terima kasih telah mempercayakan momen kelulusan kamu kepada {company_name}!`,

    reminder_h3_client: `⏰ H-3 PEMOTRETAN — {company_name}
Halo {client_name}, persiapan sesi foto wisuda kamu bersama {company_name}:
- Outfit & toga lengkap sesuai paket
- Datang tepat waktu di lokasi {shooting_time}
- Lokasi: {location}

Fotografer Bertugas: {fg_name} (wa.me/{fg_phone})`,

    reminder_h1_client: `⏰ PENGINGAT H-1 PEMOTRETAN WISUDA BESOK — {company_name}

Halo {client_name},

Sesi pemotretan wisuda kamu bersama {company_name} akan berlangsung BESOK! 🎓✨

📋 Detail Jadwal Besok:
- Tanggal: {graduation_date}
- Jam Sesi: {shooting_time}
- Lokasi / Titik Kumpul: {location}
- Universitas: {university}

📸 Fotografer Standby Besok:
- Nama FG: {fg_name}
- WhatsApp FG: wa.me/{fg_phone}

📝 Tips Penting:
1. Istirahat yang cukup malam ini agar fresh saat difoto besok.
2. Hadir di lokasi 15 menit sebelum sesi dimulai.
3. Pastikan atribut toga, selempang, dan buket sudah siap.

Sampai jumpa besok di lokasi pemotretan! ✨`,

    delivery_ready: `🎉 Foto Wisuda Siap! — {company_name}

Halo {client_name}, berkas foto wisuda kamu (#BKG-{booking_id}) sudah selesai dan siap diakses!

🔍 Halaman Akses Dokumentasi & Tracking:
{tracking_url}

🔗 Kode Tracking Client: {password}

Ada pertanyaan? Hubungi admin: wa.me/{admin_phone}`,

    client_rekap: `Halo Kak {client_name}! 👋
Berikut informasi lengkap & akses berkas foto wisuda Anda dari {company_name}:

📋 No. Invoice: {invoice_no}
🎓 Universitas: {university}
📦 Paket: {package_name}

🔍 HALAMAN AKSES DOKUMEN & TRACKING:
{tracking_url}

🔗 KODE TRACKING CLIENT: {password}
*(Gunakan kode tracking di atas untuk memantau progres & mengakses hasil foto di halaman tracking)*

📁 LINK GOOGLE DRIVE (MASTER FOLDER CLIENT):
{drive_parent_url}

Terima kasih banyak telah mempercayakan momen bahagia Anda bersama kami! ✨`,

    // ── 📷 KATEGORI 2: ALUR FOTOGRAFER FREELANCE ──
    fg_recruitment_approved: `Selamat! Pendaftaran Anda sebagai mitra fotografer di {company_name} telah DISETUJUI. Domisili: {city}.

Silakan akses Portal Freelance Anda melalui link berikut:
{portal_url}

Kode Akses Anda: {access_code}

Mohon masuk dan segera update ketersediaan jadwal Anda.`,

    fg_recruitment_rejected: `Halo {client_name},

Terima kasih atas ketertarikan Anda untuk bergabung sebagai mitra fotografer di {company_name}.

Saat ini kuota penugasan untuk domisili {city} sedang penuh. Data portofolio Anda telah tersimpan di talent pool kami dan kami akan menghubungi Anda jika ada penambahan kuota di masa mendatang.`,

    fg_assigned: `📋 SURAT TUGAS PEMOTRETAN BARU — {company_name}
Client: {client_name}
Lokasi: {location}
Kampus: {university}
Waktu: {shooting_time} ({duration_hours} jam)

Silakan akses Portal Freelance Anda untuk melihat rincian brief, jadwal, & persiapan sesi pemotretan:
{portal_url}`,

    reminder_h3_fg: `⏰ H-3 PEMOTRETAN — {company_name}
Client: {client_name} - {location}
Jam: {shooting_time}
Checklist: Kamera, Battery, Flash, Card, Lens
Brief: {brief}`,

    reminder_h1_fg: `⏰ PENGINGAT H-1 TUGAS PEMOTRETAN BESOK — {company_name}

Halo {fg_name},

Pengingat tugas sesi pemotretan wisuda kamu untuk BESOK:

📸 Detail Tugas Besok:
- Klien: {client_name} ({university})
- Waktu: {shooting_time}
- Lokasi: {location}
- Kontak Klien: wa.me/{client_phone}

⚙️ Checklist Peralatan Malam Ini:
- Baterai kamera full charge (bawa cadangan)
- Memory card format kosong & siap pakai
- Lensa & flash eksternal siap
- Standby di lokasi 15 menit sebelum jam sesi

Selamat bertugas dan hasilkan karya terbaik untuk {company_name}! 🚀`,

    fg_payout_validation: `📋 KONFIRMASI REKENING & FEE PEMOTRETAN — {company_name}

Halo {fg_name},

Mohon konfirmasi rincian tugas & fee pemotretan wisuda kamu sebelum kami transfer:

📋 Rincian Klien / Project:
{client_list}

💰 Total yang Akan Ditransfer: Rp {total_payout}

🏦 Rekening Tujuan:
- Bank: {bank_name}
- No. Rekening: {account_number}
- Atas Nama: {account_holder}

Jika data di atas sudah sesuai dan aktif, mohon membalas pesan ini agar proses transfer dapat segera kami proses. Terima kasih! ✨`,

    fg_payout_sent: `💰 PEMBAYARAN HONOR FOTOGRAFER BERHASIL — {company_name}

Halo {fg_name},

Pembayaran honor pemotretan wisuda kamu telah berhasil kami transfer! 🚀

📋 Rincian Klien / Project:
{client_list}

💵 Total Transfer: Rp {total_payout}
🔢 No. Referensi Transfer: {transfer_ref}

📄 E-Slip & Invoice Payroll:
{slip_url}

Terima kasih banyak atas kerja sama dan dedikasi luar biasa kamu bersama {company_name}! ✨`
  };
}

module.exports = { loadSettings, loadWaTemplates, getSettings, getWaTemplates, getSetting, setSetting, getDefaultWaTemplates };