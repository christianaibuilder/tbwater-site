// Shared logic for the customer-facing quote and pay pages. No login: everything goes through a token.
import { esc, money, fmtDate, titleCase, equipmentLabel, round2 } from '../lib/ui.js';

const CONFIG_KEY = 'grid.hq.config';
function config() {
  const base = (typeof window !== 'undefined' && window.GRID_CONFIG) || {};
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch (_) { saved = {}; }
  return { mode: 'local', ...base, ...saved };
}

async function backend() {
  const cfg = config();
  if (cfg.mode === 'live' && cfg.supabaseUrl && cfg.supabaseAnonKey) {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const sb = mod.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    return { mode: 'live', async rpc(name, args) { const { data, error } = await sb.rpc(name, args); if (error) throw new Error(error.message); return data; } };
  }
  const { LocalAdapter } = await import('../data/adapter-local.js');
  const a = new LocalAdapter();
  return { mode: 'local', rpc: (name, args) => a.rpc(name, args) };
}

const params = new URLSearchParams(location.search);
const token = params.get('t');
const root = document.getElementById('root');

function showErr(text) {
  let el = root.querySelector('#err');
  if (!el) { el = document.createElement('p'); el.id = 'err'; el.className = 'notice bad'; (root.querySelector('.card') || root).appendChild(el); }
  el.textContent = text;
}

function shell(brand, inner) {
  return `<header class="pub-head"><div><div class="pub-brand">${esc(brand?.name || 'Your technician')}</div>${brand?.phone ? `<div class="small"><a href="tel:${esc(brand.phone)}">${esc(brand.phone)}</a></div>` : ''}</div></header><main class="pub-main">${inner}</main>
    <footer class="pub-foot small muted">Independent technicians, introduced and billed through ${esc(brand?.name || 'the platform')}. <a href="../legal/customer-terms.md">Terms</a></footer>`;
}

function linesTable(items, subtotal, tax, total) {
  return `<table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody>
    ${items.map((li) => `<tr><td>${esc(li.description)}<div class="small muted">${esc(li.kind)}${li.taxable ? ' · taxable' : ''}</div></td><td class="num">${li.qty}</td><td class="num">${money(round2(li.qty * li.unit_price))}</td></tr>`).join('')}
    <tr><td colspan="2" class="right">Subtotal</td><td class="num">${money(subtotal)}</td></tr><tr><td colspan="2" class="right">Sales tax</td><td class="num">${money(tax)}</td></tr><tr><td colspan="2" class="right"><b>Total</b></td><td class="num"><b>${money(total)}</b></td></tr></tbody></table>`;
}

export async function renderQuote() {
  const be = await backend();
  const data = token ? await be.rpc('quote_by_token', { t: token }) : null;
  if (!data) { root.innerHTML = shell(null, `<div class="card"><h1>Quote not found</h1><p>This link may have expired. Call us and we'll resend it.</p></div>`); return; }
  const { quote: q, lead, tech, brand } = data;
  const expired = q.valid_until && q.valid_until < new Date().toISOString().slice(0, 10);
  root.innerHTML = shell(brand, `<div class="card">
    <h1>Your quote: ${money(q.total)}</h1>
    <p class="muted">${esc(lead.customer_name)} · ${esc(titleCase(lead.service_slug))} · ${esc(equipmentLabel(lead.equipment))}${tech?.business_name ? ` · by ${esc(tech.business_name)}` : ''}</p>
    ${linesTable(q.line_items, q.subtotal, q.tax, q.total)}
    <p class="small muted">Valid until ${fmtDate(q.valid_until)}. Parts are billed at the final invoiced amount; labor as quoted unless the job changes, in which case you approve first.</p>
    ${q.status === 'accepted' ? `<p class="notice ok">Accepted ${fmtDate(q.accepted_at, true)}. We'll call to schedule.</p>` : q.status === 'sent' && !expired ? `<label>Anything we should know? (optional)</label><textarea id="note" placeholder="Gate code, best days, dock location…"></textarea><div class="actions"><button class="btn primary" id="accept">Accept this quote</button><a class="btn" href="tel:${esc(brand?.phone || '')}">Call with questions</a></div>` : `<p class="notice">This quote is ${expired ? 'expired' : esc(q.status)}. Call ${esc(brand?.phone || 'us')} for an updated one.</p>`}
  </div>`);
  root.querySelector('#accept')?.addEventListener('click', async () => {
    try { await be.rpc('accept_quote', { t: token, note: root.querySelector('#note').value }); renderQuote(); }
    catch (e) { showErr(e.message); }
  });
}

export async function renderPay() {
  const be = await backend();
  const data = token ? await be.rpc('invoice_by_token', { t: token }) : null;
  if (!data) { root.innerHTML = shell(null, `<div class="card"><h1>Invoice not found</h1><p>This link may be wrong. Call us and we'll resend it.</p></div>`); return; }
  const { invoice: inv, lead, tech, brand } = data;
  const cardPct = Number(inv.card_fee_pct ?? 3);
  const cardTotal = round2(Number(inv.total) * (1 + cardPct / 100));
  const done = params.get('done') === '1' || inv.status === 'paid';
  const processing = inv.status === 'processing';
  root.innerHTML = shell(brand, `<div class="card">
    <h1>${done ? 'Thank you' : processing ? 'Payment processing' : `Invoice: ${money(inv.total)}`}</h1>
    <p class="muted">${esc(lead.customer_name)} · ${esc(titleCase(lead.service_slug))} · ${esc(equipmentLabel(lead.equipment))} · work by ${esc(tech.business_name)}</p>
    ${linesTable(inv.line_items, inv.subtotal, inv.tax, inv.total)}
    ${done ? `<p class="notice ok">Paid${inv.paid_at ? ' ' + fmtDate(inv.paid_at, true) : ''}. A receipt is on its way. Thanks for keeping it local.</p>`
      : processing ? `<p class="notice">Your bank payment is on its way (bank payments take a few business days to clear). Nothing else to do.</p>`
      : `<h2 style="margin-top:16px">Choose how to pay</h2>
        <div class="grid c2">
          <div class="card pay-opt"><div class="k">Pay by bank</div><div class="v">${money(inv.total)}</div><div class="small muted">No fee. Secure bank login through Stripe.</div>${be.mode === 'live' ? `<a class="btn primary" href="${esc(inv.payment_link_url || '#')}" ${inv.payment_link_url ? '' : 'aria-disabled="true"'}>Pay ${money(inv.total)} by bank</a>` : `<button class="btn primary" data-pay="ach">Simulate bank payment</button>`}</div>
          <div class="card pay-opt"><div class="k">Pay by card</div><div class="v">${money(cardTotal)}</div><div class="small muted">Includes a ${cardPct}% card processing fee.</div>${be.mode === 'live' ? `<a class="btn" href="${esc(inv.payment_link_card_url || '#')}" ${inv.payment_link_card_url ? '' : 'aria-disabled="true"'}>Pay ${money(cardTotal)} by card</a>` : `<button class="btn" data-pay="card">Simulate card payment</button>`}</div>
        </div>
        <p class="small muted" style="margin-top:12px">Both prices are shown so you can choose. Questions about the work? Call ${esc(brand?.phone || 'us')} before paying.</p>`}
  </div>`);
  root.querySelectorAll('[data-pay]').forEach((b) => b.addEventListener('click', async () => { try { await be.rpc('demo_pay', { t: token, method: b.dataset.pay }); location.search = `?t=${token}&done=1`; } catch (e) { showErr(e.message); } }));
}
