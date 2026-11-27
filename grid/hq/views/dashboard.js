import { store } from '../data/store.js';
import { computeGame, LEVELS } from '../lib/game.js';
import { esc, money, ago, titleCase, equipmentLabel, fmtDate } from '../lib/ui.js';

// The dashboard answers one question: what do I do next? Queues across the top, one ordered to-do
// list below, progress and money on the side.
export default async function dashboard(root) {
  const db = store.db;
  const [leads, events, invoices, payouts, techs, quotes, apps] = await Promise.all([
    db.list('leads'), db.list('lead_events'), db.list('invoices'), db.list('payouts'), db.list('techs'), db.list('quotes'), db.list('tech_applications', { filter: { status: 'new' } }),
  ]);
  const game = computeGame({ leads, events, invoices, payouts, techs, categories: store.categories, settings: store.settings, config: store.config });
  const sla = Number(store.setting('speed_sla_minutes', 5));
  const leadById = Object.fromEntries(leads.map((l) => [l.id, l]));
  const techById = Object.fromEntries(techs.map((t) => [t.id, t]));
  const mins = (iso) => (Date.now() - new Date(iso).getTime()) / 60000;

  const newLeads = leads.filter((l) => l.status === 'new').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const approved = leads.filter((l) => l.status === 'approved');
  const offered = leads.filter((l) => l.status === 'offered');
  const quotesOut = quotes.filter((q) => q.status === 'sent');
  const toReview = invoices.filter((i) => ['uploaded', 'review'].includes(i.status));
  const owed = payouts.filter((p) => p.status === 'owed').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const owedTotal = owed.reduce((s, p) => s + Number(p.amount), 0);
  const insuranceSoon = techs.filter((t) => t.status === 'approved' && t.insurance_expires && (new Date(t.insurance_expires) - Date.now()) / 86400000 < 30);

  // ---- one ordered to-do list --------------------------------------------------------------
  const todo = [];
  for (const l of newLeads) {
    const m = mins(l.created_at);
    todo.push({ tone: m <= sla ? 'warn' : 'bad', title: `Call back ${l.customer_name}`, sub: `${titleCase(l.service_slug)} in ${l.city || l.zip || 'unknown area'}. Waiting ${ago(l.created_at)}.`, href: `#/leads/${l.id}`, action: 'Call back' });
  }
  for (const l of approved) todo.push({ tone: 'warn', title: `Send ${l.customer_name}'s job to techs`, sub: `${titleCase(l.service_slug)}, ${equipmentLabel(l.equipment)}.`, href: `#/leads/${l.id}`, action: 'Dispatch' });
  for (const l of offered) {
    const m = mins(l.updated_at || l.created_at);
    todo.push({ tone: m > 30 ? 'bad' : 'info', title: `Waiting on a tech for ${l.customer_name}`, sub: m > 30 ? `Offered ${ago(l.updated_at || l.created_at)} ago with no taker. Call the top match.` : `Offered ${ago(l.updated_at || l.created_at)} ago.`, href: `#/leads/${l.id}`, action: 'Open' });
  }
  for (const i of toReview) {
    const l = leadById[i.lead_id], t = techById[i.tech_id];
    todo.push({ tone: 'warn', title: `Review ${money(i.total)} invoice`, sub: `${t?.business_name || 'Tech'} for ${l?.customer_name || 'customer'}.`, href: `#/invoices/${i.id}`, action: 'Review' });
  }
  for (const p of owed) {
    const t = techById[p.tech_id];
    todo.push({ tone: mins(p.created_at) > 3 * 1440 ? 'bad' : 'warn', title: `Pay ${t?.business_name || 'tech'} ${money(p.amount)}`, sub: `Customer paid ${ago(p.created_at)} ago.${t?.w9_path ? '' : ' Needs a W-9 first.'}`, href: '#/payouts', action: 'Pay' });
  }
  for (const q of quotesOut.filter((x) => mins(x.sent_at) > 2 * 1440)) {
    const l = leadById[q.lead_id];
    todo.push({ tone: 'info', title: `Follow up on ${l?.customer_name || 'a'} quote`, sub: `${money(q.total)}, sent ${ago(q.sent_at)} ago.`, href: `#/quotes/${q.id}`, action: 'Open' });
  }
  for (const a of apps) todo.push({ tone: 'info', title: `Call ${a.business_name} about joining`, sub: `${a.contact_name}, ${a.phone}. Applied ${ago(a.created_at)} ago.`, href: '#/techs?tab=applications', action: 'Review' });
  for (const t of insuranceSoon) todo.push({ tone: 'warn', title: `Insurance expiring for ${t.business_name}`, sub: `Expires ${fmtDate(t.insurance_expires)}. Ask for the renewal certificate.`, href: `#/techs/${t.id}`, action: 'Open' });

  const nextLocked = game.unlocks.find((u) => !u.met) || null;
  const targets = nextLocked?.targets || game.nextTargets;
  const nextLvl = LEVELS[Math.min(game.level + 1, 5)];
  const kept = game.stats.fee30 + game.stats.cardFee30 - game.stats.proc30;
  const tile = (href, label, n, sub, tone) => `<a class="tile ${n ? tone : ''}" href="${href}"><span class="tile-label">${label}</span><span class="tile-n">${n}</span><span class="tile-sub">${sub}</span></a>`;
  const recent = events.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

  root.innerHTML = `
    <div class="page-head"><div><h1>Today</h1><p class="muted">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div></div>

    <div class="tiles">
      ${tile('#/leads?tab=answer', 'New leads', newLeads.length, newLeads.length ? `Oldest waiting ${ago(newLeads[0].created_at)}` : 'All answered', 'bad')}
      ${tile('#/leads?tab=active', 'Waiting on techs', approved.length + offered.length, approved.length ? `${approved.length} not sent yet` : offered.length ? 'Offers out' : 'Nothing waiting', 'warn')}
      ${tile('#/quotes?status=sent', 'Quotes out', quotesOut.length, quotesOut.length ? `${money(quotesOut.reduce((s, q) => s + Number(q.total), 0), { cents: false })} pending` : 'None out', 'info')}
      ${tile('#/invoices?status=review', 'Invoices to review', toReview.length, toReview.length ? `${money(toReview.reduce((s, i) => s + Number(i.total), 0), { cents: false })} to send` : 'Inbox clear', 'warn')}
      ${tile('#/payouts', 'Owed to techs', owed.length, owed.length ? money(owedTotal) : 'Everyone paid', 'bad')}
    </div>

    <div class="dash">
      <section class="card todo">
        <div class="card-head"><h2>Do next</h2><span class="muted small">${todo.length ? `${todo.length} item${todo.length === 1 ? '' : 's'}` : ''}</span></div>
        ${todo.length ? `<ul class="todo-list">${todo.map((t) => `<li><span class="tone ${t.tone}" aria-hidden="true"></span><a class="todo-main" href="${t.href}"><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></a><a class="btn sm" href="${t.href}">${esc(t.action)}</a></li>`).join('')}</ul>`
          : `<div class="empty"><b>You're caught up.</b><span>New leads, invoices and payouts show up here as they arrive.</span></div>`}
      </section>

      <aside class="dash-side">
        <section class="card">
          <div class="level">
            <div class="n">${game.level}</div>
            <div class="meta"><b>Level ${game.level}: ${esc(game.display.name)}</b><span class="muted small">${game.xp.toLocaleString()} XP, fast-answer streak ${game.streaks.fast}</span></div>
          </div>
          ${game.level < 6 ? `<p class="small next-up">Next: <b>${esc(nextLvl.name)}</b>. ${esc(nextLvl.req)}. Unlocks ${esc(nextLvl.unlocks.toLowerCase())}.</p>` : '<p class="small next-up">Every vertical is unlocked.</p>'}
          ${game.checklist.some((c) => !c.done) ? `<h3>Setup</h3><ul class="check">${game.checklist.map((c) => `<li class="${c.done ? 'done' : ''}">${esc(c.label)}${c.progress ? ` <span class="muted small">${c.progress}</span>` : ''}</li>`).join('')}</ul>` : ''}
          ${targets ? `<h3>${nextLocked ? `Unlock ${esc(nextLocked.category.name.toLowerCase())}` : 'Growth'}</h3>
            <div class="meter"><div class="meter-top"><span>Paid jobs, 7 days</span><b>${game.stats.jobs7} of ${targets.jobs}</b></div><div class="bar ${game.stats.jobs7 >= targets.jobs ? 'ok' : ''}"><span style="width:${Math.min(100, (game.stats.jobs7 / targets.jobs) * 100)}%"></span></div></div>
            <div class="meter"><div class="meter-top"><span>Paid volume, 30 days</span><b>${money(game.stats.gmv30, { cents: false })} of ${money(targets.gmv, { cents: false })}</b></div><div class="bar ${game.stats.gmv30 >= targets.gmv ? 'ok' : ''}"><span style="width:${Math.min(100, (game.stats.gmv30 / targets.gmv) * 100)}%"></span></div></div>
            <p class="small muted">Either bar full unlocks it. <a href="#/verticals">Verticals</a></p>` : ''}
        </section>

        <section class="card">
          <h3>Last 30 days</h3>
          <dl class="ledger-mini">
            <div><dt>Paid invoices</dt><dd>${money(game.stats.gmv30)}</dd></div>
            <div><dt>Platform fee kept</dt><dd><b>${money(kept)}</b></dd></div>
            <div><dt>Card and bank fees</dt><dd>${money(game.stats.proc30)}</dd></div>
            <div><dt>Paid to techs</dt><dd>${money(game.stats.payout30)}</dd></div>
          </dl>
        </section>

        <section class="card">
          <h3>Response time today</h3>
          <div class="dots">${game.todays.length ? game.todays.map((t) => `<span class="dot ${t.state}" title="${esc(t.lead.customer_name)}: ${Math.round(t.minutes)} min"></span>`).join('') : '<span class="muted small">No leads yet today.</span>'}</div>
          <p class="small muted">Median ${game.medianResponse === null ? 'not enough data' : `${Math.round(game.medianResponse)} min`}. Goal ${sla} min.</p>
        </section>
      </aside>
    </div>

    <section class="card recent">
      <div class="card-head"><h2>Recent activity</h2></div>
      <ul class="feed">${recent.map((e) => {
        const l = leadById[e.lead_id];
        return `<li><span class="feed-time">${ago(e.created_at)} ago</span><span><b>${esc(describe(e))}</b> <a href="#/leads/${e.lead_id}">${esc(l?.customer_name || 'lead')}</a></span></li>`;
      }).join('')}</ul>
    </section>`;
}

function describe(e) {
  const p = e.payload || {};
  switch (e.type) {
    case 'created': return `New lead from ${titleCase(p.source || 'site')}`;
    case 'call': return p.minutes_to_respond !== undefined ? `Called back in ${Math.round(p.minutes_to_respond)} min` : 'Call logged';
    case 'text': return 'Text logged';
    case 'note': return 'Note added';
    case 'status': return `Moved to ${titleCase(p.to)}`;
    case 'offer': return `Offered to ${p.business_name || 'a tech'}`;
    case 'accepted': return `${p.business_name || 'Tech'} took the job`;
    case 'declined': return 'A tech declined';
    case 'quote_sent': return `Quote sent, ${money(p.total)}`;
    case 'quote_accepted': return `Quote accepted, ${money(p.total)}`;
    case 'invoice_uploaded': return 'Invoice uploaded';
    case 'invoice_extracted': return `Invoice read, ${Math.round((p.confidence || 0) * 100)}% confident`;
    case 'invoice_sent': return `Payment link sent, ${money(p.total)}`;
    case 'paid': return `Paid ${money(p.paid_amount || p.total)} by ${p.method === 'ach' ? 'bank' : p.method || 'card'}`;
    case 'payout_paid': return `Tech paid ${money(p.amount)}`;
    case 'review': return `${p.rating}-star review`;
    default: return titleCase(e.type);
  }
}
export { describe };
