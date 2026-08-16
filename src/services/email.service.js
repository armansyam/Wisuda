/**
 * Service for Email Delivery & SMTP Management
 * Wisuda Platform v2.0
 * Features Clean Luxury Responsive Email Template Engine linked to Studio Branding Settings
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
 * Generate Clean Luxury HTML Wrapper for all Studio Emails (Fixed Light Mode)
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
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${title}</title>
      <style>
        body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        @media only screen and (max-width: 520px) {
          .email-wrapper { padding: 12px 8px !important; }
          .email-card { border-radius: 12px !important; }
          .header-cell { padding: 18px 16px !important; }
          .header-stack { display: block !important; width: 100% !important; text-align: left !important; }
          .header-badge-col { display: block !important; width: 100% !important; margin-top: 10px !important; text-align: left !important; }
          .content-cell { padding: 20px 16px !important; font-size: 13.5px !important; }
          .footer-cell { padding: 18px 16px !important; }
          .btn-action { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0F172A;">
      <table class="email-wrapper" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 30px 12px;">
        <tr>
          <td align="center">
            <!-- Outer Luxury Card Container -->
            <table class="email-card" role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);">
              
              <!-- Clean Luxury Light Header Bar -->
              <tr>
                <td class="header-cell" style="padding: 22px 28px; background-color: #FFFFFF; border-bottom: 2px solid #F1E5D8;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td class="header-stack" align="left" style="vertical-align: middle;">
                        ${displayLogo ? `<img src="${displayLogo}" alt="${studio.name}" style="height: 36px; max-width: 150px; object-fit: contain; margin-bottom: 6px; display: block;">` : ''}
                        <h1 style="margin: 0; color: #0F172A; font-size: 16px; font-weight: 800; letter-spacing: -0.2px; text-transform: uppercase;">
                          ${studio.name}
                        </h1>
                        <p style="margin: 2px 0 0 0; color: #64748B; font-size: 9.5px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">
                          OFFICIAL STUDIO NOTIFICATION
                        </p>
                      </td>
                      ${badge ? `
                      <td class="header-badge-col" align="right" style="vertical-align: middle;">
                        <span style="display: inline-block; padding: 5px 12px; background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 20px; color: #92400E; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap;">
                          ${badge}
                        </span>
                      </td>` : ''}
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Email Body Content -->
              <tr>
                <td class="content-cell" style="padding: 28px; background-color: #FFFFFF; color: #334155; font-size: 14px; line-height: 1.6;">
                  ${contentHtml}
                </td>
              </tr>

              <!-- Clean Light Footer -->
              <tr>
                <td class="footer-cell" style="padding: 20px 28px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
                  <p style="margin: 0 0 4px 0; color: #0F172A; font-size: 12px; font-weight: 700;">
                    ${studio.name}
                  </p>
                  ${studio.address ? `<p style="margin: 0 0 4px 0; color: #64748B; font-size: 11px;">📍 ${studio.address}</p>` : ''}
                  ${studio.phone ? `<p style="margin: 0 0 6px 0; color: #64748B; font-size: 11px;">📞 WA Studio: ${studio.phone}</p>` : ''}
                  ${footerMeta ? `<p style="margin: 0 0 6px 0; color: #8A7A72; font-size: 10px; font-family: monospace;">${footerMeta}</p>` : ''}
                  <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 10px; line-height: 1.5;">
                    © ${currentYear} ${studio.name} • Hak Cipta Dilindungi.<br>Pesan resmi ini dikirimkan secara otomatis oleh ${studio.name}.
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
  const logoInfo = getLogoAttachmentInfo();

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Uji Coba Verifikasi SMTP Email Gateway</h2>
    <p style="margin-top: 0;">Halo,</p>
    <p>Email ini adalah <strong>pesan uji coba otomatis</strong> dari sistem untuk memverifikasi bahwa server <strong>Email Gateway (SMTP)</strong> studio Anda telah terhubung dan aktif sempurna.</p>
    
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
    footerMeta: `Identitas Terhubung: ${cfg.studio.name}`,
    logoSrc: logoInfo.logoSrc
  });

  const mailOptions = {
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    to: targetEmail,
    subject: `🧪 [Uji Coba SMTP] ${cfg.studio.name} — Verifikasi Email Gateway`,
    html,
    attachments: logoInfo.attachments
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

const { getDb } = require('../config/database');

function recordEmailLog({ recipient_email, recipient_name, subject, template_type, category = 'client', status = 'sent', error_message = null }) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO email_logs (recipient_email, recipient_name, subject, template_type, category, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(recipient_email, recipient_name || null, subject, template_type || null, category, status, error_message || null);
  } catch (err) {
    console.error('[EmailService] recordEmailLog error:', err.message);
  }
}

/**
 * Send Transactional System Email Wrapped in Clean Luxury Card Theme
 */
async function sendEmail({ to, recipientName, subject, title, badge, contentHtml, text, templateType = 'client_notification', category = 'client' }) {
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
        'X-Mailer': `${cfg.fromName || studio.name} Mailer`,
        'X-Priority': '3',
        'Importance': 'Normal'
      },
      attachments: logoInfo.attachments
    };

    const info = await transporter.sendMail(mailOptions);
    recordEmailLog({
      recipient_email: to,
      recipient_name: recipientName,
      subject,
      template_type: templateType,
      category,
      status: 'sent'
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error('[EmailService] sendEmail error:', e.message);
    recordEmailLog({
      recipient_email: to,
      recipient_name: recipientName,
      subject,
      template_type: templateType,
      category,
      status: 'failed',
      error_message: e.message
    });
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
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Penugasan Sesi Pemotretan Wisuda</h2>
    <p style="margin-top: 0;">Halo <strong>${fg.name}</strong>,</p>
    <p>Anda telah resmi ditugaskan oleh tim <strong>${studio.name}</strong> untuk sesi dokumentasi wisuda berikut:</p>
    
    <div style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 38%;">Klien:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${booking.client_name}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Universitas:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${booking.university || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Tanggal Wisuda:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${booking.graduation_date}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Jam Sesi Foto:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${booking.shooting_time || 'TBD'} (${booking.duration_hours || booking.shooting_duration || '2'} Jam)</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Lokasi Pemotretan:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${booking.location || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Foto:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Honor / Fee Sesi:</td>
          <td style="padding: 8px 0 4px 0; font-weight: bold; color: #059669; font-size: 15px; border-top: 1px solid #E2E8F0;">Rp ${feeFormatted}</td>
        </tr>
        ${assignment.brief ? `
        <tr>
          <td style="padding: 6px 0; color: #64748B; vertical-align: top;">Brief / Arahan:</td>
          <td style="padding: 6px 0; color: #9A6B2F; font-style: italic;">${assignment.brief}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p>Silakan buka <strong>Portal Freelance</strong> untuk melihat detail brief lengkap, lokasi pemotretan, dan memantau jadwal penugasan:</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${portalUrl}" target="_blank" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        Buka Brief & Portal Freelance →
      </a>
    </div>

    <p style="font-size: 12px; color: #64748B; margin-bottom: 0;">Jika ada pertanyaan atau kendala jadwal di lapangan, segera hubungi Admin Studio melalui WhatsApp.</p>
  `;

  return sendEmail({
    to: fg.email,
    recipientName: fg.name,
    templateType: 'fg_assignment',
    category: 'freelance',
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
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Konfirmasi Pembayaran Payroll Fotografer</h2>
    <p style="margin-top: 0;">Halo <strong>${fg.name}</strong>,</p>
    <p>Honor dan fee kerja sama sesi pemotretan Anda telah <strong>berhasil ditransfer</strong> oleh <strong>${studio.name}</strong> dengan rincian sebagai berikut:</p>
    
    <div style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 38%;">Penerima:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${fg.name}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">No. Referensi:</td>
          <td style="padding: 5px 0; font-family: monospace; font-weight: bold; color: #0F172A;">${transferRef}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Tanggal Transfer:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B; vertical-align: top;">Rincian Sesi/Tugas:</td>
          <td style="padding: 5px 0; color: #0F172A;">
            <ul style="margin: 0; padding-left: 18px;">
              ${clientNames.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Total Honor Ditransfer:</td>
          <td style="padding: 8px 0 4px 0; font-weight: bold; color: #059669; font-size: 16px; border-top: 1px solid #E2E8F0;">Rp ${totalFormatted}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${invoiceUrl}" target="_blank" style="background-color: #059669; color: #FFFFFF; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
        📄 Unduh E-Slip Faktur Digital
      </a>
    </div>

    ${slipUrl ? `
    <p style="font-size: 12px; color: #64748B;">Lampiran Bukti Transfer Bank: <a href="${slipUrl}" target="_blank" style="color: #2563EB; text-decoration: underline;">Lihat Bukti Transfer</a></p>
    ` : ''}

    <p style="font-size: 12px; color: #64748B; margin-bottom: 0;">Terima kasih banyak atas dedikasi dan karya terbaik Anda bersama ${studio.name}!</p>
  `;

  return sendEmail({
    to: fg.email,
    recipientName: fg.name,
    templateType: 'fg_payroll',
    category: 'freelance',
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
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Konfirmasi Pendaftaran Mitra Fotografer</h2>
    <p style="margin-top: 0;">Halo <strong>${name}</strong>,</p>
    <p>Terima kasih atas ketertarikan Anda untuk bergabung sebagai mitra fotografer freelance di <strong>${studio.name}</strong>.</p>
    
    <div style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 38%;">Nama Pendaftar:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Domisili:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${city || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Spesialisasi:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${specText || 'Fotografi Wisuda'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Status:</td>
          <td style="padding: 8px 0 4px 0; font-weight: bold; color: #D97706; border-top: 1px solid #E2E8F0;">Dalam Peninjauan Admin (Reviewing)</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748B;">Tim kurasi kami akan meninjau portofolio dan kelayakan peralatan Anda dalam 1–3 hari kerja. Keputusan penerimaan akan dikirimkan via WhatsApp & Email.</p>
  `;

  return sendEmail({
    to: email,
    recipientName: name,
    templateType: 'fg_recruitment',
    category: 'freelance',
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
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Selamat, Pendaftaran Kemitraan Anda Disetujui!</h2>
    <p style="margin-top: 0;">Halo <strong>${name}</strong>,</p>
    <p>Pendaftaran Anda telah <strong>DISETUJUI</strong>. Anda kini resmi terdaftar sebagai mitra fotografer freelance di <strong>${studio.name}</strong>.</p>
    
    <div style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; padding: 18px 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 38%;">Nama Mitra:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Domisili Area:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${city || '-'}</td>
        </tr>
        ${Number(defaultRate) > 0 ? `
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Standar Fee / Sesi:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #059669;">Rp ${rateFormatted}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Kode Akses Portal:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; font-family: monospace; color: #9A6B2F; font-size: 15px; border-top: 1px solid #E2E8F0;">${accessCode}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155;">Silakan masuk ke portal untuk melengkapi nomor rekening bank (pencairan honor) dan menerima penugasan sesi foto:</p>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${portalUrl}" target="_blank" style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        Buka Portal Freelance Saya →
      </a>
    </div>

    <p style="font-size: 12px; color: #64748B; margin-bottom: 0;">Selamat berkarya dan sukses bersama ${studio.name}!</p>
  `;

  return sendEmail({
    to: email,
    recipientName: name,
    templateType: 'fg_recruitment_approved',
    category: 'freelance',
    subject: `🎉 [Selamat Bergabung] Kemitraan Fotografer Freelance Disetujui — ${studio.name}`,
    title: `🎉 Kemitraan Freelance Disetujui`,
    badge: `KEMITRAAN RESMI`,
    contentHtml
  });
}

/**
 * Send Polite Rejection Email when Freelancer quota is full
 */
async function sendFreelancerRejectionEmail({ name, email, city }) {
  if (!email) return { ok: false, error: 'Email tidak tersedia' };

  const studio = getStudioIdentity();

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Terima Kasih Atas Ketertarikan Kemitraan Anda</h2>
    <p style="margin-top: 0;">Halo <strong>${name}</strong>,</p>
    <p>Terima kasih banyak telah meluangkan waktu untuk mendaftar dan mengirimkan portofolio karya terbaik Anda ke <strong>${studio.name}</strong>.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #0F172A;">
        ℹ️ Status Kuota Fotografer
      </div>
      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
        Saat ini kuota penugasan fotografer untuk domisili <strong>${city || 'wilayah Anda'}</strong> pada musim wisuda ini telah terisi penuh. Oleh karena itu, kami belum dapat mengaktifkan akun kemitraan Anda saat ini.
      </p>
    </div>

    <p style="font-size: 13px; line-height: 1.6; color: #64748B;">Data portofolio dan kontak Anda telah tersimpan rapi di dalam <em>Talent Pool Database</em> kami. Tim kami akan memprioritaskan menghubungi Anda kembali apabila ada penambahan kuota pemotretan di waktu mendatang.</p>
    <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin-bottom: 0;">Kami sangat mengapresiasi karya Anda dan mendoakan kesuksesan untuk seluruh proyek fotografi Anda selanjutnya.</p>
  `;

  return sendEmail({
    to: email,
    recipientName: name,
    templateType: 'fg_recruitment_rejected',
    category: 'freelance',
    subject: `ℹ️ Informasi Pendaftaran Kemitraan Fotografer — ${studio.name}`,
    title: `Pemberitahuan Kemitraan Fotografer`,
    badge: `PEMBERITAHUAN KEMITRAAN`,
    contentHtml
  });
}

/**
 * Send Initial Inquiry / Reservation Submission Confirmation to Client
 */
async function sendClientInquiryReceivedEmail({ inquiry }) {
  if (!inquiry?.email) return { ok: false, error: 'Email klien tidak tersedia' };
  const studio = getStudioIdentity();

  const cleanPhone = (studio.phone || '').replace(/\D/g, '');
  const adminWa = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : (cleanPhone || '6281234567890');
  const waMsg = `Halo Admin ${studio.name}, saya sudah mengajukan formulir reservasi wisuda atas nama ${inquiry.name} (${inquiry.university || ''}) untuk tanggal ${inquiry.date || ''}. Mohon informasi ketersediaan jadwalnya. Terima kasih!`;
  const waUrl = `https://api.whatsapp.com/send?phone=${adminWa}&text=${encodeURIComponent(waMsg)}`;

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Permintaan Reservasi Foto Wisuda Telah Kami Terima</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${inquiry.name || 'Wisudawan/wati'}</strong>,</p>
    <p>Terima kasih telah mengajukan formulir reservasi pemotretan wisuda di <strong>${studio.name}</strong>. Data pendaftaran awal Anda telah berhasil masuk ke dalam sistem kami.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        📋 Rincian Pengajuan Reservasi
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Nama Wisudawan:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">${inquiry.name}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Universitas:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${inquiry.university || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Rencana Tanggal:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${inquiry.date || inquiry.graduation_date || '-'}</td>
        </tr>
        ${inquiry.location || inquiry.city ? `
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Lokasi / Domisili:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${inquiry.location || inquiry.city}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Status Saat Ini:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 700; color: #D97706; border-top: 1px solid #E2E8F0;">⏳ Menunggu Pengecekan Slot Jadwal oleh Admin</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #F1F5F9; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 12.5px; color: #475569; line-height: 1.6;">
      🔍 <strong>Tahap Selanjutnya:</strong><br>
      Tim admin kami sedang memeriksa ketersediaan slot fotografer & jadwal sesi untuk tanggal yang Anda ajukan. Penawaran resmi dan instruksi pembayaran DP akan segera kami kirimkan via WhatsApp & Email dalam <strong>1x24 jam</strong>.
    </div>

    <!-- Tombol Chat Diskusi WhatsApp Admin -->
    <div style="text-align: center; margin: 26px 0 16px 0;">
      <a href="${waUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
        💬 Hubungi & Diskusi dengan Admin (WhatsApp) →
      </a>
    </div>

    <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0; text-align: center;">Ada pertanyaan mendesak seputar paket atau jadwal? Jangan ragu untuk langsung berdiskusi bersama tim admin kami melalui tautan WhatsApp di atas.</p>
  `;

  return sendEmail({
    to: inquiry.email,
    recipientName: inquiry.name,
    templateType: 'client_inquiry_received',
    category: 'client',
    subject: `📋 [Reservasi Diterima] Pengajuan Jadwal Foto Wisuda — ${studio.name}`,
    title: `Permintaan Reservasi Masuk`,
    badge: `RESERVASI DITERIMA`,
    contentHtml
  });
}

/**
 * Send Inquiry Follow-Up Reminder to Prospective Client before Graduation (H-5 / H-7)
 */
async function sendInquiryFollowUpEmail({ inquiry, daysRemaining = 5, waDirectUrl, bookingUrl }) {
  if (!inquiry?.email && !inquiry?.client_email) return { ok: false, error: 'Email calon klien tidak tersedia' };
  const targetEmail = inquiry.email || inquiry.client_email;
  const clientName = inquiry.name || inquiry.client_name || 'Wisudawan/wati';
  const studio = getStudioIdentity();

  const cleanPhone = (studio.phone || '').replace(/\D/g, '');
  const adminWa = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : (cleanPhone || '6281234567890');
  const defaultWaMsg = `Halo Admin ${studio.name}, saya ${clientName} yang sebelumnya mengajukan reservasi wisuda ${inquiry.university || ''} (${inquiry.date || inquiry.graduation_date || ''}). Saya ingin melanjutkan proses booking dan mengunci jadwal foto wisuda saya.`;
  const finalWaUrl = waDirectUrl || `https://api.whatsapp.com/send?phone=${adminWa}&text=${encodeURIComponent(defaultWaMsg)}`;
  const finalBookingUrl = bookingUrl || null;

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Jadwal Wisuda Anda Semakin Dekat! Amankan Slot Pemotretan Anda</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${clientName}</strong>,</p>
    <p>Semoga persiapan wisuda dan kelulusan Anda berjalan lancar! Kami melihat tanggal prosesi wisuda Anda di <strong>${inquiry.university || 'Kampus Anda'}</strong> tinggal <strong>${daysRemaining} hari lagi</strong> (${inquiry.date || inquiry.graduation_date || '-'}).</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        📋 Rincian Pengajuan Awal Anda
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Nama Wisudawan:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">${clientName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Universitas / Kampus:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${inquiry.university || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Rencana Tanggal:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #D97706;">${inquiry.date || inquiry.graduation_date || '-'} (H-${daysRemaining})</td>
        </tr>
        ${inquiry.location || inquiry.city ? `
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Lokasi / Titik Temu:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${inquiry.location || inquiry.city}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #92400E; line-height: 1.6;">
      ⚠️ <strong>Slot Fotografer Terbatas:</strong><br>
      Kuota jadwal fotografer kami untuk tanggal wisuda tersebut sudah hampir penuh. Agar momen kelulusan bersejarah Anda bersama keluarga dan sahabat terdokumentasikan dengan sempurna, amankan jadwal pemotretan Anda sekarang sebelum kuota ditutup.
    </div>

    ${finalBookingUrl ? `
    <div style="text-align: center; margin: 24px 0 10px 0;">
      <a href="${finalBookingUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18); margin-right: 8px;">
        Lengkapi Formulir Booking Sekarang →
      </a>
      <a href="${finalWaUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; padding: 13px 26px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
        💬 Hubungi Admin via WhatsApp
      </a>
    </div>
    ` : `
    <div style="text-align: center; margin: 26px 0 16px 0;">
      <a href="${finalWaUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; padding: 13px 32px; border-radius: 8px; font-size: 13.5px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);">
        💬 Lanjutkan Booking via WhatsApp Sekarang →
      </a>
    </div>
    `}

    <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0; text-align: center;">Butuh penyesuaian paket atau konsultasi waktu? Silakan langsung klik tombol WhatsApp di atas untuk berbicara dengan tim admin kami.</p>
  `;

  return sendEmail({
    to: targetEmail,
    recipientName: clientName,
    templateType: 'client_inquiry_reminder',
    category: 'client',
    subject: `🎓 [Pengingat Wisuda H-${daysRemaining}] Amankan Slot Foto Wisuda Anda — ${studio.name}`,
    title: `Pengingat Reservasi Jadwal Wisuda`,
    badge: `FOLLOW-UP INQUIRY (H-${daysRemaining})`,
    contentHtml
  });
}

/**
 * Send Booking Link Invitation Email to Prospective Client
 */
async function sendClientBookingInvitationEmail({ inquiry, bookingUrl, expiryHours = 3 }) {
  const targetEmail = inquiry?.email || inquiry?.client_email;
  if (!targetEmail) return { ok: false, error: 'Email calon klien tidak tersedia' };
  const clientName = inquiry.client_name || inquiry.name || 'Wisudawan/wati';
  const studio = getStudioIdentity();

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Tautan Formulir Pemesanan Sesi Foto Wisuda Resmi</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${clientName}</strong>,</p>
    <p>Kabar gembira! Permintaan jadwal foto wisuda Anda di <strong>${studio.name}</strong> telah kami verifikasi dan slot kuota pemotretan <strong>TERSEDIA</strong>.</p>
    
    <div style="margin: 20px 0; padding: 18px 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #0F172A;">
        📋 Rincian Pengajuan Jadwal Anda
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 4px 0; color: #64748B; width: 140px;">Nama Wisudawan:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">${clientName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Universitas:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${inquiry.university || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Rencana Tanggal:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">${inquiry.graduation_date || inquiry.date || '-'}</td>
        </tr>
        ${inquiry.location || inquiry.city ? `
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Lokasi Acara:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${inquiry.location || inquiry.city}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #1E40AF; line-height: 1.6;">
      📝 <strong>Langkah Penyelesaian Pemesanan:</strong><br>
      1. Buka tautan formulir resmi di bawah ini.<br>
      2. Tentukan paket foto wisuda, opsi tambahan (add-ons), dan preferensi jam sesi.<br>
      3. Pilih skema pembayaran (DP 50% atau Full Payment) & unggah bukti transfer.<br>
      <em>*Tautan formulir ini berlaku selama <strong>${expiryHours} jam</strong> ke depan untuk mengamankan slot jadwal Anda.</em>
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${bookingUrl}" target="_blank" class="btn-action" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 14px 32px; border-radius: 8px; font-size: 13.5px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);">
        Lengkapi Formulir Booking Resmi →
      </a>
    </div>
  `;

  return sendEmail({
    to: targetEmail,
    recipientName: clientName,
    templateType: 'client_booking_invitation',
    category: 'client',
    subject: `🎓 [Link Booking Resmi] Lengkapi Formulir Pemesanan Foto Wisuda — ${studio.name}`,
    title: `Formulir Pemesanan Sesi Foto Wisuda`,
    badge: `FORMULIR BOOKING RESMI`,
    contentHtml
  });
}

/**
 * Send Client Booking Submission Confirmation (Waiting for Admin Verification)
 */
async function sendClientBookingSubmittedEmail({ booking }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const totalPriceFormatted = Number(booking.total_price || 0).toLocaleString('id-ID');
  const paidAmountFormatted = Number(booking.dp_amount || 0).toLocaleString('id-ID');

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Formulir Pemesanan & Bukti Pembayaran Telah Kami Terima</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Terima kasih telah melengkapi formulir pemesanan foto wisuda dan mengunggah bukti pembayaran di <strong>${studio.name}</strong>. Berkas Anda telah berhasil kami terima dan sedang dalam proses verifikasi tim admin kami.</p>
    
    <div style="margin: 20px 0; padding: 18px 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #0F172A;">
        📋 Rincian Formulir Booking yang Diajukan
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 4px 0; color: #64748B; width: 140px;">Nama Wisudawan:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">${booking.client_name}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Paket Wisuda:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Tanggal Acara:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.graduation_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Waktu Sesi:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.shooting_time || 'Sesuai Jadwal'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Total Biaya:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 700; color: #0F172A; border-top: 1px solid #E2E8F0;">Rp ${totalPriceFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Pembayaran Diajukan:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #B45309;">Rp ${paidAmountFormatted} (${booking.balance_amount === 0 ? 'Full Payment' : 'DP 50%'})</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #92400E; line-height: 1.6;">
      ⏳ <strong>Tahap Selanjutnya:</strong><br>
      Tim admin kami sedang mencocokkan mutasi bukti transfer Anda. Konfirmasi resmi beserta <strong>Kode Booking Resmi</strong> dan tautan akses <strong>Portal Tracking Pemesanan</strong> akan dikirimkan otomatis setelah verifikasi selesai (maksimal 1x24 jam).
    </div>
  `;

  const isFullPayment = Number(booking.balance_amount || 0) === 0;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_booking_submitted',
    category: 'client',
    subject: `📋 [Booking Diterima] Formulir & Pembayaran ${isFullPayment ? 'Full Payment' : 'DP 50%'} Sedang Diverifikasi — ${studio.name}`,
    title: `Booking Diterima (Menunggu Verifikasi)`,
    badge: isFullPayment ? `BOOKING DITERIMA (FULL PAYMENT)` : `BOOKING DITERIMA (DP 50%)`,
    contentHtml
  });
}

/**
 * Send Client DP Invoice (50% Due)
 */
async function sendClientDpInvoiceEmail({ booking, confirmUrl, bankAccounts = [] }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const totalPriceFormatted = Number(booking.total_price || 0).toLocaleString('id-ID');
  const dpAmountFormatted = Number(booking.dp_amount || 0).toLocaleString('id-ID');
  const balanceFormatted = Number(booking.balance_amount || 0).toLocaleString('id-ID');

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Konfirmasi Reservasi & Tagihan Uang Muka (DP 50%)</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Terima kasih telah melakukan reservasi sesi foto wisuda di <strong>${studio.name}</strong>. Berikut rincian tagihan uang muka (DP) untuk mengunci jadwal pemotretan Anda:</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        📋 Rincian Paket & Pembagian Tagihan DP
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Kode Booking:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">BK-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Tanggal Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.graduation_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Total Harga Paket:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">Rp ${totalPriceFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Wajib Bayar DP (50%):</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #B45309; font-size: 15px; border-top: 1px solid #E2E8F0;">Rp ${dpAmountFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Sisa Pelunasan:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #64748B;">Rp ${balanceFormatted} (Sebelum Sesi / Unduh Foto)</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${confirmUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">
        Upload Bukti Transfer DP →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_dp_invoice',
    category: 'client',
    subject: `📋 [Tagihan DP] Konfirmasi Reservasi Foto Wisuda — ${studio.name}`,
    title: `Tagihan Uang Muka (DP 50%)`,
    badge: `INVOICE DP 50%`,
    contentHtml
  });
}

/**
 * Send Client Full Payment Invoice (100% Due)
 */
async function sendClientFullInvoiceEmail({ booking, confirmUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const totalPriceFormatted = Number(booking.total_price || 0).toLocaleString('id-ID');

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Konfirmasi Reservasi & Tagihan Full Payment (100%)</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Terima kasih telah memilih opsi <strong>Pembayaran Penuh 100% (Full Payment)</strong> untuk sesi foto wisuda Anda di <strong>${studio.name}</strong>. Berikut rincian penawaran & tagihan resmi Anda:</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        📋 Rincian Paket & Tagihan Pembayaran Penuh
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Kode Booking:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">BK-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Tanggal Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.graduation_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Skema Pembayaran:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #3730A3;">Full Payment (100% Lunas di Depan)</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Total Tagihan:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #0F172A; font-size: 16px; border-top: 1px solid #E2E8F0;">Rp ${totalPriceFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Sisa Pelunasan Nanti:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #059669;">Rp 0 (Bebas Tagihan Lanjutan)</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${confirmUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">
        Upload Bukti Transfer Full Payment →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_balance_invoice',
    category: 'client',
    subject: `📋 [Tagihan Lunas] Tagihan Full Payment Foto Wisuda — ${studio.name}`,
    title: `Tagihan Pembayaran Penuh (100%)`,
    badge: `INVOICE FULL PAYMENT`,
    contentHtml
  });
}

/**
 * Send Client QRIS Invoice Email (with embedded QR Code & direct payment link)
 */
async function sendClientQrisInvoiceEmail({ booking, qrisData, paymentUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const amountFormatted = Number(qrisData?.amount || booking?.dp_amount || booking?.total_price || 0).toLocaleString('id-ID');
  const paymentTypeLabel = qrisData?.payment_type === 'full' ? 'Pelunasan Penuh (100%)' : (qrisData?.payment_type === 'balance' ? 'Pelunasan Sisa Tagihan' : 'Uang Muka (DP)');
  const expiredAtFormatted = qrisData?.expired_at || '15 Menit';
  const qrImage = qrisData?.qr_image || '';

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Tagihan & Kode QRIS Pembayaran Sesi Foto Wisuda</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Terima kasih telah melakukan konfirmasi reservasi sesi foto wisuda di <strong>${studio.name}</strong>. Jadwal dan slot Anda sedang <strong>ditahan sementara</strong> menunggu penyelesaian pembayaran via QRIS.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        📋 Rincian Tagihan QRIS Dinamis
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Kode Booking:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">BK-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Tanggal Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.graduation_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Jenis Pembayaran:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #3730A3;">${paymentTypeLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Total Tagihan QRIS:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #B45309; font-size: 16px; border-top: 1px solid #E2E8F0;">Rp ${amountFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #DC2626;">Batas Waktu Berlaku:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #DC2626;">⏳ ${expiredAtFormatted}</td>
        </tr>
      </table>
    </div>

    <!-- QRIS Live Box -->
    <div style="margin: 24px auto; max-width: 320px; text-align: center; padding: 22px; background-color: #FAF9F6; border: 2px dashed #C59B63; border-radius: 16px;">
      <div style="font-size: 11px; font-weight: 800; color: #1A1A2E; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
        ⚡ Scan QRIS via M-Banking / E-Wallet
      </div>
      ${qrImage ? `
      <div style="background-color: #FFFFFF; padding: 12px; border-radius: 12px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid #E5E0D8;">
        <img src="${qrImage}" alt="Kode QRIS" width="220" height="220" style="display: block; margin: 0 auto; border-radius: 8px;" />
      </div>
      ` : ''}
      <p style="margin: 12px 0 0 0; font-size: 11px; color: #64748B; line-height: 1.4;">
        Mendukung <strong>BCA Mobile, Livin Mandiri, BRImo, BNI, GoPay, OVO, Dana, ShopeePay</strong> & seluruh aplikasi QRIS nasional.
      </p>
    </div>

    <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #1E40AF; line-height: 1.5;">
      💡 <strong>Tips Pembayaran:</strong><br>
      Jika Anda membuka email ini di smartphone, Anda dapat menekan dan menahan gambar QRIS di atas untuk menyimpannya ke galeri foto, lalu buka aplikasi M-Banking Anda dan pilih opsi <strong>Scan QR dari Galeri</strong>.
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${paymentUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        Buka Halaman Pembayaran Langsung →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_qris_invoice',
    category: 'client',
    subject: `⚡ [Tagihan QRIS] Segera Selesaikan Pembayaran Foto Wisuda — ${studio.name}`,
    title: `Tagihan & Kode QRIS Pembayaran`,
    badge: `TAGIHAN QRIS AKTIF`,
    contentHtml
  });
}

/**
 * Send Client QRIS Expired Notification Email (with direct renewal CTA button)
 */
async function sendClientQrisExpiredEmail({ booking, qrisData, retryUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const amountFormatted = Number(qrisData?.amount || booking?.dp_amount || booking?.total_price || 0).toLocaleString('id-ID');

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Kode QRIS Pembayaran Telah Kedaluwarsa</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Kami menginformasikan bahwa batas waktu pembayaran kode QRIS untuk pemesanan foto wisuda Anda di <strong>${studio.name}</strong> telah <strong>berakhir (kedaluwarsa)</strong> karena belum terselesaikan.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #991B1B;">
        ⏱️ Informasi Tagihan yang Kedaluwarsa
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Kode Booking:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">BK-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Nominal Tagihan:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">Rp ${amountFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #FECACA;">Status QRIS:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #DC2626; font-size: 14px; border-top: 1px solid #FECACA;">⏱️ Kedaluwarsa (Expired)</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #92400E; line-height: 1.5;">
      ✨ <strong>Jangan Khawatir!</strong><br>
      Data pemesanan Anda tidak terhapus. Anda dapat membuat ulang kode QRIS baru kapan saja secara instan dengan menekan tombol di bawah ini.
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${retryUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        🔄 Buat Ulang Kode QRIS Baru Sekarang →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_qris_expired',
    category: 'client',
    subject: `⏱️ [QRIS Kedaluwarsa] Kode QRIS Pembayaran Foto Wisuda Telah Berakhir — ${studio.name}`,
    title: `Pemberitahuan Kode QRIS Kedaluwarsa`,
    badge: `QRIS KEDALUWARSA`,
    contentHtml
  });
}

/**
 * Send Client DP Verified Confirmation (Jadwal Terkunci)
 */
async function sendClientDpVerifiedEmail({ booking, trackingUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const dpAmountFormatted = Number(booking.dp_amount || 0).toLocaleString('id-ID');
  const balanceFormatted = Number(booking.balance_amount || 0).toLocaleString('id-ID');
  const totalPriceFormatted = Number(booking.total_price || 0).toLocaleString('id-ID');

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Pembayaran DP Terverifikasi & Jadwal Terkunci</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Pembayaran uang muka (DP) Anda telah <strong>berhasil diverifikasi sah</strong> oleh tim admin <strong>${studio.name}</strong>. Jadwal sesi foto wisuda Anda kini telah <strong>RESMI TERKUNCI</strong> di sistem kami.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        📋 Rincian Jadwal & Status Pembayaran DP
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Kode Booking:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">BK-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Tanggal Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.graduation_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Total Biaya Paket:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">Rp ${totalPriceFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">DP Diterima (50%):</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #059669; font-size: 14px; border-top: 1px solid #E2E8F0;">✅ Rp ${dpAmountFormatted} (Sah)</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Sisa Pelunasan:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #B45309;">Rp ${balanceFormatted} (Sebelum Sesi / Unduh Foto)</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 12px; color: #92400E;">
      <strong>Informasi Penting:</strong> Tim fotografer studio akan ditugaskan <strong>H-3</strong> sebelum tanggal pemotretan. Anda dapat memantau progres persiapan dan detail penugasan melalui portal tracking.
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        Buka Portal Tracking Pemesanan →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_dp_verified',
    category: 'client',
    subject: `✅ [DP Terverifikasi] Jadwal Foto Wisuda Anda Resmi Terkunci — ${studio.name}`,
    title: `Pembayaran DP Terverifikasi & Jadwal Terkunci`,
    badge: `DP TERVERIFIKASI`,
    contentHtml
  });
}

/**
 * Send Client Full Balance Paid Confirmation (Lunas 100%)
 */
async function sendClientBalancePaidEmail({ booking, trackingUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const totalPriceFormatted = Number(booking.total_price || 0).toLocaleString('id-ID');

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Konfirmasi Pembayaran Pelunasan (Lunas 100%)</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Pembayaran pelunasan sesi foto wisuda Anda telah <strong>berhasil diverifikasi sah</strong> oleh tim admin <strong>${studio.name}</strong>. Status pemesanan Anda kini telah <strong>LUNAS 100%</strong>.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        🧾 Rincian Faktur & Kwitansi Lunas
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 140px;">No. Invoice:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">INV-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Tanggal Sesi:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.graduation_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Total Pembayaran:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">Rp ${totalPriceFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Status Pelunasan:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #059669; font-size: 14px; border-top: 1px solid #E2E8F0;">✅ LUNAS (Rp 0 Sisa Tagihan)</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155;">Akses pemilihan foto pilihan dan pengunduhan file master resolusi tinggi di Google Drive kini telah <strong>terbuka penuh</strong>.</p>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        Buka Portal Tracking & Hasil Foto →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_balance_verified',
    category: 'client',
    subject: `✅ [Kwitansi Lunas] Pembayaran Pelunasan Terverifikasi Sah — ${studio.name}`,
    title: `Konfirmasi Pembayaran Pelunasan`,
    badge: `PEMBAYARAN LUNAS`,
    contentHtml
  });
}

/**
 * Send H-3 Pre-Shoot Briefing & Penugasan FG (with Moodboard Info & Tracking Link) to Client
 */
async function sendClientH3ReminderEmail({ booking, fg, trackingUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const appUrl = (getSetting('app_url') || 'http://localhost:3000').replace(/\/$/, '');
  const finalTrackingUrl = trackingUrl || (booking.tracking_code ? `${appUrl}/tracking.html?code=${booking.tracking_code}` : `${appUrl}/tracking.html`);

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Persiapan Sesi Foto Wisuda (H-3) & Penugasan Tim Fotografer</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Sesi foto wisuda spesial Anda bersama tim <strong>${studio.name}</strong> tinggal <strong>3 hari lagi</strong>! Kami telah menugaskan fotografer resmi yang akan mengabadikan momen berharga kelulusan Anda:</p>
    
    <div style="margin: 20px 0; padding: 18px 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #0F172A;">
        📸 Detail Jadwal & Tim Fotografer Bertugas
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 4px 0; color: #64748B; width: 140px;">Nama Fotografer:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">Kak ${fg?.name || 'Tim Fotografer Studio'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Hari & Tanggal:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.graduation_date}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Waktu Sesi:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.shooting_time || 'Sesuai Jadwal'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Titik Temu / Lokasi:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.location || '-'}${booking.university ? ` (${booking.university})` : ''}</td>
        </tr>
      </table>
    </div>

    <div style="margin: 20px 0; padding: 18px 20px; background-color: #FDF4FF; border: 1px solid #F0ABFC; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #86198F;">
        🎨 Fitur Moodboard: Tambahkan Referensi Pose & Konsep Foto Impian
      </div>
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #701A75; line-height: 1.6;">
        Punya ide pose favorit, referensi konsep wisuda, atau gaya foto impian bersama keluarga dan sahabat? Anda dapat mengunggah referensi tersebut langsung ke menu <strong>Moodboard</strong> di Portal Tracking sebelum hari H! Tim fotografer kami akan mempelajari referensi Anda agar sesi pemotretan berjalan maksimal.
      </p>
    </div>

    <div style="margin: 20px 0; padding: 18px 20px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #1E40AF;">
        📝 Checklist Persiapan H-3
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #1E3A8A; line-height: 1.7;">
        <li>Pastikan atribut toga, topi, selempang kelulusan, dan buket bunga telah siap.</li>
        <li>Atur alokasi waktu perjalanan & make-up agar tidak terburu-buru.</li>
        <li>Hadir di lokasi pemotretan 15 menit sebelum jam sesi dimulai.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 26px 0 12px 0;">
      <a href="${finalTrackingUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);">
        Buka Portal Tracking & Atur Moodboard →
      </a>
    </div>

    <p style="text-align: center; font-size: 11px; color: #64748B; margin-top: 10px; margin-bottom: 0;">
      *Nomor WhatsApp langsung fotografer Anda akan dikirimkan otomatis pada email <strong>Final Call H-1</strong> (besok lusa) untuk koordinasi teknis di lapangan.
    </p>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_reminder_h3',
    category: 'client',
    subject: `⏰ [H-3 Wisuda] Briefing Persiapan & Penugasan Tim Fotografer — ${studio.name}`,
    title: `Pengingat H-3 Persiapan Foto Wisuda`,
    badge: `PENGINGAT H-3 WISUDA`,
    contentHtml
  });
}

/**
 * Send H-1 Pre-Shoot Briefing & Final Checklist Reminder to Client (Tomorrow is Shoot Day!)
 */
async function sendClientH1ReminderEmail({ booking, fg, waFgUrl, trackingUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const appUrl = (getSetting('app_url') || 'http://localhost:3000').replace(/\/$/, '');
  const finalTrackingUrl = trackingUrl || (booking.tracking_code ? `${appUrl}/tracking.html?code=${booking.tracking_code}` : `${appUrl}/tracking.html`);
  const finalWaFgUrl = waFgUrl || (fg?.phone ? `https://wa.me/${fg.phone.replace(/\D/g, '')}` : null);

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Pengingat H-1: Sesi Foto Wisuda Anda Adalah BESOK!</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Hari bahagia yang dinanti akhirnya tiba! Sesi pemotretan wisuda Anda bersama <strong>${studio.name}</strong> akan dilaksanakan <strong>BESOK</strong>. Berikut adalah rincian jadwal dan kontak langsung fotografer yang bertugas mendampingi Anda:</p>
    
    <div style="margin: 20px 0; padding: 18px 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #0F172A;">
        📸 Jadwal Pemotretan & Kontak Fotografer Besok
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 4px 0; color: #64748B; width: 140px;">Hari & Tanggal:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">${booking.graduation_date} (BESOK)</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Waktu Sesi:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #D97706;">${booking.shooting_time || 'Sesuai Jadwal'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Lokasi / Titik Temu:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.location || '-'}${booking.university ? ` (${booking.university})` : ''}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Fotografer Bertugas:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">Kak ${fg?.name || 'Fotografer Studio'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">WhatsApp Fotografer:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #059669;">${fg?.phone || '-'}</td>
        </tr>
      </table>
    </div>

    <div style="margin: 20px 0; padding: 18px 20px; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #92400E;">
        ⚠️ Checklist Kesiapan Malam Ini
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #78350F; line-height: 1.7;">
        <li>Gantung dan rapikan busana toga, kebaya/jas, topi, dan selempang malam ini.</li>
        <li>Hadir di lokasi titik temu 15 menit lebih awal dari jadwal yang ditentukan.</li>
        <li>Pastikan baterai smartphone terisi penuh untuk koordinasi di area kampus.</li>
        <li>Istirahat yang cukup malam ini agar tampil bugar dan ceria besok!</li>
      </ul>
    </div>

    ${finalWaFgUrl ? `
    <div style="text-align: center; margin: 24px 0 10px 0;">
      <a href="${finalWaFgUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; padding: 13px 28px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
        💬 Hubungi Fotografer via WhatsApp →
      </a>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 12px 0 10px 0;">
      <a href="${finalTrackingUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 10px 22px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none;">
        Buka Portal Tracking & Detail Jadwal →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_reminder_h1',
    category: 'client',
    subject: `⏰ [BESOK] Pengingat Sesi Foto Wisuda Besok & Kontak Fotografer — ${studio.name}`,
    title: `Pengingat Sesi Foto Wisuda Besok`,
    badge: `FINAL CALL: BESOK HARI H`,
    contentHtml
  });
}

/**
 * Send H-1 Shoot Day Assignment & Gear Checklist Reminder to Freelance Photographer
 */
async function sendFreelancerH1ReminderEmail({ booking, fg, portalUrl, waClientUrl }) {
  if (!fg?.email) return { ok: false, error: 'Email fotografer tidak tersedia' };
  const studio = getStudioIdentity();

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Briefing Tugas Sesi Pemotretan Wisuda BESOK!</h2>
    <p style="margin-top: 0;">Halo <strong>${fg.name}</strong>,</p>
    <p>Pengingat tugas sesi pemotretan wisuda kamu untuk <strong>BESOK</strong>. Mohon pastikan seluruh persiapan teknis dan rundown telah siap:</p>
    
    <div style="margin: 20px 0; padding: 18px 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #0F172A;">
        📸 Detail Tugas Pemotretan Besok
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 4px 0; color: #64748B; width: 140px;">Klien:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #0F172A;">${booking.client_name} (${booking.university || '-'})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Waktu Sesi:</td>
          <td style="padding: 4px 0; font-weight: 700; color: #2563EB;">${booking.shooting_time || 'Sesuai Jadwal'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Lokasi / Kampus:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #0F172A;">${booking.location || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Kontak Klien:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #059669;">${booking.client_phone || '-'}</td>
        </tr>
      </table>
    </div>

    <div style="margin: 20px 0; padding: 18px 20px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #1E40AF;">
        ⚙️ Checklist Peralatan Kamera Malam Ini
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #1E3A8A; line-height: 1.7;">
        <li>Baterai kamera terisi full 100% (siapkan baterai cadangan).</li>
        <li>Memory card format kosong dan siap digunakan.</li>
        <li>Lensa, flash eksternal, dan baterai flash siap.</li>
        <li>Standby di titik lokasi 15 menit sebelum jam sesi dimulai.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 24px 0 10px 0;">
      ${portalUrl ? `
      <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 12px 26px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; margin-right: 8px;">
        Buka Portal Freelance →
      </a>
      ` : ''}
      ${waClientUrl ? `
      <a href="${waClientUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; padding: 12px 26px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none;">
        💬 Hubungi Klien WA
      </a>
      ` : ''}
    </div>
  `;

  return sendEmail({
    to: fg.email,
    recipientName: fg.name,
    templateType: 'fg_reminder_h1',
    category: 'freelance',
    subject: `📸 [TUGAS BESOK] Pengingat Sesi Pemotretan Wisuda Klien — ${studio.name}`,
    title: `Pengingat Tugas Sesi Pemotretan Besok`,
    badge: `BRIEFING TUGAS BESOK`,
    contentHtml
  });
}

/**
 * Send Photo Selection Invitation to Client
 */
async function sendClientPhotoSelectionEmail({ booking, selectionUrl, quota = 15 }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Foto Wisuda Anda Siap Dipilih untuk Tahap Editing!</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Kabar gembira! Seluruh file foto dari sesi pemotretan wisuda Anda telah selesai diunggah oleh fotografer. Halaman <strong>Pemilihan Foto Favorit</strong> kini telah <strong>DIBUKA</strong>.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        🖼️ Ketentuan Pemilihan Foto
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Kuota Foto Pilihan:</td>
          <td style="padding: 5px 0; font-weight: 800; color: #5B21B6; font-size: 14px;">${quota} Foto Pilihan Utama</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Proses Selanjutnya:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">Proses Editing Halus & Penyelarasan Warna</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155;">Silakan klik tombol di bawah untuk masuk ke galeri pemilihan foto dan tandai foto-foto favorit Anda:</p>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${selectionUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        Pilih Foto Favorit Sekarang →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_photo_selection',
    category: 'client',
    subject: `🖼️ [Pilih Foto] Galeri Pemilihan Foto Wisuda Anda Telah Dibuka — ${studio.name}`,
    title: `Pemilihan Foto Favorit Dibuka`,
    badge: `SELEKSI FOTO TERBUKA`,
    contentHtml
  });
}

/**
 * Send Client Closing Statement & Final Handover
 */
async function sendClientClosingEmail({ booking, trackingUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Selamat Atas Kelulusan Anda! Serah Terima Berkas Selesai</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Selamat atas kelulusan dan pencapaian gelar barunya! 🎓 Seluruh tim <strong>${studio.name}</strong> mengucapkan terima kasih yang sebesar-besarnya telah mempercayakan momen wisuda bahagia Anda kepada kami.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #0F172A;">
        📋 Rekapitulasi Akhir Layanan Dokumentasi
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 150px;">No. Invoice Resmi:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #0F172A;">INV-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Universitas:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.university || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Paket Dokumentasi:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Status Berkas Foto:</td>
          <td style="padding: 5px 0; font-weight: 800; color: #059669;">✅ Selesai Diedit & Terunggah Penuh</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #64748B; border-top: 1px solid #E2E8F0;">Status Pembayaran:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #059669; font-size: 14px; border-top: 1px solid #E2E8F0;">✅ LUNAS 100%</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155;">Seluruh file master foto resolusi tinggi serta hasil editing terbaik dapat Anda unduh langsung melalui link berikut:</p>

    <div style="text-align: center; margin: 28px 0 20px 0;">
      <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);">
        📁 Unduh Master File Foto (Google Drive) →
      </a>
    </div>

    <div style="background-color: #F1F5F9; border-radius: 8px; padding: 14px 18px; margin: 20px 0; text-align: center; font-size: 12px; color: #475569;">
      ❤️ <strong>Kepuasan Anda adalah Kebanggaan Kami:</strong> Mohon luangkan waktu 1 menit untuk memberikan bintang & ulasan pengalaman Anda bersama tim fotografer kami.
    </div>

    <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0; text-align: center;">Semoga sukses selalu untuk langkah karier dan masa depan Kak ${booking.client_name} selanjutnya!</p>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_closing',
    category: 'client',
    subject: `🎓 [Serah Terima] Foto Wisuda Anda Telah Siap — ${studio.name}`,
    title: `Serah Terima Hasil Foto Selesai`,
    badge: `DOKUMENTASI SELESAI`,
    contentHtml
  });
}

/**
 * Send Drive Storage Expiration Reminder to Client (H-14 & H-3)
 */
async function sendDriveRetentionEmail(booking, daysRemaining, expiryDateStr, formattedSize, trackingUrl) {
  const studio = getStudioIdentity();
  const isUrgent = daysRemaining <= 3;
  const badge = isUrgent ? '⚠️ PENTING: MASA SIMPAN H-3' : '🔔 PENGINGAT MASA SIMPAN FOTO';
  const subject = isUrgent 
    ? `⚠️ [PENTING] Sisa ${daysRemaining} Hari: Segera Unduh & Amankan Berkas Foto Wisuda Anda — ${studio.name}`
    : `🔔 [Pengingat] Batas Waktu Unduh Foto Wisuda (${daysRemaining} Hari Lagi) — ${studio.name}`;

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">${isUrgent ? 'Peringatan Batas Akhir Unduh Foto Wisuda (H-3)' : 'Pengingat Masa Simpan Cloud Storage Foto'}</h2>
    <p>Halo <strong>${booking.client_name || 'Wisudawan/wati'}</strong>,</p>
    <p>Kami ingin menginformasikan bahwa masa simpan cloud storage (Google Drive) untuk seluruh berkas foto wisuda Anda di <strong>${studio.name}</strong> akan berakhir dalam <strong>${daysRemaining} hari lagi</strong>.</p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #0F172A;">
        ⚠️ Status Folder Cloud Drive
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 40%;">ID Pemesanan:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">#BOOK-${booking.id}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Batas Akhir Unduh:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #DC2626;">${expiryDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Total Ukuran Berkas:</td>
          <td style="padding: 5px 0; font-weight: bold; color: #0F172A;">${formattedSize}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #92400E; line-height: 1.6;">
      🔒 <strong>Penting — Pastikan Berkas Sudah Diamankan:</strong><br>
      Mohon pastikan Anda telah mengunduh (download) dan menyimpan seluruh file master foto resolusi tinggi serta hasil editing ke perangkat pribadi (laptop, smartphone, atau Google Drive pribadi Anda). Setelah melewati batas tanggal di atas, folder cloud akan dibersihkan secara otomatis.
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${trackingUrl}" target="_blank" style="background-color: #DC2626; color: #FFFFFF; text-decoration: none; padding: 13px 30px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.2);">
        📥 Unduh Seluruh File Master Sekarang →
      </a>
    </div>

    <p style="font-size: 12px; color: #64748B; margin-bottom: 0;">Terima kasih atas kepercayaan Anda telah mengabadikan momen wisuda bersama ${studio.name}.</p>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'drive_retention',
    category: 'client',
    subject,
    title: isUrgent ? `⚠️ Peringatan Masa Simpan Foto` : `🔔 Pengingat Masa Simpan Foto`,
    badge,
    contentHtml
  });
}

/**
 * Send Client Overpayment / Double Payment Notification Email
 */
async function sendClientOverpaymentEmail({ booking, totalReceived, overpaymentAmount, trackingUrl }) {
  if (!booking?.client_email) return { ok: false, error: 'Client email tidak tersedia' };
  const studio = getStudioIdentity();
  const totalReceivedFormatted = Number(totalReceived || 0).toLocaleString('id-ID');
  const overpaymentFormatted = Number(overpaymentAmount || 0).toLocaleString('id-ID');
  const totalPriceFormatted = Number(booking.total_price || 0).toLocaleString('id-ID');

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 18px; color: #0F172A; font-weight: 700;">Konfirmasi Pembayaran & Kelebihan Dana</h2>
    <p style="margin-top: 0;">Halo <strong>Kak ${booking.client_name}</strong>,</p>
    <p>Kami telah menerima pembayaran Anda sebesar <strong>Rp ${totalReceivedFormatted}</strong> untuk pemesanan foto wisuda (#BK-${booking.id}) di <strong>${studio.name}</strong>.</p>
    
    <div style="margin: 24px 0; padding: 20px; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px;">
      <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: #065F46;">
        💰 Rincian Pembayaran & Kelebihan Dana
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #334155;">
        <tr>
          <td style="padding: 5px 0; color: #64748B; width: 160px;">Paket Wisuda:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">${booking.package_name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Total Harga Paket:</td>
          <td style="padding: 5px 0; font-weight: 600; color: #0F172A;">Rp ${totalPriceFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #64748B;">Total Uang Diterima:</td>
          <td style="padding: 5px 0; font-weight: 700; color: #059669;">Rp ${totalReceivedFormatted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px 0; color: #065F46; font-weight: 700; border-top: 1px solid #A7F3D0;">Kelebihan Pembayaran:</td>
          <td style="padding: 8px 0 4px 0; font-weight: 800; color: #059669; font-size: 15px; border-top: 1px solid #A7F3D0;">Rp ${overpaymentFormatted}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #166534; line-height: 1.5;">
      ✨ <strong>Sesi Foto Anda Telah LUNAS 100%!</strong><br>
      Tim admin kami akan segera menghubungi Anda melalui WhatsApp untuk proses pengembalian dana (refund) sebesar <strong>Rp ${overpaymentFormatted}</strong> atau pengalihan ke layanan tambahan (cetak frame/album).
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #FFFFFF; padding: 13px 30px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
        🔍 Buka Halaman Tracking & Detail Reservasi →
      </a>
    </div>
  `;

  return sendEmail({
    to: booking.client_email,
    recipientName: booking.client_name,
    templateType: 'client_overpayment',
    category: 'client',
    subject: `✅ [Lunas & Refund Dana] Konfirmasi Pembayaran Foto Wisuda — ${studio.name}`,
    title: `Konfirmasi Pembayaran & Kelebihan Dana`,
    badge: `LUNAS (OVERPAYMENT)`,
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
  sendFreelancerRejectionEmail,
  sendAssignmentEmail,
  sendPayrollEmail,
  sendClientInquiryReceivedEmail,
  sendInquiryFollowUpEmail,
  sendClientBookingInvitationEmail,
  sendClientBookingSubmittedEmail,
  sendClientDpInvoiceEmail,
  sendClientFullInvoiceEmail,
  sendClientQrisInvoiceEmail,
  sendClientQrisExpiredEmail,
  sendClientOverpaymentEmail,
  sendClientDpVerifiedEmail,
  sendClientBalancePaidEmail,
  sendClientH3ReminderEmail,
  sendClientH1ReminderEmail,
  sendFreelancerH1ReminderEmail,
  sendClientPhotoSelectionEmail,
  sendClientClosingEmail,
  sendDriveRetentionEmail,
  wrapLuxuryEmailTemplate
};
