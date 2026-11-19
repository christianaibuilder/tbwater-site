#!/usr/bin/env node
// Static site generator for the boat vertical. No dependencies.
//   node build.mjs            → writes ./dist
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
const out = path.join(here, 'dist');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const site = cfg.siteUrl.replace(/\/$/, '');
const phoneHref = `tel:${cfg.phoneE164}`;
const pages = []; // for sitemap

// ---- content guards: a page without unique facts is not built --------------------------------
for (const s of services) if (!s.included?.length || !s.local_note) throw new Error(`service ${s.slug} lacks unique content`);
for (const b of brands) if (!b.common?.length || !b.intervals) throw new Error(`brand ${b.slug} lacks unique content`);
for (const a of areas) if (!a.ramps?.length || !a.issues?.length || !a.intro) throw new Error(`area ${a.slug} lacks unique content`);

// ---- shared pieces ------------------------------------------------------------------------
const brandMap = Object.fromEntries(brands.map((b) => [b.slug, b]));
const serviceOptions = services.map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('');
const makeOptions = `<option value="">Not sure / other</option>` + brands.map((b) => `<option value="${b.slug}">${esc(b.name)}</option>`).join('');
const countyOptions = `<option value="">Auto from zip</option>` + cfg.serviceCounties.map((c) => `<option>${esc(c)}</option>`).join('');

function leadForm({ compact = false, service = '', make = '', id = 'lead-form' } = {}) {
  return `<form class="lead-form ${compact ? 'compact' : ''}" id="${id}" data-lead-form data-service="${esc(service)}" data-make="${esc(make)}" novalidate>
    <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="f2">
      <label>Your name<input name="customer_name" required autocomplete="name"></label>
      <label>Phone<input name="phone" type="tel" required autocomplete="tel" placeholder="(727) 555-0100"></label>
    </div>
    <div class="f2">
      <label>Zip where the boat is<input name="zip" required inputmode="numeric" pattern="[0-9]{5}" placeholder="34689"></label>
      <label>What do you need?<select name="service_slug" required><option value="">Choose…</option>${serviceOptions}</select></label>
    </div>
    ${compact ? '' : `<div class="f2">
      <label>Email (for your quote and invoice)<input name="email" type="email" autocomplete="email"></label>
      <label>County<select name="county">${countyOptions}</select></label>
    </div>
    <div class="f3">
      <label>Engine make<select name="make">${makeOptions}</select></label>
      <label>Model<input name="model" placeholder="F150, 115 FourStroke…"></label>
      <label>Year / hours<div class="f2 tight"><input name="year" type="number" placeholder="2019" min="1960" max="2030"><input name="hours" type="number" placeholder="hrs" min="0"></div></label>
    </div>
    <label>Where is the boat?<input name="address" placeholder="Lift behind the house / Dunedin Marina slip B-12 / on a trailer"></label>`}
    <label>What's going on?<textarea name="description" rows="${compact ? 2 : 4}" required placeholder="Won't idle, dies at the dock unless I keep the throttle up. 2019 Yamaha F150, 410 hours."></textarea></label>
    ${compact ? '' : `<div class="f2">
      <label>How soon?<select name="urgency"><option value="asap">As soon as possible</option><option value="this_week" selected>This week</option><option value="flexible">Flexible</option></select></label>
      <label>Photos (optional, up to 3)<input name="photos" type="file" accept="image/*" multiple></label>
    </div>`}
    <label class="check"><input type="checkbox" name="sms_consent" checked> It's OK to text me about this job (reply STOP any time)</label>
    <button class="btn primary big" type="submit">Get a mechanic</button>
    <p class="form-msg" role="status" aria-live="polite"></p>
    <p class="fine">Free to post. No commitment. We call within ${cfg.responseGoalMinutes} minutes during the day and first thing after hours. Or call <a href="${phoneHref}">${esc(cfg.phone)}</a>. By submitting you agree to the <a href="/terms/">terms</a>.</p>
  </form>`;
}

function faqHtml(faqs = []) {
  if (!faqs.length) return '';
  return `<section class="faq"><h2>Questions we get</h2>${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
}
function faqSchema(faqs = []) {
  if (!faqs.length) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}
const areaServed = areas.map((a) => ({ '@type': 'City', name: a.name.split(' and ')[0], containedInPlace: { '@type': 'AdministrativeArea', name: `${a.county} County, FL` } }));
function businessSchema(extra = {}) {
  return { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: cfg.brand, url: site, telephone: cfg.phoneE164, email: cfg.email, description: cfg.tagline, areaServed, priceRange: '$$', openingHours: 'Mo-Su 07:00-20:00', ...extra };
}
function serviceSchema(name, description, url) {
  return { '@context': 'https://schema.org', '@type': 'Service', name, description, url, serviceType: name, provider: { '@type': 'LocalBusiness', name: cfg.brand, telephone: cfg.phoneE164, url: site }, areaServed };
}

function layout({ title, description, urlPath, body, schema = [], noindex = false, bodyClass = '' }) {
  const canonical = `${site}${urlPath}`;
  const gtm = cfg.analytics?.gtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.analytics.gtmId}');</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="${esc(cfg.brand)}">
<meta name="theme-color" content="#0b2545">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
${schema.filter(Boolean).map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
${gtm}
</head>
<body class="${bodyClass}">
<header class="top">
  <a class="brand" href="/">${esc(cfg.brand)}</a>
  <nav><a href="/#services">Services</a><a href="/#brands">Brands</a><a href="/#areas">Areas</a><a href="/how-it-works/">How it works</a><a href="/for-technicians/">For technicians</a></nav>
  <a class="btn phone" href="${phoneHref}">📞 ${esc(cfg.phone)}</a>
</header>
<main>${body}</main>
<footer class="foot">
  <div class="wrap">
    <div><b>${esc(cfg.brand)}</b><br>Mobile marine mechanics across Pinellas, Hillsborough and Pasco counties.<br><a href="${phoneHref}">${esc(cfg.phone)}</a> · <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></div>
    <div><b>Services</b><br>${services.slice(0, 6).map((s) => `<a href="/services/${s.slug}/">${esc(s.name)}</a>`).join('<br>')}</div>
    <div><b>Areas</b><br>${areas.map((a) => `<a href="/areas/${a.slug}/">${esc(a.name)}</a>`).join('<br>')}</div>
    <div><b>More</b><br><a href="/post-a-job/">Post a job</a><br><a href="/for-technicians/">Join as a technician</a><br><a href="/how-it-works/">How it works</a><br><a href="/terms/">Terms</a> · <a href="/privacy/">Privacy</a></div>
  </div>
  <p class="fine wrap">Technicians on this platform are independent, insured businesses. ${esc(cfg.brand)} introduces you, coordinates the job, and collects payment on the technician's behalf. © ${new Date().getFullYear()} ${esc(cfg.entityName)}.</p>
</footer>
<a class="sticky-call" href="${phoneHref}">Call ${esc(cfg.phone)}</a>
<script src="/assets/config.js"></script>
<script src="/assets/site.js" defer></script>
</body>
</html>`;
}

function write(urlPath, html, { sitemap = true } = {}) {
  const file = urlPath.endsWith('/') ? path.join(out, urlPath, 'index.html') : path.join(out, urlPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
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
fs.writeFileSync(path.join(out, 'assets', 'config.js'), `window.SITE_CONFIG=${JSON.stringify({ brand: cfg.brand, phone: cfg.phone, phoneE164: cfg.phoneE164, email: cfg.email, categoryId: cfg.categoryId, supabaseUrl: cfg.supabaseUrl, supabaseAnonKey: cfg.supabaseAnonKey, responseGoalMinutes: cfg.responseGoalMinutes, zipCounty, counties: cfg.serviceCounties })};\n`);

// Home
write('/', layout({
  title: `${cfg.brand} — Mobile boat mechanics to your dock in Tampa Bay`,
  description: `Post your boat repair job free. An insured mobile marine mechanic who knows your engine calls within ${cfg.responseGoalMinutes} minutes and comes to your lift, slip, or driveway in Pinellas, Hillsborough or Pasco.`,
  urlPath: '/', schema: [businessSchema()], bodyClass: 'home',
  body: `
  <section class="hero"><div class="wrap two">
    <div>
      <p class="eyebrow">Pinellas · Hillsborough · Pasco</p>
      <h1>Boat mechanic to your dock. <span>Answered in ${cfg.responseGoalMinutes} minutes.</span></h1>
      <p class="lede">Tell us what the boat is doing. We call back fast, send an insured mobile mechanic who knows your engine, and you pay by bank or card when the work is done. No shop wait list, no trailering.</p>
      <ul class="trust"><li>Vetted, insured independent mechanics</li><li>Yamaha, Mercury, Suzuki, Honda, inboard and diesel</li><li>Written quote before any work</li><li>Pay by bank with no fee, or card</li></ul>
      <p class="cta-row"><a class="btn phone big" href="${phoneHref}">Call ${esc(cfg.phone)}</a><a class="btn ghost big" href="/post-a-job/">Post the job</a></p>
    </div>
    <div class="card form-card"><h2>Get a mechanic</h2>${leadForm({ compact: true, id: 'hero-form' })}</div>
  </div></section>

  <section class="wrap how" id="how"><h2>How it works</h2><ol class="steps">
    <li><b>Post it or call it.</b> Boat, engine, what it's doing, where it sits. Two minutes.</li>
    <li><b>We match and dispatch.</b> A dispatcher calls you back, then offers the job to the two or three best mechanics near you. The first to accept calls you with his name and a time.</li>
    <li><b>Fixed at your dock, paid when done.</b> Written quote first. Afterward you get a payment link: bank transfer with no fee, or card.</li>
  </ol></section>

  <section class="wrap" id="services"><h2>What we fix</h2><div class="grid3">
    ${services.map((s) => `<a class="tile" href="/services/${s.slug}/"><b>${esc(s.name)}</b><span>${esc(s.blurbShort || s.intro.split('. ')[0] + '.')}</span></a>`).join('')}
  </div></section>

  <section class="wrap" id="brands"><h2>Engines we work on</h2><p>Mechanics are matched by brand, so a Yamaha owner gets someone who carries Yamaha service kits and reads Yamaha codes.</p><p class="chips">${brands.map((b) => `<a class="chip" href="/brands/${b.slug}/">${esc(b.name)}</a>`).join('')}</p></section>

  <section class="wrap" id="areas"><h2>Where we go</h2><p>Anywhere a boat sits in Pinellas, Hillsborough and Pasco counties: lifts, slips, dry storage, driveways, and the ramp when it won't start.</p><p class="chips">${areas.map((a) => `<a class="chip" href="/areas/${a.slug}/">${esc(a.name)}</a>`).join('')}</p></section>

  <section class="wrap why"><h2>Why not just call a shop?</h2><div class="grid3">
    <div class="tile static"><b>Shops are weeks out in season.</b><span>Mobile mechanics in our network usually see you within a few days, same day for a no-start.</span></div>
    <div class="tile static"><b>No trailering, no yard fees.</b><span>Work happens on your lift or in your slip. You don't need to be there.</span></div>
    <div class="tile static"><b>You still get a real mechanic.</b><span>Independent, insured, matched to your engine, with a written quote and a review trail.</span></div>
  </div></section>

  ${faqHtml([
    { q: 'Is posting a job really free?', a: 'Yes. You pay the mechanic for the work, through a payment link, after it is done. There is no fee to post or to get quotes.' },
    { q: 'Who are the mechanics?', a: 'Independent marine mechanics and small shops in Tampa Bay who have been vetted for experience and insurance, signed our standards agreement, and are matched to your engine brand and your zip code.' },
    { q: 'How fast can someone come?', a: 'Routine service is usually scheduled within a few days. A boat that will not start at the ramp or a lift can often be seen the same day; call rather than post for those.' },
    { q: 'How do I pay?', a: 'When the work is done you get a link. Pay by bank transfer with no fee, or by card with a small processing fee. The mechanic is paid by us.' },
  ])}`,
}));

// Post a job
write('/post-a-job/', layout({
  title: `Post a boat repair job in Tampa Bay — ${cfg.brand}`,
  description: 'Describe your boat problem. We call back within minutes and send an insured mobile marine mechanic to your lift, slip, or driveway.',
  urlPath: '/post-a-job/', schema: [businessSchema()],
  body: `<section class="wrap narrow"><h1>Post your job</h1><p class="lede">Two minutes. The more you tell us, the better the mechanic we send. Or just call <a href="${phoneHref}">${esc(cfg.phone)}</a>.</p><div class="card">${leadForm({})}</div></section>`,
}));

// Thanks
write('/thanks/', layout({
  title: `We've got it — ${cfg.brand}`, description: 'Your job is in. Expect a call shortly.', urlPath: '/thanks/', noindex: true,
  body: `<section class="wrap narrow"><h1>Got it. Keep your phone handy.</h1><p class="lede">A dispatcher will call you within ${cfg.responseGoalMinutes} minutes during the day, or first thing in the morning if it's late. Then the mechanic who takes the job will text you his name and a time.</p><p>Can't wait? <a class="btn phone" href="${phoneHref}">Call ${esc(cfg.phone)}</a></p><p class="fine">If your boat is taking on water or there is a fuel leak, deal with that first: Sea Tow, TowBoatUS, or 911 on the water.</p></section>`,
}), { sitemap: false });

// How it works
write('/how-it-works/', layout({
  title: `How it works — ${cfg.brand}`,
  description: 'Post or call, we dispatch an insured mobile mechanic matched to your engine, you approve a written quote, and pay by bank or card when the work is done.',
  urlPath: '/how-it-works/', schema: [businessSchema()],
  body: `<section class="wrap narrow"><h1>How it works</h1>
  <ol class="steps big">
    <li><b>You post or call.</b> Boat, engine make and model, hours if you know them, what it's doing, where it sits, photos if you have them.</li>
    <li><b>A human calls you back.</b> Within ${cfg.responseGoalMinutes} minutes during the day. We confirm the details and make sure it's a job we can help with.</li>
    <li><b>We offer it to the best-matched mechanics.</b> Two or three insured independents near you who work on your engine brand. The first to accept gets it, and texts you his name and a time window.</li>
    <li><b>Written quote before work.</b> For anything beyond a diagnostic visit, you get a quote by text or email and approve it with one tap. Parts are billed at the final invoiced amount; labor as quoted unless the job changes, in which case you approve first.</li>
    <li><b>Fixed at your dock.</b> You don't need to be there. The mechanic sends photos of the work and the old parts.</li>
    <li><b>Pay when it's done.</b> You get a link showing the itemized invoice. Pay by bank transfer at the invoiced amount, or by card with a small processing fee shown up front. We pay the mechanic.</li>
  </ol>
  <h2>What the mechanics are vetted on</h2>
  <ul><li>Years of experience and brand certifications</li><li>Commercial general liability insurance, certificate on file and renewal tracked</li><li>A signed standards agreement: show up, quote in writing, honor the quote, clean up</li><li>Customer reviews on every job, visible to our dispatchers</li></ul>
  <h2>What it costs</h2>
  <p>You pay the mechanic's price. Mobile marine labor in Tampa Bay runs roughly $120 to $150 an hour, with a trip or diagnostic fee around $75 to $150 that is usually credited toward the repair. Our fee comes out of the mechanic's side, in exchange for sending them work and handling the billing.</p>
  <p class="cta-row"><a class="btn primary big" href="/post-a-job/">Post a job</a><a class="btn phone big" href="${phoneHref}">Call ${esc(cfg.phone)}</a></p></section>`,
}));

// For technicians
write('/for-technicians/', layout({
  title: `Mobile marine mechanics: get jobs in Tampa Bay — ${cfg.brand}`,
  description: 'Free to join. We send you vetted jobs near you, you set your prices, we handle quoting and billing and pay you 90% when the customer pays.',
  urlPath: '/for-technicians/', schema: [businessSchema()],
  body: `<section class="wrap two"><div>
    <h1>Jobs sent to your phone. Billing handled. You keep 90%.</h1>
    <p class="lede">We run a dispatch desk for boat owners in Pinellas, Hillsborough and Pasco. Owners post jobs, we screen them, and we offer each one to the two or three best-matched mechanics. You accept the ones you want.</p>
    <ul class="trust"><li><b>Free to join.</b> No monthly fee, no lead fees.</li><li><b>You set your rates</b> and edit every quote before it goes out.</li><li><b>Decline anything.</b> No penalties.</li><li><b>We collect from the customer</b> by bank or card and pay you 90% when it clears, usually within a week. No chasing invoices.</li><li><b>Upload any invoice</b>, a photo of a paper ticket is fine. We read it.</li></ul>
    <h2>What we ask</h2>
    <ul><li>Commercial general liability insurance ($1M), certificate on file</li><li>W-9 before your first payout</li><li>Your own truck, tools, and parts sourcing</li><li>Call the customer within the hour when you accept a job</li><li>Written quotes, and honor them</li><li>Customers we introduce run through the platform for 12 months</li></ul>
    <p class="fine">You remain an independent business. Read the <a href="/terms/">customer terms</a> and ask for the technician agreement before you accept your first job.</p>
  </div>
  <div class="card"><h2>Apply</h2>
    <form id="apply-form" data-apply-form novalidate>
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="f2"><label>Business name<input name="business_name" required></label><label>Your name<input name="contact_name" required></label></div>
      <div class="f2"><label>Phone<input name="phone" type="tel" required></label><label>Email<input name="email" type="email" required></label></div>
      <div class="f2"><label>Home zip<input name="home_zip" required inputmode="numeric" pattern="[0-9]{5}"></label><label>Years in marine repair<input name="years_experience" type="number" min="0"></label></div>
      <label>Area you cover<input name="service_area_text" placeholder="Tarpon Springs to Clearwater, 25 miles"></label>
      <fieldset><legend>What you work on</legend><div class="checks">${services.map((s) => `<label class="check"><input type="checkbox" name="specialties" value="${s.slug}"> ${esc(s.name)}</label>`).join('')}</div></fieldset>
      <fieldset><legend>Brands</legend><div class="checks">${brands.map((b) => `<label class="check"><input type="checkbox" name="brands" value="${b.slug}"> ${esc(b.name)}</label>`).join('')}</div></fieldset>
      <div class="f2"><label class="check"><input type="checkbox" name="has_insurance"> I carry general liability insurance</label><label>Carrier<input name="insurance_carrier"></label></div>
      <label>Anything else<textarea name="notes" rows="3" placeholder="Certifications, dealer background, what you don't do"></textarea></label>
      <label class="check"><input type="checkbox" name="agreement_accepted" required> I understand I'd be an independent contractor who sets my own prices and can decline any job, and I agree to the technician agreement.</label>
      <button class="btn primary big" type="submit">Send application</button>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </form></div></section>`,
}));

// Services
for (const s of services) {
  const related = brands.filter((b) => (s.brands || []).includes(b.slug));
  write(`/services/${s.slug}/`, layout({
    title: `${s.title} | ${cfg.brand}`, description: s.intro.slice(0, 155), urlPath: `/services/${s.slug}/`,
    schema: [serviceSchema(s.name, s.intro, `${site}/services/${s.slug}/`), faqSchema(s.faqs)],
    body: `<section class="wrap two"><article>
      <p class="crumbs"><a href="/">Home</a> › <a href="/#services">Services</a> › ${esc(s.name)}</p>
      <h1>${esc(s.title)}</h1><p class="lede">${esc(s.intro)}</p>
      <h2>What's included</h2><ul>${s.included.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <div class="facts"><div><b>When</b><p>${esc(s.when)}</p></div><div><b>Time on site</b><p>${esc(s.duration)}</p></div><div><b>What it usually costs here</b><p>${esc(s.price_range)}</p></div></div>
      <h2>In Tampa Bay specifically</h2><p>${esc(s.local_note)}</p>
      ${related.length ? `<h2>Engines</h2><p class="chips">${related.map((b) => `<a class="chip" href="/brands/${b.slug}/">${esc(b.name)}</a>`).join('')}</p>` : ''}
      ${faqHtml(s.faqs)}
      <h2>Where</h2><p class="chips">${areas.map((a) => `<a class="chip" href="/areas/${a.slug}/">${esc(a.name)}</a>`).join('')}</p>
    </article><aside class="card form-card sticky"><h2>Get this done</h2>${leadForm({ compact: true, service: s.slug, id: 'side-form' })}</aside></section>`,
  }));
}

// Brands
for (const b of brands) {
  const related = services.filter((s) => (s.brands || []).includes(b.slug));
  write(`/brands/${b.slug}/`, layout({
    title: `${b.title} | ${cfg.brand}`, description: b.intro.slice(0, 155), urlPath: `/brands/${b.slug}/`,
    schema: [serviceSchema(`${b.name} outboard repair`, b.intro, `${site}/brands/${b.slug}/`), faqSchema(b.faqs)],
    body: `<section class="wrap two"><article>
      <p class="crumbs"><a href="/">Home</a> › <a href="/#brands">Brands</a> › ${esc(b.name)}</p>
      <h1>${esc(b.title)}</h1><p class="lede">${esc(b.intro)}</p>
      <div class="facts"><div><b>Models we see most</b><p>${esc(b.models)}</p></div><div><b>Service intervals</b><p>${esc(b.intervals)}</p></div><div><b>Parts and diagnostics</b><p>${esc(b.parts)}</p></div></div>
      <h2>What goes wrong on ${esc(b.name)}s around here</h2><ul>${b.common.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      ${related.length ? `<h2>Services for ${esc(b.name)}</h2><div class="grid3">${related.map((s) => `<a class="tile" href="/services/${s.slug}/"><b>${esc(s.name)}</b><span>${esc(s.price_range.split(';')[0])}</span></a>`).join('')}</div>` : ''}
      ${faqHtml(b.faqs)}
      <h2>Where</h2><p class="chips">${areas.map((a) => `<a class="chip" href="/areas/${a.slug}/">${esc(a.name)}</a>`).join('')}</p>
    </article><aside class="card form-card sticky"><h2>${esc(b.name)} mechanic</h2>${leadForm({ compact: true, make: b.slug, id: 'side-form' })}</aside></section>`,
  }));
}

// Areas
for (const a of areas) {
  const nearby = (a.nearby || []).map((n) => areas.find((x) => x.slug === n)).filter(Boolean);
  write(`/areas/${a.slug}/`, layout({
    title: `${a.title} | ${cfg.brand}`, description: a.intro.slice(0, 155), urlPath: `/areas/${a.slug}/`,
    schema: [businessSchema({ areaServed: [{ '@type': 'City', name: a.name, containedInPlace: { '@type': 'AdministrativeArea', name: `${a.county} County, FL` } }] }), faqSchema(a.faqs)],
    body: `<section class="wrap two"><article>
      <p class="crumbs"><a href="/">Home</a> › <a href="/#areas">Areas</a> › ${esc(a.name)}</p>
      <h1>${esc(a.title)}</h1><p class="lede">${esc(a.intro)}</p>
      <div class="facts"><div><b>Waters</b><ul>${a.waters.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div><div><b>Ramps and marinas</b><ul>${a.ramps.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div><div><b>Boats we see</b><p>${esc(a.boats)}</p></div></div>
      <h2>What breaks in ${esc(a.name.split(' and ')[0])}</h2><ul>${a.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <h2>Services</h2><div class="grid3">${services.slice(0, 9).map((s) => `<a class="tile" href="/services/${s.slug}/"><b>${esc(s.name)}</b><span>${esc(s.price_range.split(';')[0])}</span></a>`).join('')}</div>
      ${faqHtml(a.faqs)}
      ${nearby.length ? `<h2>Nearby</h2><p class="chips">${nearby.map((n) => `<a class="chip" href="/areas/${n.slug}/">${esc(n.name)}</a>`).join('')}</p>` : ''}
      <p class="fine">Zip codes: ${a.zips.join(', ')} · ${esc(a.county)} County</p>
    </article><aside class="card form-card sticky"><h2>Mechanic in ${esc(a.name.split(' and ')[0])}</h2>${leadForm({ compact: true, id: 'side-form' })}</aside></section>`,
  }));
}

// Legal
const legalDir = path.join(here, '..', '..', 'hq', 'legal');
const terms = fs.existsSync(path.join(legalDir, 'customer-terms.md')) ? fs.readFileSync(path.join(legalDir, 'customer-terms.md'), 'utf8') : '# Terms\n\nTo be added.';
write('/terms/', layout({ title: `Customer terms — ${cfg.brand}`, description: 'Terms for customers using the platform.', urlPath: '/terms/', body: `<section class="wrap narrow legal">${md(terms.replace(/\[BRAND\]/g, cfg.brand).replace(/\[ENTITY\]/g, cfg.entityName))}</section>` }));
write('/privacy/', layout({ title: `Privacy — ${cfg.brand}`, description: 'What we collect and why.', urlPath: '/privacy/', body: `<section class="wrap narrow legal"><h1>Privacy</h1>
<p>We collect what the job needs: your name, phone, email, the boat's location, equipment details, photos you choose to send, and your description of the problem. We share it only with the technician assigned to your job and with our payment processor (Stripe), which handles card and bank details; we never see them.</p>
<p>If you check the texting box we may text you about your job; reply STOP to opt out. We do not sell your information. Email <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a> to ask what we hold or to have it deleted.</p>
<p>This site uses standard server logs and, if enabled, Google Analytics to count visits.</p></section>` }));

// 404
write('/404.html', layout({ title: `Not found — ${cfg.brand}`, description: 'Page not found.', urlPath: '/404.html', noindex: true, body: `<section class="wrap narrow"><h1>That page isn't here.</h1><p><a href="/">Home</a> · <a href="/post-a-job/">Post a job</a> · <a href="${phoneHref}">Call ${esc(cfg.phone)}</a></p></section>` }), { sitemap: false });

// sitemap, robots, CNAME
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /thanks/\nSitemap: ${site}/sitemap.xml\n`);
if (cfg.domain) fs.writeFileSync(path.join(out, 'CNAME'), cfg.domain + '\n');
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`Built ${pages.length} indexable pages (+ thanks, 404) into ${path.relative(process.cwd(), out)}`);
