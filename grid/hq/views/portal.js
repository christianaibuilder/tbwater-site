// Tech portal: offers, my jobs, quotes to review, invoices, payouts, profile.
import { store } from '../data/store.js';
import { esc, money, badge, titleCase, fmtDate, ago, equipmentLabel, telLink, smsLink, modal, closeModal, toast, formValues, on, round2 } from '../lib/ui.js';
import * as act from '../lib/actions.js';

export default async function portal(root, { query }) {
  const db = store.db;
  const user = store.user();
  const demo = db.mode === 'local';
  const showPicker = user?.role === 'admin' || demo;
  const allTechs = showPicker ? await db.list('techs', { filter: { status: 'approved' }, order: 'business_name', desc: false }) : [];
  const techId = user?.tech_id || null;
  const canAct = user?.role === 'tech' || demo;

  const header = `<div class="page-head"><h1>Tech portal</h1>
    ${showPicker ? `<div class="row gap"><span class="small muted">${demo ? 'Acting as' : 'Preview as'}</span><select id="actas"><option value="">— pick a tech —</option>${allTechs.map((t) => `<option value="${t.id}" ${t.id === techId ? 'selected' : ''}>${esc(t.business_name)}</option>`).join('')}</select>${techId && demo ? `<button class="btn sm" id="back-admin">Back to admin</button>` : ''}</div>` : ''}</div>`;

  if (!techId) {
    root.innerHTML = header + `<div class="card"><p>${showPicker ? 'Pick a technician above to see what they see.' : 'Your account is not linked to a technician profile yet. Ask the admin to approve your application with this email address.'}</p></div>`;
    bindHeader(root, allTechs, demo);
    return;
  }

  const tech = await db.get('techs', techId);
  let offers;
  if (db.mode === 'live') offers = (await db.rpc('my_offers')) || [];
  else {
    const os = await db.list('dispatch_offers', { filter: { tech_id: techId }, order: 'offered_at' });
    offers = await Promise.all(os.map(async (o) => ({ offer: o, lead: await db.get('leads', o.lead_id) })));
  }
  await act.expireStaleOffers(offers.map((x) => x.offer));
  const open = offers.filter((x) => x.offer.status === 'offered');
  const [jobs, quotes, invoices, payouts] = await Promise.all([
    db.list('leads', { filter: { assigned_tech_id: techId } }), db.list('quotes', { filter: { tech_id: techId } }), db.list('invoices', { filter: { tech_id: techId } }), db.list('payouts', { filter: { tech_id: techId } }),
  ]);
  const activeJobs = jobs.filter((j) => ['assigned', 'quoted', 'scheduled', 'in_progress'].includes(j.status));
  const doneJobs = jobs.filter((j) => ['completed', 'paid'].includes(j.status));
  const owed = payouts.filter((p) => p.status === 'owed').reduce((s, p) => s + Number(p.amount), 0);
  const ytd = payouts.filter((p) => p.status === 'paid' && p.tax_year === new Date().getFullYear()).reduce((s, p) => s + Number(p.amount), 0);
  const cat = store.category((tech.category_ids || [])[0]) || store.categories[0];
  const svcName = (slug) => (cat?.services || []).find((s) => s.slug === slug)?.name || titleCase(slug);

  root.innerHTML = header + `
    <div class="card"><div class="row between"><div><b>${esc(tech.business_name)}</b> <span class="muted small">${esc(tech.contact_name || '')}</span></div><div class="row gap small"><span>Owed to you: <b>${money(owed)}</b></span><span class="muted">Paid this year: ${money(ytd, { cents: false })}</span></div></div></div>

    <div class="grid c2" style="margin-top:12px">
      <div class="card"><h2>New job offers <span class="muted">${open.length}</span></h2>
        ${open.length ? open.map(({ offer: o, lead: l }) => `<div class="card" style="margin-top:8px"><div class="row between"><b>${esc(svcName(l.service_slug))}</b><span class="small muted">expires in ${Math.max(0, Math.round((new Date(o.expires_at) - Date.now()) / 60000))} min</span></div>
          <div class="small">${esc(equipmentLabel(l.equipment))} · ${esc(l.city || '')} ${esc(l.zip || '')} · ${l.urgency === 'asap' ? '<span class="badge s-new">ASAP</span>' : titleCase(l.urgency)}</div>
          <p class="small" style="white-space:pre-wrap">${esc(l.description || '')}</p>
          <p class="small muted">Customer contact unlocks when you accept. First to accept gets the job.</p>
          <div class="row gap"><button class="btn ok" data-accept="${o.id}" ${canAct ? '' : 'disabled'}>Accept</button><button class="btn" data-decline="${o.id}" ${canAct ? '' : 'disabled'}>Decline</button></div></div>`).join('') : '<p class="muted small">No open offers. You\'ll get a text when a job near you comes in.</p>'}
      </div>
      <div class="card"><h2>My jobs <span class="muted">${activeJobs.length}</span></h2>
        ${activeJobs.length ? activeJobs.map((l) => { const q = quotes.find((x) => x.lead_id === l.id && ['sent', 'accepted'].includes(x.status)); return `<div class="card" style="margin-top:8px"><div class="row between"><b>${esc(l.customer_name)}</b>${badge(l.status)}</div>
          <div class="small"><a href="${telLink(l.phone)}">${esc(l.phone)}</a>${l.sms_consent ? ` · <a href="${smsLink(l.phone)}">text</a>` : ''} · ${esc([l.address, l.city, l.zip].filter(Boolean).join(', '))}</div>
          <div class="small muted">${esc(svcName(l.service_slug))} · ${esc(equipmentLabel(l.equipment))}${l.scheduled_at ? ` · scheduled ${fmtDate(l.scheduled_at, true)}` : ''}${q ? ` · quote ${money(q.total)} ${q.status}` : ''}</div>
          <p class="small" style="white-space:pre-wrap">${esc(l.description || '')}</p>
          <div class="row gap">${l.status !== 'in_progress' ? `<button class="btn sm" data-start="${l.id}" ${canAct ? '' : 'disabled'}>Started</button>` : ''}<button class="btn sm primary" data-invoice="${l.id}" ${canAct ? '' : 'disabled'}>Done — upload invoice</button></div></div>`; }).join('') : '<p class="muted small">No active jobs.</p>'}
        ${doneJobs.length ? `<details style="margin-top:10px"><summary class="small muted">${doneJobs.length} completed</summary><ul class="list small">${doneJobs.map((l) => `<li><span>${esc(l.customer_name)} · ${esc(svcName(l.service_slug))}</span>${badge(l.status)}</li>`).join('')}</ul></details>` : ''}
      </div>
    </div>

    <div class="grid c3" style="margin-top:12px">
      <div class="card"><h2>Quotes to review</h2><p class="small muted">Drafts the office built from your rates. Edit anything before it goes to the customer.</p>
        ${quotes.length ? `<ul class="list">${quotes.map((q) => { const l = jobs.find((x) => x.id === q.lead_id); return `<li><span>${esc(l?.customer_name || 'Customer')} <span class="muted small">${fmtDate(q.created_at)}</span></span><span class="row gap"><b>${money(q.total)}</b>${badge(q.status)}${q.status === 'draft' && canAct ? `<button class="btn sm" data-quote="${q.id}">Edit</button>` : ''}</span></li>`; }).join('')}</ul>` : '<p class="muted small">None.</p>'}</div>
      <div class="card"><h2>Invoices</h2>
        ${invoices.length ? `<ul class="list">${invoices.map((i) => { const l = jobs.find((x) => x.id === i.lead_id); return `<li><span>${esc(l?.customer_name || '')} <span class="muted small">${fmtDate(i.created_at)}</span></span><span class="row gap"><b>${money(i.total)}</b>${badge(i.status)}</span></li>`; }).join('')}</ul>` : '<p class="muted small">Upload invoices from a finished job above.</p>'}
        <p class="small muted">You keep ${100 - Number(store.setting('platform_fee_pct', 10))}% of each invoice. The platform collects from the customer and pays you after the payment settles.</p></div>
      <div class="card"><h2>Payouts</h2>
        ${payouts.length ? `<ul class="list">${payouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((p) => `<li><span>${fmtDate(p.paid_at || p.created_at)} <span class="muted small">${titleCase(p.method)}${p.reference ? ' · ' + esc(p.reference) : ''}</span></span><span class="row gap"><b>${money(p.amount)}</b>${badge(p.status)}</span></li>`).join('')}</ul>` : '<p class="muted small">Nothing yet.</p>'}
        ${!tech.w9_path ? '<p class="notice">We need your W-9 before the first payout. Email it to the office.</p>' : ''}</div>
    </div>

    <div class="card" style="margin-top:12px"><div class="row between"><h2 style="margin:0">My profile</h2><button class="btn sm" id="edit-profile" ${canAct ? '' : 'disabled'}>Edit</button></div>
      <dl class="kv" style="margin-top:8px"><dt>Phone / email</dt><dd>${esc(tech.phone || '')} · ${esc(tech.email || '')}</dd><dt>My rates</dt><dd>${tech.hourly_rate ? money(tech.hourly_rate) + '/hr' : '—'} · trip ${tech.trip_fee ? money(tech.trip_fee) : '—'}</dd><dt>Zips I serve</dt><dd>${(tech.service_zips || []).join(', ') || '—'}</dd><dt>Specialties</dt><dd>${(tech.specialties || []).map((s) => `<span class="chip">${esc(svcName(s))}</span>`).join('')}</dd><dt>Insurance</dt><dd>${esc(tech.insurance_carrier || '—')} · ${tech.insurance_expires ? 'expires ' + fmtDate(tech.insurance_expires) : '<span class="timer red">no expiry on file</span>'}</dd></dl></div>`;

  bindHeader(root, allTechs, demo);
  on(root, '[data-accept]', 'click', async (_e, el) => { try { await db.rpc('accept_offer', { offer_id: el.dataset.accept }); toast('Job is yours. Call the customer now.'); } catch (e) { toast(e.message, 'bad'); } });
  on(root, '[data-decline]', 'click', async (_e, el) => { try { await db.rpc('decline_offer', { offer_id: el.dataset.decline, reason: 'declined in portal' }); toast('Declined'); } catch (e) { toast(e.message, 'bad'); } });
  on(root, '[data-start]', 'click', async (_e, el) => { const l = jobs.find((x) => x.id === el.dataset.start); await act.setLeadStatus(l, 'in_progress'); toast('Marked started'); });
  on(root, '[data-invoice]', 'click', (_e, el) => {
    const l = jobs.find((x) => x.id === el.dataset.invoice);
    modal(`<h3>Upload your invoice</h3><p class="small muted">Any format: photo of a paper ticket, PDF from your software. We read it, the office checks it, the customer gets a payment link.</p>
      <label>File</label><input id="file" type="file" accept="image/*,application/pdf">
      <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Upload</button></div>`,
      { onMount(m) { m.querySelector('#go').addEventListener('click', async () => { const f = m.querySelector('#file').files[0]; if (!f) return toast('Choose a file', 'warn'); closeModal(); toast('Uploading…'); try { await act.uploadInvoice(l, techId, f); toast('Invoice received. You\'ll be paid after the customer pays.'); } catch (e) { toast(e.message, 'bad'); } }); } });
  });
  on(root, '[data-quote]', 'click', (_e, el) => quoteEditor(quotes.find((q) => q.id === el.dataset.quote)));
  root.querySelector('#edit-profile')?.addEventListener('click', () => profileEditor(tech, cat));
}

function bindHeader(root, allTechs, demo) {
  root.querySelector('#actas')?.addEventListener('change', (e) => { if (demo) store.db.auth.actAs(e.target.value || null); else { toast('Live preview is read-only; sign in as the tech to act.'); } });
  root.querySelector('#back-admin')?.addEventListener('click', () => store.db.auth.actAs(null));
}

function quoteEditor(q) {
  let items = (q.line_items || []).map((li) => ({ ...li }));
  const draw = (m) => {
    const t = act.computeTotals(items, q.tax_rate);
    m.innerHTML = `<h3>Edit quote</h3><div class="table-wrap"><table class="lines"><thead><tr><th class="w-desc">Line</th><th class="w-num">Qty</th><th class="w-num">Unit $</th><th>Tax</th><th class="num">Amt</th><th></th></tr></thead><tbody>
      ${items.map((li, i) => `<tr><td><input data-i="${i}" data-k="description" value="${esc(li.description)}"></td><td><input type="number" step="0.25" data-i="${i}" data-k="qty" value="${li.qty}"></td><td><input type="number" step="0.01" data-i="${i}" data-k="unit_price" value="${li.unit_price}"></td><td><input type="checkbox" data-i="${i}" data-k="taxable" ${li.taxable ? 'checked' : ''}></td><td class="num">${money(round2(li.qty * li.unit_price))}</td><td><button class="btn sm link" data-del="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>
      <div class="row between"><button class="btn sm" id="add">+ Line</button><div class="money-grid"><span>Subtotal</span><span>${money(t.subtotal)}</span><span>Tax</span><span>${money(t.tax)}</span><span class="total">Total</span><span class="total">${money(t.total)}</span></div></div>
      <div class="row end gap" style="margin-top:12px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="save">Save</button></div>`;
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
    m.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('change', () => { const i = Number(el.dataset.i), k = el.dataset.k; items[i][k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value; draw(m); }));
    m.querySelectorAll('[data-del]').forEach((el) => el.addEventListener('click', () => { items.splice(Number(el.dataset.del), 1); draw(m); }));
    m.querySelector('#add').addEventListener('click', () => { items.push({ description: '', qty: 1, unit_price: 0, taxable: true, kind: 'parts' }); draw(m); });
    m.querySelector('#save').addEventListener('click', async () => { const totals = act.computeTotals(items, q.tax_rate); await store.db.update('quotes', q.id, { line_items: items, ...totals }); closeModal(); toast('Quote updated. The office sees your changes.'); });
  };
  modal('', { onMount: draw });
}

function profileEditor(t, cat) {
  const services = cat?.services || [];
  modal(`<h3>My profile</h3><form id="f"><div class="grid c2">
      <div><label>Phone</label><input name="phone" value="${esc(t.phone || '')}"></div><div><label>Email</label><input name="email" value="${esc(t.email || '')}"></div>
      <div><label>Hourly rate</label><input name="hourly_rate" type="number" step="1" value="${esc(t.hourly_rate ?? '')}"></div><div><label>Trip fee</label><input name="trip_fee" type="number" step="1" value="${esc(t.trip_fee ?? '')}"></div>
      <div><label>Insurance carrier</label><input name="insurance_carrier" value="${esc(t.insurance_carrier || '')}"></div><div><label>Insurance expires</label><input name="insurance_expires" type="date" value="${esc(t.insurance_expires || '')}"></div>
    </div><label>Zips I serve</label><input name="service_zips" value="${esc((t.service_zips || []).join(', '))}">
    <label>Specialties</label><div>${services.map((s) => `<label class="inline" style="display:inline-flex;margin:2px 10px 2px 0"><input type="checkbox" name="sp" value="${s.slug}" ${(t.specialties || []).includes(s.slug) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('')}</div>
    <div class="row end gap"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`,
    { onMount(m) { m.querySelector('#f').addEventListener('submit', async (e) => { e.preventDefault(); const v = formValues(e.target); const sp = [...m.querySelectorAll('input[name=sp]:checked')].map((i) => i.value); await store.db.update('techs', t.id, { phone: v.phone, email: v.email, hourly_rate: v.hourly_rate, trip_fee: v.trip_fee, insurance_carrier: v.insurance_carrier, insurance_expires: v.insurance_expires || null, service_zips: String(v.service_zips).split(/[\s,]+/).filter(Boolean), specialties: sp }); closeModal(); toast('Saved'); }); } });
}
