import { store } from '../data/store.js';
import { esc, money, badge, titleCase, fmtDate, ago, modal, closeModal, toast, on, csv, download } from '../lib/ui.js';
import * as act from '../lib/actions.js';

export default async function payouts(root) {
  const db = store.db;
  const [all, techs, invoices, leads] = await Promise.all([db.list('payouts'), db.list('techs'), db.list('invoices'), db.list('leads')]);
  const owed = all.filter((p) => p.status === 'owed');
  const paid = all.filter((p) => p.status === 'paid').sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
  const year = new Date().getFullYear();
  const ytd = {};
  for (const p of paid) if (p.tax_year === year) ytd[p.tech_id] = (ytd[p.tech_id] || 0) + Number(p.amount);
  const owedTotal = owed.reduce((s, p) => s + Number(p.amount), 0);
  const rowFor = (p) => { const t = techs.find((x) => x.id === p.tech_id); const i = invoices.find((x) => x.id === p.invoice_id); const l = leads.find((x) => x.id === i?.lead_id); return { t, i, l }; };

  root.innerHTML = `
    <div class="row between"><h1>Payouts</h1><div class="row gap"><button class="btn" id="csv">Export CSV</button></div></div>
    <div class="grid c3">
      <div class="card stat ${owedTotal ? 'hot' : ''}"><div class="k">Owed to techs</div><div class="v">${money(owedTotal)}</div><div class="sub">${owed.length} payout${owed.length === 1 ? '' : 's'} · treat as not yours</div></div>
      <div class="card stat"><div class="k">Paid this year</div><div class="v">${money(Object.values(ytd).reduce((s, v) => s + v, 0), { cents: false })}</div><div class="sub">${paid.filter((p) => p.tax_year === year).length} payouts</div></div>
      <div class="card stat"><div class="k">1099-NEC needed</div><div class="v">${Object.values(ytd).filter((v) => v >= 2000).length}</div><div class="sub">techs at or over $2,000 in ${year}</div></div>
    </div>
    <div class="card" style="margin-top:12px"><h3>Owed</h3>${owed.length ? `<div class="table-wrap"><table><thead><tr><th>Tech</th><th>Job</th><th>Since</th><th>W-9</th><th>Method</th><th class="num">Amount</th><th></th></tr></thead><tbody>
      ${owed.map((p) => { const { t, i, l } = rowFor(p); return `<tr><td><a href="#/techs/${t?.id}">${esc(t?.business_name || '?')}</a></td><td><a href="#/invoices/${i?.id}">${esc(l?.customer_name || '')}</a> <span class="small muted">${money(i?.total)} · ${i?.payment_method || ''}</span></td><td class="small muted">${ago(p.created_at)} ago</td><td>${t?.w9_path ? '✓' : '<span class="timer red">missing</span>'}</td><td>${titleCase(p.method)}</td><td class="num"><b>${money(p.amount)}</b></td><td class="right"><button class="btn sm primary" data-pay="${p.id}" ${t?.w9_path ? '' : 'disabled title="Collect W-9 first"'}>Mark paid</button></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted small">Nothing owed. 👌</p>'}
      <p class="small muted">Pay from your business bank (QuickBooks Bill Pay, Melio, or a plain ACH), then mark it here with the reference. Switch to Stripe Connect in Settings when this list gets long.</p></div>
    <div class="grid c2" style="margin-top:12px">
      <div class="card"><h3>Year-to-date by tech (${year})</h3>${techs.length ? `<table><thead><tr><th>Tech</th><th class="num">Paid YTD</th><th>1099</th></tr></thead><tbody>${techs.filter((t) => ytd[t.id]).sort((a, b) => ytd[b.id] - ytd[a.id]).map((t) => `<tr><td><a href="#/techs/${t.id}">${esc(t.business_name)}</a></td><td class="num">${money(ytd[t.id])}</td><td>${ytd[t.id] >= 2000 ? '<b>required</b>' : `<span class="muted small">${money(2000 - ytd[t.id], { cents: false })} to go</span>`}</td></tr>`).join('') || '<tr><td colspan="3" class="muted small">No payouts yet this year.</td></tr>'}</tbody></table>` : ''}</div>
      <div class="card"><h3>Recently paid</h3>${paid.length ? `<ul class="list">${paid.slice(0, 12).map((p) => { const { t } = rowFor(p); return `<li><span>${esc(t?.business_name || '?')} <span class="small muted">${fmtDate(p.paid_at)} · ${titleCase(p.method)}${p.reference ? ' · ' + esc(p.reference) : ''}</span></span><b>${money(p.amount)}</b></li>`; }).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</div>
    </div>`;

  on(root, '[data-pay]', 'click', (_e, el) => {
    const p = owed.find((x) => x.id === el.dataset.pay);
    const { t } = rowFor(p);
    modal(`<h3>Mark payout paid</h3><p>${esc(t?.business_name)} · <b>${money(p.amount)}</b></p>
      <label>Method</label><select id="m">${['ach_manual', 'zelle', 'check', 'stripe_connect'].map((m) => `<option value="${m}" ${m === p.method ? 'selected' : ''}>${titleCase(m)}</option>`).join('')}</select>
      <label>Reference (bank confirmation, check #)</label><input id="ref" placeholder="optional">
      <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Paid</button></div>`,
      { onMount(m) { m.querySelector('#go').addEventListener('click', async () => { const method = m.querySelector('#m').value, reference = m.querySelector('#ref').value; closeModal(); try { await act.markPayoutPaid(p, { method, reference }); toast('Payout recorded'); } catch (e) { toast(e.message, 'bad'); } }); } });
  });
  root.querySelector('#csv').addEventListener('click', () => {
    const rows = all.map((p) => { const { t, i, l } = rowFor(p); return { date: p.paid_at || p.created_at, status: p.status, tech: t?.business_name, tech_email: t?.email, customer: l?.customer_name, invoice_total: i?.total, platform_fee: i?.platform_fee_amount, amount: p.amount, method: p.method, reference: p.reference, tax_year: p.tax_year }; });
    download(`payouts-${new Date().toISOString().slice(0, 10)}.csv`, csv(rows, Object.keys(rows[0] || { date: 1 })), 'text/csv');
  });
}
