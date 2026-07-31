const puppeteer = require('puppeteer');
const path = require('path');

async function captureAll() {
  console.log('Starting puppeteer to capture authentic logged-in screenshots...');

  // 1. Fetch Session Cookie via API login
  const loginRes = await fetch('http://localhost:8081/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  const loginData = await loginRes.json();
  const setCookieHeader = loginRes.headers.get('set-cookie');
  console.log('Login API response:', loginData.user ? 'Success' : 'Failed');

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
  await page.setViewport({ width: 1366, height: 768 });

  if (sidValue) {
    await page.setCookie({
      name: 'wisuda.sid',
      value: sidValue,
      domain: 'localhost',
      path: '/'
    });
  }

  // Go to root to set localStorage
  await page.goto('http://localhost:8081/admin/dashboard', { waitUntil: 'networkidle2' });
  await page.evaluate((tok, usr) => {
    localStorage.setItem('token', tok);
    localStorage.setItem('auth_token', tok);
    localStorage.setItem('user', JSON.stringify(usr));
  }, loginData.token, loginData.user);

  const screenshots = [
    { url: 'http://localhost:8081/admin/deliverables', file: 'DATA/uploads/ss_deliverables.png', title: 'Post Production View' },
    { url: 'http://localhost:8081/admin/bookings', file: 'DATA/uploads/ss_bookings.png', title: 'Client & Bookings View' },
    { url: 'http://localhost:8081/admin/inquiries', file: 'DATA/uploads/ss_inquiries.png', title: 'Inquiries View' },
    { url: 'http://localhost:8081/admin/settings', file: 'DATA/uploads/ss_settings.png', title: 'Settings View' },
    { url: 'http://localhost:8081/freelance-portal.html', file: 'DATA/uploads/ss_freelance_portal.png', title: 'Freelance Portal' },
    { url: 'http://localhost:8081/select-photos.html', file: 'DATA/uploads/ss_select_photos.png', title: 'Select Photos' },
    { url: 'http://localhost:8081/tracking.html', file: 'DATA/uploads/ss_tracking.png', title: 'Order Tracking' }
  ];

  for (const item of screenshots) {
    console.log(`Capturing ${item.title} at ${item.url}...`);
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000)); // wait for Vue rendering & data fetching
    await page.screenshot({ path: path.resolve(__dirname, '..', item.file), fullPage: false });
    console.log(`Saved screenshot: ${item.file}`);
  }

  await browser.close();
  console.log('All authentic logged-in screenshots captured successfully!');
}

captureAll().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
