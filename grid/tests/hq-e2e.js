// End-to-end click-through of Grid HQ in demo mode.
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8080/hq/';
const SHOT = require('path').join(__dirname, 'shots') + '/';
const errors = [];
const results = [];
const ok = (name, cond, extra = '') => { const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`; results.push(line); console.log(line); };

// tiny 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const hook = (p) => { p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`)); p.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); }); };
  hook(page);
  const settle = async (ms = 350) => page.waitForTimeout(ms);
  // innerText applies CSS text-transform, so compare case-insensitively.
  const text = async () => (await page.locator('#main').innerText()).toLowerCase();
  const T = (s) => s.toLowerCase();

  // reset demo data for a clean run
  await page.goto(BASE + '#/settings'); await settle(600);
  await page.evaluate(() => { localStorage.clear(); });
  await page.goto(BASE + '#/'); await settle(800);
  ok('dashboard renders', (await text()).includes('the loop'));
  ok('level card renders', /level \d/i.test(await text()));
  await page.screenshot({ path: SHOT + 'dashboard.png' });

  for (const r of ['#/leads', '#/leads?tab=active', '#/leads?tab=done', '#/techs', '#/techs?tab=applications', '#/quotes', '#/quotes?status=all', '#/invoices', '#/invoices?status=paid', '#/payouts', '#/verticals', '#/settings', '#/portal']) {
    await page.goto(BASE + r); await settle(400);
    const t = await text();
    ok(`route ${r}`, !t.includes('something broke') && t.length > 40, t.includes('something broke') ? t.slice(0, 200) : '');
  }

  // ---- lead flow -----------------------------------------------------------------------
  await page.goto(BASE + '#/leads?tab=answer'); await settle(400);
  const firstRow = page.locator('tr.click').first();
  const customer = (await firstRow.locator('td').nth(1).innerText()).split('\n')[0];
  await firstRow.click(); await settle(400);
  const leadUrl = page.url();
  ok('lead detail opens', (await text()).includes(customer.toLowerCase()), customer);

  await page.click('button[data-a="call"]'); await settle(200);
  await page.fill('#note', 'Spoke with customer; confirmed symptoms.');
  await page.click('#save'); await settle(500);
  ok('log call → contacted', (await text()).includes('contacted'));
  ok('response time shown', /\d+ min\s*first response/i.test(await text()));

  await page.click('button[data-a="offer"]'); await settle(300);
  const checked = page.locator('#modal input[name=t]:checked');
  const nChecked = await checked.count();
  ok('offer modal lists matches', nChecked > 0, `${nChecked} checked`);
  const offeredTechId = nChecked ? await checked.first().inputValue() : null;
  await page.click('#modal #go'); await settle(600);
  ok('approve & offer → offered', (await text()).includes('offered'));
  ok('offers table shows techs', (await page.locator('#main table').count()) > 0);
  await page.screenshot({ path: SHOT + 'lead-offered.png' });

  // ---- portal: accept as tech ------------------------------------------------------------
  await page.goto(BASE + '#/portal'); await settle(400);
  await page.selectOption('#actas', offeredTechId); await settle(600);
  const acceptBtn = page.locator('[data-accept]').first();
  ok('portal shows offer to tech', (await acceptBtn.count()) > 0);
  await acceptBtn.click(); await settle(600);
  ok('tech accepted → job listed', (await text()).includes(customer.toLowerCase()));
  await page.screenshot({ path: SHOT + 'portal.png' });
  await page.click('#back-admin'); await settle(400);

  await page.goto(leadUrl); await settle(500);
  ok('lead now assigned', (await text()).includes('assigned'));

  // ---- quote ------------------------------------------------------------------------------
  await page.click('button[data-a="quote"]'); await settle(600);
  ok('quote builder opens', page.url().includes('#/quotes/') && (await text()).includes('line item'));
  const quoteTotalBefore = (await page.locator('.money-grid .total').nth(1).innerText());
  await page.click('[data-a="add"]'); await settle(200);
  await page.click('[data-a="send"]'); await settle(600);
  ok('quote sent', (await text()).includes('sent'), quoteTotalBefore);
  const quoteLink = (await page.locator('.card .mono').first().innerText()).trim();
  ok('customer quote link present', quoteLink.includes('public/quote.html?t='), quoteLink);

  const cust = await context.newPage(); hook(cust);
  await cust.goto(quoteLink); await cust.waitForTimeout(700);
  const qt = (await cust.locator('#root').innerText()).toLowerCase();
  ok('public quote page renders', qt.includes('your quote'), qt.slice(0, 80));
  await cust.click('#accept'); await cust.waitForTimeout(700);
  ok('customer accepts quote', (await cust.locator('#root').innerText()).toLowerCase().includes('accepted'));
  await cust.screenshot({ path: SHOT + 'public-quote.png' });

  await page.goto(leadUrl); await settle(600);
  ok('lead shows quoted', (await text()).includes('quoted'));

  // ---- invoice ------------------------------------------------------------------------------
  await page.click('button[data-a="invoice"]'); await settle(300);
  await page.setInputFiles('#modal #file', { name: 'invoice.png', mimeType: 'image/png', buffer: PNG });
  await page.click('#modal #go'); await settle(900);
  ok('invoice detail opens', page.url().includes('#/invoices/'));
  const invText = await text();
  ok('invoice in review with lines', invText.includes('review') && invText.includes('where the money goes'));
  await page.screenshot({ path: SHOT + 'invoice.png' });
  await page.click('[data-a="send"]'); await settle(800);
  ok('payment link sent', (await text()).includes('sent'));
  const payLink = (await page.locator('.card .mono').first().innerText()).trim();
  ok('pay link present', payLink.includes('public/pay.html?t='), payLink);

  await cust.goto(payLink); await cust.waitForTimeout(700);
  const pt = (await cust.locator('#root').innerText()).toLowerCase();
  ok('pay page shows both prices', pt.includes('pay by bank') && pt.includes('pay by card'));
  await cust.screenshot({ path: SHOT + 'public-pay.png' });
  await cust.click('[data-pay="ach"]'); await cust.waitForTimeout(900);
  ok('demo payment → thank you', (await cust.locator('#root').innerText()).toLowerCase().includes('thank you'));

  await page.reload(); await settle(700);
  ok('invoice shows paid', (await text()).includes('paid'));
  await page.goto(leadUrl); await settle(500);
  ok('lead shows paid', (await text()).includes('paid'));

  // ---- payouts -------------------------------------------------------------------------------
  await page.goto(BASE + '#/payouts'); await settle(500);
  const owedBefore = await page.locator('[data-pay]').count();
  const enabled = page.locator('[data-pay]:not([disabled])').first();
  ok('payout owed appears', owedBefore > 0, `${owedBefore} owed`);
  if (await enabled.count()) {
    await enabled.click(); await settle(200);
    await page.fill('#modal #ref', 'ACH TEST-001');
    await page.click('#modal #go'); await settle(600);
    const owedAfter = await page.locator('[data-pay]').count();
    ok('payout marked paid', owedAfter === owedBefore - 1, `${owedBefore} → ${owedAfter}`);
  }
  await page.screenshot({ path: SHOT + 'payouts.png' });

  // ---- techs: approve application ------------------------------------------------------------
  await page.goto(BASE + '#/techs?tab=applications'); await settle(400);
  const appBtn = page.locator('[data-act="approve"]').first();
  ok('applications listed', (await appBtn.count()) > 0);
  await appBtn.click(); await settle(600);
  ok('application approved → tech detail', page.url().includes('#/techs/') && (await text()).includes('approved'));

  // ---- verticals: forced unlock --------------------------------------------------------------
  await page.goto(BASE + '#/verticals'); await settle(400);
  await page.click('[data-a="force"]'); await settle(200);
  await page.fill('#confirm-word', 'UNLOCK');
  await page.click('#confirm-yes'); await settle(600);
  ok('vertical force-unlocked', (await text()).match(/active/gi)?.length >= 2);
  await page.screenshot({ path: SHOT + 'verticals.png' });

  // ---- settings save ---------------------------------------------------------------------------
  await page.goto(BASE + '#/settings'); await settle(400);
  await page.fill('#fees input[name=platform_fee_pct]', '12');
  await page.click('#fees button[type=submit]'); await settle(500);
  await page.goto(BASE + '#/'); await settle(500);
  await page.goto(BASE + '#/settings'); await settle(400);
  ok('settings persist', (await page.inputValue('#fees input[name=platform_fee_pct]')) === '12');

  // ---- dashboard after the flow ----------------------------------------------------------
  await page.goto(BASE + '#/'); await settle(600);
  await page.screenshot({ path: SHOT + 'dashboard-after.png' });
  ok('dashboard XP grew', /[\d,]+ xp/i.test(await text()));

  // ---- phone lead creation ----------------------------------------------------------------
  await page.goto(BASE + '#/leads'); await settle(400);
  await page.click('#new-lead'); await settle(200);
  await page.fill('#modal input[name=customer_name]', 'Test Caller');
  await page.fill('#modal input[name=phone]', '(727) 555-9999');
  await page.fill('#modal input[name=zip]', '34689');
  await page.fill('#modal textarea[name=description]', 'Test description');
  await page.click('#modal button[type=submit]'); await settle(600);
  ok('phone lead created', (await text()).includes('test caller') && (await text()).includes('contacted'));

  // mobile layout sanity
  const mob = await context.newPage(); hook(mob);
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(BASE + '#/'); await mob.waitForTimeout(600);
  const sw = await mob.evaluate(() => document.documentElement.scrollWidth);
  ok('no horizontal scroll on phone', sw <= 392, `scrollWidth ${sw}`);
  await mob.screenshot({ path: SHOT + 'mobile.png' });

  await browser.close();
  console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
  const uniq = [...new Set(errors)].filter((e) => !/favicon|manifest/.test(e));
  console.log(`\nJS errors (${uniq.length}):`); uniq.slice(0, 20).forEach((e) => console.log(' -', e));
})().catch((e) => { console.error('RUN FAILED', e); process.exit(1); });
