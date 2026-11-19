import { store } from '../data/store.js';
import { computeGame } from '../lib/game.js';
import { esc, money, badge, titleCase, modal, closeModal, toast, formValues, on, confirmTyped } from '../lib/ui.js';

// Starter service/brand lists for verticals 2–4. They are plans, not live content, until activated.
export const VERTICAL_TEMPLATES = {
  golf_cart: {
    services: [
      { slug: 'battery-charging', name: 'Batteries & charging', blurb: 'Lead-acid and lithium battery testing, replacement, charger and OBC diagnostics.', avg_ticket: 650, intake_fields: ['cart_make', 'voltage'] },
      { slug: 'wont-run', name: "Cart won't run / cuts out", blurb: 'Controllers, solenoids, motors, F/R switches, key switches, and wiring faults.', avg_ticket: 350, intake_fields: ['cart_make', 'symptom'] },
      { slug: 'gas-cart-service', name: 'Gas cart service & repair', blurb: 'Yamaha, Club Car and E-Z-GO gas engines: tune-ups, starters, carburetors, belts.', avg_ticket: 300, intake_fields: ['cart_make'] },
      { slug: 'brakes-tires', name: 'Brakes, tires & suspension', blurb: 'Brake shoes and cables, tire replacement, leaf springs, bushings, lift kit issues.', avg_ticket: 280, intake_fields: ['cart_make'] },
      { slug: 'lights-accessories', name: 'Lights, horns & accessories', blurb: 'Street-legal light kits, turn signals, mirrors, stereos, seat and enclosure installs.', avg_ticket: 350, intake_fields: ['cart_make'] },
      { slug: 'lithium-conversion', name: 'Lithium conversion', blurb: 'Replace lead-acid packs with lithium, including charger and gauge changes.', avg_ticket: 2200, intake_fields: ['cart_make', 'voltage'] },
      { slug: 'annual-service', name: 'Annual service & safety check', blurb: 'Full inspection, lubrication, battery water, brake adjust, tire pressure, lights.', avg_ticket: 180, intake_fields: ['cart_make'] },
    ],
    brands: [{ slug: 'club-car', name: 'Club Car' }, { slug: 'ezgo', name: 'E-Z-GO' }, { slug: 'yamaha', name: 'Yamaha' }, { slug: 'icon', name: 'ICON' }, { slug: 'evolution', name: 'Evolution' }, { slug: 'star-ev', name: 'Star EV' }, { slug: 'bintelli', name: 'Bintelli' }],
  },
  rv: {
    services: [
      { slug: 'ac-roof', name: 'Roof A/C repair', blurb: 'Dometic and Coleman-Mach units: capacitors, fans, compressors, thermostats, soft starts.', avg_ticket: 550, intake_fields: ['rv_type', 'ac_brand'] },
      { slug: 'fridge', name: 'RV refrigerator', blurb: 'Absorption and 12V compressor fridges: cooling units, boards, igniters, door seals.', avg_ticket: 600, intake_fields: ['rv_type', 'fridge_brand'] },
      { slug: 'water-heater', name: 'Water heater & plumbing', blurb: 'Suburban and Atwood water heaters, pumps, leaks, winter damage, tank valves.', avg_ticket: 400, intake_fields: ['rv_type'] },
      { slug: 'electrical-12v', name: '12V electrical & converters', blurb: 'Converters, inverters, batteries, transfer switches, shore power faults.', avg_ticket: 450, intake_fields: ['rv_type'] },
      { slug: 'slide-leveling', name: 'Slide-outs & leveling', blurb: 'Slide motors, gear packs, seals, hydraulic and electric leveling systems.', avg_ticket: 700, intake_fields: ['rv_type'] },
      { slug: 'roof-seal', name: 'Roof reseal & leak repair', blurb: 'Inspection, resealing seams and fixtures, water intrusion tracing.', avg_ticket: 650, intake_fields: ['rv_type', 'rv_length'] },
      { slug: 'awning', name: 'Awnings', blurb: 'Fabric replacement, motors, arms, and manual awning repair.', avg_ticket: 500, intake_fields: ['rv_type'] },
      { slug: 'pre-trip', name: 'Pre-trip inspection', blurb: 'Full systems check before a trip or after storage: propane leak test, tires, brakes, appliances.', avg_ticket: 250, intake_fields: ['rv_type'] },
    ],
    brands: [{ slug: 'dometic', name: 'Dometic' }, { slug: 'coleman-mach', name: 'Coleman-Mach' }, { slug: 'suburban', name: 'Suburban' }, { slug: 'lippert', name: 'Lippert' }, { slug: 'norcold', name: 'Norcold' }, { slug: 'wfco', name: 'WFCO' }, { slug: 'onan', name: 'Onan generators' }],
  },
  auto: {
    services: [
      { slug: 'no-start', name: "Car won't start", blurb: 'Battery, starter, alternator and fuel delivery diagnostics at your home or office.', avg_ticket: 320, intake_fields: ['vehicle', 'symptom'] },
      { slug: 'brakes', name: 'Brakes', blurb: 'Pads, rotors, calipers and brake fluid, done in your driveway.', avg_ticket: 420, intake_fields: ['vehicle'] },
      { slug: 'oil-maintenance', name: 'Oil change & maintenance', blurb: 'Oil, filters, belts, fluids, tune-ups on your schedule.', avg_ticket: 140, intake_fields: ['vehicle'] },
      { slug: 'check-engine', name: 'Check engine light diagnostics', blurb: 'Scan, diagnose and quote the repair before any work.', avg_ticket: 150, intake_fields: ['vehicle', 'codes'] },
      { slug: 'cooling', name: 'Cooling system', blurb: 'Radiators, hoses, thermostats, water pumps, overheating.', avg_ticket: 480, intake_fields: ['vehicle'] },
      { slug: 'suspension-steering', name: 'Suspension & steering', blurb: 'Struts, shocks, control arms, tie rods, wheel bearings.', avg_ticket: 550, intake_fields: ['vehicle'] },
      { slug: 'pre-purchase', name: 'Pre-purchase inspection', blurb: 'Independent inspection before you buy a used car.', avg_ticket: 160, intake_fields: ['vehicle'] },
      { slug: 'fleet', name: 'Fleet maintenance', blurb: 'Scheduled on-site service for small business fleets.', avg_ticket: 600, intake_fields: ['fleet_size'] },
    ],
    brands: [{ slug: 'toyota', name: 'Toyota' }, { slug: 'honda', name: 'Honda' }, { slug: 'ford', name: 'Ford' }, { slug: 'chevrolet', name: 'Chevrolet' }, { slug: 'nissan', name: 'Nissan' }, { slug: 'hyundai-kia', name: 'Hyundai / Kia' }, { slug: 'jeep-ram', name: 'Jeep / Ram' }, { slug: 'bmw-mercedes', name: 'BMW / Mercedes' }],
  },
};

export default async function verticals(root) {
  const db = store.db;
  const [leads, events, invoices, payouts, techs] = await Promise.all([db.list('leads'), db.list('lead_events'), db.list('invoices'), db.list('payouts'), db.list('techs')]);
  const game = computeGame({ leads, events, invoices, payouts, techs, categories: store.categories, settings: store.settings, config: store.config });

  root.innerHTML = `<h1>Verticals</h1>
    <p class="muted">One brand, one site, one phone number per trade. The back end is shared. Locks are guardrails: unlock when the current vertical is steady, or override with a typed confirmation.</p>
    <div class="grid c2">${store.categories.map((c) => card(c, game, techs, leads, invoices)).join('')}</div>`;

  on(root, '[data-a]', 'click', async (_e, el) => {
    const c = store.categories.find((x) => x.id === el.dataset.id);
    const a = el.dataset.a;
    try {
      if (a === 'edit') return editModal(c);
      if (a === 'activate') return activate(c, false);
      if (a === 'force') return confirmTyped(`Unlock ${c.name} early`, `Level ${game.level} now; this vertical asks for level ${c.unlock_rule?.min_level}. Unlocking early splits your attention across two cold starts. Sure?`, 'UNLOCK', () => activate(c, true));
      if (a === 'pause') { await db.update('categories', c.id, { status: 'paused' }); return toast(`${c.name} paused`); }
      if (a === 'resume') { await db.update('categories', c.id, { status: 'active' }); return toast(`${c.name} active`); }
      if (a === 'services') return servicesModal(c);
    } catch (e) { toast(e.message, 'bad'); }
  });

  async function activate(c, forced) {
    const tpl = VERTICAL_TEMPLATES[c.id];
    const patch = { status: 'active' };
    if (tpl && !(c.services || []).length) { patch.services = tpl.services; patch.equipment_brands = tpl.brands; }
    await db.update('categories', c.id, patch);
    await db.insert('achievements', { key: `unlock_${c.id}`, unlocked_at: new Date().toISOString(), meta: { forced } }).catch(() => {});
    toast(`${c.name} unlocked. Build its site from sites/ and recruit techs.`);
  }
}

function card(c, game, techs, leads, invoices) {
  const u = game.unlocks.find((x) => x.category.id === c.id);
  const n = { techs: techs.filter((t) => (t.category_ids || []).includes(c.id) && t.status === 'approved').length, leads: leads.filter((l) => l.category_id === c.id).length, gmv: invoices.filter((i) => i.status === 'paid' && leads.find((l) => l.id === i.lead_id)?.category_id === c.id).reduce((s, i) => s + Number(i.total), 0) };
  const t = u?.targets;
  return `<div class="card">
    <div class="row between"><h2 style="margin:0">${esc(c.name)} ${badge(c.status)}</h2><div class="row gap">
      ${c.status === 'locked' ? (u?.met ? `<button class="btn ok" data-a="activate" data-id="${c.id}">Unlock</button>` : `<button class="btn" data-a="force" data-id="${c.id}">Unlock anyway</button>`) : ''}
      ${c.status === 'active' ? `<button class="btn" data-a="pause" data-id="${c.id}">Pause</button>` : c.status === 'paused' ? `<button class="btn ok" data-a="resume" data-id="${c.id}">Resume</button>` : ''}
      <button class="btn" data-a="edit" data-id="${c.id}">Edit</button></div></div>
    <dl class="kv" style="margin-top:8px"><dt>Brand</dt><dd>${esc(c.brand_name || '—')}</dd><dt>Site</dt><dd>${c.site_url ? `<a href="${esc(c.site_url)}" target="_blank">${esc(c.site_url)}</a>` : '—'}</dd><dt>Phone</dt><dd>${esc(c.phone || '—')}</dd><dt>Tax default</dt><dd>${(Number(c.default_tax_rate) * 100).toFixed(2)}%</dd></dl>
    ${c.status === 'locked' ? `<div style="margin-top:10px"><div class="small muted">Requires level ${u?.need}. You are level ${game.level}.${t ? ` Hit either bar to get there:` : ''}</div>
      ${t ? `<div class="small muted" style="margin-top:6px">Paid jobs / 7 days</div><div class="row gap"><div class="bar ${u.jobs7 >= t.jobs ? 'ok' : ''}" style="flex:1"><span style="width:${Math.min(100, (u.jobs7 / t.jobs) * 100)}%"></span></div><b>${u.jobs7}/${t.jobs}</b></div>
      <div class="small muted" style="margin-top:6px">Paid volume / 30 days</div><div class="row gap"><div class="bar ${u.gmv30 >= t.gmv ? 'ok' : ''}" style="flex:1"><span style="width:${Math.min(100, (u.gmv30 / t.gmv) * 100)}%"></span></div><b>${money(u.gmv30, { cents: false })}/${money(t.gmv, { cents: false })}</b></div>` : ''}
      <p class="small muted">Plan: <code>docs/verticals/</code>. Starter services (${(VERTICAL_TEMPLATES[c.id]?.services || []).length}) load on unlock.</p></div>`
    : `<div class="grid c3" style="margin-top:10px"><div class="stat"><div class="k">Techs</div><div class="v">${n.techs}</div></div><div class="stat"><div class="k">Leads</div><div class="v">${n.leads}</div></div><div class="stat"><div class="k">Paid volume</div><div class="v">${money(n.gmv, { cents: false })}</div></div></div>
      <div class="row between" style="margin-top:8px"><span class="small muted">${(c.services || []).length} services · ${(c.equipment_brands || []).length} brands</span><button class="btn sm" data-a="services" data-id="${c.id}">Edit services & brands</button></div>`}
  </div>`;
}

function editModal(c) {
  modal(`<h3>Edit ${esc(c.name)}</h3><form id="f"><div class="grid c2">
    <div><label>Brand name (what customers see)</label><input name="brand_name" value="${esc(c.brand_name || '')}"></div><div><label>Phone</label><input name="phone" value="${esc(c.phone || '')}"></div>
    <div><label>Email</label><input name="email" value="${esc(c.email || '')}"></div><div><label>Site URL</label><input name="site_url" value="${esc(c.site_url || '')}"></div>
    <div><label>Default tax rate (e.g. 0.07)</label><input name="default_tax_rate" type="number" step="0.0001" value="${esc(c.default_tax_rate)}"></div><div><label>Unlock at level</label><input name="min_level" type="number" value="${esc(c.unlock_rule?.min_level ?? 0)}"></div>
    </div><div class="row end gap"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`,
    { onMount(m) { m.querySelector('#f').addEventListener('submit', async (e) => { e.preventDefault(); const v = formValues(e.target); await store.db.update('categories', c.id, { brand_name: v.brand_name, phone: v.phone, email: v.email, site_url: v.site_url, default_tax_rate: v.default_tax_rate, unlock_rule: { ...c.unlock_rule, min_level: v.min_level } }); closeModal(); toast('Saved'); }); } });
}

function servicesModal(c) {
  let services = (c.services || []).map((s) => ({ ...s }));
  let brands = (c.equipment_brands || []).map((b) => ({ ...b }));
  const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const draw = (m) => {
    m.innerHTML = `<h3>${esc(c.name)}: services & brands</h3>
      <h4>Services</h4><div>${services.map((s, i) => `<span class="chip">${esc(s.name)} <span class="muted small">${money(s.avg_ticket, { cents: false })}</span><span class="x" data-ds="${i}">✕</span></span>`).join('')}</div>
      <div class="row gap"><input id="sn" placeholder="Service name" style="flex:2"><input id="st" type="number" placeholder="Typical $" style="flex:1"><button class="btn sm" id="sa">Add</button></div>
      <h4 style="margin-top:14px">Equipment brands</h4><div>${brands.map((b, i) => `<span class="chip">${esc(b.name)}<span class="x" data-db="${i}">✕</span></span>`).join('')}</div>
      <div class="row gap"><input id="bn" placeholder="Brand name" style="flex:1"><button class="btn sm" id="ba">Add</button></div>
      <div class="row end gap" style="margin-top:14px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="save">Save</button></div>`;
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
    m.querySelectorAll('[data-ds]').forEach((x) => x.addEventListener('click', () => { services.splice(Number(x.dataset.ds), 1); draw(m); }));
    m.querySelectorAll('[data-db]').forEach((x) => x.addEventListener('click', () => { brands.splice(Number(x.dataset.db), 1); draw(m); }));
    m.querySelector('#sa').addEventListener('click', () => { const n = m.querySelector('#sn').value.trim(); if (!n) return; services.push({ slug: slug(n), name: n, blurb: '', avg_ticket: Number(m.querySelector('#st').value) || null, intake_fields: [] }); draw(m); });
    m.querySelector('#ba').addEventListener('click', () => { const n = m.querySelector('#bn').value.trim(); if (!n) return; brands.push({ slug: slug(n), name: n, notes: '' }); draw(m); });
    m.querySelector('#save').addEventListener('click', async () => { await store.db.update('categories', c.id, { services, equipment_brands: brands }); closeModal(); toast('Saved'); });
  };
  modal('', { onMount: draw });
}
