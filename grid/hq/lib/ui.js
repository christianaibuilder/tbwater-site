// Small DOM/format helpers. No framework.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n, opts = {}) => (n === null || n === undefined || Number.isNaN(Number(n))) ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: opts.cents === false ? 0 : 2, maximumFractionDigits: opts.cents === false ? 0 : 2 });
export const num = (n) => Number(n || 0).toLocaleString('en-US');
export const pct = (n) => `${Math.round(Number(n) * 1000) / 10}%`;
export const round2 = (n) => Math.round(Number(n) * 100) / 100;

export function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  return withTime ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function ago(iso) {
  if (!iso) return '—';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
export function minutesBetween(a, b) { return (new Date(b).getTime() - new Date(a).getTime()) / 60000; }
export function daysUntil(dateStr) { if (!dateStr) return null; return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000); }

export const STATUS_LABEL = {
  new: 'New', contacted: 'Contacted', approved: 'Approved', offered: 'Offered', assigned: 'Assigned', quoted: 'Quoted',
  scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', paid: 'Paid', dead: 'Dead',
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired', withdrawn: 'Withdrawn',
  uploaded: 'Uploaded', review: 'Review', processing: 'Processing', void: 'Void', owed: 'Owed', failed: 'Failed',
  applied: 'Applied', paused: 'Paused', rejected: 'Rejected', locked: 'Locked', active: 'Active', offeredTech: 'Offered',
};
export function badge(status, extra = '') {
  const cls = `badge s-${esc(status)}${extra ? ' ' + extra : ''}`;
  return `<span class="${cls}">${esc(STATUS_LABEL[status] || status)}</span>`;
}
export function titleCase(slug) { return String(slug || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
export function telLink(phone) { return `tel:${String(phone || '').replace(/[^\d+]/g, '')}`; }
export function smsLink(phone, body = '') { return `sms:${String(phone || '').replace(/[^\d+]/g, '')}${body ? `?&body=${encodeURIComponent(body)}` : ''}`; }

export function equipmentLabel(eq = {}) {
  const parts = [eq.year, titleCase(eq.make), eq.model].filter(Boolean);
  const s = parts.join(' ');
  return eq.hours ? `${s} · ${num(eq.hours)} hrs` : s || '—';
}

// ---- toast / modal ----------------------------------------------------------------------
export function toast(msg, kind = 'ok') {
  let host = document.getElementById('toasts');
  if (!host) { host = document.createElement('div'); host.id = 'toasts'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2800);
}

export function modal(html, { onMount } = {}) {
  closeModal();
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.id = 'modal';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  back.addEventListener('click', (e) => { if (e.target === back) closeModal(); });
  document.body.appendChild(back);
  back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  if (onMount) onMount(back.querySelector('.modal'));
  const first = back.querySelector('input, select, textarea, button');
  if (first) first.focus();
  return back;
}
export function closeModal() { document.getElementById('modal')?.remove(); }

export function confirmTyped(title, body, word, onYes) {
  modal(`<h3>${esc(title)}</h3><p>${body}</p><p>Type <b>${esc(word)}</b> to confirm.</p>
    <input id="confirm-word" placeholder="${esc(word)}">
    <div class="row end gap"><button class="btn" data-close>Cancel</button><button class="btn danger" id="confirm-yes" disabled>Confirm</button></div>`,
    { onMount(m) {
      const inp = m.querySelector('#confirm-word'), yes = m.querySelector('#confirm-yes');
      inp.addEventListener('input', () => { yes.disabled = inp.value.trim().toUpperCase() !== word.toUpperCase(); });
      yes.addEventListener('click', async () => { closeModal(); await onYes(); });
    } });
}

export function formValues(form) {
  const out = {};
  for (const el of form.querySelectorAll('[name]')) {
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'number') out[el.name] = el.value === '' ? null : Number(el.value);
    else out[el.name] = el.value;
  }
  return out;
}

export function on(root, selector, event, handler) {
  root.querySelectorAll(selector).forEach((el) => el.addEventListener(event, (e) => handler(e, el)));
}

export function csv(rows, columns) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [columns.map(q).join(','), ...rows.map((r) => columns.map((c) => q(r[c])).join(','))].join('\n');
}
export function download(filename, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
