const path = require('path');
const fs = require('fs');
const config = require('../config/settings');
const { getSettings } = require('../config/wa-templates');
const { formatCurrency, formatDate } = require('./currency');

/**
 * Generates and saves a static Final Invoice Proof Snapshot to /uploads/invoices-client/
 * when a booking reaches completion.
 */
function saveFinalInvoiceSnapshot(booking, db) {
  if (!booking || !booking.id) return null;

  const invoiceClientDir = path.join(config.uploadPath, 'invoices-client');
  if (!fs.existsSync(invoiceClientDir)) {
    fs.mkdirSync(invoiceClientDir, { recursive: true });
  }

  const filename = `invoice_final_bkg_${booking.id}.html`;
  const filePath = path.join(invoiceClientDir, filename);

  const settings = getSettings();
  const pkg = booking.package_id ? db.prepare('SELECT * FROM packages WHERE id = ?').get(booking.package_id) : null;

  const totalStr = formatCurrency(booking.total_price || 0);
  const dpStr = formatCurrency(booking.dp_amount || 0);
  const balanceStr = formatCurrency(booking.balance_amount || 0);
  const dateStr = formatDate(booking.graduation_date);
  const verifyDateStr = booking.balance_verified_at ? formatDate(booking.balance_verified_at) : formatDate(new Date());

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Pelunasan Selesai — #BKG-${booking.id}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #faf9f6; color: #1a1a2e; padding: 40px 20px; margin: 0; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #e5e0d8; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #faf9f6; padding-bottom: 20px; margin-bottom: 25px; }
    .title { font-size: 22px; font-weight: bold; color: #1a1a2e; margin: 0; }
    .badge-paid { background: #e8f5e9; color: #2e7d32; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 13px; color: #6b7280; }
    .meta-grid strong { color: #1a1a2e; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
    .table th { text-align: left; padding: 12px; background: #faf9f6; color: #8a7a72; font-weight: 600; text-transform: uppercase; font-size: 10px; }
    .table td { padding: 12px; border-bottom: 1px solid #f0ece3; color: #1a1a2e; }
    .total-box { background: #faf9f6; padding: 20px; border-radius: 12px; font-size: 13px; border: 1px solid #e5e0d8; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row.grand { font-size: 16px; font-weight: bold; color: #c59b63; border-top: 1px solid #e5e0d8; padding-top: 10px; margin-top: 6px; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .no-print { text-align: center; margin-bottom: 20px; }
    .btn-print { background: #1a1a2e; color: #c59b63; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 12px; }
    @media print { .no-print { display: none; } body { background: #fff; padding: 0; } .container { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" class="btn-print">🖨️ Cetak / Simpan PDF</button>
  </div>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">${settings.companyName || 'Wisuda Platform'}</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">INVOICE PELUNASAN RESMI & ARSIP PENYELESAIAN</p>
      </div>
      <span class="badge-paid">✓ LUNAS 100%</span>
    </div>

    <div class="meta-grid">
      <div>
        <p style="margin:0 0 4px 0;">No. Booking: <strong>#BKG-${booking.id}</strong></p>
        <p style="margin:0 0 4px 0;">Klien: <strong>${booking.client_name}</strong> (${booking.client_phone})</p>
        <p style="margin:0;">Universitas: <strong>${booking.university || '-'}</strong></p>
      </div>
      <div style="text-align: right;">
        <p style="margin:0 0 4px 0;">Tgl Wisuda: <strong>${dateStr}</strong></p>
        <p style="margin:0 0 4px 0;">Status Pembayaran: <strong>Lunas 100%</strong></p>
        <p style="margin:0;">Tgl Verifikasi: <strong>${verifyDateStr}</strong></p>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Rincian Layanan</th>
          <th>Durasi Sesi</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${pkg ? pkg.name : 'Paket Dokumentasi Wisuda'}</strong><br>
            <span style="font-size: 11px; color: #6b7280;">${booking.location || 'Makassar'}</span>
          </td>
          <td>${booking.duration_hours || 2} Jam Pemotretan</td>
          <td style="text-align: right; font-weight: bold;">${totalStr}</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row"><span>Total Biaya Layanan:</span> <span>${totalStr}</span></div>
      <div class="total-row"><span>Pembayaran DP (50%):</span> <span style="color: #2e7d32;">- ${dpStr} (Lunas)</span></div>
      <div class="total-row"><span>Pelunasan (50%):</span> <span style="color: #2e7d32;">- ${balanceStr} (Lunas)</span></div>
      <div class="total-row grand"><span>SISA HUTANG:</span> <span>Rp 0 (SELESAI)</span></div>
    </div>

    <div class="footer">
      <p>Dokumen ini disetujui dan diterbitkan secara resmi oleh ${settings.companyName || 'Wisuda Platform'}.<br>Arsip Bukti Penyelesaian Fisik Admin — ID Booking #${booking.id}</p>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(filePath, html, 'utf8');
  const relativeUrl = `/uploads/invoices-client/${filename}`;

  try {
    db.prepare('UPDATE bookings SET final_invoice_url = ? WHERE id = ?').run(relativeUrl, booking.id);
  } catch (e) {}

  return relativeUrl;
}

module.exports = {
  saveFinalInvoiceSnapshot
};
