// Grid HQ: router, layout, navigation, search, auth gate. Views live in ./views/*.js.
import { store, saveConfig } from './data/store.js';
import { esc, toast, titleCase, money } from './lib/ui.js';
import { icon } from './lib/icons.js';
import dashboard from './views/dashboard.js';
import leads, { detail as leadDetail, newLeadModal } from './views/leads.js';
import techs, { detail as techDetail } from './views/techs.js';
import quotes, { detail as quoteDetail } from './views/quotes.js';
import invoices, { detail as invoiceDetail } from './views/invoices.js';
import payouts from './views/payouts.js';
import verticals from './views/verticals.js';
import settings from './views/settings.js';
import portal from './views/portal.js';

const main = document.getElementById('main');
const nav = document.getElementById('nav');
const foot = document.getElementById('side-foot');
const tabbar = document.getElementById('tabbar');
const side = document.getElementById('side');
const scrim = document.getElementById('scrim');
let renderTimer = null;

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const segs = path.split('/').filter(Boolean);
  return { segs, query: Object.fromEntries(new URLSearchParams(qs)), path };
}
export function navigate(hash) { location.hash = hash; }
const ctx = { store, navigate, rerender: () => scheduleRender(true) };

async function navCounts() {
  const db = store.db;
  try {
    const [newLeads, apps, review, owed, sent] = await Promise.all([
      db.list('leads', { filter: { status: 'new' } }), db.list('tech_applications', { filter: { status: 'new' } }),
      db.list('invoices', { filter: { status: ['uploaded', 'review'] } }), db.list('payouts', { filter: { status: 'owed' } }), db.list('quotes', { filter: { status: 'sent' } }),
    ]);
    return { leads: newLeads.length, apps: apps.length, review: review.length, owed: owed.length, quotes: sent.length };
  } catch (_) { return {}; }
}

// Navigation follows the work: today, then the pipeline in the order a job moves, then people, then setup.
const GROUPS = [
  { label: 'Today', items: [{ href: '/', text: 'Dashboard', icon: 'home' }] },
  { label: 'Pipeline', items: [
    { href: '/leads', text: 'Leads', icon: 'leads', count: 'leads', hot: true },
    { href: '/quotes', text: 'Quotes', icon: 'quotes', count: 'quotes' },
    { href: '/invoices', text: 'Invoices', icon: 'invoices', count: 'review', hot: true },
    { href: '/payouts', text: 'Payouts', icon: 'payouts', count: 'owed', hot: true },
  ] },
  { label: 'Network', items: [{ href: '/techs', text: 'Techs', icon: 'techs', count: 'apps' }] },
  { label: 'Setup', items: [{ href: '/verticals', text: 'Verticals', icon: 'verticals' }, { href: '/settings', text: 'Settings', icon: 'settings' }] },
];

function isActive(active, href) { return href === '/' ? active === '/' : active === href || active.startsWith(href + '/'); }

function renderNav(active, counts, user) {
  const item = (it) => {
    const n = it.count ? counts[it.count] : 0;
    return `<a href="#${it.href}" class="nav-item ${isActive(active, it.href) ? 'active' : ''}" ${isActive(active, it.href) ? 'aria-current="page"' : ''}>${icon(it.icon)}<span>${esc(it.text)}</span>${n ? `<span class="count ${it.hot ? 'hot' : ''}">${n}</span>` : ''}</a>`;
  };
  if (user?.role === 'tech') {
    nav.innerHTML = `<div class="nav-group">${item({ href: '/portal', text: 'My jobs', icon: 'portal' })}${item({ href: '/settings', text: 'Settings', icon: 'settings' })}</div>`;
    tabbar.innerHTML = '';
  } else {
    nav.innerHTML = GROUPS.map((g) => `<div class="nav-group"><p class="nav-label">${esc(g.label)}</p>${g.items.map(item).join('')}</div>`).join('')
      + `<div class="nav-group nav-extra">${item({ href: '/portal', text: store.db.mode === 'local' ? 'Tech portal (demo)' : 'Tech portal', icon: 'portal' })}</div>`;
    const tab = (href, text, ic, n, hot) => `<a href="#${href}" class="${isActive(active, href) ? 'active' : ''}">${icon(ic, 22)}<span>${text}</span>${n ? `<b class="${hot ? 'hot' : ''}">${n}</b>` : ''}</a>`;
    tabbar.innerHTML = tab('/', 'Today', 'home') + tab('/leads', 'Leads', 'leads', counts.leads, true) + tab('/invoices', 'Invoices', 'invoices', counts.review, true) + tab('/payouts', 'Payouts', 'payouts', counts.owed, true)
      + `<button type="button" id="tab-menu">${icon('menu', 22)}<span>More</span></button>`;
    document.getElementById('tab-menu')?.addEventListener('click', openDrawer);
  }
  const brand = store.category('marine')?.brand_name || 'Grid';
  foot.innerHTML = `<p class="side-brand">${esc(brand)}</p><p>${store.db.mode === 'local' ? 'Demo mode. Data stays in this browser.' : `Signed in as ${esc(user?.email || '')}`}</p>`;
}

function openDrawer() { side.classList.add('open'); scrim.hidden = false; }
function closeDrawer() { side.classList.remove('open'); scrim.hidden = true; }

function signInView() {
  main.innerHTML = `<div class="card signin"><h1>Sign in</h1><p class="muted">Enter your email and we'll send a sign-in link. The first person to sign in becomes the admin.</p>
    <form id="signin"><label for="signin-email">Email</label><input id="signin-email" name="email" type="email" required placeholder="you@yourdomain.com">
    <div class="actions"><button class="btn primary" type="submit">Send sign-in link</button><a class="btn" href="#/settings">Settings</a></div></form>
    ${store.initError ? `<p class="notice bad">Couldn't connect to Supabase: ${esc(store.initError)}</p>` : ''}</div>`;
  main.querySelector('#signin').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await store.db.auth.signIn(new FormData(e.target).get('email')); toast('Check your email for the sign-in link.'); }
    catch (err) { toast(err.message, 'bad'); }
  });
}

async function render() {
  const { segs, query, path } = parseHash();
  const user = store.user();
  const needsAuth = store.db.mode === 'live' && !user && segs[0] !== 'settings';
  document.body.classList.toggle('is-tech', user?.role === 'tech');
  if (needsAuth) { renderNav(path, {}, null); signInView(); return; }
  if (user?.role === 'tech' && !['portal', 'settings'].includes(segs[0])) { location.hash = '#/portal'; return; }

  const counts = user?.role === 'tech' ? {} : await navCounts();
  renderNav('/' + segs.join('/'), counts, user);
  closeDrawer();

  const params = { id: segs[1], sub: segs[2] };
  let view = dashboard;
  switch (segs[0]) {
    case undefined: view = dashboard; break;
    case 'leads': view = segs[1] ? leadDetail : leads; break;
    case 'techs': view = segs[1] ? techDetail : techs; break;
    case 'quotes': view = segs[1] ? quoteDetail : quotes; break;
    case 'invoices': view = segs[1] ? invoiceDetail : invoices; break;
    case 'payouts': view = payouts; break;
    case 'verticals': view = verticals; break;
    case 'settings': view = settings; break;
    case 'portal': view = portal; break;
    default: view = () => { main.innerHTML = `<div class="card"><h1>Page not found</h1><p><a href="#/">Go to the dashboard</a></p></div>`; };
  }
  const scrollY = window.scrollY;
  try { await view(main, { params, query, ctx }); }
  catch (e) { console.error(e); main.innerHTML = `<div class="card"><h1>Something broke</h1><pre class="mono">${esc(e.stack || e.message)}</pre></div>`; }
  window.scrollTo(0, scrollY);
}

function scheduleRender(force = false) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    if (!force && (document.getElementById('modal') || (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && document.activeElement.closest('#main')))) return;
    render();
  }, 60);
}

// ---- search: leads, techs, quotes and invoices by name, phone, city, zip ------------------------
const qInput = document.getElementById('q');
const qBox = document.getElementById('q-results');
let qIndex = 0;
const digits = (s) => String(s || '').replace(/\D/g, '');
async function runSearch() {
  const term = qInput.value.trim().toLowerCase();
  if (term.length < 2) { qBox.hidden = true; qBox.innerHTML = ''; return; }
  const d = digits(term);
  const [ls, ts] = await Promise.all([store.db.list('leads'), store.db.list('techs')]);
  const hit = (...vals) => vals.some((v) => String(v || '').toLowerCase().includes(term)) || (d.length >= 3 && vals.some((v) => digits(v).includes(d)));
  const leadHits = ls.filter((l) => hit(l.customer_name, l.phone, l.city, l.zip, l.email, l.equipment?.model)).slice(0, 6);
  const techHits = ts.filter((t) => hit(t.business_name, t.contact_name, t.phone, t.email, t.home_zip)).slice(0, 4);
  const rows = [
    ...leadHits.map((l) => ({ href: `#/leads/${l.id}`, title: l.customer_name, sub: `${titleCase(l.service_slug)}, ${l.city || l.zip || ''}`, tag: titleCase(l.status), kind: 'Lead' })),
    ...techHits.map((t) => ({ href: `#/techs/${t.id}`, title: t.business_name, sub: `${t.contact_name || ''}, ${t.phone || ''}`, tag: titleCase(t.status), kind: 'Tech' })),
  ];
  qIndex = 0;
  qBox.innerHTML = rows.length
    ? rows.map((r, i) => `<a href="${r.href}" class="q-row ${i === 0 ? 'sel' : ''}"><span class="q-kind">${r.kind}</span><span class="q-main"><b>${esc(r.title)}</b><span>${esc(r.sub)}</span></span><span class="q-tag">${esc(r.tag)}</span></a>`).join('')
    : `<p class="q-empty">No leads or techs match "${esc(qInput.value.trim())}".</p>`;
  qBox.hidden = false;
}
function closeSearch() { qBox.hidden = true; }
qInput.addEventListener('input', runSearch);
qInput.addEventListener('focus', () => { if (qInput.value.trim().length >= 2) runSearch(); });
qInput.addEventListener('keydown', (e) => {
  const rows = [...qBox.querySelectorAll('.q-row')];
  if (e.key === 'Escape') { qInput.value = ''; closeSearch(); qInput.blur(); }
  else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
    e.preventDefault(); qIndex = (qIndex + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
    rows.forEach((r, i) => r.classList.toggle('sel', i === qIndex));
  } else if (e.key === 'Enter' && rows[qIndex]) { e.preventDefault(); location.hash = rows[qIndex].getAttribute('href'); qInput.value = ''; closeSearch(); qInput.blur(); }
});
qBox.addEventListener('click', (e) => { if (e.target.closest('.q-row')) { qInput.value = ''; closeSearch(); } });
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) closeSearch(); });
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.getElementById('modal')) { e.preventDefault(); qInput.focus(); }
  if (e.key === 'Escape') { closeDrawer(); }
});

async function boot() {
  document.querySelector('.search-icon').innerHTML = icon('search', 18);
  const menuBtn = document.getElementById('menu-btn');
  menuBtn.innerHTML = icon('menu', 22);
  menuBtn.addEventListener('click', openDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.getElementById('top-new-lead').addEventListener('click', () => newLeadModal());
  await store.init();
  store.onChange(() => scheduleRender(false));
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
  // Keep timers live on the views that show them.
  setInterval(() => { const { segs } = parseHash(); if (!segs[0] || (segs[0] === 'leads' && !segs[1])) scheduleRender(false); }, 15000);
  await render();
}

window.GRID = { store, saveConfig, navigate, money };
boot();
