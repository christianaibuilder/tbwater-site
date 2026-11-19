import { store, saveConfig, loadConfig } from '../data/store.js';
import { esc, fmtDate, badge, modal, closeModal, toast, formValues, on, download } from '../lib/ui.js';

export default async function settings(root, { query }) {
  const cfg = loadConfig();
  const db = store.db;
  const live = db?.mode === 'live';
  const user = store.user();
  const notes = db ? await db.list('notifications', { limit: 30 }).catch(() => []) : [];
  const s = (k, d) => store.setting(k, d);

  root.innerHTML = `<h1>Settings</h1>
    <div class="grid c2">
      <div class="card"><h2>Mode & connection</h2>
        <p class="small muted">Demo mode keeps everything in this browser. Live mode uses your Supabase project. Keys here are the public anon key only; secrets live in edge-function settings.</p>
        <form id="cfg"><label>Mode</label><select name="mode"><option value="local" ${cfg.mode === 'local' ? 'selected' : ''}>Demo (this browser)</option><option value="live" ${cfg.mode === 'live' ? 'selected' : ''}>Live (Supabase)</option></select>
          <label>Supabase project URL</label><input name="supabaseUrl" placeholder="https://xxxx.supabase.co" value="${esc(cfg.supabaseUrl || '')}">
          <label>Supabase anon key</label><input name="supabaseAnonKey" placeholder="eyJ..." value="${esc(cfg.supabaseAnonKey || '')}">
          <div class="actions"><button class="btn primary" type="submit">Save & reload</button></div></form>
        ${live ? `<p class="small">Signed in as <b>${esc(user?.email || '')}</b> (${esc(user?.role || '')}) <button class="btn sm" id="signout">Sign out</button></p>` : ''}
        ${store.initError ? `<p class="notice bad">${esc(store.initError)}</p>` : ''}
      </div>
      <div class="card"><h2>Fees & rules</h2>
        <form id="fees"><div class="grid c2">
          <div><label>Platform fee %</label><input name="platform_fee_pct" type="number" step="0.5" value="${esc(s('platform_fee_pct', 10))}"></div>
          <div><label>Minimum platform fee $</label><input name="platform_fee_min" type="number" step="1" value="${esc(s('platform_fee_min', 25))}"></div>
          <div><label>Card fee passed to customer %</label><input name="card_fee_pct" type="number" step="0.5" value="${esc(s('card_fee_pct', 3))}"></div>
          <div><label>Response goal (minutes)</label><input name="speed_sla_minutes" type="number" value="${esc(s('speed_sla_minutes', 5))}"></div>
          <div><label>Offer expiry (minutes)</label><input name="offer_expiry_minutes" type="number" value="${esc(s('offer_expiry_minutes', 30))}"></div>
          <div><label>Payout rail</label><select name="payout_rail"><option value="ach_manual" ${s('payout_rail') === 'ach_manual' ? 'selected' : ''}>Manual ACH from your bank</option><option value="stripe_connect" ${s('payout_rail') === 'stripe_connect' ? 'selected' : ''}>Stripe Connect (auto-split)</option></select></div>
          <div><label>Admin email (alerts)</label><input name="admin_email" type="email" value="${esc(s('admin_email', ''))}"></div>
          <div><label>HQ public URL</label><input name="hq_url" placeholder="https://hq.yourdomain.com" value="${esc(s('hq_url', ''))}"></div>
        </div>
        <label>County tax rates (JSON)</label><textarea name="county_tax_rates" class="mono">${esc(JSON.stringify(s('county_tax_rates', {})))}</textarea>
        <label class="inline"><input type="checkbox" name="site_live" ${s('site_live') ? 'checked' : ''}> The boat site is published and taking leads</label>
        <div class="actions"><button class="btn primary" type="submit">Save</button></div></form>
      </div>
    </div>
    <div class="grid c2" style="margin-top:12px">
      <div class="card"><h2>Outbox</h2><p class="small muted">Every email and text the platform sent or tried to send.${live ? '' : ' In demo mode nothing actually goes out.'}</p>
        ${notes.length ? `<div class="table-wrap"><table><thead><tr><th>When</th><th>Channel</th><th>To</th><th>Message</th><th>Status</th></tr></thead><tbody>${notes.map((n) => `<tr><td class="small muted">${fmtDate(n.created_at, true)}</td><td>${esc(n.channel)}</td><td class="small">${esc(n.to_addr)}</td><td class="small">${esc(n.subject || '')}${n.subject ? '<br>' : ''}<span class="muted">${esc(String(n.body).slice(0, 120))}</span></td><td>${badge(n.status)}${n.error ? `<div class="small muted">${esc(n.error)}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Nothing sent yet.</p>'}</div>
      <div class="card"><h2>${live ? 'Data' : 'Demo data'}</h2>
        ${live ? '<p class="small muted">Backups and exports: Supabase dashboard → Database → Backups. Edge functions and secrets: see <code>supabase/functions/README.md</code>.</p>' : `<p class="small muted">Seeded Tampa Bay data lives in this browser only. Reset to start clean, export to keep a copy.</p>
        <div class="actions"><button class="btn" id="export">Export JSON</button><label class="btn" for="import" style="cursor:pointer">Import JSON</label><input id="import" type="file" accept="application/json" style="display:none"><button class="btn danger" id="reset">Reset demo data</button></div>`}
        <h3 style="margin-top:14px">Legal templates</h3><p class="small">Tech agreement and customer terms are in <code>hq/legal/</code>. Have an attorney read them once, then version them (the agreement version is stored on each tech).</p>
        <h3 style="margin-top:14px">About</h3><p class="small muted">Grid HQ ${esc(cfg.version || '')} · mode ${esc(db?.mode || '')} · docs in <code>grid/docs/</code></p></div>
    </div>`;

  root.querySelector('#cfg').addEventListener('submit', (e) => { e.preventDefault(); const v = formValues(e.target); saveConfig({ mode: v.mode, supabaseUrl: v.supabaseUrl.trim(), supabaseAnonKey: v.supabaseAnonKey.trim() }); toast('Saved. Reloading…'); setTimeout(() => location.reload(), 400); });
  root.querySelector('#fees').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = formValues(e.target);
    try {
      let rates; try { rates = JSON.parse(v.county_tax_rates); } catch (_) { return toast('County tax rates must be valid JSON', 'bad'); }
      for (const [k, val] of Object.entries({ platform_fee_pct: v.platform_fee_pct, platform_fee_min: v.platform_fee_min, card_fee_pct: v.card_fee_pct, speed_sla_minutes: v.speed_sla_minutes, offer_expiry_minutes: v.offer_expiry_minutes, payout_rail: v.payout_rail, admin_email: v.admin_email, hq_url: v.hq_url, county_tax_rates: rates, site_live: v.site_live })) await db.upsertSetting(k, val);
      toast('Settings saved');
    } catch (err) { toast(err.message, 'bad'); }
  });
  root.querySelector('#signout')?.addEventListener('click', async () => { await db.auth.signOut(); location.hash = '#/'; location.reload(); });
  root.querySelector('#export')?.addEventListener('click', () => download(`grid-demo-${new Date().toISOString().slice(0, 10)}.json`, db.exportJson(), 'application/json'));
  root.querySelector('#import')?.addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; try { db.importJson(await f.text()); toast('Imported'); } catch (err) { toast(err.message, 'bad'); } });
  root.querySelector('#reset')?.addEventListener('click', () => { if (confirm('Reset all demo data to the seed? This cannot be undone.')) { db.reset(); toast('Demo data reset'); } });
}
