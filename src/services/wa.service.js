/**
 * Wisuda Platform — WA Service (wa.me links only, no Baileys)
 */

const { db } = require('../config/database');

function loadTemplates() {
  const row = db.prepare('SELECT value FROM settings WHERE key = "wa_templates"').get();
  if (row && row.value) {
    try {
      return JSON.parse(row.value);
    } catch {
      return getDefaultTemplates();
    }
  }
  return getDefaultTemplates();
}

function getDefaultTemplates() {
  return {
    admin_new_inquiry: "🔔 Inquiry Baru\\nNama: {client_name}\\nTanggal: {graduation_date}\\nLokasi: {location}\\nPaket: {package_name}\\nWA: wa.me/{client_phone}",
    client_quotation: "Halo {client_name},\\n\\nTerima kasih untuk inquiry wisuda {graduation_date}.\\n\\nPaket: {package_name}\\nHarga: Rp {total_price}\\nDP (50%): Rp {dp_amount}\\n\\nSilakan transfer ke:\\n{bank_list}\\n\\nKirim bukti ke WA ini. Quotation berlaku 7 hari.",
    client_dp_verified: "DP Terverifikasi ✅\\n\\nKontrak digital: {contract_url}\\nBalas 'OK' untuk setuju.\\n\\nFG akan diassign H-3 sebelum shoot.",
    fg_assigned: "📋 TUGAS BARU\\nClient: {client_name}\\nLokasi: {location}\\nKampus: {university}\\nJam: {shooting_time}\\nDurasi: {duration_hours} jam\\n\\nKonfirmasi: wa.me/{admin_phone}?text=KONFIRMASI%20{assignment_id}",
    reminder_h3_fg: "⏰ H-3 SHOOT\\n{client_name} - {location}\\nJam: {shooting_time}\\nChecklist: Kamera, Battery, Flash, Card, Lens\\nBrief: {brief}",
    reminder_h3_client: "⏰ H-3 HARI SHOOT\\n{client_name}, persiapan:\\n- Outfit sesuai paket\\n- Datang tepat waktu {shooting_time}\\n- Lokasi: {location}\\n\\nFG: {fg_name} (wa.me/{fg_phone})",
    fg_upload_ready: "FG {fg_name} sudah upload hasil shoot.\\nSilakan QC: {admin_url}/deliverables/{assignment_id}",
    delivery_ready: "🎉 Foto Wisuda Siap!\\n\\nLink download: {download_url}\\nPassword: {password}\\nBerlaku 7 hari.\\nReview 48 jam. Balas 'OK' jika puas.",
    balance_due: "Tagihan Pelunasan\\nSisa: Rp {balance_amount}\\nTransfer ke:\\n{bank_list}\\nKirim bukti ke WA ini.",
    client_fully_paid: "✅ Pelunasan Terverifikasi\\nBooking {booking_id} SELESAI.\\nTerima kasih telah percaya ke {company_name}!",
    fg_payout_sent: "💰 Payout Dikirim\\nPeriode: {period_start} - {period_end}\\nTotal: Rp {total_payout}\\nSlip: {slip_url}",
    fg_recruitment_approved: "Selamat! Pendaftaran Anda sebagai partner freelance di {company_name} telah DISETUJUI. Domisili: {city}.\\n\\nSilakan akses Portal Freelance Anda melalui link berikut:\\n{portal_url}\\n\\nKode Akses Anda: {access_code}\\n\\nMohon masuk dan segera update ketersediaan jadwal Anda.",
    fg_recruitment_rejected: "Halo {client_name},\\n\\nTerima kasih atas ketertarikan Anda untuk bergabung sebagai partner freelance di {company_name}.\\n\\nSaat ini kuota pendaftaran untuk spesialisasi {specialty} di domisili {city} sedang penuh. Kami akan menyimpan data portofolio Anda dan menghubungi Anda jika ada kebutuhan di masa mendatang."
  };
}

function saveTemplates(templates) {
  db.prepare('UPDATE settings SET value = ? WHERE key = "wa_templates"').run(JSON.stringify(templates, null, 2));
}

function generateWaLink(phone, templateKey, variables) {
  const templates = loadTemplates();
  let message = templates[templateKey] || `Template ${templateKey} not found`;
  
  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    message = message.replace(regex, value ?? '');
  }
  
  // Clean phone number (remove non-digits, ensure 62 prefix)
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;
  
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}

function getTemplate(templateKey) {
  return loadTemplates()[templateKey];
}

function setTemplate(templateKey, template) {
  const templates = loadTemplates();
  templates[templateKey] = template;
  saveTemplates(templates);
}

module.exports = { 
  generateWaLink, 
  getTemplate, 
  setTemplate, 
  loadTemplates,
  saveTemplates 
};