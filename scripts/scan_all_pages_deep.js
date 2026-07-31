const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function scanAllPages() {
  console.log('🚀 Starting Deep Visual UI Audit on ALL 21 Public & Admin Pages...');

  const outputDir = path.resolve(__dirname, '../DATA/uploads/all_pages');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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
  await page.setViewport({ width: 1366, height: 850 });

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

  const allPages = [
    { id: 'admin_dashboard', url: 'http://localhost:8081/admin/dashboard', label: 'Admin Dashboard' },
    { id: 'admin_inquiries', url: 'http://localhost:8081/admin/inquiries', label: 'Admin Inquiries' },
    { id: 'admin_bookings', url: 'http://localhost:8081/admin/bookings', label: 'Admin Bookings & Assignments' },
    { id: 'admin_deliverables', url: 'http://localhost:8081/admin/deliverables', label: 'Admin Post Production' },
    { id: 'admin_payroll', url: 'http://localhost:8081/admin/payroll', label: 'Admin Payroll Summary' },
    { id: 'admin_freelancers', url: 'http://localhost:8081/admin/freelancers', label: 'Admin Freelancers Directory' },
    { id: 'admin_packages', url: 'http://localhost:8081/admin/packages', label: 'Admin Package Management' },
    { id: 'admin_portfolio', url: 'http://localhost:8081/admin/portfolio', label: 'Admin Portfolio Manager' },
    { id: 'admin_reports', url: 'http://localhost:8081/admin/reports', label: 'Admin Financial Reports' },
    { id: 'admin_archive', url: 'http://localhost:8081/admin/archive', label: 'Admin Archive Data' },
    { id: 'admin_settings', url: 'http://localhost:8081/admin/settings', label: 'Admin Settings & OAuth Wizard' },

    { id: 'public_index', url: 'http://localhost:8081/index.html', label: 'Public Landing Page' },
    { id: 'public_inquiry', url: 'http://localhost:8081/inquiry.html', label: 'Public Reservation Form' },
    { id: 'public_confirm_booking', url: 'http://localhost:8081/confirm-booking.html?token=2380a34492291f153ec4626f9b65ccc8', label: 'Client Token Confirmation' },
    { id: 'public_freelance_portal', url: 'http://localhost:8081/freelance-portal.html', label: 'Freelance Portal' },
    { id: 'public_freelancer_register', url: 'http://localhost:8081/freelancer-register.html', label: 'Freelancer Registration Form' },
    { id: 'public_select_photos', url: 'http://localhost:8081/select-photos.html?token=TRK-10-88AC41', label: 'Client Select Photos Gallery' },
    { id: 'public_tracking', url: 'http://localhost:8081/tracking.html?token=TRK-10-88AC41', label: 'Client Order Tracking' },
    { id: 'public_portfolio', url: 'http://localhost:8081/portfolio.html', label: 'Public Portfolio Gallery' },
    { id: 'public_moodboard', url: 'http://localhost:8081/moodboard.html', label: 'Public Moodboard' },
    { id: 'public_invoice', url: 'http://localhost:8081/invoice.html?booking_id=10', label: 'Client Digital Invoice' },
    { id: 'public_payout_invoice', url: 'http://localhost:8081/payout-invoice.html?id=1', label: 'Freelance Payout Receipt' }
  ];

  for (const item of allPages) {
    try {
      await page.goto(item.url, { waitUntil: 'load', timeout: 3000 });
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
    const fileRelPath = `DATA/uploads/all_pages/${item.id}.png`;
    await page.screenshot({ path: path.resolve(__dirname, '..', fileRelPath) });
    console.log(`✓ Scanned [${item.label}] -> ${fileRelPath}`);
  }

  await browser.close();
  console.log('\n✅ COMPLETED ALL 21 PAGES SCREENSHOT SCAN!');
}

scanAllPages().catch(err => {
  console.error('Deep scan error:', err);
  process.exit(1);
});
