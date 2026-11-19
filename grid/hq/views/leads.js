import { store, loadLeadBundle } from '../data/store.js';
import { esc, money, ago, badge, titleCase, equipmentLabel, fmtDate, telLink, smsLink, modal, closeModal, toast, formValues, on, minutesBetween } from '../lib/ui.js';
import { rankTechs } from '../lib/match.js';
import * as act from '../lib/actions.js';
import { describe } from './dashboard.js';

const ACTIVE = ['contacted', 'approved', 'offered', 'assigned', 'quoted', 'scheduled', 'in_progress'];

export default async function leads(root, { query }) {
  const db = store.db;
  const all = await db.list('leads');
  const techs = await db.list('techs');
  const tab = query.tab || 'answer';
  const filtered = all.filter((l) => tab === 'answer' ? l.status === 'new' : tab === 'active' ? ACTIVE.includes(l.status) : tab === 'done' ? ['completed', 'paid'].includes(l.status) : tab === 'dead' ? l.status === 'dead' : true)
    .sort((a, b) => tab === 'answer' ? new Date(a.created_at) - new Date(b.created_at) : new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  const sla = Number(store.setting('speed_sla_minutes', 5));
  const counts = { answer: all.filter((l) => l.status === 'new').length, active: all.filter((l) => ACTIVE.includes(l.status)).length, done: all.filter((l) => ['completed', 'paid'].includes(l.status)).length, dead: all.filter((l) => l.status === 'dead').length, all: all.length };
  const tabLink = (k, label) => `<a href="#/leads?tab=${k}" class="${tab === k ? 'active' : ''}">${label} <span class="muted">${counts[k]}</span></a>`;

  root.innerHTML = `
    <div class="row between"><h1>Leads</h1><button class="btn primary" id="new-lead">+ Phone lead</button></div>
    <div class="tabs">${tabLink('answer', 'Needs answer')}${tabLink('active', 'Active')}${tabLink('done', 'Completed')}${tabLink('dead', 'Dead')}${tabLink('all', 'All')}</div>
    <div class="card table-wrap">
      ${filtered.length ? `<table><thead><tr><th>${tab === 'answer' ? 'Waiting' : 'Updated'}</th><th>Customer</th><th>Where</th><th>Job</th><th>Status</th><th>Tech</th><th class="num">Value</th></tr></thead><tbody>
      ${filtered.map((l) => {
        const t = techs.find((x) => x.id === l.assigned_tech_id);
        const m = (Date.now() - new Date(l.created_at)) / 60000;
        const timer = l.status === 'new' ? `<span class="timer ${m <= sla ? 'green' : m <= 30 ? 'yellow' : 'red'}">${ago(l.created_at)}</span>` : `<span class="muted small">${ago(l.updated_at || l.created_at)} ago</span>`;
        return `<tr class="click" data-href="#/leads/${l.id}"><td>${timer}</td><td><b>${esc(l.customer_name)}</b><div class="small muted">${esc(l.phone)}</div></td><td>${esc(l.city || '')}<div class="small muted">${esc(l.zip || '')} · ${esc(l.county || '')}</div></td>
          <td>${esc(titleCase(l.service_slug))}<div class="small muted">${esc(equipmentLabel(l.equipment))}</div></td><td>${badge(l.status)}${l.urgency === 'asap' ? ' <span class="badge s-new">ASAP</span>' : ''}</td><td>${t ? esc(t.business_name) : '<span class="muted">—</span>'}</td><td class="num">${l.estimated_value ? money(l.estimated_value, { cents: false }) : '—'}</td></tr>`;
      }).join('')}</tbody></table>` : `<div class="empty">Nothing here.</div>`}
    </div>`;
  on(root, 'tr.click', 'click', (_e, el) => { location.hash = el.dataset.href; });
  root.querySelector('#new-lead').addEventListener('click', () => newLeadModal());
}

function newLeadModal() {
  const cats = store.categories.filter((c) => c.status === 'active');
  const marine = cats[0];
  modal(`<h3>New lead from a phone call</h3><form id="f">
    <div class="grid c2">
      <div><label>Customer name</label><input name="customer_name" required></div>
      <div><label>Phone</label><input name="phone" required placeholder="(727) 555-0100"></div>
      <div><label>Email</label><input name="email" type="email"></div>
      <div><label>City</label><input name="city"></div>
      <div><label>Zip</label><input name="zip" required></div>
      <div><label>County</label><select name="county">${['Pinellas', 'Hillsborough', 'Pasco', 'Manatee', 'Hernando'].map((c) => `<option>${c}</option>`).join('')}</select></div>
      <div><label>Vertical</label><select name="category_id">${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>Service</label><select name="service_slug">${(marine?.services || []).map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('')}</select></div>
      <div><label>Engine / equipment make</label><select name="make"><option value="">—</option>${(marine?.equipment_brands || []).map((b) => `<option value="${b.slug}">${esc(b.name)}</option>`).join('')}</select></div>
      <div><label>Model</label><input name="model"></div>
      <div><label>Year</label><input name="year" type="number"></div>
      <div><label>Hours</label><input name="hours" type="number"></div>
      <div><label>Urgency</label><select name="urgency"><option value="asap">ASAP</option><option value="this_week" selected>This week</option><option value="flexible">Flexible</option></select></div>
      <div><label>Source</label><select name="source"><option value="phone">Phone</option><option value="referral">Referral</option><option value="tech_overflow">Tech overflow</option><option value="facebook">Facebook</option><option value="google_ads">Google Ads</option></select></div>
    </div>
    <label>What's wrong (customer's words)</label><textarea name="description"></textarea>
    <label class="inline"><input type="checkbox" name="sms_consent" checked> Customer OK with texts about this job</label>
    <div class="row end gap"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Create & mark answered</button></div></form>`,
    { onMount(m) {
      m.querySelector('#f').addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = formValues(e.target);
        const now = new Date().toISOString();
        const lead = await store.db.insert('leads', {
          category_id: v.category_id, source: v.source, customer_name: v.customer_name, phone: v.phone, email: v.email || null, city: v.city || null, zip: v.zip, county: v.county,
          equipment: { make: v.make || null, model: v.model || null, year: v.year, hours: v.hours }, service_slug: v.service_slug, description: v.description, photos: [], urgency: v.urgency, sms_consent: v.sms_consent,
          status: 'contacted', assigned_tech_id: null, first_response_at: now, scheduled_at: null, estimated_value: null, lost_reason: null,
        });
        await act.logEvent(lead.id, 'created', { source: v.source }, 'admin');
        await act.logEvent(lead.id, 'call', { minutes_to_respond: 0, note: 'Inbound call' });
        closeModal(); toast('Lead created'); location.hash = `#/leads/${lead.id}`;
      });
    } });
}

// ---------------------------------------------------------------------------------------- detail
export async function detail(root, { params }) {
  const b = await loadLeadBundle(params.id);
  if (!b) { root.innerHTML = `<div class="card">Lead not found. <a href="#/leads">Back</a></div>`; return; }
  const { lead: l, events, offers, quotes, invoices, payouts, techs } = b;
  const expired = await act.expireStaleOffers(offers);
  if (expired) return detail(root, { params });
  const tech = techs.find((t) => t.id === l.assigned_tech_id);
  const cat = store.category(l.category_id);
  const service = (cat?.services || []).find((s) => s.slug === l.service_slug);
  const sla = Number(store.setting('speed_sla_minutes', 5));
  const resp = l.first_response_at ? minutesBetween(l.created_at, l.first_response_at) : null;
  const waiting = (Date.now() - new Date(l.created_at)) / 60000;
  const openOffers = offers.filter((o) => o.status === 'offered');
  const ranked = rankTechs(l, techs, { limit: 5, openOffers: await store.db.list('dispatch_offers', { filter: { status: 'offered' } }) });
  const photos = await Promise.all((l.photos || []).map(async (p) => ({ p, url: await store.db.fileUrl('lead-photos', p) })));

  const primary = [];
  const secondary = [];
  if (['new', 'contacted'].includes(l.status)) {
    primary.push(`<button class="btn primary" data-a="call">📞 Log call</button>`, `<button class="btn" data-a="text">💬 Log text</button>`, `<button class="btn ok" data-a="offer">Approve & offer to techs</button>`);
    secondary.push(`<button class="btn" data-a="assign">Assign directly</button>`, `<button class="btn danger" data-a="dead">Mark dead</button>`);
  } else if (l.status === 'approved') {
    primary.push(`<button class="btn ok" data-a="offer">Offer to techs</button>`, `<button class="btn" data-a="assign">Assign directly</button>`);
    secondary.push(`<button class="btn" data-a="call">📞 Log call</button>`, `<button class="btn danger" data-a="dead">Mark dead</button>`);
  } else if (l.status === 'offered') {
    primary.push(`<button class="btn" data-a="assign">Assign directly</button>`, `<button class="btn" data-a="reoffer">Offer to more techs</button>`);
    secondary.push(`<button class="btn" data-a="call">📞 Log call</button>`, `<button class="btn danger" data-a="dead">Mark dead</button>`);
  } else if (['assigned', 'quoted', 'scheduled', 'in_progress'].includes(l.status)) {
    if (!quotes.some((q) => ['sent', 'accepted'].includes(q.status))) primary.push(`<button class="btn primary" data-a="quote">Build quote</button>`);
    primary.push(`<button class="btn" data-a="schedule">📅 ${l.scheduled_at ? 'Reschedule' : 'Schedule'}</button>`);
    if (l.status !== 'in_progress') primary.push(`<button class="btn" data-a="start">Mark in progress</button>`);
    primary.push(`<button class="btn ok" data-a="invoice">Upload invoice</button>`);
    secondary.push(`<button class="btn" data-a="call">📞 Log call</button>`, `<button class="btn" data-a="assign">Reassign</button>`, `<button class="btn danger" data-a="dead">Mark dead</button>`);
  } else if (l.status === 'completed') {
    primary.push(`<button class="btn" data-a="call">📞 Log call</button>`);
  } else if (l.status === 'dead') {
    primary.push(`<button class="btn" data-a="revive">Reopen</button>`);
  }
  secondary.push(`<button class="btn" data-a="note">+ Note</button>`, `<button class="btn" data-a="edit">Edit details</button>`);

  root.innerHTML = `
    <div class="row between">
      <div><a href="#/leads" class="small">← Leads</a><h1 style="margin:4px 0">${esc(l.customer_name)} ${badge(l.status)} ${l.urgency === 'asap' ? '<span class="badge s-new">ASAP</span>' : ''}</h1>
        <div class="row gap"><a href="${telLink(l.phone)}">${esc(l.phone)}</a>${l.sms_consent ? `<a href="${smsLink(l.phone, `Hi ${l.customer_name.split(' ')[0]}, this is ${cat?.brand_name || 'the shop'} about your boat.`)}">Text</a>` : '<span class="muted small">no text consent</span>'}${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : ''}</div></div>
      <div class="right">${l.status === 'new' ? `<div class="timer ${waiting <= sla ? 'green' : waiting <= 30 ? 'yellow' : 'red'}" style="font-size:28px">${ago(l.created_at)}</div><div class="small muted">waiting · goal ${sla} min</div>` : resp !== null ? `<div class="timer ${resp <= sla ? 'green' : resp <= 30 ? 'yellow' : 'red'}" style="font-size:22px">${Math.round(resp)} min</div><div class="small muted">first response</div>` : ''}</div>
    </div>
    <div class="actions">${primary.join('')}</div>
    <div class="actions">${secondary.join('')}</div>

    <div class="grid c2">
      <div class="card">
        <h3>Job</h3>
        <dl class="kv">
          <dt>Service</dt><dd>${esc(service?.name || titleCase(l.service_slug))}</dd>
          <dt>Equipment</dt><dd>${esc(equipmentLabel(l.equipment))}</dd>
          <dt>Location</dt><dd>${esc([l.address, l.city, l.zip].filter(Boolean).join(', '))} <span class="muted">· ${esc(l.county || '')} County</span></dd>
          <dt>Source</dt><dd>${esc(titleCase(l.source))} · ${fmtDate(l.created_at, true)}</dd>
          <dt>Tech</dt><dd>${tech ? `<a href="#/techs/${tech.id}">${esc(tech.business_name)}</a> · <a href="${telLink(tech.phone)}">${esc(tech.phone)}</a>` : '<span class="muted">unassigned</span>'}</dd>
          <dt>Scheduled</dt><dd>${l.scheduled_at ? fmtDate(l.scheduled_at, true) : '<span class="muted">—</span>'}</dd>
          <dt>Est. value</dt><dd>${l.estimated_value ? money(l.estimated_value) : `<span class="muted">${service?.avg_ticket ? 'typical ' + money(service.avg_ticket, { cents: false }) : '—'}</span>`}</dd>
          ${l.lost_reason ? `<dt>Lost</dt><dd>${esc(l.lost_reason)}</dd>` : ''}
        </dl>
        <p style="white-space:pre-wrap">${esc(l.description || '')}</p>
        ${photos.length ? `<div class="row gap">${photos.map((x) => x.url ? `<a href="${x.url}" target="_blank"><img src="${x.url}" alt="photo" style="height:90px;border-radius:6px"></a>` : `<span class="chip">${esc(x.p)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="card">
        <h3>Dispatch</h3>
        ${offers.length ? `<table><thead><tr><th>Tech</th><th>Status</th><th>When</th></tr></thead><tbody>${offers.map((o) => { const t = techs.find((x) => x.id === o.tech_id); return `<tr><td><a href="#/techs/${o.tech_id}">${esc(t?.business_name || '?')}</a></td><td>${badge(o.status)}${o.status === 'offered' ? ` <span class="small muted">expires in ${Math.max(0, Math.round((new Date(o.expires_at) - Date.now()) / 60000))} min</span>` : ''}</td><td class="small muted">${ago(o.responded_at || o.offered_at)} ago</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted small">No offers yet.</p>'}
        ${!l.assigned_tech_id && ranked.length ? `<h3 style="margin-top:12px">Best matches</h3><ul class="list">${ranked.map((r) => `<li><span><a href="#/techs/${r.tech.id}">${esc(r.tech.business_name)}</a> <span class="small muted">${r.reasons.join(' · ')}</span></span><span class="row gap"><b>${r.score}</b><button class="btn sm" data-assign="${r.tech.id}">Assign</button></span></li>`).join('')}</ul>` : ''}
        ${!l.assigned_tech_id && !ranked.length ? '<p class="notice">No approved techs match this zip and service. Add techs or widen their zip lists.</p>' : ''}
      </div>
    </div>

    ${quotes.length || invoices.length ? `<div class="grid c2" style="margin-top:12px">
      <div class="card"><h3>Quotes</h3>${quotes.length ? `<ul class="list">${quotes.map((q) => `<li><a href="#/quotes/${q.id}">${money(q.total)}</a><span>${badge(q.status)}</span></li>`).join('')}</ul>` : '<p class="muted small">None</p>'}</div>
      <div class="card"><h3>Invoices & payouts</h3>${invoices.length ? `<ul class="list">${invoices.map((i) => { const po = payouts.find((p) => p.invoice_id === i.id); return `<li><a href="#/invoices/${i.id}">${money(i.total)}</a><span>${badge(i.status)}${po ? ` payout ${badge(po.status)}` : ''}</span></li>`; }).join('')}</ul>` : '<p class="muted small">None</p>'}</div>
    </div>` : ''}

    <div class="card" style="margin-top:12px"><h3>Timeline</h3>
      <ul class="timeline">${events.slice().reverse().map((e) => `<li><span class="muted small">${fmtDate(e.created_at, true)}</span> · <b>${esc(describe(e))}</b>${e.payload?.note ? ` — ${esc(e.payload.note)}` : ''}${e.payload?.reason ? ` — ${esc(e.payload.reason)}` : ''} <span class="muted small">${esc(e.actor.startsWith('tech:') ? (techs.find((t) => 'tech:' + t.id === e.actor)?.business_name || 'tech') : e.actor)}</span></li>`).join('')}</ul>
    </div>`;

  on(root, '[data-assign]', 'click', async (_e, el) => { await act.assignTech(l, el.dataset.assign); toast('Assigned'); });
  on(root, '[data-a]', 'click', async (_e, el) => {
    const a = el.dataset.a;
    try {
      if (a === 'call' || a === 'text') return noteModal(a === 'call' ? 'Log a call' : 'Log a text', async (note) => { await act.logContact(l, a, note); toast('Logged'); });
      if (a === 'note') return noteModal('Add a note', async (note) => { await act.addNote(l, note); toast('Noted'); });
      if (a === 'offer' || a === 'reoffer') return offerModal(l, ranked);
      if (a === 'assign') return assignModal(l, techs);
      if (a === 'dead') return noteModal('Why is this lead dead?', async (reason) => { await act.markDead(l, reason); toast('Marked dead'); }, 'Reason (required)', true);
      if (a === 'revive') { await act.setLeadStatus(l, l.assigned_tech_id ? 'assigned' : 'contacted', { lost_reason: null }); return toast('Reopened'); }
      if (a === 'schedule') return scheduleModal(l);
      if (a === 'start') { await act.setLeadStatus(l, 'in_progress'); return toast('In progress'); }
      if (a === 'quote') { const q = await act.createQuote(l, l.assigned_tech_id, defaultLines(l, tech, service)); location.hash = `#/quotes/${q.id}`; return; }
      if (a === 'invoice') return invoiceModal(l, tech, techs);
      if (a === 'edit') return editModal(l);
    } catch (e) { toast(e.message, 'bad'); }
  });
}

export function defaultLines(lead, tech, service) {
  const rate = Number(tech?.hourly_rate || 130), trip = Number(tech?.trip_fee || 85);
  const hours = Math.max(1, Math.round(((service?.avg_ticket || 500) * 0.55) / rate));
  return [
    { description: `${service?.name || titleCase(lead.service_slug) || 'Labor'} — labor`, qty: hours, unit_price: rate, taxable: true, kind: 'labor' },
    { description: 'Parts (estimate, billed at cost + markup)', qty: 1, unit_price: Math.round((service?.avg_ticket || 500) * 0.35), taxable: true, kind: 'parts' },
    { description: 'Trip fee', qty: 1, unit_price: trip, taxable: false, kind: 'fee' },
  ];
}

function noteModal(title, onSave, label = 'Note', required = false) {
  modal(`<h3>${esc(title)}</h3><label>${esc(label)}</label><textarea id="note" ${required ? 'required' : ''}></textarea>
    <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="save">Save</button></div>`,
    { onMount(m) { m.querySelector('#save').addEventListener('click', async () => { const v = m.querySelector('#note').value.trim(); if (required && !v) return toast('Reason required', 'warn'); closeModal(); await onSave(v); }); } });
}

function offerModal(lead, ranked) {
  modal(`<h3>Offer this job</h3><p class="muted small">Pick who gets the text. First to accept wins; others are withdrawn automatically. Offers expire in ${store.setting('offer_expiry_minutes', 30)} minutes.</p>
    ${ranked.length ? ranked.map((r, i) => `<label class="inline"><input type="checkbox" name="t" value="${r.tech.id}" ${i < 3 ? 'checked' : ''}> <b>${esc(r.tech.business_name)}</b> <span class="muted small">score ${r.score} · ${r.reasons.join(' · ')}</span></label>`).join('') : '<p class="notice">No matches. Assign directly or add techs.</p>'}
    <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn ok" id="go" ${ranked.length ? '' : 'disabled'}>Send offers</button></div>`,
    { onMount(m) { m.querySelector('#go').addEventListener('click', async () => { const ids = [...m.querySelectorAll('input[name=t]:checked')].map((i) => i.value); if (!ids.length) return toast('Pick at least one tech', 'warn'); closeModal(); try { await act.approveAndOffer(lead, ids); toast(`Offered to ${ids.length} tech${ids.length > 1 ? 's' : ''}`); } catch (e) { toast(e.message, 'bad'); } }); } });
}

function assignModal(lead, techs) {
  const approved = techs.filter((t) => t.status === 'approved' && (t.category_ids || []).includes(lead.category_id));
  modal(`<h3>Assign directly</h3><label>Technician</label><select id="t">${approved.map((t) => `<option value="${t.id}" ${t.id === lead.assigned_tech_id ? 'selected' : ''}>${esc(t.business_name)} — ${esc(t.contact_name || '')}</option>`).join('')}</select>
    <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Assign</button></div>`,
    { onMount(m) { m.querySelector('#go').addEventListener('click', async () => { const id = m.querySelector('#t').value; closeModal(); await act.assignTech(lead, id); toast('Assigned'); }); } });
}

function scheduleModal(lead) {
  const d = lead.scheduled_at ? new Date(lead.scheduled_at) : new Date(Date.now() + 86400000);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  modal(`<h3>Schedule</h3><label>Date & time</label><input id="when" type="datetime-local" value="${local}">
    <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Save</button></div>`,
    { onMount(m) { m.querySelector('#go').addEventListener('click', async () => { const v = m.querySelector('#when').value; if (!v) return; closeModal(); await act.scheduleLead(lead, new Date(v).toISOString()); toast('Scheduled'); }); } });
}

function invoiceModal(lead, tech, techs) {
  const approved = techs.filter((t) => t.status === 'approved');
  modal(`<h3>Upload the tech's invoice</h3><p class="muted small">Photo or PDF. The AI reads the line items; you review before anything is sent.</p>
    <label>Technician</label><select id="t">${approved.map((t) => `<option value="${t.id}" ${t.id === (tech?.id) ? 'selected' : ''}>${esc(t.business_name)}</option>`).join('')}</select>
    <label>File</label><input id="file" type="file" accept="image/*,application/pdf">
    <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Upload & read</button></div>`,
    { onMount(m) { m.querySelector('#go').addEventListener('click', async () => { const f = m.querySelector('#file').files[0]; if (!f) return toast('Choose a file', 'warn'); const tid = m.querySelector('#t').value; closeModal(); toast('Reading invoice…'); try { const inv = await act.uploadInvoice(lead, tid, f); location.hash = `#/invoices/${inv.id}`; } catch (e) { toast(e.message, 'bad'); } }); } });
}

function editModal(l) {
  const cat = store.category(l.category_id);
  modal(`<h3>Edit lead</h3><form id="f"><div class="grid c2">
      <div><label>Name</label><input name="customer_name" value="${esc(l.customer_name)}"></div><div><label>Phone</label><input name="phone" value="${esc(l.phone)}"></div>
      <div><label>Email</label><input name="email" value="${esc(l.email || '')}"></div><div><label>Address</label><input name="address" value="${esc(l.address || '')}"></div>
      <div><label>City</label><input name="city" value="${esc(l.city || '')}"></div><div><label>Zip</label><input name="zip" value="${esc(l.zip || '')}"></div>
      <div><label>County</label><select name="county">${['Pinellas', 'Hillsborough', 'Pasco', 'Manatee', 'Hernando'].map((c) => `<option ${c === l.county ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div><label>Service</label><select name="service_slug">${(cat?.services || []).map((s) => `<option value="${s.slug}" ${s.slug === l.service_slug ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div><label>Make</label><select name="make"><option value="">—</option>${(cat?.equipment_brands || []).map((b) => `<option value="${b.slug}" ${b.slug === l.equipment?.make ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div><label>Model</label><input name="model" value="${esc(l.equipment?.model || '')}"></div>
      <div><label>Year</label><input name="year" type="number" value="${esc(l.equipment?.year || '')}"></div><div><label>Hours</label><input name="hours" type="number" value="${esc(l.equipment?.hours || '')}"></div>
      <div><label>Urgency</label><select name="urgency">${['asap', 'this_week', 'flexible'].map((u) => `<option value="${u}" ${u === l.urgency ? 'selected' : ''}>${titleCase(u)}</option>`).join('')}</select></div>
      <div><label>Estimated value</label><input name="estimated_value" type="number" step="1" value="${esc(l.estimated_value || '')}"></div>
    </div><label>Description</label><textarea name="description">${esc(l.description || '')}</textarea>
    <label class="inline"><input type="checkbox" name="sms_consent" ${l.sms_consent ? 'checked' : ''}> OK to text</label>
    <div class="row end gap"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`,
    { onMount(m) { m.querySelector('#f').addEventListener('submit', async (e) => { e.preventDefault(); const v = formValues(e.target); const { make, model, year, hours, ...rest } = v; await store.db.update('leads', l.id, { ...rest, email: rest.email || null, equipment: { ...l.equipment, make: make || null, model, year, hours } }); closeModal(); toast('Saved'); }); } });
}
