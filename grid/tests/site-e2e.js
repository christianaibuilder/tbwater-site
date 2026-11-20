// Boat site checks: link integrity, unique titles, JSON-LD validity, form flows, screenshots.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIST = require('path').resolve(__dirname, '..', 'sites', 'boat', 'dist');
const BASE = 'http://127.0.0.1:8081';
const SHOT = require('path').join(__dirname, 'shots') + '/';
const results = []; const errors = [];
const ok = (n, c, x = '') => { const l = `${c ? 'PASS' : 'FAIL'} ${n}${x ? ' — ' + x : ''}`; results.push(l); console.log(l); };

// ---- static checks ---------------------------------------------------------------------
const htmlFiles = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.html')) htmlFiles.push(p); } })(DIST);
const titles = new Map(); let brokenLinks = []; let badJson = 0; let h1Missing = [];
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const t = (html.match(/<title>(.*?)<\/title>/) || [])[1];
  titles.set(t, (titles.get(t) || 0) + 1);
  if (!/<h1[\s>]/.test(html)) h1Missing.push(f);
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1];
    const target = href.endsWith('/') ? path.join(DIST, href, 'index.html') : path.join(DIST, href);
    if (!fs.existsSync(target)) brokenLinks.push(`${path.relative(DIST, f)} → ${href}`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (_) { badJson++; } }
}
const dupTitles = [...titles.entries()].filter(([, n]) => n > 1);
ok(`${htmlFiles.length} html pages built`, htmlFiles.length >= 36);
ok('all titles unique', dupTitles.length === 0, dupTitles.map(([t]) => t).join(' | '));
ok('every page has an h1', h1Missing.length === 0, h1Missing.join(', '));
ok('no broken internal links', brokenLinks.length === 0, [...new Set(brokenLinks)].slice(0, 5).join(' ; '));
ok('all JSON-LD parses', badJson === 0, `${badJson} bad`);
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
ok('sitemap has 37 urls', (sitemap.match(/<url>/g) || []).length === 37, `${(sitemap.match(/<url>/g) || []).length}`);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE + '/'); await page.waitForTimeout(400);
  ok('home renders h1', /lift, slip or driveway/i.test(await page.locator('h1').innerText()));
  await page.screenshot({ path: SHOT + 'site-home.png', fullPage: false });

  // unconfigured form shows call-us message
  await page.fill('#hero-form input[name=customer_name]', 'Test Person');
  await page.fill('#hero-form input[name=phone]', '7275550100');
  await page.fill('#hero-form input[name=zip]', '34689');
  await page.selectOption('#hero-form select[name=service_slug]', 'outboard-repair');
  await page.fill('#hero-form textarea[name=description]', 'Testing');
  await page.click('#hero-form button[type=submit]'); await page.waitForTimeout(500);
  const m1 = await page.locator('#hero-form .form-msg').innerText();
  ok('unconfigured form falls back to phone', /isn't connected|call/i.test(m1), m1.slice(0, 80));

  // configured path: swap config.js and mock Supabase
  const page2 = await ctx.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  let posted = null; let uploaded = 0;
  await page2.route('**/assets/config.js', async (route) => {
    const body = fs.readFileSync(path.join(DIST, 'assets', 'config.js'), 'utf8').replace('"supabaseUrl":""', '"supabaseUrl":"https://fake.supabase.co"').replace('"supabaseAnonKey":""', '"supabaseAnonKey":"anon-test"');
    await route.fulfill({ status: 200, contentType: 'application/javascript', body });
  });
  await page2.route('https://fake.supabase.co/**', async (route) => {
    const req = route.request();
    if (req.url().includes('/rest/v1/leads')) { posted = JSON.parse(req.postData()); return route.fulfill({ status: 201, body: '' }); }
    if (req.url().includes('/storage/v1/object/')) { uploaded++; return route.fulfill({ status: 200, body: '{}' }); }
    if (req.url().includes('/rest/v1/tech_applications')) { posted = JSON.parse(req.postData()); return route.fulfill({ status: 201, body: '' }); }
    return route.fulfill({ status: 404, body: '' });
  });
  await page2.goto(BASE + '/post-a-job/?utm_source=google'); await page2.waitForTimeout(300);
  await page2.fill('#lead-form input[name=customer_name]', 'Form Tester');
  await page2.fill('#lead-form input[name=phone]', '(813) 555-0100');
  await page2.fill('#lead-form input[name=zip]', '33572');
  await page2.selectOption('#lead-form select[name=service_slug]', 'outboard-service');
  await page2.selectOption('#lead-form select[name=make]', 'mercury');
  await page2.fill('#lead-form input[name=model]', '115 FourStroke');
  await page2.fill('#lead-form input[name=year]', '2021');
  await page2.fill('#lead-form textarea[name=description]', '100 hour service, boat on a lift.');
  await page2.setInputFiles('#lead-form input[type=file]', { name: 'boat.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
  await page2.click('#lead-form button[type=submit]');
  await page2.waitForURL('**/thanks/', { timeout: 8000 }).catch(() => {});
  ok('configured form posts lead and redirects to thanks', page2.url().includes('/thanks/'));
  ok('lead payload correct', posted && posted.customer_name === 'Form Tester' && posted.zip === '33572' && posted.county === 'Hillsborough' && posted.source === 'google_ads' && posted.equipment.make === 'mercury' && posted.photos.length === 1 && posted.status === 'new' && posted.category_id === 'marine', JSON.stringify(posted || {}).slice(0, 200));
  ok('photo uploaded to storage', uploaded === 1, `${uploaded}`);

  // brand page prefilled make, service page prefilled service
  await page2.goto(BASE + '/brands/yamaha/'); await page2.waitForTimeout(300);
  ok('brand page renders', /Yamaha/i.test(await page2.locator('h1').innerText()));
  await page2.goto(BASE + '/services/outboard-repair/'); await page2.waitForTimeout(300);
  ok('service page prefills service', (await page2.inputValue('#side-form select[name=service_slug]')) === 'outboard-repair');
  await page2.screenshot({ path: SHOT + 'site-service.png' });
  await page2.goto(BASE + '/areas/apollo-beach-ruskin/'); await page2.waitForTimeout(300);
  ok('area page renders', /Apollo Beach/i.test(await page2.locator('h1').innerText()));

  // application form
  await page2.goto(BASE + '/for-technicians/'); await page2.waitForTimeout(300);
  await page2.fill('#apply-form input[name=business_name]', 'Test Marine LLC');
  await page2.fill('#apply-form input[name=contact_name]', 'Sam Tester');
  await page2.fill('#apply-form input[name=phone]', '7275550123');
  await page2.fill('#apply-form input[name=email]', 'sam@example.com');
  await page2.fill('#apply-form input[name=home_zip]', '34698');
  await page2.check('#apply-form input[name=specialties][value=outboard-service]');
  await page2.check('#apply-form input[name=brands][value=yamaha]');
  await page2.check('#apply-form input[name=agreement_accepted]');
  await page2.click('#apply-form button[type=submit]'); await page2.waitForTimeout(500);
  ok('application posts', posted && posted.business_name === 'Test Marine LLC' && posted.specialties.includes('outboard-service') && posted.agreement_accepted === true, JSON.stringify(posted || {}).slice(0, 160));
  ok('application success message', /got it/i.test(await page2.locator('#apply-form .form-msg').innerText()));

  // mobile
  const mob = await ctx.newPage(); await mob.setViewportSize({ width: 390, height: 844 });
  mob.on('pageerror', (e) => errors.push(e.message));
  await mob.goto(BASE + '/'); await mob.waitForTimeout(400);
  const sw = await mob.evaluate(() => document.documentElement.scrollWidth);
  ok('no horizontal scroll on phone', sw <= 392, `${sw}`);
  await mob.screenshot({ path: SHOT + 'site-mobile.png' });
  await mob.goto(BASE + '/services/outboard-service/'); await mob.waitForTimeout(300);
  const sw2 = await mob.evaluate(() => document.documentElement.scrollWidth);
  ok('service page no horizontal scroll on phone', sw2 <= 392, `${sw2}`);

  await browser.close();
  console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
  const u = [...new Set(errors)].filter((e) => !/favicon|net::ERR/.test(e));
  console.log(`JS errors (${u.length}):`); u.slice(0, 10).forEach((e) => console.log(' -', e));
})().catch((e) => { console.error('RUN FAILED', e); process.exit(1); });
