/**
 * Service for Email Delivery & SMTP Management
 * Wisuda Platform v2.0
 * Features Luxury Responsive Email Template Engine linked to Studio Branding Settings
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { getSetting } = require('../config/wa-templates');

/**
 * Get Studio Identity Settings dynamically from DB
 */
function getStudioIdentity() {
  const name = getSetting('company_name', '') || getSetting('companyName', '') || 'Wisuda Official Studio';
  const phone = getSetting('company_phone', '') || getSetting('companyPhone', '') || '';
  const address = getSetting('company_address', '') || getSetting('companyAddress', '') || '';
  const logoUrl = getSetting('logo_url', '') || '';
  return { name, phone, address, logoUrl };
}

/**
 * Get current SMTP Configuration from DB Settings
 */
function getSmtpConfig(override = {}) {
  const studio = getStudioIdentity();
  const host = override.smtp_host !== undefined ? override.smtp_host : (override.host !== undefined ? override.host : getSetting('smtp_host', ''));
  const port = override.smtp_port !== undefined ? Number(override.smtp_port) : (override.port !== undefined ? Number(override.port) : Number(getSetting('smtp_port', 587)));
  const user = override.smtp_user !== undefined ? override.smtp_user : (override.user !== undefined ? override.user : getSetting('smtp_user', ''));
  const pass = override.smtp_pass !== undefined ? override.smtp_pass : (override.pass !== undefined ? override.pass : getSetting('smtp_pass', ''));
  const secure = override.smtp_secure !== undefined ? Boolean(Number(override.smtp_secure)) : (override.secure !== undefined ? Boolean(override.secure) : Boolean(Number(getSetting('smtp_secure', 0))));
  const fromName = (override.smtp_from_name !== undefined ? override.smtp_from_name : (override.fromName !== undefined ? override.fromName : getSetting('smtp_from_name', ''))).trim() || studio.name;
  const rawFromEmail = (override.smtp_from_email !== undefined ? override.smtp_from_email : (override.fromEmail !== undefined ? override.fromEmail : getSetting('smtp_from_email', ''))).trim();
  const fromEmail = rawFromEmail || user || 'no-reply@wisuda.com';

  return { host, port, user, pass, secure, fromName, fromEmail, studio };
}

/**
 * Create Nodemailer Transporter instance
 */
function createTransporter(configOverride = {}) {
  const cfg = getSmtpConfig(configOverride);

  if (!cfg.host || !cfg.user) {
    throw new Error('Konfigurasi SMTP (Host & User) belum diatur.');
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure, // true for 465, false for 587
    auth: {
      user: cfg.user,
      pass: cfg.pass
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certs in dev
    }
  });
}

/**
 * Probe Test SMTP Server Connection
 */
async function verifySmtpConnection(configOverride = {}) {
  const cfg = getSmtpConfig(configOverride);
  const transporter = createTransporter(cfg);
  
  await transporter.verify();
  return {
    ok: true,
    message: `Terhubung ke server SMTP (${cfg.host}:${cfg.port})`
  };
}

/**
 * Resolve Logo Info for Email Rendering (CID inline or direct URL)
 */
function getLogoAttachmentInfo() {
  const studio = getStudioIdentity();
  if (!studio.logoUrl) return { useCid: false, logoSrc: '', attachments: [] };

  if (studio.logoUrl.startsWith('https://') || studio.logoUrl.startsWith('http://')) {
    return { useCid: false, logoSrc: studio.logoUrl, attachments: [] };
  }

  const cleanPath = studio.logoUrl.split('?')[0].replace(/^\//, '');
  const absolutePath = path.join(process.cwd(), 'public', cleanPath);

  if (fs.existsSync(absolutePath)) {
    return {
      useCid: true,
      logoSrc: 'cid:studiologo',
      attachments: [{
        filename: path.basename(cleanPath),
        path: absolutePath,
        cid: 'studiologo'
      }]
    };
  }

  return { useCid: false, logoSrc: '', attachments: [] };
}

/**
 * Generate Luxury HTML Wrapper for all Studio Emails
 */
function wrapLuxuryEmailTemplate({ title, badge, contentHtml, footerMeta = '', logoSrc = '' }) {
  const studio = getStudioIdentity();
  const currentYear = new Date().getFullYear();
  const displayLogo = logoSrc || (studio.logoUrl && (studio.logoUrl.startsWith('http://') || studio.logoUrl.startsWith('https://')) ? studio.logoUrl : '');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #FAF9F6; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #2D1B14;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF9F6; padding: 40px 15px;">
        <tr>
          <td align="center">
            <!-- Outer Luxury Card Container -->
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E8D5C8; overflow: hidden; box-shadow: 0 10px 30px rgba(45, 27, 20, 0.06);">
              
              <!-- Luxury Navy Header Bar -->
              <tr>
                <td style="padding: 28px 32px; background-color: #111E35; border-bottom: 3px solid #C59B63;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left" style="vertical-align: middle;">
                        ${displayLogo ? `<img src="${displayLogo}" alt="${studio.name}" style="height: 34px; max-width: 150px; object-fit: contain; margin-bottom: 6px; display: block;">` : ''}
                        <h1 style="margin: 0; color: #F8FAFC; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; text-transform: uppercase;">
                          ${studio.name}
                        </h1>
                        <p style="margin: 3px 0 0 0; color: #94A3B8; font-size: 10px; font-weight: 600; letter-spacing: 0.8px;">
                          OFFICIAL STUDIO NOTIFICATION
                        </p>
                      </td>
                      ${badge ? `
                      <td align="right" style="vertical-align: middle;">
                        <span style="display: inline-block; padding: 5px 12px; background: rgba(197, 155, 99, 0.2); border: 1px solid #C59B63; border-radius: 20px; color: #F5E5C9; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">
                          ${badge}
                        </span>
                      </td>` : ''}
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Email Body Content -->
              <tr>
                <td style="padding: 32px; background-color: #FFFFFF; color: #2D1B14; font-size: 14px; line-height: 1.7;">
                  <h2 style="margin: 0 0 16px 0; color: #111E35; font-size: 16px; font-weight: 700; border-bottom: 1px solid #F0E6DD; padding-bottom: 10px;">
                    ${title}
                  </h2>
                  ${contentHtml}
                </td>
              </tr>

              <!-- Luxury Warm Cream Footer Bar -->
              <tr>
                <td style="padding: 22px 32px; background-color: #FAF6F0; border-top: 1px solid #E8D5C8; text-align: center;">
                  <p style="margin: 0 0 6px 0; color: #2D1B14; font-size: 12px; font-weight: 700;">
                    ${studio.name}
                  </p>
                  ${studio.address ? `<p style="margin: 0 0 4px 0; color: #7A6E65; font-size: 11px;">📍 ${studio.address}</p>` : ''}
                  ${studio.phone ? `<p style="margin: 0 0 8px 0; color: #7A6E65; font-size: 11px;">📞 WA Studio: ${studio.phone}</p>` : ''}
                  ${footerMeta ? `<p style="margin: 0 0 8px 0; color: #8A7A72; font-size: 10px; font-family: monospace;">${footerMeta}</p>` : ''}
                  <p style="margin: 0; color: #A0948C; font-size: 10px;">
                    © ${currentYear} ${studio.name}. Hak Cipta Dilindungi. Dikirim otomatis oleh Wisuda Platform.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send Test Email to Target Destination using Luxury Template
 */
async function sendTestEmail(configOverride = {}, targetEmail) {
  if (!targetEmail) throw new Error('Email tujuan uji coba wajib diisi.');
  
  const cfg = getSmtpConfig(configOverride);
  const transporter = createTransporter(cfg);

  const contentHtml = `
    <p style="margin-top: 0;">Halo,</p>
    <p>Email ini adalah <strong>pesan uji coba otomatis</strong> dari sistem untuk memverifikasi bahwa server <strong>Email Gateway (SMTP)</strong> Anda telah terhubung dan aktif sempurna.</p>
    
    <!-- Status Box -->
    <div style="margin: 20px 0; padding: 18px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; color: #065F46;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #047857;">
        ✓ STATUS KONEKSI SMTP: TERHUBUNG
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; font-family: monospace; color: #1F2937;">
        <tr>
          <td style="padding: 4px 0; color: #4B5563; width: 120px;">Host Server:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #111827;">${cfg.host}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #4B5563;">Port:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #111827;">${cfg.port} (${cfg.secure ? 'SSL/TLS' : 'STARTTLS'})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #4B5563;">Nama Pengirim:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #111827;">${cfg.fromName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #4B5563;">Email Pengirim:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #111827;">${cfg.fromEmail}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #4B5563;">Waktu Uji Coba:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #111827;">${new Date().toLocaleString('id-ID')}</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 0;">Sistem Email Gateway kini <strong>siap digunakan</strong> untuk pengiriman invoice, tanda terima pendaftaran, link galeri foto wisuda, dan rekap honor freelancer.</p>
  `;

  const html = wrapLuxuryEmailTemplate({
    title: '🧪 Uji Coba Verifikasi SMTP Email Gateway',
    badge: 'SMTP TEST SUCCESS',
    contentHtml,
    footerMeta: `Identitas Terhubung: ${cfg.studio.name}`
  });

  const mailOptions = {
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: targetEmail,
    subject: `🧪 [Uji Coba SMTP] ${cfg.studio.name} — Verifikasi Email Gateway`,
    html
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    ok: true,
    messageId: info.messageId,
    message: `Email uji coba berhasil dikirim ke: ${targetEmail}`
  };
}

function stripHtmlToPlain(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Send Transactional System Email Wrapped in Luxury Card Theme
 */
async function sendEmail({ to, subject, title, badge, contentHtml, text }) {
  try {
    const cfg = getSmtpConfig();
    const transporter = createTransporter(cfg);
    const logoInfo = getLogoAttachmentInfo();

    const html = wrapLuxuryEmailTemplate({
      title: title || subject,
      badge: badge || 'STUDIO NOTIFICATION',
      contentHtml,
      logoSrc: logoInfo.logoSrc
    });

    const plainText = text || stripHtmlToPlain(contentHtml);

    const mailOptions = {
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      replyTo: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to,
      subject,
      html,
      text: plainText,
      headers: {
        'X-Mailer': 'Wisuda Platform Mailer',
        'X-Priority': '3',
        'Importance': 'Normal'
      },
      attachments: logoInfo.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error('[EmailService] sendEmail error:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Send Assignment Briefing Email to Freelancer
 */
async function sendAssignmentEmail({ fg, booking, assignment, portalUrl }) {
  if (!fg?.email) return { ok: false, error: 'Freelancer tidak memiliki alamat email' };

  const studio = getStudioIdentity();
  const feeFormatted = Number(assignment.fg_fee || 0).toLocaleString('id-ID');
  
  const contentHtml = `
    <p style="margin-top: 0;">Halo <strong>${fg.name}</strong>,</p>
    <p>Anda telah resmi ditugaskan oleh tim <strong>${studio.name}</strong> untuk sesi dokumentasi wisuda berikut:</p>
    
    <div style="background-color: #FAF6F0; border-radius: 12px; border: 1px solid #E8D5C8; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #2D1B14;">
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; width: 38%;">Klien:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${booking.client_name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Universitas:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${booking.university || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Tanggal Wisuda:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${booking.graduation_date}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Jam Sesi Foto:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${booking.shooting_time || 'TBD'} (${booking.duration_hours || booking.shooting_duration || '2'} Jam)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Lokasi Pemotretan:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${booking.location || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Paket Foto:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; border-top: 1px solid #E8D5C8;">Honor / Fee Sesi:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #059669; font-size: 15px; border-top: 1px solid #E8D5C8;">Rp ${feeFormatted}</td>
        </tr>
        ${assignment.brief ? `
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; vertical-align: top;">Brief / Arahan:</td>
          <td style="padding: 6px 0; color: #9A6B2F; font-style: italic;">${assignment.brief}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p>Silakan buka <strong>Portal Freelance</strong> untuk melihat detail brief lengkap, mengonfirmasi kesiapan sesi, serta mengunggah berkas foto setelah sesi pemotretan selesai:</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${portalUrl}" target="_blank" style="background-color: #111E35; color: #D4AF37; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(17,30,53,0.25);">
        🚀 Buka Portal Tugas Freelancer
      </a>
    </div>

    <p style="font-size: 12px; color: #7A6E65; margin-bottom: 0;">Jika ada pertanyaan atau kendala jadwal di lapangan, segera hubungi Admin Studio melalui WhatsApp.</p>
  `;

  return sendEmail({
    to: fg.email,
    subject: `📸 [Surat Tugas] Penugasan Sesi Foto Wisuda — ${booking.client_name} (${booking.graduation_date})`,
    title: `📸 Penugasan Sesi Foto Wisuda`,
    badge: `SURAT TUGAS RESMI`,
    contentHtml
  });
}

/**
 * Send Payroll Payout E-Slip to Freelancer
 */
async function sendPayrollEmail({ fg, clientNames = [], totalPaid, transferRef, slipUrl, appUrl }) {
  if (!fg?.email) return { ok: false, error: 'Freelancer tidak memiliki alamat email' };

  const studio = getStudioIdentity();
  const totalFormatted = Number(totalPaid || 0).toLocaleString('id-ID');
  const invoiceUrl = `${appUrl}/payout-invoice.html?ref=${encodeURIComponent(transferRef)}`;

  const contentHtml = `
    <p style="margin-top: 0;">Halo <strong>${fg.name}</strong>,</p>
    <p>Honor dan fee kerja sama Anda telah <strong>berhasil ditransfer</strong> oleh <strong>${studio.name}</strong> dengan rincian sebagai berikut:</p>
    
    <div style="background-color: #FAF6F0; border-radius: 12px; border: 1px solid #E8D5C8; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #2D1B14;">
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; width: 38%;">Penerima:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${fg.name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">No. Referensi:</td>
          <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #111E35;">${transferRef}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Tanggal Transfer:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; vertical-align: top;">Rincian Sesi/Tugas:</td>
          <td style="padding: 6px 0; color: #111E35;">
            <ul style="margin: 0; padding-left: 18px;">
              ${clientNames.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #7A6E65; border-top: 1px solid #E8D5C8;">Total Honor Ditransfer:</td>
          <td style="padding: 8px 0 4px 0; font-weight: bold; color: #059669; font-size: 16px; border-top: 1px solid #E8D5C8;">Rp ${totalFormatted}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${invoiceUrl}" target="_blank" style="background-color: #059669; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(5,150,105,0.25);">
        📄 Lihat E-Slip Invoice Payroll
      </a>
    </div>

    ${slipUrl ? `
    <p style="font-size: 12px; color: #7A6E65;">Lampiran Bukti Transfer Bank: <a href="${slipUrl}" target="_blank" style="color: #2563EB; text-decoration: underline;">Lihat Bukti Transfer</a></p>
    ` : ''}

    <p style="font-size: 12px; color: #7A6E65; margin-bottom: 0;">Terima kasih banyak atas dedikasi dan karya terbaik Anda bersama ${studio.name}!</p>
  `;

  return sendEmail({
    to: fg.email,
    subject: `💸 [E-Slip Honor] Pembayaran Payroll Fotografer — Ref: ${transferRef}`,
    title: `💸 Konfirmasi Pembayaran Payroll`,
    badge: `BUKTI TRANSFER RESMI`,
    contentHtml
  });
}

/**
 * Send Confirmation Email when Candidate Freelancer Registers
 */
async function sendFreelancerRegistrationEmail({ name, email, city, specialties = [] }) {
  if (!email) return { ok: false, error: 'Email tidak tersedia' };

  const studio = getStudioIdentity();
  let specText = Array.isArray(specialties) ? specialties.join(', ') : specialties;

  const contentHtml = `
    <p style="margin-top: 0;">Halo <strong>${name}</strong>,</p>
    <p>Terima kasih atas ketertarikan Anda untuk bergabung sebagai mitra fotografer freelance di <strong>${studio.name}</strong>.</p>
    
    <div style="background-color: #FAF6F0; border-radius: 12px; border: 1px solid #E8D5C8; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #2D1B14;">
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; width: 38%;">Nama Pendaftar:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Domisili:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${city || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Spesialisasi:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${specText || 'Fotografi Wisuda'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; border-top: 1px solid #E8D5C8;">Status Pendaftaran:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #9A6B2F; border-top: 1px solid #E8D5C8;">Dalam Peninjauan Admin (Reviewing)</td>
        </tr>
      </table>
    </div>

    <p>Berkas formulir dan tautan portofolio karya Anda telah aman tersimpan di sistem kami. Tim kurasi ${studio.name} akan meninjau kelayakan peralatan & portofolio Anda dalam 1–3 hari kerja.</p>
    <p style="font-size: 12px; color: #7A6E65; margin-bottom: 0;">Keputusan penerimaan dan kode akses portal akan dikirimkan langsung ke Email & nomor WhatsApp Anda.</p>
  `;

  return sendEmail({
    to: email,
    subject: `📋 [Pendaftaran Diterima] Pendaftaran Fotografer Freelance — ${name}`,
    title: `📋 Pendaftaran Mitra Freelance Diterima`,
    badge: `PENDAFTARAN MASUK`,
    contentHtml
  });
}

/**
 * Send Approval & Access Code Email to Accepted Freelancer
 */
async function sendFreelancerApprovalEmail({ name, email, accessCode, portalUrl, city, defaultRate = 0 }) {
  if (!email) return { ok: false, error: 'Email tidak tersedia' };

  const studio = getStudioIdentity();
  const rateFormatted = Number(defaultRate || 0).toLocaleString('id-ID');

  const contentHtml = `
    <p style="margin-top: 0;">Selamat <strong>${name}</strong>! 🎉</p>
    <p>Pendaftaran Anda telah <strong>DISETUJUI</strong>. Anda kini resmi terdaftar sebagai mitra fotografer freelance di <strong>${studio.name}</strong>.</p>
    
    <div style="background-color: #FAF6F0; border-radius: 12px; border: 1px solid #E8D5C8; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #2D1B14;">
        <tr>
          <td style="padding: 6px 0; color: #7A6E65; width: 38%;">Nama Mitra:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Domisili Area:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #111E35;">${city || '-'}</td>
        </tr>
        ${Number(defaultRate) > 0 ? `
        <tr>
          <td style="padding: 6px 0; color: #7A6E65;">Standar Fee / Sesi:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #059669;">Rp ${rateFormatted}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0 4px 0; color: #7A6E65; border-top: 1px solid #E8D5C8;">Kode Akses Portal:</td>
          <td style="padding: 8px 0 4px 0; font-weight: bold; font-family: monospace; color: #9A6B2F; font-size: 16px; letter-spacing: 1.5px; border-top: 1px solid #E8D5C8;">${accessCode}</td>
        </tr>
      </table>
    </div>

    <p>Silakan klik tombol di bawah ini untuk langsung masuk ke <strong>Portal Freelancer</strong> Anda menggunakan Kode Akses di atas:</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${portalUrl}" target="_blank" style="background-color: #111E35; color: #D4AF37; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(17,30,53,0.25);">
        🚀 Buka Portal Freelancer
      </a>
    </div>

    <div style="background-color: #FAF6F0; border-radius: 8px; border-left: 4px solid #C59B63; padding: 12px 16px; margin: 18px 0; font-size: 12px; color: #5C4B40;">
      <strong>Petunjuk Penting:</strong> Simpan kode akses Anda dengan baik. Melalui Portal Freelance, Anda dapat mengatur tanggal ketersediaan jadwal (availability), menerima penawaran pemotretan wisuda baru, serta memantau slip pembayaran payroll.
    </div>

    <p style="font-size: 12px; color: #7A6E65; margin-bottom: 0;">Selamat berkarya dan sukses bersama ${studio.name}!</p>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 [Selamat Bergabung] Kemitraan Fotografer Freelance Disetujui — ${studio.name}`,
    title: `🎉 Kemitraan Freelance Disetujui`,
    badge: `KEMITRAAN RESMI`,
    contentHtml
  });
}

module.exports = {
  getStudioIdentity,
  getSmtpConfig,
  createTransporter,
  verifySmtpConnection,
  sendTestEmail,
  sendEmail,
  sendFreelancerRegistrationEmail,
  sendFreelancerApprovalEmail,
  sendAssignmentEmail,
  sendPayrollEmail,
  wrapLuxuryEmailTemplate
};
