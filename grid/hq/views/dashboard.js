import { store } from '../data/store.js';
import { computeGame, LEVELS } from '../lib/game.js';
import { esc, money, ago, badge, titleCase, equipmentLabel, fmtDate } from '../lib/ui.js';

export default async function dashboard(root) {
  const db = store.db;
  const [leads, events, invoices, payouts, techs, quotes, apps] = await Promise.all([
    db.list('leads'), db.list('lead_events'), db.list('invoices'), db.list('payouts'), db.list('techs'), db.list('quotes'), db.list('tech_applications', { filter: { status: 'new' } }),
  ]);
  const game = computeGame({ leads, events, invoices, payouts, techs, categories: store.categories, settings: store.settings, config: store.config });
  const sla = Number(store.setting('speed_sla_minutes', 5));

  const newLeads = leads.filter((l) => l.status === 'new').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const offered = leads.filter((l) => l.status === 'offered');
  const quotesOut = quotes.filter((q) => q.status === 'sent');
  const toReview = invoices.filter((i) => ['uploaded', 'review'].includes(i.status));
  const owed = payouts.filter((p) => p.status === 'owed');
  const owedTotal = owed.reduce((s, p) => s + Number(p.amount), 0);
  const insuranceSoon = techs.filter((t) => t.status === 'approved' && t.insurance_expires && (new Date(t.insurance_expires) - Date.now()) / 86400000 < 30);

  const timerClass = (l) => { const m = (Date.now() - new Date(l.created_at)) / 60000; return m <= sla ? 'green' : m <= 30 ? 'yellow' : 'red'; };
  const nextLocked = game.unlocks.find((u) => !u.met) || null;
  const targets = nextLocked?.targets || game.nextTargets;
  const lvl = game.display;
  const nextLvl = LEVELS[Math.min(game.level + 1, 5)];

  root.innerHTML = `
    <div class="row between"><h1>Dashboard</h1><span class="muted small">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>

    <div class="grid c2">
      <div class="card">
        <div class="level">
          <div class="n">${game.level}</div>
          <div class="meta">
            <div class="row between"><b>Level ${game.level} · ${esc(lvl.name)}</b><span class="muted small">${game.xp.toLocaleString()} XP</span></div>
            <div class="small muted">${game.level >= 6 ? 'Max level. Everything is unlocked.' : `Next: <b>${esc(nextLvl.name)}</b> — ${esc(nextLvl.req)} → unlocks ${esc(nextLvl.unlocks)}`}</div>
            <div class="row gap" style="margin-top:8px">
              <span title="Consecutive leads answered under ${sla} min">🔥 Fast hands: <b>${game.streaks.fast}</b></span>
              <span class="muted small">Median response ${game.medianResponse === null ? '—' : Math.round(game.medianResponse) + ' min'}</span>
            </div>
          </div>
        </div>
        ${game.level === 0 || game.checklist.some((c) => !c.done) ? `<h3 style="margin-top:14px">Setup checklist</h3><ul class="check">${game.checklist.map((c) => `<li class="${c.done ? 'done' : ''}">${esc(c.label)}${c.progress ? ` <span class="muted small">(${c.progress})</span>` : ''}</li>`).join('')}</ul>` : ''}
        <h3 style="margin-top:14px">Today's responses</h3>
        <div>${game.todays.length ? game.todays.map((t) => `<span class="dot ${t.state}" title="${esc(t.lead.customer_name)} · ${Math.round(t.minutes)} min"></span>`).join('') : '<span class="muted small">No leads yet today.</span>'}</div>
      </div>

      <div class="card">
        <h2>${nextLocked ? `Unlock next: ${esc(nextLocked.category.name)}` : 'Growth'}</h2>
        ${targets ? `
        <div class="small muted">Paid jobs, last 7 days</div>
        <div class="row gap"><div class="bar ${game.stats.jobs7 >= targets.jobs ? 'ok' : ''}" style="flex:1"><span style="width:${Math.min(100, (game.stats.jobs7 / targets.jobs) * 100)}%"></span></div><b>${game.stats.jobs7} / ${targets.jobs}</b></div>
        <div class="small muted" style="margin-top:10px">Paid volume, last 30 days</div>
        <div class="row gap"><div class="bar ${game.stats.gmv30 >= targets.gmv ? 'ok' : ''}" style="flex:1"><span style="width:${Math.min(100, (game.stats.gmv30 / targets.gmv) * 100)}%"></span></div><b>${money(game.stats.gmv30, { cents: false })} / ${money(targets.gmv, { cents: false })}</b></div>
        <p class="small muted">Either bar full = unlock${nextLocked ? ` (needs level ${nextLocked.need}; you are level ${game.level})` : ''}. <a href="#/verticals">Verticals →</a></p>` : '<p class="muted">All verticals unlocked.</p>'}
        <h3 style="margin-top:12px">Month to date</h3>
        <div class="grid c2">
          <div class="stat"><div class="k">Paid invoices (30d)</div><div class="v">${money(game.stats.gmv30, { cents: false })}</div></div>
          <div class="stat"><div class="k">Platform fee kept</div><div class="v">${money(game.stats.fee30 + game.stats.cardFee30 - game.stats.proc30)}</div><div class="sub">after ${money(game.stats.proc30)} processing</div></div>
          <div class="stat"><div class="k">Paid to techs</div><div class="v">${money(game.stats.payout30, { cents: false })}</div></div>
          <div class="stat ${owedTotal ? 'hot' : ''}"><div class="k">Owed to techs now</div><div class="v">${money(owedTotal)}</div><div class="sub">${owed.length} payout${owed.length === 1 ? '' : 's'}</div></div>
        </div>
      </div>
    </div>

    <h2 style="margin-top:18px">The loop</h2>
    <div class="grid c5">
      ${queue('1. Answer', newLeads.length, '#/leads?tab=answer', newLeads.slice(0, 4).map((l) => `<li><a href="#/leads/${l.id}">${esc(l.customer_name)}</a><span class="timer ${timerClass(l)}">${ago(l.created_at)}</span></li>`), 'No new leads. Nice.', newLeads.length ? 'hot' : '')}
      ${queue('2. Dispatch', offered.length + leads.filter((l) => l.status === 'approved').length, '#/leads?tab=active', [...leads.filter((l) => l.status === 'approved'), ...offered].slice(0, 4).map((l) => `<li><a href="#/leads/${l.id}">${esc(l.customer_name)}</a>${badge(l.status)}</li>`), 'Nothing waiting on techs.')}
      ${queue('3. Chase quotes', quotesOut.length, '#/quotes?status=sent', quotesOut.slice(0, 4).map((q) => `<li><a href="#/quotes/${q.id}">${money(q.total)}</a><span class="muted small">sent ${ago(q.sent_at)} ago</span></li>`), 'No quotes waiting.')}
      ${queue('4. Review invoices', toReview.length, '#/invoices?status=review', toReview.slice(0, 4).map((i) => `<li><a href="#/invoices/${i.id}">${money(i.total)}</a>${badge(i.status)}</li>`), 'Inbox clear.')}
      ${queue('5. Pay techs', owed.length, '#/payouts', owed.slice(0, 4).map((p) => `<li><a href="#/payouts">${money(p.amount)}</a><span class="muted small">${ago(p.created_at)}</span></li>`), 'Everyone is paid.', owed.length ? 'hot' : '')}
    </div>

    ${(apps.length || insuranceSoon.length) ? `<div class="grid c2" style="margin-top:12px">
      ${apps.length ? `<div class="card"><h3>${apps.length} tech application${apps.length === 1 ? '' : 's'} waiting</h3><ul class="list">${apps.slice(0, 4).map((a) => `<li><span>${esc(a.business_name)} <span class="muted small">· ${esc(a.contact_name)}</span></span><a href="#/techs?tab=applications">Review</a></li>`).join('')}</ul></div>` : ''}
      ${insuranceSoon.length ? `<div class="card"><h3>Insurance expiring within 30 days</h3><ul class="list">${insuranceSoon.map((t) => `<li><a href="#/techs/${t.id}">${esc(t.business_name)}</a><span class="muted small">${fmtDate(t.insurance_expires)}</span></li>`).join('')}</ul></div>` : ''}
    </div>` : ''}

    <div class="card" style="margin-top:12px">
      <h3>Recent activity</h3>
      <ul class="timeline">${events.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10).map((e) => {
        const l = leads.find((x) => x.id === e.lead_id);
        return `<li><span class="muted small">${ago(e.created_at)} ago</span> · <b>${esc(describe(e))}</b> — <a href="#/leads/${e.lead_id}">${esc(l?.customer_name || 'lead')}</a>${l ? ` <span class="muted small">${esc(titleCase(l.service_slug))} · ${esc(equipmentLabel(l.equipment))}</span>` : ''}</li>`;
      }).join('')}</ul>
    </div>`;
}

function queue(title, count, href, items, empty, hot = '') {
  return `<div class="card stat ${hot}"><div class="row between"><div class="k">${esc(title)}</div><a class="small" href="${href}">all</a></div><div class="v">${count}</div>
    <ul class="list small" style="margin-top:6px">${items.length ? items.join('') : `<li class="muted">${esc(empty)}</li>`}</ul></div>`;
}

function describe(e) {
  const p = e.payload || {};
  switch (e.type) {
    case 'created': return `New lead (${p.source || 'site'})`;
    case 'call': return p.minutes_to_respond !== undefined ? `Called back in ${Math.round(p.minutes_to_respond)} min` : 'Call logged';
    case 'text': return 'Text logged';
    case 'note': return 'Note';
    case 'status': return `Status → ${titleCase(p.to)}`;
    case 'offer': return `Offered to ${p.business_name || 'tech'}`;
    case 'accepted': return `${p.business_name || 'Tech'} accepted`;
    case 'declined': return 'Tech declined';
    case 'quote_sent': return `Quote sent ${money(p.total)}`;
    case 'quote_accepted': return `Quote accepted ${money(p.total)}`;
    case 'invoice_uploaded': return 'Invoice uploaded';
    case 'invoice_extracted': return `Invoice read by AI (${Math.round((p.confidence || 0) * 100)}% confident)`;
    case 'invoice_sent': return `Payment link sent ${money(p.total)}`;
    case 'paid': return `Paid ${money(p.paid_amount || p.total)} by ${p.method || 'card'}`;
    case 'payout_paid': return `Tech paid ${money(p.amount)}`;
    case 'review': return `Review: ${p.rating}★`;
    default: return titleCase(e.type);
  }
}
export { describe };
