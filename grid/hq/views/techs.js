import { store } from '../data/store.js';
import { esc, money, badge, titleCase, fmtDate, daysUntil, telLink, modal, closeModal, toast, formValues, on, ago } from '../lib/ui.js';
import * as act from '../lib/actions.js';

export default async function techs(root, { query }) {
  const db = store.db;
  const [all, apps] = await Promise.all([db.list('techs', { order: 'business_name', desc: false }), db.list('tech_applications')]);
  const tab = query.tab || 'roster';
  const newApps = apps.filter((a) => a.status === 'new');
  const rows = tab === 'roster' ? all.filter((t) => t.status === 'approved') : tab === 'paused' ? all.filter((t) => ['paused', 'rejected', 'applied'].includes(t.status)) : all;

  root.innerHTML = `
    <div class="row between"><h1>Techs</h1><button class="btn primary" id="add">+ Add tech manually</button></div>
    <div class="tabs"><a href="#/techs?tab=roster" class="${tab === 'roster' ? 'active' : ''}">Roster <span class="muted">${all.filter((t) => t.status === 'approved').length}</span></a>
      <a href="#/techs?tab=applications" class="${tab === 'applications' ? 'active' : ''}">Applications <span class="muted">${newApps.length}</span></a>
      <a href="#/techs?tab=paused" class="${tab === 'paused' ? 'active' : ''}">Paused / other <span class="muted">${all.filter((t) => t.status !== 'approved').length}</span></a></div>
    ${tab === 'applications' ? applicationsHtml(apps) : `<div class="card table-wrap">${rows.length ? `<table><thead><tr><th>Business</th><th>Coverage</th><th>Specialties</th><th class="num">Rating</th><th class="num">Jobs</th><th>Insurance</th><th>W-9</th><th>Status</th></tr></thead><tbody>
      ${rows.map((t) => { const d = daysUntil(t.insurance_expires); return `<tr class="click" data-href="#/techs/${t.id}"><td><b>${esc(t.business_name)}</b><div class="small muted">${esc(t.contact_name || '')} · ${esc(t.phone || '')}</div></td>
        <td>${esc(t.home_zip || '')}<div class="small muted">${(t.service_zips || []).length} zips</div></td><td>${(t.specialties || []).slice(0, 4).map((s) => `<span class="chip">${esc(titleCase(s))}</span>`).join('')}${(t.specialties || []).length > 4 ? `<span class="chip">+${t.specialties.length - 4}</span>` : ''}</td>
        <td class="num">${t.rating ? t.rating.toFixed(1) + '★' : '—'}</td><td class="num">${t.jobs_completed || 0}<div class="small muted">${money(t.gmv_total, { cents: false })}</div></td>
        <td>${t.insurance_expires ? `<span class="${d < 0 ? 'timer red' : d < 30 ? 'timer yellow' : ''}">${fmtDate(t.insurance_expires)}</span>${d < 0 ? '<div class="small timer red">expired</div>' : d < 30 ? `<div class="small muted">${d} days</div>` : ''}` : '<span class="timer red">none</span>'}</td>
        <td>${t.w9_path ? '✓' : '<span class="timer red">missing</span>'}</td><td>${badge(t.status)}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No techs here yet.</div>'}</div>`}`;
  on(root, 'tr.click', 'click', (_e, el) => { location.hash = el.dataset.href; });
  root.querySelector('#add').addEventListener('click', () => techForm(null));
  on(root, '[data-app]', 'click', async (_e, el) => {
    const app = apps.find((a) => a.id === el.dataset.app);
    const action = el.dataset.act;
    try {
      if (action === 'approve') { const t = await act.approveApplication(app); toast(`${t.business_name} approved`); location.hash = `#/techs/${t.id}`; }
      else if (action === 'reject') { await db.update('tech_applications', app.id, { status: 'rejected' }); toast('Rejected'); }
      else if (action === 'contacted') { await db.update('tech_applications', app.id, { status: 'contacted' }); toast('Marked contacted'); }
    } catch (e) { toast(e.message, 'bad'); }
  });
}

function applicationsHtml(apps) {
  const open = apps.filter((a) => ['new', 'contacted'].includes(a.status));
  if (!open.length) return `<div class="card empty">No open applications. Share the apply link on the boat site.</div>`;
  return open.map((a) => `<div class="card"><div class="row between"><div><b>${esc(a.business_name)}</b> ${badge(a.status)}<div class="small muted">${esc(a.contact_name)} · <a href="${telLink(a.phone)}">${esc(a.phone)}</a> · ${esc(a.email)} · applied ${ago(a.created_at)} ago</div></div>
    <div class="row gap"><button class="btn sm" data-app="${a.id}" data-act="contacted">Called</button><button class="btn sm ok" data-app="${a.id}" data-act="approve">Approve</button><button class="btn sm danger" data-app="${a.id}" data-act="reject">Reject</button></div></div>
    <dl class="kv" style="margin-top:8px"><dt>Area</dt><dd>${esc(a.home_zip || '')} · ${esc(a.service_area_text || '')}</dd><dt>Specialties</dt><dd>${(a.specialties || []).map((s) => `<span class="chip">${esc(titleCase(s))}</span>`).join('') || '—'}</dd><dt>Brands</dt><dd>${(a.brands || []).map((s) => `<span class="chip">${esc(titleCase(s))}</span>`).join('') || '—'}</dd>
    <dt>Experience</dt><dd>${a.years_experience ?? '—'} years</dd><dt>Insurance</dt><dd>${a.has_insurance ? `Yes · ${esc(a.insurance_carrier || '')}` : '<span class="timer red">No — require before approval</span>'}</dd><dt>Agreement</dt><dd>${a.agreement_accepted ? 'Accepted' : '<span class="timer red">Not accepted</span>'}</dd>${a.notes ? `<dt>Notes</dt><dd>${esc(a.notes)}</dd>` : ''}</dl>
    <p class="small muted">Approval checklist: call them, confirm insurance certificate, confirm W-9 will be sent, confirm they set their own rates and can decline jobs.</p></div>`).join('');
}

// ---------------------------------------------------------------------------------------- detail
export async function detail(root, { params }) {
  const db = store.db;
  const t = await db.get('techs', params.id);
  if (!t) { root.innerHTML = `<div class="card">Tech not found. <a href="#/techs">Back</a></div>`; return; }
  const [leads, offers, payouts, invoices] = await Promise.all([db.list('leads', { filter: { assigned_tech_id: t.id } }), db.list('dispatch_offers', { filter: { tech_id: t.id }, order: 'offered_at' }), db.list('payouts', { filter: { tech_id: t.id } }), db.list('invoices', { filter: { tech_id: t.id } })]);
  const ytd = payouts.filter((p) => p.status === 'paid' && p.tax_year === new Date().getFullYear()).reduce((s, p) => s + Number(p.amount), 0);
  const owed = payouts.filter((p) => p.status === 'owed').reduce((s, p) => s + Number(p.amount), 0);
  const accepted = offers.filter((o) => o.status === 'accepted').length, declined = offers.filter((o) => o.status === 'declined').length, expired = offers.filter((o) => o.status === 'expired').length;
  const d = daysUntil(t.insurance_expires);
  const cat = store.category((t.category_ids || [])[0]) || store.categories[0];

  root.innerHTML = `
    <a href="#/techs" class="small">← Techs</a>
    <div class="row between"><h1 style="margin:4px 0">${esc(t.business_name)} ${badge(t.status)}</h1>
      <div class="actions">${t.status === 'approved' ? `<button class="btn" data-a="pause">Pause</button>` : `<button class="btn ok" data-a="approve">Approve</button>`}<button class="btn primary" data-a="edit">Edit</button>${store.setting('payout_rail') === 'stripe_connect' ? `<button class="btn" data-a="connect">${t.stripe_account_id ? 'Stripe onboarding link' : 'Set up Stripe payouts'}</button>` : ''}</div></div>
    ${!t.w9_path || !t.insurance_expires || d < 0 ? `<p class="notice">${!t.w9_path ? 'No W-9 on file — payouts are blocked until you mark it received. ' : ''}${!t.insurance_expires ? 'No insurance expiry recorded. ' : d < 0 ? 'Insurance expired. ' : ''}</p>` : ''}
    <div class="grid c4">
      <div class="card stat"><div class="k">Jobs completed</div><div class="v">${t.jobs_completed || 0}</div><div class="sub">${money(t.gmv_total, { cents: false })} invoiced</div></div>
      <div class="card stat"><div class="k">Offers</div><div class="v">${accepted}/${offers.length}</div><div class="sub">accepted · ${declined} declined · ${expired} expired</div></div>
      <div class="card stat ${owed ? 'hot' : ''}"><div class="k">Owed now</div><div class="v">${money(owed)}</div></div>
      <div class="card stat"><div class="k">Paid YTD (1099)</div><div class="v">${money(ytd, { cents: false })}</div><div class="sub">${ytd >= 2000 ? '<b>1099-NEC required</b>' : `${money(2000 - ytd, { cents: false })} below $2,000 threshold`}</div></div>
    </div>
    <div class="grid c2" style="margin-top:12px">
      <div class="card"><h3>Profile</h3><dl class="kv">
        <dt>Contact</dt><dd>${esc(t.contact_name || '')} · <a href="${telLink(t.phone)}">${esc(t.phone || '')}</a><br>${esc(t.email || '')}</dd>
        <dt>Home zip</dt><dd>${esc(t.home_zip || '')} · radius ${t.service_radius_miles || '—'} mi</dd>
        <dt>Zips served</dt><dd>${(t.service_zips || []).map((z) => `<span class="chip">${esc(z)}</span>`).join('') || '—'}</dd>
        <dt>Specialties</dt><dd>${(t.specialties || []).map((s) => `<span class="chip">${esc(titleCase(s))}</span>`).join('') || '—'}</dd>
        <dt>Brands</dt><dd>${(t.brands || []).map((s) => `<span class="chip">${esc(titleCase(s))}</span>`).join('') || '—'}</dd>
        <dt>Certs</dt><dd>${(t.certifications || []).join(', ') || '—'}</dd>
        <dt>Experience</dt><dd>${t.years_experience ?? '—'} years</dd>
        <dt>Their rates</dt><dd>${t.hourly_rate ? money(t.hourly_rate) + '/hr' : '—'} · trip ${t.trip_fee ? money(t.trip_fee) : '—'} <span class="muted small">(tech sets these)</span></dd>
        <dt>Rating</dt><dd>${t.rating ? t.rating.toFixed(1) + '★' : '—'}</dd>
      </dl></div>
      <div class="card"><h3>Compliance</h3><dl class="kv">
        <dt>Insurance</dt><dd>${esc(t.insurance_carrier || '—')} · ${t.insurance_expires ? `expires ${fmtDate(t.insurance_expires)} <span class="${d < 0 ? 'timer red' : d < 30 ? 'timer yellow' : 'muted'} small">(${d < 0 ? 'expired' : d + ' days'})</span>` : '<span class="timer red">no date</span>'} ${t.coi_path ? '· certificate on file' : ''}</dd>
        <dt>W-9</dt><dd>${t.w9_path ? `On file` : `<span class="timer red">Missing</span> <button class="btn sm" data-a="w9">Mark received</button>`}</dd>
        <dt>Business tax receipt</dt><dd>${esc(t.btr_number || '—')}</dd>
        <dt>Agreement</dt><dd>${t.agreement_signed_at ? `v${esc(t.agreement_version)} signed ${fmtDate(t.agreement_signed_at)}` : '<span class="timer red">not signed</span>'}</dd>
        <dt>Payout method</dt><dd>${titleCase(t.payout_method)}${t.stripe_account_id ? ` · <span class="mono">${esc(t.stripe_account_id)}</span>` : ''}</dd>
        ${t.notes ? `<dt>Notes</dt><dd>${esc(t.notes)}</dd>` : ''}
      </dl></div>
    </div>
    <div class="card" style="margin-top:12px"><h3>Jobs</h3>${leads.length ? `<table><thead><tr><th>Customer</th><th>Job</th><th>Status</th><th class="num">Invoice</th></tr></thead><tbody>${leads.map((l) => { const inv = invoices.find((i) => i.lead_id === l.id); return `<tr class="click" data-href="#/leads/${l.id}"><td>${esc(l.customer_name)}<div class="small muted">${esc(l.city || '')}</div></td><td>${esc(titleCase(l.service_slug))}</td><td>${badge(l.status)}</td><td class="num">${inv ? money(inv.total) : '—'}</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted small">No jobs yet.</p>'}</div>`;

  on(root, 'tr.click', 'click', (_e, el) => { location.hash = el.dataset.href; });
  on(root, '[data-a]', 'click', async (_e, el) => {
    const a = el.dataset.a;
    try {
      if (a === 'edit') return techForm(t, cat);
      if (a === 'pause') { await db.update('techs', t.id, { status: 'paused' }); return toast('Paused'); }
      if (a === 'approve') { await db.update('techs', t.id, { status: 'approved' }); return toast('Approved'); }
      if (a === 'w9') { await db.update('techs', t.id, { w9_path: `manual/${new Date().toISOString().slice(0, 10)}` }); return toast('W-9 marked received'); }
      if (a === 'connect') { const r = await db.call('connect-onboard', { tech_id: t.id }); if (r.url && !r.url.startsWith('#')) window.open(r.url, '_blank'); return toast('Stripe onboarding link created'); }
    } catch (e) { toast(e.message, 'bad'); }
  });
}

export function techForm(t, cat = store.categories[0]) {
  const services = cat?.services || [], brands = cat?.equipment_brands || [];
  const v = t || {};
  modal(`<h3>${t ? 'Edit tech' : 'Add tech'}</h3><form id="f"><div class="grid c2">
      <div><label>Business name</label><input name="business_name" required value="${esc(v.business_name || '')}"></div><div><label>Contact name</label><input name="contact_name" value="${esc(v.contact_name || '')}"></div>
      <div><label>Phone</label><input name="phone" value="${esc(v.phone || '')}"></div><div><label>Email</label><input name="email" type="email" value="${esc(v.email || '')}"></div>
      <div><label>Home zip</label><input name="home_zip" value="${esc(v.home_zip || '')}"></div><div><label>Radius (miles)</label><input name="service_radius_miles" type="number" value="${esc(v.service_radius_miles ?? 25)}"></div>
      <div><label>Hourly rate (their number)</label><input name="hourly_rate" type="number" step="1" value="${esc(v.hourly_rate ?? '')}"></div><div><label>Trip fee</label><input name="trip_fee" type="number" step="1" value="${esc(v.trip_fee ?? '')}"></div>
      <div><label>Years experience</label><input name="years_experience" type="number" value="${esc(v.years_experience ?? '')}"></div><div><label>Rating</label><input name="rating" type="number" step="0.1" min="1" max="5" value="${esc(v.rating ?? '')}"></div>
      <div><label>Insurance carrier</label><input name="insurance_carrier" value="${esc(v.insurance_carrier || '')}"></div><div><label>Insurance expires</label><input name="insurance_expires" type="date" value="${esc(v.insurance_expires || '')}"></div>
      <div><label>Business tax receipt #</label><input name="btr_number" value="${esc(v.btr_number || '')}"></div>
      <div><label>Payout method</label><select name="payout_method">${['ach_manual', 'zelle', 'check', 'stripe_connect'].map((m) => `<option value="${m}" ${m === (v.payout_method || 'ach_manual') ? 'selected' : ''}>${titleCase(m)}</option>`).join('')}</select></div>
      <div><label>Status</label><select name="status">${['approved', 'paused', 'applied', 'rejected'].map((s) => `<option value="${s}" ${s === (v.status || 'approved') ? 'selected' : ''}>${titleCase(s)}</option>`).join('')}</select></div>
    </div>
    <label>Zips served (comma or space separated)</label><input name="service_zips" value="${esc((v.service_zips || []).join(', '))}">
    <label>Specialties</label><div>${services.map((s) => `<label class="inline" style="display:inline-flex;margin:2px 10px 2px 0"><input type="checkbox" name="sp" value="${s.slug}" ${(v.specialties || []).includes(s.slug) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('')}</div>
    <label>Brands</label><div>${brands.map((b) => `<label class="inline" style="display:inline-flex;margin:2px 10px 2px 0"><input type="checkbox" name="br" value="${b.slug}" ${(v.brands || []).includes(b.slug) ? 'checked' : ''}> ${esc(b.name)}</label>`).join('')}</div>
    <label>Certifications (comma separated)</label><input name="certifications" value="${esc((v.certifications || []).join(', '))}">
    <label class="inline"><input type="checkbox" name="w9" ${v.w9_path ? 'checked' : ''}> W-9 on file</label>
    <label class="inline"><input type="checkbox" name="coi" ${v.coi_path ? 'checked' : ''}> Insurance certificate on file</label>
    <label class="inline"><input type="checkbox" name="agreement" ${v.agreement_signed_at ? 'checked' : ''}> Tech agreement signed</label>
    <label>Admin notes</label><textarea name="notes">${esc(v.notes || '')}</textarea>
    <div class="row end gap"><button class="btn" type="button" data-close>Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`,
    { onMount(m) {
      m.querySelector('#f').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = formValues(e.target);
        const sp = [...m.querySelectorAll('input[name=sp]:checked')].map((i) => i.value), br = [...m.querySelectorAll('input[name=br]:checked')].map((i) => i.value);
        const row = {
          business_name: f.business_name, contact_name: f.contact_name, phone: f.phone, email: f.email || null, home_zip: f.home_zip, service_radius_miles: f.service_radius_miles,
          hourly_rate: f.hourly_rate, trip_fee: f.trip_fee, years_experience: f.years_experience, rating: f.rating, insurance_carrier: f.insurance_carrier || null, insurance_expires: f.insurance_expires || null,
          btr_number: f.btr_number || null, payout_method: f.payout_method, status: f.status, service_zips: String(f.service_zips || '').split(/[\s,]+/).filter(Boolean), specialties: sp, brands: br,
          certifications: String(f.certifications || '').split(',').map((s) => s.trim()).filter(Boolean), notes: f.notes,
          w9_path: f.w9 ? (v.w9_path || `manual/${new Date().toISOString().slice(0, 10)}`) : null, coi_path: f.coi ? (v.coi_path || 'manual') : null,
          agreement_signed_at: f.agreement ? (v.agreement_signed_at || new Date().toISOString()) : null, agreement_version: f.agreement ? (v.agreement_version || '2026-11') : null,
        };
        try {
          if (t) await store.db.update('techs', t.id, row);
          else { const created = await store.db.insert('techs', { ...row, user_id: null, category_ids: [cat?.id || 'marine'], payout_details: {}, stripe_account_id: null, jobs_completed: 0, gmv_total: 0 }); location.hash = `#/techs/${created.id}`; }
          closeModal(); toast('Saved');
        } catch (err) { toast(err.message, 'bad'); }
      });
    } });
}
