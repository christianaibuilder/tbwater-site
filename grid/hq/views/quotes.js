import { store } from '../data/store.js';
import { esc, money, badge, titleCase, fmtDate, ago, pct, modal, closeModal, toast, on, round2 } from '../lib/ui.js';
import * as act from '../lib/actions.js';

export default async function quotes(root, { query }) {
  const db = store.db;
  const [all, leads, techs] = await Promise.all([db.list('quotes'), db.list('leads'), db.list('techs')]);
  const status = query.status || 'open';
  const rows = all.filter((q) => status === 'open' ? ['draft', 'sent'].includes(q.status) : status === 'all' ? true : q.status === status);
  const tab = (k, label) => `<a href="#/quotes?status=${k}" class="${status === k ? 'active' : ''}">${label}</a>`;
  root.innerHTML = `<h1>Quotes</h1>
    <div class="tabs">${tab('open', 'Open')}${tab('accepted', 'Accepted')}${tab('declined', 'Declined')}${tab('expired', 'Expired')}${tab('all', 'All')}</div>
    <div class="card table-wrap">${rows.length ? `<table><thead><tr><th>Customer</th><th>Tech</th><th>Status</th><th>Valid until</th><th class="num">Total</th></tr></thead><tbody>
      ${rows.map((q) => { const l = leads.find((x) => x.id === q.lead_id); const t = techs.find((x) => x.id === q.tech_id); return `<tr class="click" data-href="#/quotes/${q.id}"><td><b>${esc(l?.customer_name || '?')}</b><div class="small muted">${esc(titleCase(l?.service_slug))}</div></td><td>${esc(t?.business_name || '—')}</td><td>${badge(q.status)}${q.status === 'sent' ? `<div class="small muted">sent ${ago(q.sent_at)} ago</div>` : ''}</td><td>${fmtDate(q.valid_until)}</td><td class="num"><b>${money(q.total)}</b></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">No quotes in this view. Build one from a lead.</div>'}</div>
    <p class="small muted">Quotes are built from the assigned tech's own rate and trip fee. The tech can edit line items in their portal before you send. Reminders stop when the customer answers.</p>`;
  on(root, 'tr.click', 'click', (_e, el) => { location.hash = el.dataset.href; });
}

export async function detail(root, { params }) {
  const db = store.db;
  const q = await db.get('quotes', params.id);
  if (!q) { root.innerHTML = `<div class="card">Quote not found. <a href="#/quotes">Back</a></div>`; return; }
  const lead = await db.get('leads', q.lead_id);
  const tech = q.tech_id ? await db.get('techs', q.tech_id) : null;
  const editable = ['draft', 'sent'].includes(q.status);
  const customerUrl = new URL(`public/quote.html?t=${q.public_token}`, document.baseURI).href;
  let items = (q.line_items || []).map((li) => ({ ...li }));
  let taxRate = Number(q.tax_rate ?? store.taxRateFor(lead));

  const render = () => {
    const t = act.computeTotals(items, taxRate);
    root.innerHTML = `
      <a href="#/leads/${lead.id}" class="small">← ${esc(lead.customer_name)}</a>
      <div class="row between"><h1 style="margin:4px 0">Quote ${badge(q.status)}</h1><div class="small muted">${tech ? `Tech: <a href="#/techs/${tech.id}">${esc(tech.business_name)}</a> · ${money(tech.hourly_rate)}/hr, trip ${money(tech.trip_fee)}` : 'No tech assigned'}</div></div>
      <div class="actions">
        ${editable ? `<button class="btn" data-a="save">Save</button>` : ''}
        ${q.status === 'draft' ? `<button class="btn primary" data-a="send">Send to customer</button>` : ''}
        ${q.status === 'sent' ? `<button class="btn ok" data-a="accept">Mark accepted (by phone)</button><button class="btn" data-a="resend">Resend</button><button class="btn" data-a="decline">Mark declined</button>` : ''}
        ${q.status === 'accepted' && !['scheduled', 'in_progress', 'completed', 'paid'].includes(lead.status) ? `<a class="btn primary" href="#/leads/${lead.id}">Schedule the job →</a>` : ''}
        <button class="btn" data-a="copy">Copy customer link</button>
      </div>
      <div class="card table-wrap"><table class="lines"><thead><tr><th class="w-desc">Line item</th><th>Type</th><th class="w-num">Qty</th><th class="w-num">Unit $</th><th>Taxable</th><th class="num">Amount</th><th></th></tr></thead><tbody>
        ${items.map((li, i) => `<tr>
          <td>${editable ? `<input data-i="${i}" data-k="description" value="${esc(li.description)}">` : esc(li.description)}</td>
          <td>${editable ? `<select data-i="${i}" data-k="kind">${['labor', 'parts', 'fee', 'other'].map((k) => `<option ${k === li.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>` : esc(li.kind)}</td>
          <td>${editable ? `<input type="number" step="0.25" data-i="${i}" data-k="qty" value="${li.qty}">` : li.qty}</td>
          <td>${editable ? `<input type="number" step="0.01" data-i="${i}" data-k="unit_price" value="${li.unit_price}">` : money(li.unit_price)}</td>
          <td>${editable ? `<input type="checkbox" data-i="${i}" data-k="taxable" ${li.taxable ? 'checked' : ''}>` : li.taxable ? 'yes' : 'no'}</td>
          <td class="num">${money(round2(li.qty * li.unit_price))}</td>
          <td>${editable ? `<button class="btn sm link" data-del="${i}">✕</button>` : ''}</td></tr>`).join('')}
      </tbody></table>
      ${editable ? `<div class="actions"><button class="btn sm" data-a="add">+ Line</button></div>` : ''}
      <div class="row between" style="margin-top:8px"><div class="small muted">Tax rate ${editable ? `<input type="number" step="0.0001" id="tax" value="${taxRate}" style="width:110px;display:inline-block">` : pct(taxRate)} · ${esc(lead.county || '')} County. Florida taxes parts and, when parts are supplied, labor too; labor-only jobs are exempt.</div>
        <div class="money-grid"><span>Subtotal</span><span>${money(t.subtotal)}</span><span>Sales tax</span><span>${money(t.tax)}</span><span class="total">Total</span><span class="total">${money(t.total)}</span></div></div></div>
      <div class="grid c2" style="margin-top:12px">
        <div class="card"><h3>Terms</h3><dl class="kv"><dt>Valid until</dt><dd>${editable ? `<input type="date" id="valid" value="${esc(q.valid_until || '')}">` : fmtDate(q.valid_until)}</dd><dt>Sent</dt><dd>${q.sent_at ? fmtDate(q.sent_at, true) : '—'}</dd><dt>Accepted</dt><dd>${q.accepted_at ? fmtDate(q.accepted_at, true) : '—'}</dd>${q.customer_note ? `<dt>Customer note</dt><dd>${esc(q.customer_note)}</dd>` : ''}</dl></div>
        <div class="card"><h3>Customer link</h3><p class="small mono" style="word-break:break-all">${esc(customerUrl)}</p><p class="small muted">The customer sees the line items, tax, and an Accept button. No login.</p></div>
      </div>`;

    on(root, '[data-k]', 'change', (_e, el) => { const i = Number(el.dataset.i), k = el.dataset.k; items[i][k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value; render(); });
    on(root, '[data-del]', 'click', (_e, el) => { items.splice(Number(el.dataset.del), 1); render(); });
    const tax = root.querySelector('#tax'); if (tax) tax.addEventListener('change', () => { taxRate = Number(tax.value); render(); });
    on(root, '[data-a]', 'click', async (_e, el) => {
      const a = el.dataset.a;
      try {
        const totals = act.computeTotals(items, taxRate);
        const valid = root.querySelector('#valid')?.value || q.valid_until;
        if (a === 'add') { items.push({ description: '', qty: 1, unit_price: 0, taxable: true, kind: 'parts' }); return render(); }
        if (a === 'save') { await db.update('quotes', q.id, { line_items: items, tax_rate: taxRate, ...totals, valid_until: valid }); return toast('Saved'); }
        if (a === 'send' || a === 'resend') { const saved = await db.update('quotes', q.id, { line_items: items, tax_rate: taxRate, ...totals, valid_until: valid }); await act.sendQuote(saved); return toast('Quote sent'); }
        if (a === 'accept') { await act.acceptQuoteManually(q); return toast('Marked accepted'); }
        if (a === 'decline') { await db.update('quotes', q.id, { status: 'declined' }); await act.logEvent(q.lead_id, 'status', { note: 'quote declined' }); return toast('Declined'); }
        if (a === 'copy') { await navigator.clipboard?.writeText(customerUrl); return toast('Link copied'); }
      } catch (e) { toast(e.message, 'bad'); }
    });
  };
  render();
}
