// Picks the adapter from config, exposes `db`, settings cache, and change events.
import { LocalAdapter } from './adapter-local.js';
import { SupabaseAdapter } from './adapter-supabase.js';

const CONFIG_KEY = 'grid.hq.config';

export function loadConfig() {
  const base = (typeof window !== 'undefined' && window.GRID_CONFIG) || {};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch (_) { saved = {}; }
  return { mode: 'local', supabaseUrl: '', supabaseAnonKey: '', ...base, ...saved };
}
export function saveConfig(patch) {
  const next = { ...loadConfig(), ...patch };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  return next;
}

export const store = {
  config: loadConfig(),
  db: null,
  settings: {},
  categories: [],
  listeners: new Set(),
  async init() {
    const cfg = this.config;
    if (cfg.mode === 'live' && cfg.supabaseUrl && cfg.supabaseAnonKey) {
      const a = new SupabaseAdapter({ url: cfg.supabaseUrl, anonKey: cfg.supabaseAnonKey });
      try { await a.init(); this.db = a; }
      catch (e) { console.error('Supabase init failed, falling back to demo', e); this.db = new LocalAdapter(); this.initError = e.message; }
    } else {
      this.db = new LocalAdapter();
    }
    this.db.onChange(() => this._refresh());
    await this._refresh();
  },
  async _refresh() {
    try {
      const [settings, categories] = await Promise.all([this.db.list('settings', { order: null }), this.db.list('categories', { order: 'sort_order', desc: false })]);
      this.settings = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      this.categories = categories;
    } catch (e) { console.error(e); }
    for (const fn of this.listeners) fn();
  },
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  user() { return this.db?.auth.user(); },
  isAdmin() { return this.user()?.role === 'admin'; },
  setting(key, fallback) { const v = this.settings[key]; return v === undefined || v === null ? fallback : v; },
  category(id) { return this.categories.find((c) => c.id === id); },
  taxRateFor(lead) {
    const rates = this.setting('county_tax_rates', {});
    const cat = this.category(lead?.category_id);
    return rates[lead?.county] ?? Number(cat?.default_tax_rate ?? 0.07);
  },
};

// Convenience: load related rows for a lead in one go.
export async function loadLeadBundle(leadId) {
  const db = store.db;
  const lead = await db.get('leads', leadId);
  if (!lead) return null;
  const [events, offers, quotes, invoices, techs] = await Promise.all([
    db.list('lead_events', { filter: { lead_id: leadId }, desc: false }),
    db.list('dispatch_offers', { filter: { lead_id: leadId }, order: 'offered_at' }),
    db.list('quotes', { filter: { lead_id: leadId } }),
    db.list('invoices', { filter: { lead_id: leadId } }),
    db.list('techs', { order: 'business_name', desc: false }),
  ]);
  const payouts = invoices.length ? await db.list('payouts', { filter: { invoice_id: invoices.map((i) => i.id) } }) : [];
  return { lead, events, offers, quotes, invoices, payouts, techs };
}
