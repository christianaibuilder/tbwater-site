// Shared state transitions. Every action writes the lead_events row that the timeline and XP read.
import { store } from '../data/store.js';
import { rankTechs } from './match.js';
import { round2 } from './ui.js';

const now = () => new Date().toISOString();
const actor = () => { const u = store.user(); return u?.role === 'tech' ? `tech:${u.tech_id}` : 'admin'; };

export async function logEvent(leadId, type, payload = {}, who = actor()) {
  return store.db.insert('lead_events', { lead_id: leadId, type, actor: who, payload, created_at: now() });
}

export async function setLeadStatus(lead, status, extra = {}, payload = {}) {
  const updated = await store.db.update('leads', lead.id, { status, ...extra });
  await logEvent(lead.id, 'status', { from: lead.status, to: status, ...payload });
  return updated;
}

export async function logContact(lead, how, note = '') {
  const t = now();
  const patch = {};
  if (!lead.first_response_at) patch.first_response_at = t;
  if (lead.status === 'new') patch.status = 'contacted';
  const minutes = Math.round(((new Date(t) - new Date(lead.created_at)) / 60000) * 10) / 10;
  const updated = Object.keys(patch).length ? await store.db.update('leads', lead.id, patch) : lead;
  await logEvent(lead.id, how, { note, ...(lead.first_response_at ? {} : { minutes_to_respond: minutes }) });
  return updated;
}

export async function addNote(lead, note) { return logEvent(lead.id, 'note', { note }); }

export async function markDead(lead, reason) {
  const offers = await store.db.list('dispatch_offers', { filter: { lead_id: lead.id, status: 'offered' } });
  for (const o of offers) await store.db.update('dispatch_offers', o.id, { status: 'withdrawn', responded_at: now() });
  return setLeadStatus(lead, 'dead', { lost_reason: reason }, { reason });
}

// Approve a lead and offer it to the best-matched techs. Returns the offers made.
export async function approveAndOffer(lead, techIds = null, limit = 3) {
  const db = store.db;
  let l = lead;
  if (!l.first_response_at) l = await db.update('leads', l.id, { first_response_at: now(), status: l.status === 'new' ? 'contacted' : l.status });
  if (['new', 'contacted'].includes(l.status)) l = await setLeadStatus(l, 'approved');
  const techs = await db.list('techs', { filter: { status: 'approved' } });
  const open = await db.list('dispatch_offers', { filter: { status: 'offered' } });
  const chosen = techIds ? techs.filter((t) => techIds.includes(t.id)) : rankTechs(l, techs, { limit, openOffers: open }).map((r) => r.tech);
  if (!chosen.length) throw new Error('No matching approved technicians for this job');
  const expiryMin = Number(store.setting('offer_expiry_minutes', 30));
  const existing = await db.list('dispatch_offers', { filter: { lead_id: l.id } });
  const offers = [];
  for (const t of chosen) {
    if (existing.some((o) => o.tech_id === t.id && o.status === 'offered')) continue;
    const o = await db.insert('dispatch_offers', { lead_id: l.id, tech_id: t.id, status: 'offered', offered_at: now(), expires_at: new Date(Date.now() + expiryMin * 60000).toISOString(), responded_at: null, note: null });
    offers.push(o);
    await logEvent(l.id, 'offer', { tech_id: t.id, business_name: t.business_name }, 'system');
    try { await db.call('notify', { kind: 'offer', lead_id: l.id, tech_id: t.id }); } catch (e) { console.warn('notify failed', e); }
  }
  await db.update('leads', l.id, { status: 'offered' });
  return offers;
}

export async function assignTech(lead, techId) {
  const db = store.db;
  const tech = await db.get('techs', techId);
  const offers = await db.list('dispatch_offers', { filter: { lead_id: lead.id } });
  for (const o of offers) if (o.status === 'offered') await db.update('dispatch_offers', o.id, { status: o.tech_id === techId ? 'accepted' : 'withdrawn', responded_at: now() });
  if (!offers.some((o) => o.tech_id === techId)) await db.insert('dispatch_offers', { lead_id: lead.id, tech_id: techId, status: 'accepted', offered_at: now(), expires_at: now(), responded_at: now(), note: 'assigned by admin' });
  const patch = { status: 'assigned', assigned_tech_id: techId };
  if (!lead.first_response_at) patch.first_response_at = now();
  const updated = await db.update('leads', lead.id, patch);
  await logEvent(lead.id, 'accepted', { tech_id: techId, business_name: tech?.business_name, by: 'admin' });
  try { await db.call('notify', { kind: 'offer', lead_id: lead.id, tech_id: techId, sms: false }); } catch (_) { /* optional */ }
  return updated;
}

export async function expireStaleOffers(offers) {
  const stale = offers.filter((o) => o.status === 'offered' && new Date(o.expires_at) < new Date());
  for (const o of stale) await store.db.update('dispatch_offers', o.id, { status: 'expired', responded_at: now() });
  return stale.length;
}

export async function scheduleLead(lead, iso) {
  const status = ['in_progress', 'completed', 'paid'].includes(lead.status) ? lead.status : 'scheduled';
  return setLeadStatus(lead, status, { scheduled_at: iso }, { scheduled_at: iso });
}

// ---- quotes -------------------------------------------------------------------------------
export function computeTotals(lineItems, taxRate) {
  const subtotal = round2(lineItems.reduce((s, li) => s + Number(li.qty || 0) * Number(li.unit_price || 0), 0));
  const taxable = lineItems.filter((li) => li.taxable).reduce((s, li) => s + Number(li.qty || 0) * Number(li.unit_price || 0), 0);
  const tax = round2(taxable * Number(taxRate || 0));
  return { subtotal, tax, total: round2(subtotal + tax) };
}

export async function createQuote(lead, techId, lineItems = []) {
  const taxRate = store.taxRateFor(lead);
  const totals = computeTotals(lineItems, taxRate);
  const valid = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  return store.db.insert('quotes', { lead_id: lead.id, tech_id: techId || lead.assigned_tech_id || null, line_items: lineItems, tax_rate: taxRate, ...totals, deposit_required: null, status: 'draft', valid_until: valid, sent_at: null, accepted_at: null, customer_note: null });
}

export async function sendQuote(quote) {
  const db = store.db;
  const q = await db.update('quotes', quote.id, { status: 'sent', sent_at: now() });
  await logEvent(q.lead_id, 'quote_sent', { quote_id: q.id, total: q.total });
  try { await db.call('notify', { kind: 'quote', lead_id: q.lead_id, quote_id: q.id }); } catch (e) { console.warn('notify failed', e); }
  const lead = await db.get('leads', q.lead_id);
  if (lead && ['assigned', 'approved', 'offered', 'contacted'].includes(lead.status)) await db.update('leads', lead.id, { status: 'quoted', estimated_value: q.total });
  return q;
}

export async function acceptQuoteManually(quote, note = 'accepted by phone') {
  const db = store.db;
  const q = await db.update('quotes', quote.id, { status: 'accepted', accepted_at: now(), customer_note: note });
  await logEvent(q.lead_id, 'quote_accepted', { quote_id: q.id, total: q.total, manual: true });
  const lead = await db.get('leads', q.lead_id);
  if (lead && !['scheduled', 'in_progress', 'completed', 'paid'].includes(lead.status)) await db.update('leads', lead.id, { status: 'quoted', estimated_value: q.total });
  return q;
}

// ---- invoices -----------------------------------------------------------------------------
export async function uploadInvoice(lead, techId, file, { runExtract = true } = {}) {
  const db = store.db;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${techId}/${lead.id}-${Date.now()}.${ext}`;
  await db.uploadFile('invoices', path, file);
  const acceptedQuote = (await db.list('quotes', { filter: { lead_id: lead.id, status: 'accepted' } }))[0];
  const inv = await db.insert('invoices', {
    lead_id: lead.id, tech_id: techId, quote_id: acceptedQuote?.id || null, file_path: path, extracted: null, line_items: [], subtotal: 0, tax: 0, total: 0,
    status: 'uploaded', platform_fee_pct: Number(store.setting('platform_fee_pct', 10)), platform_fee_min: Number(store.setting('platform_fee_min', 25)), card_fee_pct: Number(store.setting('card_fee_pct', 3)), card_fee_charged: 0,
  });
  await logEvent(lead.id, 'invoice_uploaded', { invoice_id: inv.id, file: path });
  if (!['completed', 'paid'].includes(lead.status)) await db.update('leads', lead.id, { status: 'completed' });
  if (runExtract) {
    try { const r = await db.call('extract-invoice', { invoice_id: inv.id }); return r.invoice || inv; }
    catch (e) { console.warn('extract failed', e); await db.update('invoices', inv.id, { status: 'review' }); }
  }
  return inv;
}

export function feePreview(total) {
  const pct = Number(store.setting('platform_fee_pct', 10)), min = Number(store.setting('platform_fee_min', 25)), cardPct = Number(store.setting('card_fee_pct', 3));
  const fee = round2(Math.max(Number(total) * (pct / 100), min));
  const ach = Math.min(5, round2(Number(total) * 0.008));
  const cardFee = round2(Number(total) * (cardPct / 100));
  const card = round2((Number(total) + cardFee) * 0.029 + 0.30);
  return { fee, techShare: round2(Number(total) - fee), ach, card, cardFee, netAch: round2(fee - ach), netCard: round2(fee + cardFee - card) };
}

export async function approveAndSendInvoice(inv) {
  const r = await store.db.call('create-payment-link', { invoice_id: inv.id });
  return r.invoice;
}

export async function markInvoicePaidManually(inv, method = 'cash', amount = null) {
  const db = store.db;
  const total = Number(inv.total);
  const fee = round2(Math.max(total * (Number(inv.platform_fee_pct) / 100), Number(inv.platform_fee_min)));
  const share = round2(total - fee);
  const updated = await db.update('invoices', inv.id, { status: 'paid', paid_at: now(), paid_amount: amount ?? total, payment_method: method, platform_fee_amount: fee, processing_fee_amount: 0, tech_share_amount: share });
  const tech = await db.get('techs', inv.tech_id);
  await db.insert('payouts', { invoice_id: inv.id, tech_id: inv.tech_id, amount: share, method: tech?.payout_method || 'ach_manual', status: 'owed', paid_at: null, reference: null, tax_year: new Date().getFullYear() });
  if (tech) await db.update('techs', tech.id, { jobs_completed: (tech.jobs_completed || 0) + 1, gmv_total: round2(Number(tech.gmv_total || 0) + total) });
  await db.update('leads', inv.lead_id, { status: 'paid' });
  await logEvent(inv.lead_id, 'paid', { invoice_id: inv.id, total, paid_amount: amount ?? total, method, processing_fee: 0, platform_fee: fee, manual: true });
  return updated;
}

// ---- payouts -----------------------------------------------------------------------------
export async function markPayoutPaid(payout, { method, reference }) {
  const db = store.db;
  const tech = await db.get('techs', payout.tech_id);
  if (!tech?.w9_path) throw new Error(`${tech?.business_name || 'Tech'} has no W-9 on file. Collect it before paying.`);
  const p = await db.update('payouts', payout.id, { status: 'paid', paid_at: now(), method: method || payout.method, reference: reference || null });
  const inv = await db.get('invoices', payout.invoice_id);
  const sameDay = inv?.paid_at ? new Date(inv.paid_at).toDateString() === new Date().toDateString() : false;
  if (inv) await logEvent(inv.lead_id, 'payout_paid', { payout_id: p.id, amount: p.amount, same_day: sameDay, reference });
  try { await db.call('notify', { kind: 'payout', payout_id: p.id }); } catch (_) { /* optional */ }
  return p;
}

// ---- techs -------------------------------------------------------------------------------
export async function approveApplication(app) {
  const db = store.db;
  const tech = await db.insert('techs', {
    user_id: null, category_ids: [app.category_id], business_name: app.business_name, contact_name: app.contact_name, phone: app.phone, email: app.email,
    home_zip: app.home_zip, service_zips: app.home_zip ? [app.home_zip] : [], specialties: app.specialties || [], brands: app.brands || [], certifications: [],
    years_experience: app.years_experience, hourly_rate: null, trip_fee: null, insurance_carrier: app.insurance_carrier || null, insurance_expires: null, coi_path: null, w9_path: null, btr_number: null,
    payout_method: 'ach_manual', payout_details: {}, stripe_account_id: null, status: 'approved', agreement_version: app.agreement_accepted ? '2026-11' : null, agreement_signed_at: app.agreement_accepted ? app.created_at : null,
    rating: null, jobs_completed: 0, gmv_total: 0, notes: app.notes || '', service_radius_miles: 25,
  });
  await db.update('tech_applications', app.id, { status: 'approved', tech_id: tech.id });
  return tech;
}
