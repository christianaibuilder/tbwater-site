// Demo-mode adapter: everything lives in localStorage. Same interface as adapter-supabase.js.
import { buildSeed } from './seed.js';

const KEY = 'grid.hq.v1';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
const nowIso = () => new Date().toISOString();
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
const round2 = (n) => Math.round(n * 100) / 100;

export class LocalAdapter {
  constructor() {
    this.mode = 'local';
    this.listeners = new Set();
    this._load();
    // Demo identity: admin by default; portal lets you "act as" a tech.
    this._user = { id: 'demo-admin', email: 'you@demo.local', role: 'admin', tech_id: null };
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.state = raw ? JSON.parse(raw) : buildSeed();
    } catch (_) {
      this.state = buildSeed();
    }
    if (!raw_ok(this.state)) this.state = buildSeed();
    this.state._rev = Number(this.state._rev || 0);
    this._save();
    // Another tab (the customer pay page, the public quote page) may write too: reload when it does.
    if (!this._watching && typeof window !== 'undefined') {
      this._watching = true;
      window.addEventListener('storage', (e) => {
        if (e.key === KEY + '.rev' && e.newValue !== String(this.state._rev)) { this._reload(); for (const fn of this.listeners) fn(); }
      });
    }
  }
  _reload() {
    try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (raw_ok(s)) this.state = s; } } catch (_) { /* keep current */ }
  }
  // Cheap staleness check before every operation: compare the rev stamp written by the last saver.
  _sync() {
    try { const rev = localStorage.getItem(KEY + '.rev'); if (rev !== null && rev !== String(this.state._rev)) this._reload(); } catch (_) { /* ignore */ }
  }
  _save() {
    try {
      this.state._rev = Number(this.state._rev || 0) + 1;
      localStorage.setItem(KEY, JSON.stringify(this.state));
      localStorage.setItem(KEY + '.rev', String(this.state._rev));
    } catch (_) { /* quota or private mode */ }
  }
  _emit() { this._save(); for (const fn of this.listeners) fn(); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  reset() { this.state = buildSeed(); this._emit(); }
  exportJson() { return JSON.stringify(this.state, null, 2); }
  importJson(text) { const s = JSON.parse(text); if (!raw_ok(s)) throw new Error('Not a Grid export'); this.state = s; this._emit(); }

  // ---- CRUD -------------------------------------------------------------------------------
  _table(name) { this._sync(); if (!this.state[name]) this.state[name] = []; return this.state[name]; }
  async list(table, { filter = {}, order = 'created_at', desc = true, limit } = {}) {
    let rows = this._table(table).filter((r) => Object.entries(filter).every(([k, v]) => Array.isArray(v) ? v.includes(r[k]) : r[k] === v));
    if (order) rows = rows.slice().sort((a, b) => (a[order] > b[order] ? 1 : a[order] < b[order] ? -1 : 0) * (desc ? -1 : 1));
    if (limit) rows = rows.slice(0, limit);
    return rows.map((r) => ({ ...r }));
  }
  async get(table, id) { const r = this._table(table).find((x) => x.id === id || x.key === id); return r ? { ...r } : null; }
  async insert(table, row) {
    const full = { id: uid(), created_at: nowIso(), ...row };
    if (['quotes', 'invoices'].includes(table) && !full.public_token) full.public_token = token();
    if (['leads', 'quotes', 'invoices', 'techs'].includes(table)) full.updated_at = full.created_at;
    this._table(table).push(full);
    this._emit();
    return { ...full };
  }
  async update(table, id, patch) {
    const rows = this._table(table);
    const i = rows.findIndex((x) => x.id === id || x.key === id);
    if (i < 0) throw new Error(`${table} ${id} not found`);
    rows[i] = { ...rows[i], ...patch };
    if (['leads', 'quotes', 'invoices', 'techs'].includes(table)) rows[i].updated_at = nowIso();
    this._emit();
    return { ...rows[i] };
  }
  async upsertSetting(key, value) {
    const rows = this._table('settings');
    const i = rows.findIndex((x) => x.key === key);
    if (i < 0) rows.push({ key, value, updated_at: nowIso() }); else rows[i] = { key, value, updated_at: nowIso() };
    this._emit();
  }
  async remove(table, id) {
    const rows = this._table(table);
    const i = rows.findIndex((x) => x.id === id || x.key === id);
    if (i >= 0) rows.splice(i, 1);
    this._emit();
  }

  // ---- files ---------------------------------------------------------------------------------
  async uploadFile(bucket, path, file) {
    const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
    this.state.files = this.state.files || {};
    // keep demo storage small
    if (dataUrl.length < 1_500_000) this.state.files[`${bucket}/${path}`] = dataUrl;
    this._save();
    return path;
  }
  async fileUrl(bucket, path) { return (this.state.files || {})[`${bucket}/${path}`] || null; }

  // ---- auth -----------------------------------------------------------------------------------
  get auth() {
    const self = this;
    return {
      user: () => self._user,
      async signIn() { return { ok: true }; },
      async signOut() { return { ok: true }; },
      actAs(techId) { self._user = techId ? { id: 'demo-tech', email: 'tech@demo.local', role: 'tech', tech_id: techId } : { id: 'demo-admin', email: 'you@demo.local', role: 'admin', tech_id: null }; for (const fn of self.listeners) fn(); },
    };
  }

  // ---- RPC (mirrors the SQL functions in 0002_policies.sql) -------------------------------
  async rpc(name, args = {}) {
    switch (name) {
      case 'accept_offer': return this._acceptOffer(args.offer_id);
      case 'decline_offer': return this._declineOffer(args.offer_id, args.reason);
      case 'quote_by_token': return this._quoteByToken(args.t);
      case 'accept_quote': return this._acceptQuote(args.t, args.note);
      case 'invoice_by_token': return this._invoiceByToken(args.t);
      case 'demo_pay': return this._demoPay(args.t, args.method);
      default: throw new Error(`rpc ${name} not available in demo`);
    }
  }

  async _acceptOffer(offerId) {
    const o = this._table('dispatch_offers').find((x) => x.id === offerId);
    if (!o) throw new Error('offer not found');
    if (o.status !== 'offered') throw new Error(`offer is ${o.status}`);
    const lead = this._table('leads').find((l) => l.id === o.lead_id);
    if (lead.assigned_tech_id) { o.status = 'expired'; this._emit(); throw new Error('job already taken'); }
    o.status = 'accepted'; o.responded_at = nowIso();
    for (const other of this._table('dispatch_offers')) if (other.lead_id === o.lead_id && other.id !== o.id && other.status === 'offered') { other.status = 'withdrawn'; other.responded_at = nowIso(); }
    lead.status = 'assigned'; lead.assigned_tech_id = o.tech_id; lead.updated_at = nowIso();
    const tech = this._table('techs').find((t) => t.id === o.tech_id);
    this._table('lead_events').push({ id: uid(), lead_id: o.lead_id, type: 'accepted', actor: 'tech:' + o.tech_id, payload: { offer_id: o.id, business_name: tech?.business_name }, created_at: nowIso() });
    this._emit();
    return { ok: true, lead_id: o.lead_id };
  }
  async _declineOffer(offerId, reason) {
    const o = this._table('dispatch_offers').find((x) => x.id === offerId);
    if (!o) throw new Error('offer not found');
    o.status = 'declined'; o.responded_at = nowIso(); o.note = reason || null;
    this._table('lead_events').push({ id: uid(), lead_id: o.lead_id, type: 'declined', actor: 'tech:' + o.tech_id, payload: { offer_id: o.id, reason }, created_at: nowIso() });
    this._emit();
    return { ok: true };
  }
  _brandFor(lead) { const c = this._table('categories').find((x) => x.id === lead.category_id); return { name: c?.brand_name, phone: c?.phone, email: c?.email, site_url: c?.site_url }; }
  async _quoteByToken(t) {
    const q = this._table('quotes').find((x) => x.public_token === t); if (!q) return null;
    const lead = this._table('leads').find((l) => l.id === q.lead_id);
    const tech = this._table('techs').find((x) => x.id === q.tech_id);
    return { quote: { ...q }, lead: { customer_name: lead.customer_name, city: lead.city, service_slug: lead.service_slug, equipment: lead.equipment }, tech: { business_name: tech?.business_name }, brand: this._brandFor(lead) };
  }
  async _acceptQuote(t, note) {
    const q = this._table('quotes').find((x) => x.public_token === t); if (!q) throw new Error('quote not found');
    if (q.status !== 'sent') throw new Error(`quote is ${q.status}`);
    if (q.valid_until && q.valid_until < new Date().toISOString().slice(0, 10)) { q.status = 'expired'; this._emit(); throw new Error('quote expired'); }
    q.status = 'accepted'; q.accepted_at = nowIso(); q.customer_note = note || null; q.updated_at = nowIso();
    const lead = this._table('leads').find((l) => l.id === q.lead_id);
    if (['assigned', 'quoted', 'offered', 'approved'].includes(lead.status)) { lead.status = 'quoted'; lead.estimated_value = q.total; lead.updated_at = nowIso(); }
    this._table('lead_events').push({ id: uid(), lead_id: q.lead_id, type: 'quote_accepted', actor: 'customer', payload: { quote_id: q.id, total: q.total }, created_at: nowIso() });
    this._emit();
    return { ok: true };
  }
  async _invoiceByToken(t) {
    const i = this._table('invoices').find((x) => x.public_token === t); if (!i) return null;
    const lead = this._table('leads').find((l) => l.id === i.lead_id);
    const tech = this._table('techs').find((x) => x.id === i.tech_id);
    return { invoice: { ...i }, lead: { customer_name: lead.customer_name, city: lead.city, service_slug: lead.service_slug, equipment: lead.equipment }, tech: { business_name: tech?.business_name }, brand: this._brandFor(lead) };
  }
  // Demo-only: simulate Stripe's webhook.
  async _demoPay(t, method = 'ach') {
    const inv = this._table('invoices').find((x) => x.public_token === t); if (!inv) throw new Error('invoice not found');
    if (inv.status === 'paid') return { ok: true, already: true };
    const total = Number(inv.total);
    const fee = round2(Math.max(total * (Number(inv.platform_fee_pct) / 100), Number(inv.platform_fee_min)));
    const cardFee = method === 'card' ? round2(total * (Number(inv.card_fee_pct) / 100)) : 0;
    const paidAmount = round2(total + cardFee);
    const processing = method === 'card' ? round2(paidAmount * 0.029 + 0.30) : Math.min(5, round2(total * 0.008));
    Object.assign(inv, { status: 'paid', paid_at: nowIso(), paid_amount: paidAmount, payment_method: method, processing_fee_amount: processing, card_fee_charged: cardFee, platform_fee_amount: fee, tech_share_amount: round2(total - fee), stripe_payment_intent: 'pi_demo_' + token().slice(0, 8), updated_at: nowIso() });
    const tech = this._table('techs').find((x) => x.id === inv.tech_id);
    this._table('payouts').push({ id: uid(), invoice_id: inv.id, tech_id: inv.tech_id, amount: inv.tech_share_amount, method: tech?.payout_method || 'ach_manual', status: 'owed', paid_at: null, reference: null, tax_year: new Date().getFullYear(), created_at: nowIso() });
    if (tech) { tech.jobs_completed = (tech.jobs_completed || 0) + 1; tech.gmv_total = round2(Number(tech.gmv_total || 0) + total); }
    const lead = this._table('leads').find((l) => l.id === inv.lead_id);
    if (lead) { lead.status = 'paid'; lead.updated_at = nowIso(); }
    this._table('lead_events').push({ id: uid(), lead_id: inv.lead_id, type: 'paid', actor: 'customer', payload: { invoice_id: inv.id, total, paid_amount: paidAmount, method, processing_fee: processing, platform_fee: fee }, created_at: nowIso() });
    this._emit();
    return { ok: true };
  }

  // ---- edge functions, simulated ------------------------------------------------------------
  async call(fn, payload = {}) {
    switch (fn) {
      case 'extract-invoice': return this._simExtract(payload.invoice_id);
      case 'create-payment-link': return this._simPaymentLink(payload.invoice_id);
      case 'notify': return this._simNotify(payload);
      case 'connect-onboard': return { ok: true, url: '#/settings?demo=connect', account_id: 'acct_demo' };
      default: throw new Error(`function ${fn} not available in demo`);
    }
  }
  async _simExtract(invoiceId) {
    const inv = this._table('invoices').find((x) => x.id === invoiceId); if (!inv) throw new Error('invoice not found');
    const lead = this._table('leads').find((l) => l.id === inv.lead_id);
    const tech = this._table('techs').find((x) => x.id === inv.tech_id);
    const quote = this._table('quotes').filter((q) => q.lead_id === inv.lead_id && q.status === 'accepted').pop();
    let items;
    if (quote) items = quote.line_items.map((li) => ({ ...li }));
    else {
      const cat = this._table('categories').find((c) => c.id === lead.category_id);
      const svc = (cat?.services || []).find((s) => s.slug === lead.service_slug);
      const hours = Math.max(1, Math.round(((svc?.avg_ticket || 500) * 0.55) / (tech?.hourly_rate || 130)));
      items = [
        { description: `${svc?.name || 'Service'} labor`, qty: hours, unit_price: tech?.hourly_rate || 130, taxable: true, kind: 'labor' },
        { description: 'Parts and consumables', qty: 1, unit_price: round2((svc?.avg_ticket || 500) * 0.35), taxable: true, kind: 'parts' },
        { description: 'Trip fee', qty: 1, unit_price: tech?.trip_fee || 85, taxable: false, kind: 'fee' },
      ];
    }
    const rates = (this._table('settings').find((s) => s.key === 'county_tax_rates') || {}).value || {};
    const rate = rates[lead.county] ?? 0.07;
    const subtotal = round2(items.reduce((s, li) => s + li.qty * li.unit_price, 0));
    const tax = round2(items.filter((li) => li.taxable).reduce((s, li) => s + li.qty * li.unit_price, 0) * rate);
    Object.assign(inv, { extracted: { vendor_name: tech?.business_name, confidence: 0.92, demo: true }, line_items: items, subtotal, tax, total: round2(subtotal + tax), status: 'review', updated_at: nowIso() });
    this._table('lead_events').push({ id: uid(), lead_id: inv.lead_id, type: 'invoice_extracted', actor: 'system', payload: { invoice_id: inv.id, total: inv.total, confidence: 0.92, demo: true }, created_at: nowIso() });
    this._emit();
    return { ok: true, invoice: { ...inv } };
  }
  async _simPaymentLink(invoiceId) {
    const inv = this._table('invoices').find((x) => x.id === invoiceId); if (!inv) throw new Error('invoice not found');
    const s = Object.fromEntries(this._table('settings').map((x) => [x.key, x.value]));
    const total = Number(inv.total);
    const fee = round2(Math.max(total * (Number(s.platform_fee_pct ?? 10) / 100), Number(s.platform_fee_min ?? 25)));
    const base = location.pathname.replace(/\/[^/]*$/, '');
    Object.assign(inv, {
      status: 'sent', sent_at: nowIso(), platform_fee_pct: Number(s.platform_fee_pct ?? 10), platform_fee_min: Number(s.platform_fee_min ?? 25), card_fee_pct: Number(s.card_fee_pct ?? 3),
      platform_fee_amount: fee, tech_share_amount: round2(total - fee),
      payment_link_url: `${base}/public/pay.html?t=${inv.public_token}&method=ach`, payment_link_card_url: `${base}/public/pay.html?t=${inv.public_token}&method=card`, updated_at: nowIso(),
    });
    const lead = this._table('leads').find((l) => l.id === inv.lead_id);
    if (lead && ['assigned', 'quoted', 'scheduled', 'in_progress'].includes(lead.status)) { lead.status = 'completed'; lead.updated_at = nowIso(); }
    this._table('lead_events').push({ id: uid(), lead_id: inv.lead_id, type: 'invoice_sent', actor: 'admin', payload: { invoice_id: inv.id, total, fee }, created_at: nowIso() });
    await this._simNotify({ kind: 'invoice', invoice_id: inv.id, lead_id: inv.lead_id });
    this._emit();
    return { ok: true, invoice: { ...inv } };
  }
  async _simNotify(p) {
    const lead = p.lead_id ? this._table('leads').find((l) => l.id === p.lead_id) : null;
    const brand = lead ? this._brandFor(lead).name : 'Grid';
    const push = (channel, to, subject, body, ref_type, ref_id) => this._table('notifications').push({ id: uid(), channel, to_addr: to || '(none)', subject, body, ref_type, ref_id, status: to ? 'sent' : 'failed', error: to ? null : 'no address', created_at: nowIso() });
    switch (p.kind) {
      case 'offer': { const t = this._table('techs').find((x) => x.id === p.tech_id); push('sms', t?.phone, null, `${brand}: new job near ${lead?.zip} — ${lead?.service_slug}. Accept in your portal.`, 'lead', lead?.id); break; }
      case 'quote': { const q = this._table('quotes').find((x) => x.id === p.quote_id); if (q && q.status === 'draft') { q.status = 'sent'; q.sent_at = nowIso(); } push('email', lead?.email, `Your quote: $${Number(q?.total).toFixed(2)}`, `Hi ${lead?.customer_name}, your quote from ${brand} is ready.`, 'quote', q?.id); if (lead?.sms_consent) push('sms', lead?.phone, null, `${brand}: your quote is ready.`, 'quote', q?.id); break; }
      case 'invoice': { const i = this._table('invoices').find((x) => x.id === p.invoice_id); push('email', lead?.email, `Your invoice: $${Number(i?.total).toFixed(2)}`, `Hi ${lead?.customer_name}, your invoice from ${brand} is ready. Pay by bank (no fee) or card.`, 'invoice', i?.id); if (lead?.sms_consent) push('sms', lead?.phone, null, `${brand}: your $${Number(i?.total).toFixed(2)} invoice is ready.`, 'invoice', i?.id); break; }
      case 'payout': { const po = this._table('payouts').find((x) => x.id === p.payout_id); const t = po && this._table('techs').find((x) => x.id === po.tech_id); push('email', t?.email, `Payout sent: $${Number(po?.amount).toFixed(2)}`, `We sent $${Number(po?.amount).toFixed(2)} via ${po?.method}.`, 'payout', po?.id); break; }
      case 'new_lead': { const s = Object.fromEntries(this._table('settings').map((x) => [x.key, x.value])); push('email', s.admin_email, `New lead: ${lead?.customer_name}`, lead?.description || '', 'lead', lead?.id); break; }
      default: break;
    }
    this._emit();
    return { ok: true };
  }
}

function raw_ok(s) { return s && Array.isArray(s.categories) && Array.isArray(s.leads) && Array.isArray(s.techs); }
