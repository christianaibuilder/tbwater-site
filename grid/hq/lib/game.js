// Levels, XP, streaks, and unlock progress. Everything is derived from data, nothing is stored.
import { minutesBetween } from './ui.js';

export const LEVELS = [
  { n: 0, name: 'Dock', req: 'Finish the setup checklist', unlocks: 'Lead intake' },
  { n: 1, name: 'First wake', req: 'First lead answered under 5 min and first offer accepted', unlocks: 'Quotes' },
  { n: 2, name: 'Paid', req: 'First invoice paid and first payout completed', unlocks: 'Payout reports, 1099 tracker' },
  { n: 3, name: 'Steady', req: '10 paid jobs in 7 days, or $5,000 paid in 30 days', unlocks: 'Vertical 2: golf carts' },
  { n: 4, name: 'Fleet', req: '20 paid jobs in 7 days, or $15,000 paid in 30 days', unlocks: 'Vertical 3: RV' },
  { n: 5, name: 'Grid', req: '35 paid jobs in 7 days, or $30,000 paid in 30 days', unlocks: 'Vertical 4: mobile auto' },
];
const JOB_TARGETS = { 3: { jobs: 10, gmv: 5000 }, 4: { jobs: 20, gmv: 15000 }, 5: { jobs: 35, gmv: 30000 } };

export function computeGame({ leads, events, invoices, payouts, techs, categories, settings, config }) {
  const sla = Number(settings.speed_sla_minutes ?? 5);
  const now = Date.now();
  const d7 = now - 7 * 86400000, d30 = now - 30 * 86400000;

  // --- XP ----------------------------------------------------------------------------------
  let xp = 0;
  const xpLog = [];
  const add = (n, why, at) => { xp += n; xpLog.push({ n, why, at }); };
  for (const l of leads) {
    if (l.first_response_at) {
      const m = minutesBetween(l.created_at, l.first_response_at);
      if (m <= sla) add(15, `Answered ${l.customer_name} in ${Math.round(m)} min`, l.first_response_at);
      else if (m <= 30) add(5, `Answered ${l.customer_name} in ${Math.round(m)} min`, l.first_response_at);
    }
  }
  const offeredLeads = new Set();
  for (const e of events) {
    switch (e.type) {
      case 'offer': if (!offeredLeads.has(e.lead_id)) { offeredLeads.add(e.lead_id); add(5, 'Job offered to techs', e.created_at); } break;
      case 'accepted': add(10, `${e.payload?.business_name || 'Tech'} accepted a job`, e.created_at); break;
      case 'quote_sent': add(10, 'Quote sent', e.created_at); break;
      case 'quote_accepted': add(15, 'Quote accepted', e.created_at); break;
      case 'paid': add(50 + Math.floor(Number(e.payload?.total || 0) / 10), `Invoice paid ${fmt(e.payload?.total)}`, e.created_at); break;
      case 'payout_paid': if (e.payload?.same_day) add(10, 'Same-day payout', e.created_at); break;
      case 'review': add(20, 'Customer review collected', e.created_at); break;
      default: break;
    }
  }
  for (const t of techs) if (t.status === 'approved' && t.w9_path && t.insurance_expires) add(20, `${t.business_name} fully onboarded`, t.agreement_signed_at || t.created_at);

  // --- setup checklist (level 0) ------------------------------------------------------------
  const marine = categories.find((c) => c.id === 'marine') || categories[0] || {};
  const approvedTechs = techs.filter((t) => t.status === 'approved').length;
  const checklist = [
    { key: 'live', label: 'Connect Supabase (switch to live mode)', done: config?.mode === 'live' },
    { key: 'brand', label: 'Set brand name and phone on the first vertical', done: Boolean(marine.brand_name && marine.phone) },
    { key: 'techs', label: 'Approve 5 technicians', done: approvedTechs >= 5, progress: `${approvedTechs}/5` },
    { key: 'site', label: 'Publish the boat site and mark it live in Settings', done: Boolean(settings.site_live) },
  ];
  for (const c of checklist) if (c.done) add(20, `Setup: ${c.label}`, null);

  // --- milestones ------------------------------------------------------------------------------
  const fastAnswer = leads.some((l) => l.first_response_at && minutesBetween(l.created_at, l.first_response_at) <= sla);
  const firstAccept = events.some((e) => e.type === 'accepted');
  const firstPaid = invoices.some((i) => i.status === 'paid');
  const firstPayout = payouts.some((p) => p.status === 'paid');

  const paidInv = invoices.filter((i) => i.status === 'paid' && i.paid_at);
  const jobs7 = paidInv.filter((i) => new Date(i.paid_at).getTime() >= d7).length;
  const gmv30 = paidInv.filter((i) => new Date(i.paid_at).getTime() >= d30).reduce((s, i) => s + Number(i.total), 0);
  const fee30 = paidInv.filter((i) => new Date(i.paid_at).getTime() >= d30).reduce((s, i) => s + Number(i.platform_fee_amount || 0), 0);
  const proc30 = paidInv.filter((i) => new Date(i.paid_at).getTime() >= d30).reduce((s, i) => s + Number(i.processing_fee_amount || 0), 0);
  const cardFee30 = paidInv.filter((i) => new Date(i.paid_at).getTime() >= d30).reduce((s, i) => s + Number(i.card_fee_charged || 0), 0);
  const payout30 = paidInv.filter((i) => new Date(i.paid_at).getTime() >= d30).reduce((s, i) => s + Number(i.tech_share_amount || 0), 0);

  const meets = (n) => { const t = JOB_TARGETS[n]; return t ? (jobs7 >= t.jobs || gmv30 >= t.gmv) : false; };
  let level = 0;
  if (checklist.every((c) => c.done)) level = 1;
  if (level >= 1 && fastAnswer && firstAccept) level = 2;
  if (level >= 2 && firstPaid && firstPayout) level = 3;
  if (level >= 3 && meets(3)) level = 4;
  if (level >= 4 && meets(4)) level = 5;
  if (level >= 5 && meets(5)) level = 6;
  const current = LEVELS[Math.min(level, 5)];
  const next = LEVELS[Math.min(level + 1, 5)];
  // "level N reached" means requirements for LEVELS[N-1] met. Display current as LEVELS[level].
  const display = LEVELS[Math.min(level, 5)];

  // --- streaks ---------------------------------------------------------------------------
  const answered = leads.filter((l) => l.first_response_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  let fast = 0;
  for (const l of answered) { if (minutesBetween(l.created_at, l.first_response_at) <= sla) fast++; else break; }

  // --- today's response dots -----------------------------------------------------------------
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const todays = leads.filter((l) => new Date(l.created_at) >= dayStart).map((l) => {
    if (!l.first_response_at) { const m = (now - new Date(l.created_at).getTime()) / 60000; return { lead: l, minutes: m, state: m <= sla ? 'open' : 'late' }; }
    const m = minutesBetween(l.created_at, l.first_response_at);
    return { lead: l, minutes: m, state: m <= sla ? 'green' : m <= 30 ? 'yellow' : 'red' };
  });

  const nextTargets = JOB_TARGETS[Math.max(3, Math.min(level + 1, 5))] || JOB_TARGETS[5];
  const unlocks = categories.filter((c) => c.status === 'locked').map((c) => {
    const need = Number(c.unlock_rule?.min_level ?? 99);
    return { category: c, need, met: level >= need, targets: JOB_TARGETS[need] || null, jobs7, gmv30 };
  });

  return {
    xp, xpLog, level, display, current, next, checklist, streaks: { fast }, todays,
    stats: { jobs7, gmv30, fee30, proc30, cardFee30, payout30, approvedTechs, paidCount: paidInv.length },
    nextTargets, unlocks,
    medianResponse: median(answered.map((l) => minutesBetween(l.created_at, l.first_response_at))),
  };
}

function median(arr) { if (!arr.length) return null; const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }); }
