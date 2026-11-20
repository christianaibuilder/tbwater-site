#!/usr/bin/env node
// Static site generator for the boat vertical. No dependencies.
//   node build.mjs                      → ./dist with root-relative URLs (custom domain)
//   basePath in site.config.json        → URLs prefixed, e.g. "/grid" for a GitHub Pages project site
//   node build.mjs --relative --out X   → page-relative URLs with explicit index.html (previews)
// Every page is built from content/*.json so SEO pages carry real local facts (see docs/06-seo-plan.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');
const cfg = JSON.parse(read('site.config.json'));
const services = JSON.parse(read('content/services.json'));
const brands = JSON.parse(read('content/brands.json'));
const areas = JSON.parse(read('content/areas.json'));

const argv = process.argv.slice(2);
const RELATIVE = argv.includes('--relative');
const outFlag = argv.indexOf('--out');
const out = outFlag >= 0 && argv[outFlag + 1] ? path.resolve(argv[outFlag + 1]) : path.join(here, 'dist');
const basePath = RELATIVE ? '' : String(cfg.basePath || '').replace(/\/$/, '');

function rewriteUrls(html, urlPath) {
  if (RELATIVE) {
    const segs = urlPath.split('/').filter(Boolean);
    const depth = urlPath.endsWith('/') ? segs.length : Math.max(0, segs.length - 1);
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    return html.replace(/(href|src|action)="\/(?!\/)([^"]*)"/g, (_m, attr, rest) => {
      const [p, hash] = rest.split('#');
      const fixed = p === '' ? 'index.html' : p.endsWith('/') ? p + 'index.html' : p;
      return `${attr}="${prefix}${fixed}${hash !== undefined ? '#' + hash : ''}"`;
    });
  }
  if (basePath) return html.replace(/(href|src|action)="\/(?!\/)([^"]*)"/g, (_m, attr, rest) => `${attr}="${basePath}/${rest}"`);
  return html;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const site = cfg.siteUrl.replace(/\/$/, '');
const phoneHref = `tel:${cfg.phoneE164}`;
const FONTS = 'https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:ital,wght@0,600;0,700;1,400;1,600&display=swap';
const pages = []; // for sitemap

// ---- content guards: a page without unique facts is not built --------------------------------
for (const s of services) if (!s.included?.length || !s.local_note || !s.short || !s.cost_short) throw new Error(`service ${s.slug} lacks unique content`);
for (const b of brands) if (!b.common?.length || !b.intervals) throw new Error(`brand ${b.slug} lacks unique content`);
for (const a of areas) if (!a.ramps?.length || !a.issues?.length || !a.intro) throw new Error(`area ${a.slug} lacks unique content`);

// ---- shared pieces ------------------------------------------------------------------------
const plain = (s) => String(s).replace(/\s*\(.*?\)\s*/g, ' ').trim();
const firstName = (a) => a.name.split(' and ')[0];
const serviceOptions = services.map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('');
const makeOptions = `<option value="">Not sure / other</option>` + brands.map((b) => `<option value="${b.slug}">${esc(b.name)}</option>`).join('');
const countyOptions = `<option value="">From the zip code</option>` + cfg.serviceCounties.map((c) => `<option>${esc(c)}</option>`).join('');

function leadForm({ compact = false, service = '', make = '', id = 'lead-form' } = {}) {
  return `<form class="lead-form" id="${id}" data-lead-form data-service="${esc(service)}" data-make="${esc(make)}" novalidate>
    <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="f2">
      <label>Your name<input name="customer_name" required autocomplete="name"></label>
      <label>Phone<input name="phone" type="tel" required autocomplete="tel" placeholder="(727) 555-0100"></label>
    </div>
    <div class="f2">
      <label>Zip where the boat is<input name="zip" required inputmode="numeric" pattern="[0-9]{5}" placeholder="34689"></label>
      <label>What do you need?<select name="service_slug" required><option value="">Choose one</option>${serviceOptions}</select></label>
    </div>
    ${compact ? '' : `<div class="f2">
      <label>Email, for your quote and invoice<input name="email" type="email" autocomplete="email"></label>
      <label>County<select name="county">${countyOptions}</select></label>
    </div>
    <div class="f3">
      <label>Engine make<select name="make">${makeOptions}</select></label>
      <label>Model<input name="model" placeholder="F150, 115 FourStroke"></label>
      <label>Year and hours<span class="pair"><input name="year" type="number" placeholder="2019" min="1960" max="2030" aria-label="Year"><input name="hours" type="number" placeholder="Hours" min="0" aria-label="Engine hours"></span></label>
    </div>
    <label>Where is the boat?<input name="address" placeholder="Lift behind the house, Dunedin Marina slip B-12, on a trailer"></label>`}
    <label>What is it doing?<textarea name="description" rows="${compact ? 3 : 4}" required placeholder="Won't idle. Dies at the dock unless I keep the throttle up. 2019 Yamaha F150, 410 hours."></textarea></label>
    ${compact ? '' : `<div class="f2">
      <label>How soon?<select name="urgency"><option value="asap">As soon as possible</option><option value="this_week" selected>This week</option><option value="flexible">Flexible</option></select></label>
      <label>Photos, up to 3<input name="photos" type="file" accept="image/*" multiple></label>
    </div>`}
    <label class="check"><input type="checkbox" name="sms_consent" checked> Text me about this job. Reply STOP any time.</label>
    <button class="btn primary big wide" type="submit">Get a mechanic</button>
    <p class="form-msg" role="status" aria-live="polite"></p>
    <p class="fine">Free to post, no commitment. We call back within ${cfg.responseGoalMinutes} minutes during the day and first thing after hours. By sending you agree to the <a href="/terms/">terms</a>.</p>
  </form>`;
}

function faqHtml(faqs = [], title = 'Questions we get') {
  if (!faqs.length) return '';
  return `<section class="faq"><h2>${esc(title)}</h2>${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
}
function faqSchema(faqs = []) {
  if (!faqs.length) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}
const areaServed = areas.map((a) => ({ '@type': 'City', name: firstName(a), containedInPlace: { '@type': 'AdministrativeArea', name: `${a.county} County, FL` } }));
function businessSchema(extra = {}) {
  return { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: cfg.brand, url: site, telephone: cfg.phoneE164, email: cfg.email, description: cfg.tagline, areaServed, priceRange: '$$', openingHours: 'Mo-Su 07:00-20:00', ...extra };
}
function serviceSchema(name, description, url) {
  return { '@context': 'https://schema.org', '@type': 'Service', name, description, url, serviceType: name, provider: { '@type': 'LocalBusiness', name: cfg.brand, telephone: cfg.phoneE164, url: site }, areaServed };
}

// The chart band: a generated nautical chart behind a cartouche holding the page title.
function band({ id, label = 'Tampa Bay', coast = 0.7, crumbs = '', h1, lede = '', extra = '' }) {
  return `<section class="band">
    <canvas class="chart" data-chart="${esc(id)}" data-coast="${coast}" data-label="${esc(label)}" aria-hidden="true"></canvas>
    <div class="wrap band-in"><div class="cartouche" data-chart-avoid>
      ${crumbs ? `<p class="crumbs">${crumbs}</p>` : ''}
      <h1>${h1}</h1>
      ${lede ? `<p class="lede">${lede}</p>` : ''}
      ${extra}
    </div></div>
  </section>`;
}

function ledger(list, { caption = '' } = {}) {
  return `<div class="ledger-wrap"><table class="ledger">
    ${caption ? `<caption>${esc(caption)}</caption>` : ''}
    <thead><tr><th scope="col">Service</th><th scope="col">What it covers</th><th scope="col" class="num">Typical cost here</th></tr></thead>
    <tbody>${list.map((s) => `<tr><th scope="row"><a href="/services/${s.slug}/">${esc(s.name)}</a></th><td>${esc(s.short)}</td><td class="num">${esc(s.cost_short)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}
const inlineLinks = (items) => `<ul class="inline-list">${items.map(([href, text]) => `<li><a href="${href}">${esc(text)}</a></li>`).join('')}</ul>`;
const notes = (rows) => `<dl class="notes">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

function layout({ title, description, urlPath, body, schema = [], noindex = false, bodyClass = '' }) {
  const canonical = `${site}${urlPath}`;
  const gtm = cfg.analytics?.gtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.analytics.gtmId}');</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="${esc(cfg.brand)}">
<meta name="theme-color" content="#14263a">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/site.css">
${schema.filter(Boolean).map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
${gtm}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap top-in">
  <a class="brand" href="/">${esc(cfg.brand)}</a>
  <nav aria-label="Main"><a href="/#services">Services</a><a href="/#engines">Engines</a><a href="/#areas">Areas</a><a href="/how-it-works/">How it works</a><a href="/for-technicians/">For mechanics</a></nav>
  <a class="btn primary call" href="${phoneHref}">Call ${esc(cfg.phone)}</a>
</div></header>
<main id="main">${body}</main>
<footer class="foot"><div class="wrap">
  <div class="foot-grid">
    <div><p class="foot-brand">${esc(cfg.brand)}</p><p>Mobile marine mechanics across Pinellas, Hillsborough and Pasco counties.</p><p><a href="${phoneHref}">${esc(cfg.phone)}</a><br><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p></div>
    <div><p class="foot-h">Services</p>${services.slice(0, 6).map((s) => `<a href="/services/${s.slug}/">${esc(s.name)}</a>`).join('')}</div>
    <div><p class="foot-h">Areas</p>${areas.map((a) => `<a href="/areas/${a.slug}/">${esc(a.name)}</a>`).join('')}</div>
    <div><p class="foot-h">More</p><a href="/post-a-job/">Post a job</a><a href="/for-technicians/">Join as a mechanic</a><a href="/how-it-works/">How it works</a><a href="/terms/">Terms</a><a href="/privacy/">Privacy</a></div>
  </div>
  <p class="fine">Mechanics on this site are independent, insured businesses. ${esc(cfg.brand)} introduces you, coordinates the job and collects payment on the mechanic's behalf. © ${new Date().getFullYear()} ${esc(cfg.entityName)}.</p>
</div></footer>
<a class="sticky-call" href="${phoneHref}">Call ${esc(cfg.phone)}</a>
<script src="/assets/config.js"></script>
<script src="/assets/site.js" defer></script>
<script src="/assets/chart.js" defer></script>
</body>
</html>`;
}

function write(urlPath, html, { sitemap = true } = {}) {
  const file = urlPath.endsWith('/') ? path.join(out, urlPath, 'index.html') : path.join(out, urlPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rewriteUrls(html, urlPath));
  if (sitemap) pages.push(urlPath);
}

// ---- tiny markdown → html for the legal pages ---------------------------------------------
function md(text) {
  const lines = text.split('\n'); const outp = []; let list = null;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  for (const raw of lines) {
    const l = raw.trimEnd();
    const li = l.match(/^(\d+\.|-)\s+(.*)/);
    if (li) { const t = li[1] === '-' ? 'ul' : 'ol'; if (list !== t) { if (list) outp.push(`</${list}>`); outp.push(`<${t}>`); list = t; } outp.push(`<li>${inline(li[2])}</li>`); continue; }
    if (list) { outp.push(`</${list}>`); list = null; }
    if (!l.trim()) continue;
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) { outp.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    outp.push(`<p>${inline(l)}</p>`);
  }
  if (list) outp.push(`</${list}>`);
  return outp.join('\n');
}

// ---- build -----------------------------------------------------------------------------------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'assets'))) fs.copyFileSync(path.join(here, 'assets', f), path.join(out, 'assets', f));
const zipCounty = {};
for (const a of areas) for (const z of a.zips) zipCounty[z] = a.county;
fs.writeFileSync(path.join(out, 'assets', 'config.js'), `window.SITE_CONFIG=${JSON.stringify({ brand: cfg.brand, phone: cfg.phone, phoneE164: cfg.phoneE164, email: cfg.email, categoryId: cfg.categoryId, supabaseUrl: cfg.supabaseUrl, supabaseAnonKey: cfg.supabaseAnonKey, responseGoalMinutes: cfg.responseGoalMinutes, zipCounty, counties: cfg.serviceCounties, base: RELATIVE ? null : `${basePath}/`, relative: RELATIVE })};\n`);

const crumb = (section, sectionHref, name) => `<a href="/">Home</a> <span aria-hidden="true">/</span> <a href="${sectionHref}">${esc(section)}</a> <span aria-hidden="true">/</span> ${esc(name)}`;

// Home
write('/', layout({
  title: `${cfg.brand}: mobile boat repair at your lift, slip or driveway`,
  description: `Post your boat repair job free. An insured mobile marine mechanic who knows your engine calls within ${cfg.responseGoalMinutes} minutes and comes to your lift, slip, or driveway in Pinellas, Hillsborough or Pasco.`,
  urlPath: '/', schema: [businessSchema()], bodyClass: 'home',
  body: `
  <section class="plate">
    <canvas class="chart" data-chart="home" data-coast="0.6" data-label="Gulf of Mexico" aria-hidden="true"></canvas>
    <div class="wrap plate-in">
      <div class="cartouche" data-chart-avoid>
        <h1>Boat repair at your lift, slip or driveway</h1>
        <p class="lede">Tell us what the boat is doing. We call you back within ${cfg.responseGoalMinutes} minutes, then send an insured mobile mechanic who knows your engine. Pinellas, Hillsborough and Pasco counties.</p>
        <p class="cta-row"><a class="btn primary big" href="${phoneHref}">Call ${esc(cfg.phone)}</a><a class="btn line big" href="/post-a-job/">Describe the problem</a></p>
        <p class="coords">Tampa Bay and approaches, 27°45′&nbsp;N, 82°35′&nbsp;W</p>
      </div>
      <div class="inset" data-chart-avoid><h2>Get a mechanic</h2>${leadForm({ compact: true, id: 'hero-form' })}</div>
    </div>
  </section>

  <section class="sect" id="how"><div class="wrap">
    <h2>How a job runs</h2>
    <ol class="course">
      <li><span class="wp" aria-hidden="true">1</span><h3>Post it or call it</h3><p>Boat, engine, what it's doing and where it sits. Two minutes.</p></li>
      <li><span class="wp" aria-hidden="true">2</span><h3>We call back and dispatch</h3><p>A dispatcher confirms the details, then offers the job to the two or three insured mechanics nearest you who work on your engine.</p></li>
      <li><span class="wp" aria-hidden="true">3</span><h3>A mechanic comes to the boat</h3><p>The first to accept texts you their name and a time. You approve a written quote before any work starts.</p></li>
      <li><span class="wp" aria-hidden="true">4</span><h3>Pay when it's done</h3><p>You get an itemized invoice by text or email. Pay by bank with no fee, or by card.</p></li>
    </ol>
  </div></section>

  <section class="sect" id="services"><div class="wrap">
    <h2>What we fix</h2>
    ${ledger(services)}
    <p class="fine">Mechanics set their own prices. These are typical ranges for mobile work in Pinellas and Hillsborough.</p>
  </div></section>

  <section class="sect" id="engines"><div class="wrap">
    <h2>Engines we work on</h2>
    <p class="intro">Jobs are matched by brand, so a Yamaha owner gets a mechanic who carries Yamaha service kits and reads Yamaha fault codes.</p>
    <ul class="engines">${brands.map((b) => `<li><a href="/brands/${b.slug}/">${esc(b.name)}</a><span>${esc(b.models)}</span></li>`).join('')}</ul>
  </div></section>

  <section class="sect" id="areas"><div class="wrap">
    <h2>Where we go</h2>
    <p class="intro">Anywhere a boat sits in Pinellas, Hillsborough and Pasco: lifts, slips, dry storage, driveways, and the ramp when it won't start.</p>
    <ul class="harbors">${areas.map((a) => `<li><a href="/areas/${a.slug}/">${esc(a.name)}</a><span>${esc(a.county)} County. ${esc(a.ramps.slice(0, 2).map(plain).join(', '))}.</span></li>`).join('')}</ul>
  </div></section>

  <section class="sect"><div class="wrap">
    <h2>Why not just call a shop?</h2>
    <div class="reasons">
      <div><h3>Shops are weeks out in season</h3><p>Mobile mechanics usually see you within a few days, often the same day for a boat that won't start.</p></div>
      <div><h3>No trailering, no yard fees</h3><p>The work happens on your lift or in your slip. You don't need to be there.</p></div>
      <div><h3>Still a real mechanic</h3><p>Independent and insured, matched to your engine, with a written quote and reviews from every job.</p></div>
    </div>
  </div></section>

  <div class="wrap">${faqHtml([
    { q: 'Is posting a job really free?', a: 'Yes. You pay the mechanic for the work, through a payment link, after it is done. There is no fee to post or to get a quote.' },
    { q: 'Who are the mechanics?', a: 'Independent marine mechanics and small shops in Tampa Bay, checked for experience and insurance, who have signed our standards agreement. Each job goes to mechanics who work on your engine brand near your zip code.' },
    { q: 'How fast can someone come?', a: 'Routine service is usually scheduled within a few days. A boat that won\'t start at the ramp or on a lift can often be seen the same day; call rather than post for those.' },
    { q: 'How do I pay?', a: 'When the work is done you get a link. Pay by bank transfer with no fee, or by card with a small processing fee shown up front. We pay the mechanic.' },
  ])}</div>

  <section class="closing"><div class="wrap closing-in"><p>Boat won't start at the ramp? Call, and the nearest mechanic heads over.</p><a class="btn primary big" href="${phoneHref}">Call ${esc(cfg.phone)}</a></div></section>`,
}));

// Post a job
write('/post-a-job/', layout({
  title: `Post a boat repair job in Tampa Bay | ${cfg.brand}`,
  description: 'Describe your boat problem. We call back within minutes and send an insured mobile marine mechanic to your lift, slip, or driveway.',
  urlPath: '/post-a-job/', schema: [businessSchema()],
  body: band({ id: 'post', h1: 'Post your job', lede: `Two minutes. The more you tell us, the better the match. Or call <a href="${phoneHref}">${esc(cfg.phone)}</a>.` })
    + `<div class="wrap narrow page"><div class="inset">${leadForm({})}</div></div>`,
}));

// Thanks
write('/thanks/', layout({
  title: `Job received | ${cfg.brand}`, description: 'Your job is in. Expect a call shortly.', urlPath: '/thanks/', noindex: true,
  body: band({ id: 'thanks', h1: 'Got it. Keep your phone close.', lede: `A dispatcher will call you within ${cfg.responseGoalMinutes} minutes during the day, or first thing in the morning if it's late. Then the mechanic who takes the job will text you their name and a time.` })
    + `<div class="wrap narrow page"><p class="cta-row"><a class="btn primary big" href="${phoneHref}">Call ${esc(cfg.phone)}</a></p><p class="fine">If the boat is taking on water or leaking fuel, deal with that first: Sea Tow, TowBoatUS, or 911 on the water.</p></div>`,
}), { sitemap: false });

// How it works
write('/how-it-works/', layout({
  title: `How it works | ${cfg.brand}`,
  description: 'Post or call, we dispatch an insured mobile mechanic matched to your engine, you approve a written quote, and pay by bank or card when the work is done.',
  urlPath: '/how-it-works/', schema: [businessSchema()],
  body: band({ id: 'how', h1: 'How it works', lede: 'A dispatcher between you and a mechanic who knows your engine. Here is every step, and what you pay.' })
    + `<div class="wrap narrow page prose">
  <ol class="course vertical">
    <li><span class="wp" aria-hidden="true">1</span><h3>You post or call</h3><p>Boat, engine make and model, hours if you know them, what it's doing, where it sits, and photos if you have them.</p></li>
    <li><span class="wp" aria-hidden="true">2</span><h3>A person calls you back</h3><p>Within ${cfg.responseGoalMinutes} minutes during the day. We confirm the details and make sure it's a job we can help with.</p></li>
    <li><span class="wp" aria-hidden="true">3</span><h3>We offer it to the best-matched mechanics</h3><p>Two or three insured independents near you who work on your engine brand. The first to accept gets the job and texts you their name and a time window.</p></li>
    <li><span class="wp" aria-hidden="true">4</span><h3>You approve a written quote</h3><p>For anything beyond a diagnostic visit, the quote arrives by text or email and you accept it with one tap. Parts are billed at the final amount. If the job changes, the mechanic asks you first.</p></li>
    <li><span class="wp" aria-hidden="true">5</span><h3>The work happens at the boat</h3><p>You don't need to be there. The mechanic sends photos of the work and the old parts.</p></li>
    <li><span class="wp" aria-hidden="true">6</span><h3>You pay when it's done</h3><p>A link shows the itemized invoice. Pay by bank transfer at the invoiced amount, or by card with a small processing fee shown up front. We pay the mechanic.</p></li>
  </ol>
  <h2>How mechanics are checked</h2>
  <ul><li>Years of experience and brand certifications</li><li>Commercial general liability insurance, with the certificate on file and renewals tracked</li><li>A signed standards agreement: show up, quote in writing, honor the quote, clean up</li><li>Customer reviews on every job, visible to our dispatchers</li></ul>
  <h2>What it costs</h2>
  <p>You pay the mechanic's price. Mobile marine labor in Tampa Bay runs about $120 to $150 an hour, with a trip or diagnostic fee around $75 to $150 that is usually credited toward the repair. Our fee comes out of the mechanic's side, in exchange for sending them work and handling the billing.</p>
  <p class="cta-row"><a class="btn primary big" href="/post-a-job/">Post a job</a><a class="btn line big" href="${phoneHref}">Call ${esc(cfg.phone)}</a></p></div>`,
}));

// For technicians
write('/for-technicians/', layout({
  title: `Marine mechanics: get jobs in Tampa Bay | ${cfg.brand}`,
  description: 'Free to join. We send you screened jobs near you, you set your prices, we handle quoting and billing and pay you 90% when the customer pays.',
  urlPath: '/for-technicians/', schema: [businessSchema()],
  body: band({ id: 'mechanics', coast: 0.66, h1: 'Jobs sent to your phone. Billing handled. You keep 90%.', lede: 'Boat owners in Pinellas, Hillsborough and Pasco post jobs. We screen them and offer each one to the two or three best-matched mechanics. You take the ones you want.' })
    + `<div class="wrap two page"><article class="prose">
    <h2>How it works for you</h2>
    <ul><li><b>Free to join.</b> No monthly fee and no lead fees.</li><li><b>You set your rates</b> and edit every quote before it goes out.</li><li><b>Decline anything</b>, with no penalty.</li><li><b>We collect from the customer</b> by bank or card and pay you 90% when it clears, usually within a week. No chasing invoices.</li><li><b>Upload any invoice.</b> A photo of a paper ticket is fine; we read it.</li></ul>
    <h2>What we ask</h2>
    <ul><li>Commercial general liability insurance, $1 million, with the certificate on file</li><li>A W-9 before your first payout</li><li>Your own truck, tools and parts sourcing</li><li>A call to the customer within the hour after you accept a job</li><li>Written quotes, and you honor them</li><li>Customers we introduce run through the platform for 12 months</li></ul>
    <p class="fine">You stay an independent business. Read the <a href="/terms/">customer terms</a>, and ask for the mechanic agreement before you accept your first job.</p>
  </article>
  <aside class="inset"><h2>Apply</h2>
    <form id="apply-form" data-apply-form novalidate>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="f2"><label>Business name<input name="business_name" required></label><label>Your name<input name="contact_name" required></label></div>
      <div class="f2"><label>Phone<input name="phone" type="tel" required></label><label>Email<input name="email" type="email" required></label></div>
      <div class="f2"><label>Home zip<input name="home_zip" required inputmode="numeric" pattern="[0-9]{5}"></label><label>Years in marine repair<input name="years_experience" type="number" min="0"></label></div>
      <label>Area you cover<input name="service_area_text" placeholder="Tarpon Springs to Clearwater, 25 miles"></label>
      <fieldset><legend>What you work on</legend><div class="checks">${services.map((s) => `<label class="check"><input type="checkbox" name="specialties" value="${s.slug}"> ${esc(s.name)}</label>`).join('')}</div></fieldset>
      <fieldset><legend>Brands</legend><div class="checks">${brands.map((b) => `<label class="check"><input type="checkbox" name="brands" value="${b.slug}"> ${esc(b.name)}</label>`).join('')}</div></fieldset>
      <div class="f2"><label class="check"><input type="checkbox" name="has_insurance"> I carry general liability insurance</label><label>Carrier<input name="insurance_carrier"></label></div>
      <label>Anything else<textarea name="notes" rows="3" placeholder="Certifications, dealer background, work you don't do"></textarea></label>
      <label class="check"><input type="checkbox" name="agreement_accepted" required> I understand I'd be an independent contractor who sets my own prices and can decline any job, and I agree to the mechanic agreement.</label>
      <button class="btn primary big wide" type="submit">Send application</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </form></aside></div>`,
}));

// Services
for (const s of services) {
  const related = brands.filter((b) => (s.brands || []).includes(b.slug));
  write(`/services/${s.slug}/`, layout({
    title: `${s.title} | ${cfg.brand}`, description: s.intro.slice(0, 155), urlPath: `/services/${s.slug}/`,
    schema: [serviceSchema(s.name, s.intro, `${site}/services/${s.slug}/`), faqSchema(s.faqs)],
    body: band({ id: `svc-${s.slug}`, crumbs: crumb('Services', '/#services', s.name), h1: esc(s.title), lede: esc(s.intro) })
      + `<div class="wrap two page"><article class="prose">
      ${notes([['When', esc(s.when)], ['Time on site', esc(s.duration)], ['What it usually costs here', esc(s.price_range)]])}
      <h2>What's included</h2><ul>${s.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <h2>In Tampa Bay specifically</h2><p>${esc(s.local_note)}</p>
      ${related.length ? `<h2>Engines</h2>${inlineLinks(related.map((b) => [`/brands/${b.slug}/`, b.name]))}` : ''}
      ${faqHtml(s.faqs)}
      <h2>Where</h2>${inlineLinks(areas.map((a) => [`/areas/${a.slug}/`, a.name]))}
    </article><aside class="inset sticky"><h2>Get this done</h2>${leadForm({ compact: true, service: s.slug, id: 'side-form' })}</aside></div>`,
  }));
}

// Brands
for (const b of brands) {
  const related = services.filter((s) => (s.brands || []).includes(b.slug));
  write(`/brands/${b.slug}/`, layout({
    title: `${b.title} | ${cfg.brand}`, description: b.intro.slice(0, 155), urlPath: `/brands/${b.slug}/`,
    schema: [serviceSchema(`${b.name} repair`, b.intro, `${site}/brands/${b.slug}/`), faqSchema(b.faqs)],
    body: band({ id: `brand-${b.slug}`, coast: 0.66, crumbs: crumb('Engines', '/#engines', b.name), h1: esc(b.title), lede: esc(b.intro) })
      + `<div class="wrap two page"><article class="prose">
      ${notes([['Models we see most', esc(b.models)], ['Service intervals', esc(b.intervals)], ['Parts and diagnostics', esc(b.parts)]])}
      <h2>What goes wrong on ${esc(b.name)} engines here</h2><ul>${b.common.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      ${related.length ? `<h2>Services for ${esc(b.name)}</h2>${ledger(related)}` : ''}
      ${faqHtml(b.faqs)}
      <h2>Where</h2>${inlineLinks(areas.map((a) => [`/areas/${a.slug}/`, a.name]))}
    </article><aside class="inset sticky"><h2>${esc(b.name)} mechanic</h2>${leadForm({ compact: true, make: b.slug, id: 'side-form' })}</aside></div>`,
  }));
}

// Areas
for (const a of areas) {
  const nearby = (a.nearby || []).map((n) => areas.find((x) => x.slug === n)).filter(Boolean);
  write(`/areas/${a.slug}/`, layout({
    title: `${a.title} | ${cfg.brand}`, description: a.intro.slice(0, 155), urlPath: `/areas/${a.slug}/`,
    schema: [businessSchema({ areaServed: [{ '@type': 'City', name: firstName(a), containedInPlace: { '@type': 'AdministrativeArea', name: `${a.county} County, FL` } }] }), faqSchema(a.faqs)],
    body: band({ id: `area-${a.slug}`, label: a.water_label, coast: 0.62, crumbs: crumb('Areas', '/#areas', a.name), h1: esc(a.title), lede: esc(a.intro) })
      + `<div class="wrap two page"><article class="prose">
      ${notes([['Waters', `<ul>${a.waters.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`], ['Ramps and marinas', `<ul>${a.ramps.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`], ['Boats we see', esc(a.boats)]])}
      <h2>What breaks in ${esc(firstName(a))}</h2><ul>${a.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <h2>Services</h2>${ledger(services)}
      ${faqHtml(a.faqs)}
      ${nearby.length ? `<h2>Nearby</h2>${inlineLinks(nearby.map((n) => [`/areas/${n.slug}/`, n.name]))}` : ''}
      <p class="fine">Zip codes ${a.zips.join(', ')}. ${esc(a.county)} County.</p>
    </article><aside class="inset sticky"><h2>Mechanic in ${esc(firstName(a))}</h2>${leadForm({ compact: true, id: 'side-form' })}</aside></div>`,
  }));
}

// Legal
const legalDir = path.join(here, '..', '..', 'hq', 'legal');
const terms = fs.existsSync(path.join(legalDir, 'customer-terms.md')) ? fs.readFileSync(path.join(legalDir, 'customer-terms.md'), 'utf8') : '# Terms\n\nTo be added.';
write('/terms/', layout({ title: `Customer terms | ${cfg.brand}`, description: 'Terms for customers using the platform.', urlPath: '/terms/', body: `<div class="wrap narrow page prose legal">${md(terms.replace(/\[BRAND\]/g, cfg.brand).replace(/\[ENTITY\]/g, cfg.entityName))}</div>` }));
write('/privacy/', layout({ title: `Privacy | ${cfg.brand}`, description: 'What we collect and why.', urlPath: '/privacy/', body: `<div class="wrap narrow page prose legal"><h1>Privacy</h1>
<p>We collect what the job needs: your name, phone, email, where the boat is, equipment details, photos you choose to send, and your description of the problem. We share it only with the mechanic assigned to your job and with our payment processor, Stripe, which handles card and bank details; we never see them.</p>
<p>If you check the texting box we may text you about your job; reply STOP to opt out. We do not sell your information. Email <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a> to ask what we hold or to have it deleted.</p>
<p>This site uses standard server logs and, if enabled, Google Analytics to count visits.</p></div>` }));

// 404
write('/404.html', layout({ title: `Page not found | ${cfg.brand}`, description: 'Page not found.', urlPath: '/404.html', noindex: true, body: band({ id: '404', h1: "That page isn't here", lede: `Try the <a href="/">home page</a>, <a href="/post-a-job/">post a job</a>, or call <a href="${phoneHref}">${esc(cfg.phone)}</a>.` }) }), { sitemap: false });

// sitemap, robots, CNAME
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /thanks/\nSitemap: ${site}/sitemap.xml\n`);
if (cfg.domain && !RELATIVE) fs.writeFileSync(path.join(out, 'CNAME'), cfg.domain + '\n');
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`Built ${pages.length} indexable pages (+ thanks, 404) into ${path.relative(process.cwd(), out) || '.'}${RELATIVE ? ' [relative URLs]' : basePath ? ` [base ${basePath}]` : ''}`);
