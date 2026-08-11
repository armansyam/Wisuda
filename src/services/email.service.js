/**
 * Service for Email Delivery & SMTP Management
 * Wisuda Platform v2.0
 * Features Luxury Responsive Email Template Engine linked to Studio Branding Settings
 */

const nodemailer = require('nodemailer');
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
  const host = override.smtp_host !== undefined ? override.smtp_host : getSetting('smtp_host', '');
  const port = override.smtp_port !== undefined ? Number(override.smtp_port) : Number(getSetting('smtp_port', 587));
  const user = override.smtp_user !== undefined ? override.smtp_user : getSetting('smtp_user', '');
  const pass = override.smtp_pass !== undefined ? override.smtp_pass : getSetting('smtp_pass', '');
  const secure = override.smtp_secure !== undefined ? Boolean(Number(override.smtp_secure)) : Boolean(Number(getSetting('smtp_secure', 0)));
  const fromName = (override.smtp_from_name !== undefined ? override.smtp_from_name : getSetting('smtp_from_name', '')).trim() || studio.name;
  const rawFromEmail = (override.smtp_from_email !== undefined ? override.smtp_from_email : getSetting('smtp_from_email', '')).trim();
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
 * Generate Luxury HTML Wrapper for all Studio Emails
 */
function wrapLuxuryEmailTemplate({ title, badge, contentHtml, footerMeta = '' }) {
  const studio = getStudioIdentity();
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #121824; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #121824; padding: 40px 15px;">
        <tr>
          <td align="center">
            <!-- Outer Card Container -->
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
              
              <!-- Luxury Header Bar -->
              <tr>
                <td style="padding: 32px 36px 24px 36px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 2px solid #C59B63;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left" style="vertical-align: middle;">
                        ${studio.logoUrl ? `<img src="${studio.logoUrl}" alt="${studio.name}" style="height: 36px; max-width: 160px; object-fit: contain; margin-bottom: 8px; display: block;">` : ''}
                        <h1 style="margin: 0; color: #f8fafc; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">
                          ${studio.name}
                        </h1>
                        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; font-weight: 500; letter-spacing: 0.5px;">
                          OFFICIAL STUDIO NOTIFICATION
                        </p>
                      </td>
                      ${badge ? `
                      <td align="right" style="vertical-align: middle;">
                        <span style="display: inline-block; padding: 6px 14px; background: rgba(197, 155, 99, 0.15); border: 1px solid #C59B63; border-radius: 30px; color: #E5C396; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                          ${badge}
                        </span>
                      </td>` : ''}
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Email Body Content -->
              <tr>
                <td style="padding: 36px; background-color: #1e293b; color: #e2e8f0; font-size: 14px; line-height: 1.7;">
                  <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 17px; font-weight: 700;">
                    ${title}
                  </h2>
                  ${contentHtml}
                </td>
              </tr>

              <!-- Luxury Footer Bar -->
              <tr>
                <td style="padding: 24px 36px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
                  <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600;">
                    ${studio.name}
                  </p>
                  ${studio.address ? `<p style="margin: 0 0 6px 0; color: #64748b; font-size: 11px;">📍 ${studio.address}</p>` : ''}
                  ${studio.phone ? `<p style="margin: 0 0 12px 0; color: #64748b; font-size: 11px;">📞 WA Studio: ${studio.phone}</p>` : ''}
                  ${footerMeta ? `<p style="margin: 0 0 12px 0; color: #475569; font-size: 10px; font-family: monospace;">${footerMeta}</p>` : ''}
                  <p style="margin: 0; color: #475569; font-size: 10px;">
                    © ${currentYear} ${studio.name}. All rights reserved. Generated by Wisuda Platform.
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
    <div style="margin: 24px 0; padding: 20px; background: rgba(15, 118, 110, 0.15); border: 1px solid #0f766e; border-radius: 12px; color: #5eead4;">
      <div style="font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; color: #2dd4bf; display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #2dd4bf;"></span>
        STATUS KONEKSI SMTP SERVER: CONNECTED ✓
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 12px; font-family: monospace; color: #cbd5e1;">
        <tr>
          <td style="padding: 4px 0; color: #94a3b8; width: 120px;">Host Server:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #f1f5f9;">${cfg.host}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #94a3b8;">Port:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #f1f5f9;">${cfg.port} (${cfg.secure ? 'SSL/TLS' : 'STARTTLS'})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #94a3b8;">Nama Pengirim:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #f1f5f9;">${cfg.fromName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #94a3b8;">Email Pengirim:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #f1f5f9;">${cfg.fromEmail}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #94a3b8;">Waktu Uji Coba:</td>
          <td style="padding: 4px 0; font-weight: bold; color: #f1f5f9;">${new Date().toLocaleString('id-ID')}</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 0;">Sistem Email Gateway kini **siap digunakan** untuk pengiriman invoice, tanda terima pendaftaran, link foto galeri wisuda, dan pengingat pelunasan otomatis kepada klien studio.</p>
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

/**
 * Send Transactional System Email Wrapped in Luxury Card Theme
 */
async function sendEmail({ to, subject, title, badge, contentHtml, text }) {
  try {
    const cfg = getSmtpConfig();
    const transporter = createTransporter(cfg);

    const html = wrapLuxuryEmailTemplate({
      title: title || subject,
      badge: badge || 'STUDIO NOTIFICATION',
      contentHtml
    });

    const mailOptions = {
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error('[EmailService] sendEmail error:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = {
  getStudioIdentity,
  getSmtpConfig,
  createTransporter,
  verifySmtpConnection,
  sendTestEmail,
  sendEmail,
  wrapLuxuryEmailTemplate
};
