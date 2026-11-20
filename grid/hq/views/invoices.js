import { store } from '../data/store.js';
import { esc, money, badge, titleCase, fmtDate, ago, modal, closeModal, toast, on, round2 } from '../lib/ui.js';
import * as act from '../lib/actions.js';

export default async function invoices(root, { query }) {
  const db = store.db;
  const [all, leads, techs] = await Promise.all([db.list('invoices'), db.list('leads'), db.list('techs')]);
  const status = query.status || 'review';
  const rows = all.filter((i) => status === 'review' ? ['uploaded', 'review', 'approved'].includes(i.status) : status === 'sent' ? ['sent', 'processing'].includes(i.status) : status === 'all' ? true : i.status === status);
  const tab = (k, label, n) => `<a href="#/invoices?status=${k}" class="${status === k ? 'active' : ''}">${label}${n !== undefined ? ` <span class="muted">${n}</span>` : ''}</a>`;
  root.innerHTML = `<h1>Invoices</h1>
    <div class="tabs">${tab('review', 'To review', all.filter((i) => ['uploaded', 'review', 'approved'].includes(i.status)).length)}${tab('sent', 'Awaiting payment', all.filter((i) => ['sent', 'processing'].includes(i.status)).length)}${tab('paid', 'Paid')}${tab('void', 'Void')}${tab('all', 'All')}</div>
    <div class="card table-wrap">${rows.length ? `<table><thead><tr><th>Customer</th><th>Tech</th><th>Status</th><th>When</th><th class="num">Total</th><th class="num">Fee</th></tr></thead><tbody>
      ${rows.map((i) => { const l = leads.find((x) => x.id === i.lead_id); const t = techs.find((x) => x.id === i.tech_id); const fee = i.platform_fee_amount ?? act.feePreview(i.total).fee; return `<tr class="click" data-href="#/invoices/${i.id}"><td><b>${esc(l?.customer_name || '?')}</b><div class="small muted">${esc(titleCase(l?.service_slug))}</div></td><td>${esc(t?.business_name || '—')}</td><td>${badge(i.status)}${i.payment_method ? `<div class="small muted">${i.payment_method}</div>` : ''}</td><td class="small muted">${ago(i.paid_at || i.sent_at || i.created_at)} ago</td><td class="num"><b>${money(i.total)}</b></td><td class="num">${money(fee)}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty">Nothing here.</div>'}</div>`;
  on(root, 'tr.click', 'click', (_e, el) => { location.hash = el.dataset.href; });
}

export async function detail(root, { params }) {
  const db = store.db;
  const inv = await db.get('invoices', params.id);
  if (!inv) { root.innerHTML = `<div class="card">Invoice not found. <a href="#/invoices">Back</a></div>`; return; }
  const [lead, tech, payouts] = await Promise.all([db.get('leads', inv.lead_id), db.get('techs', inv.tech_id), db.list('payouts', { filter: { invoice_id: inv.id } })]);
  const fileUrl = inv.file_path ? await db.fileUrl('invoices', inv.file_path) : null;
  const editable = ['uploaded', 'review', 'approved'].includes(inv.status);
  const payUrl = new URL(`public/pay.html?t=${inv.public_token}`, document.baseURI).href;
  let items = (inv.line_items || []).map((li) => ({ ...li }));
  let tax = Number(inv.tax || 0);
  const taxRate = store.taxRateFor(lead);

  const render = () => {
    const subtotal = round2(items.reduce((s, li) => s + Number(li.qty || 0) * Number(li.unit_price || 0), 0));
    const total = round2(subtotal + tax);
    const fp = act.feePreview(total);
    const conf = inv.extracted?.confidence;
    root.innerHTML = `
      <a href="#/leads/${lead.id}" class="small">← ${esc(lead.customer_name)}</a>
      <div class="row between"><h1 style="margin:4px 0">Invoice ${badge(inv.status)}</h1><div class="small muted">Tech: <a href="#/techs/${tech?.id}">${esc(tech?.business_name || '?')}</a> · ${esc(titleCase(lead.service_slug))}</div></div>
      ${inv.status === 'uploaded' ? '<p class="notice">Not read yet. Run the AI read or enter lines by hand.</p>' : ''}
      ${conf !== undefined && conf !== null && editable ? `<p class="notice ${conf >= 0.85 ? 'ok' : ''}">AI read this invoice with ${Math.round(conf * 100)}% confidence${inv.extracted?.demo ? ' (demo simulation)' : ''}. Check the total against the picture before sending.</p>` : ''}
      <div class="actions">
        ${editable ? `<button class="btn" data-a="save">Save</button><button class="btn" data-a="extract">${inv.status === 'uploaded' ? 'Run AI read' : 'Re-read with AI'}</button><button class="btn primary" data-a="send" ${total > 0 ? '' : 'disabled'}>Approve & send payment link</button><button class="btn" data-a="manual">Mark paid (cash/check)</button><button class="btn danger" data-a="void">Void</button>` : ''}
        ${['sent', 'processing'].includes(inv.status) ? `<button class="btn" data-a="copy">Copy pay link</button><button class="btn" data-a="resend">Resend</button><button class="btn" data-a="manual">Mark paid (cash/check)</button>` : ''}
        ${inv.status === 'paid' && payouts.length ? `<a class="btn" href="#/payouts">Payout ${badge(payouts[0].status)}</a>` : ''}
      </div>
      <div class="grid c2">
        <div class="card">
          <div class="table-wrap"><table class="lines"><thead><tr><th class="w-desc">Line</th><th>Type</th><th class="w-num">Qty</th><th class="w-num">Unit $</th><th>Tax</th><th class="num">Amount</th><th></th></tr></thead><tbody>
          ${items.map((li, i) => `<tr><td>${editable ? `<input data-i="${i}" data-k="description" value="${esc(li.description)}">` : esc(li.description)}</td><td>${editable ? `<select data-i="${i}" data-k="kind">${['labor', 'parts', 'fee', 'other'].map((k) => `<option ${k === li.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>` : esc(li.kind)}</td>
            <td>${editable ? `<input type="number" step="0.25" data-i="${i}" data-k="qty" value="${li.qty}">` : li.qty}</td><td>${editable ? `<input type="number" step="0.01" data-i="${i}" data-k="unit_price" value="${li.unit_price}">` : money(li.unit_price)}</td>
            <td>${editable ? `<input type="checkbox" data-i="${i}" data-k="taxable" ${li.taxable ? 'checked' : ''}>` : li.taxable ? 'yes' : 'no'}</td><td class="num">${money(round2(li.qty * li.unit_price))}</td><td>${editable ? `<button class="btn sm link" data-del="${i}">✕</button>` : ''}</td></tr>`).join('')}
          </tbody></table></div>
          ${editable ? `<div class="actions"><button class="btn sm" data-a="add">+ Line</button><button class="btn sm" data-a="autotax">Compute tax at ${(taxRate * 100).toFixed(2)}%</button></div>` : ''}
          <div class="row end"><div class="money-grid"><span>Subtotal</span><span>${money(subtotal)}</span><span>Sales tax ${editable ? `<input type="number" step="0.01" id="taxv" value="${tax}" style="width:90px;display:inline-block">` : ''}</span><span>${money(tax)}</span><span class="total">Total</span><span class="total">${money(total)}</span></div></div>
          <h3 style="margin-top:14px">Where the money goes</h3>
          <div class="table-wrap"><table><thead><tr><th></th><th class="num">Customer pays by bank</th><th class="num">by card (+${store.setting('card_fee_pct', 3)}%)</th></tr></thead><tbody>
            <tr><td>Customer pays</td><td class="num">${money(total)}</td><td class="num">${money(round2(total + fp.cardFee))}</td></tr>
            <tr><td>Tech receives (${100 - Number(inv.platform_fee_pct)}%)</td><td class="num">${money(inv.tech_share_amount ?? fp.techShare)}</td><td class="num">${money(inv.tech_share_amount ?? fp.techShare)}</td></tr>
            <tr><td>Platform fee (max ${inv.platform_fee_pct}%, $${inv.platform_fee_min})</td><td class="num">${money(inv.platform_fee_amount ?? fp.fee)}</td><td class="num">${money(round2((inv.platform_fee_amount ?? fp.fee) + fp.cardFee))}</td></tr>
            <tr><td>Stripe processing (est.)</td><td class="num">−${money(inv.status === 'paid' && inv.payment_method === 'ach' ? inv.processing_fee_amount : fp.ach)}</td><td class="num">−${money(inv.status === 'paid' && inv.payment_method === 'card' ? inv.processing_fee_amount : fp.card)}</td></tr>
            <tr><td><b>You keep</b></td><td class="num"><b>${money(fp.netAch)}</b></td><td class="num"><b>${money(fp.netCard)}</b></td></tr>
          </tbody></table></div>
          ${inv.status === 'paid' ? `<p class="small muted">Paid ${fmtDate(inv.paid_at, true)} by ${inv.payment_method} · ${money(inv.paid_amount)} received · processing ${money(inv.processing_fee_amount)} · card fee charged ${money(inv.card_fee_charged)}.</p>` : ''}
        </div>
        <div class="card">
          <h3>The tech's invoice</h3>
          ${fileUrl ? (String(fileUrl).includes('application/pdf') || /\.pdf($|\?)/i.test(inv.file_path) ? `<div class="preview"><iframe src="${fileUrl}"></iframe></div>` : `<div class="preview"><a href="${fileUrl}" target="_blank"><img src="${fileUrl}" alt="invoice"></a></div>`) : `<p class="muted small">File: <span class="mono">${esc(inv.file_path || 'none')}</span>${inv.file_path?.startsWith('demo/') ? ' (demo placeholder, no image)' : ''}</p>`}
          ${inv.extracted && !inv.extracted.demo ? `<details style="margin-top:8px"><summary class="small muted">Raw AI output</summary><pre class="mono" style="white-space:pre-wrap">${esc(JSON.stringify(inv.extracted, null, 2))}</pre></details>` : ''}
          <h3 style="margin-top:14px">Customer pay page</h3><p class="small mono" style="word-break:break-all">${esc(payUrl)}</p>
          ${inv.payment_link_url ? `<p class="small muted">Bank link: <a href="${esc(inv.payment_link_url)}" target="_blank">open</a> · Card link: <a href="${esc(inv.payment_link_card_url || '#')}" target="_blank">open</a></p>` : '<p class="small muted">Links are created when you approve.</p>'}
        </div>
      </div>`;

    on(root, '[data-k]', 'change', (_e, el) => { const i = Number(el.dataset.i), k = el.dataset.k; items[i][k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value; render(); });
    on(root, '[data-del]', 'click', (_e, el) => { items.splice(Number(el.dataset.del), 1); render(); });
    const tv = root.querySelector('#taxv'); if (tv) tv.addEventListener('change', () => { tax = Number(tv.value); render(); });
    on(root, '[data-a]', 'click', async (_e, el) => {
      const a = el.dataset.a;
      const subtotalNow = round2(items.reduce((s, li) => s + Number(li.qty || 0) * Number(li.unit_price || 0), 0));
      const totalNow = round2(subtotalNow + tax);
      const save = () => db.update('invoices', inv.id, { line_items: items, subtotal: subtotalNow, tax, total: totalNow, status: inv.status === 'uploaded' ? 'review' : inv.status });
      try {
        if (a === 'add') { items.push({ description: '', qty: 1, unit_price: 0, taxable: true, kind: 'parts' }); return render(); }
        if (a === 'autotax') { tax = round2(items.filter((li) => li.taxable).reduce((s, li) => s + li.qty * li.unit_price, 0) * taxRate); return render(); }
        if (a === 'save') { await save(); return toast('Saved'); }
        if (a === 'extract') { toast('Reading…'); await db.call('extract-invoice', { invoice_id: inv.id }); return toast('Read complete'); }
        if (a === 'send' || a === 'resend') { if (a === 'send') await save(); await act.approveAndSendInvoice({ ...inv, total: totalNow }); return toast('Payment link sent'); }
        if (a === 'copy') { await navigator.clipboard?.writeText(payUrl); return toast('Copied'); }
        if (a === 'void') { await db.update('invoices', inv.id, { status: 'void' }); return toast('Voided'); }
        if (a === 'manual') return manualModal({ ...inv, total: totalNow, line_items: items, subtotal: subtotalNow, tax });
      } catch (e) { toast(e.message, 'bad'); }
    });
  };
  render();
}

function manualModal(inv) {
  modal(`<h3>Mark paid outside Stripe</h3><p class="muted small">Cash, check, or Zelle taken by the tech or by you. The platform fee is still owed by the tech; the payout record will net it out.</p>
    <label>Method</label><select id="m"><option value="cash">Cash</option><option value="check">Check</option><option value="other">Zelle / other</option></select>
    <label>Amount received</label><input id="amt" type="number" step="0.01" value="${inv.total}">
    <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Mark paid</button></div>`,
    { onMount(m) { m.querySelector('#go').addEventListener('click', async () => { const method = m.querySelector('#m').value, amt = Number(m.querySelector('#amt').value); closeModal(); try { await store.db.update('invoices', inv.id, { line_items: inv.line_items, subtotal: inv.subtotal, tax: inv.tax, total: inv.total }); await act.markInvoicePaidManually(inv, method, amt); toast('Marked paid'); } catch (e) { toast(e.message, 'bad'); } }); } });
}
