const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function runAuditScan() {
  console.log('🔍 Starting Comprehensive Visual UI & Text Overflow Audit Scan...');

  // 1. Perform Admin Login
  const loginRes = await fetch('http://localhost:8081/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  const loginData = await loginRes.json();
  const setCookieHeader = loginRes.headers.get('set-cookie');
  let sidValue = '';
  if (setCookieHeader) {
    const match = setCookieHeader.match(/wisuda\.sid=([^;]+)/);
    if (match) sidValue = match[1];
  }

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  if (sidValue) {
    await page.setCookie({
      name: 'wisuda.sid',
      value: sidValue,
      domain: 'localhost',
      path: '/'
    });
  }

  await page.goto('http://localhost:8081/admin/dashboard', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
  }, loginData.token, loginData.user);

  const scanTargets = [
    { name: '01_admin_dashboard', url: 'http://localhost:8081/admin/dashboard', label: 'Admin Dashboard Stats & Cards' },
    { name: '02_admin_inquiries', url: 'http://localhost:8081/admin/inquiries', label: 'Admin Inquiries Table' },
    { name: '03_admin_bookings', url: 'http://localhost:8081/admin/bookings', label: 'Admin Bookings & Cards' },
    { name: '04_admin_deliverables', url: 'http://localhost:8081/admin/deliverables', label: 'Admin Post Production / Deliverables Cards' },
    { name: '05_admin_payroll', url: 'http://localhost:8081/admin/payroll', label: 'Admin Payroll Summary Table' },
    { name: '06_admin_freelancers', url: 'http://localhost:8081/admin/freelancers', label: 'Admin Freelancers List' },
    { name: '07_admin_packages', url: 'http://localhost:8081/admin/packages', label: 'Admin Packages Cards' },
    { name: '08_admin_settings', url: 'http://localhost:8081/admin/settings', label: 'Admin Settings Google Drive Wizard' },
    { name: '09_freelance_portal', url: 'http://localhost:8081/freelance-portal.html', label: 'Simplified Freelance Portal' },
    { name: '10_public_inquiry', url: 'http://localhost:8081/inquiry.html', label: 'Public Reservation Form' }
  ];

  const auditResults = [];

  for (const item of scanTargets) {
    console.log(`Scanning [${item.label}]...`);
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000)); // wait for rendering

    const screenshotPath = `DATA/uploads/audit_${item.name}.png`;
    await page.screenshot({ path: path.resolve(__dirname, '..', screenshotPath), fullPage: false });

    // Inspect DOM for potential text overflow or long text in cards/tables
    const findings = await page.evaluate(() => {
      const issues = [];

      // Check long text in table cells or card titles/badges
      const elements = document.querySelectorAll('td, .card, .bg-white, .rounded-lg, span.badge, .font-medium');
      elements.forEach(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        const hasOverflow = el.scrollWidth > el.clientWidth;
        
        if (hasOverflow && text.length > 15) {
          issues.push({
            tag: el.tagName,
            class: el.className,
            textSnippet: text.substring(0, 50) + '...',
            reason: 'Horizontal Text Overflow (scrollWidth > clientWidth)'
          });
        }

        if (text.length > 40 && (el.classList.contains('badge') || el.tagName === 'SPAN')) {
          issues.push({
            tag: el.tagName,
            class: el.className,
            textSnippet: text.substring(0, 50) + '...',
            reason: 'Badge Text Exceptionally Long (> 40 chars)'
          });
        }
      });

      return issues;
    });

    auditResults.push({
      target: item.label,
      screenshot: screenshotPath,
      findingsCount: findings.length,
      findings: findings
    });
  }

  await browser.close();

  console.log('\n====================================================');
  console.log('   VISUAL UI & TEXT OVERFLOW AUDIT COMPLETED        ');
  console.log('====================================================\n');
  console.log(JSON.stringify(auditResults, null, 2));
}

runAuditScan().catch(err => {
  console.error('Audit scan error:', err);
  process.exit(1);
});
