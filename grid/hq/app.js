// Grid HQ: router, layout, auth gate. Views live in ./views/*.js.
import { store, saveConfig } from './data/store.js';
import { esc, toast } from './lib/ui.js';
import dashboard from './views/dashboard.js';
import leads, { detail as leadDetail } from './views/leads.js';
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
let current = null;
let renderTimer = null;
let tick = null;

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
    const [newLeads, apps, review, owed, offered] = await Promise.all([
      db.list('leads', { filter: { status: 'new' } }), db.list('tech_applications', { filter: { status: 'new' } }),
      db.list('invoices', { filter: { status: ['uploaded', 'review'] } }), db.list('payouts', { filter: { status: 'owed' } }), db.list('leads', { filter: { status: 'offered' } }),
    ]);
    return { leads: newLeads.length, offered: offered.length, apps: apps.length, review: review.length, owed: owed.length };
  } catch (_) { return {}; }
}

function renderNav(active, counts, user) {
  const item = (href, label, count, hot) => `<a href="#${href}" class="${active === href || (href !== '/' && active.startsWith(href)) ? 'active' : ''}"><span>${label}</span>${count ? `<span class="count ${hot ? 'hot' : ''}">${count}</span>` : ''}</a>`;
  if (user?.role === 'tech') {
    nav.innerHTML = item('/portal', 'My portal') + `<div class="sep"></div>` + item('/settings', 'Settings');
  } else {
    nav.innerHTML = [
      item('/', 'Dashboard'),
      item('/leads', 'Leads', counts.leads, true),
      item('/techs', 'Techs', counts.apps),
      item('/quotes', 'Quotes'),
      item('/invoices', 'Invoices', counts.review),
      item('/payouts', 'Payouts', counts.owed),
      item('/verticals', 'Verticals'),
      `<div class="sep"></div>`,
      item('/portal', store.db.mode === 'local' ? 'Tech portal (demo)' : 'Tech portal'),
      item('/settings', 'Settings'),
    ].join('');
  }
  const modeLabel = store.db.mode === 'local' ? 'Demo mode · data in this browser' : `Live · ${esc(user?.email || '')}`;
  foot.innerHTML = `<div><b>${esc(store.category('marine')?.brand_name || 'Grid')}</b></div><div>${modeLabel}</div>`;
}

function signInView() {
  main.innerHTML = `<div class="card signin"><h1>Sign in</h1><p class="muted">Enter your email. You'll get a magic link. The first person to sign in becomes admin.</p>
    <form id="signin"><label>Email</label><input name="email" type="email" required placeholder="you@yourdomain.com">
    <div class="actions"><button class="btn primary" type="submit">Send magic link</button><a class="btn" href="#/settings">Settings</a></div></form>
    ${store.initError ? `<p class="notice bad">Supabase connection failed: ${esc(store.initError)}</p>` : ''}</div>`;
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
  if (needsAuth) { renderNav(path, {}, null); signInView(); return; }
  if (user?.role === 'tech' && !['portal', 'settings'].includes(segs[0])) { location.hash = '#/portal'; return; }

  const counts = user?.role === 'tech' ? {} : await navCounts();
  renderNav('/' + segs.join('/'), counts, user);
  document.getElementById('side').classList.remove('open');

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
    default: view = () => { main.innerHTML = `<div class="card"><h1>Not found</h1><p><a href="#/">Back to dashboard</a></p></div>`; };
  }
  current = view;
  const scrollY = window.scrollY;
  try { await view(main, { params, query, ctx }); }
  catch (e) { console.error(e); main.innerHTML = `<div class="card"><h1>Something broke</h1><pre class="mono">${esc(e.stack || e.message)}</pre></div>`; }
  window.scrollTo(0, scrollY);
}

function scheduleRender(force = false) {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    // Don't yank focus from an open modal or a field being typed into unless forced.
    if (!force && (document.getElementById('modal') || (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && document.activeElement.closest('#main')))) return;
    render();
  }, 60);
}

async function boot() {
  await store.init();
  store.onChange(() => scheduleRender(false));
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
  document.getElementById('menu-btn').addEventListener('click', () => document.getElementById('side').classList.toggle('open'));
  // Live timers on list views.
  tick = setInterval(() => { const { segs } = parseHash(); if (!segs[0] || segs[0] === 'leads' && !segs[1]) scheduleRender(false); }, 15000);
  await render();
}

window.GRID = { store, saveConfig, navigate };
boot();
