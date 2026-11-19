// Live-mode adapter: Supabase. Same interface as adapter-local.js.
// supabase-js is loaded from a CDN only when live mode is on, so demo mode works offline.

export class SupabaseAdapter {
  constructor({ url, anonKey }) {
    this.mode = 'live';
    this.url = url;
    this.anonKey = anonKey;
    this.listeners = new Set();
    this._user = null;
    this._profile = null;
  }

  async init() {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    this.sb = mod.createClient(this.url, this.anonKey);
    const { data } = await this.sb.auth.getSession();
    await this._setSession(data.session);
    this.sb.auth.onAuthStateChange(async (_evt, session) => { await this._setSession(session); this._emit(); });
  }
  async _setSession(session) {
    this._session = session;
    if (!session) { this._user = null; this._profile = null; return; }
    const { data: profile } = await this.sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    this._profile = profile;
    this._user = { id: session.user.id, email: session.user.email, role: profile?.role || 'tech', tech_id: profile?.tech_id || null };
  }
  _emit() { for (const fn of this.listeners) fn(); }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  _check({ data, error }) { if (error) throw new Error(error.message); return data; }

  async list(table, { filter = {}, order = 'created_at', desc = true, limit } = {}) {
    let q = this.sb.from(table).select('*');
    for (const [k, v] of Object.entries(filter)) q = Array.isArray(v) ? q.in(k, v) : q.eq(k, v);
    if (order) q = q.order(order, { ascending: !desc });
    if (limit) q = q.limit(limit);
    return this._check(await q) || [];
  }
  async get(table, id) {
    const col = table === 'settings' || table === 'achievements' ? 'key' : 'id';
    return this._check(await this.sb.from(table).select('*').eq(col, id).maybeSingle());
  }
  async insert(table, row) { const r = this._check(await this.sb.from(table).insert(row).select('*').single()); this._emit(); return r; }
  async update(table, id, patch) {
    const col = table === 'settings' || table === 'achievements' ? 'key' : 'id';
    const r = this._check(await this.sb.from(table).update(patch).eq(col, id).select('*').single()); this._emit(); return r;
  }
  async upsertSetting(key, value) { this._check(await this.sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })); this._emit(); }
  async remove(table, id) { this._check(await this.sb.from(table).delete().eq('id', id)); this._emit(); }

  async uploadFile(bucket, path, file) {
    this._check(await this.sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined }));
    return path;
  }
  async fileUrl(bucket, path) {
    const { data, error } = await this.sb.storage.from(bucket).createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  }

  get auth() {
    const self = this;
    return {
      user: () => self._user,
      async signIn(email) {
        const { error } = await self.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) throw new Error(error.message);
        return { ok: true };
      },
      async signOut() { await self.sb.auth.signOut(); self._user = null; self._emit(); },
      actAs() { /* no-op in live mode: role comes from profiles */ },
    };
  }

  async rpc(name, args = {}) { return this._check(await this.sb.rpc(name, args)); }

  async call(fn, payload = {}) {
    const { data, error } = await this.sb.functions.invoke(fn, { body: payload });
    if (error) throw new Error(error.message || String(error));
    if (data?.error) throw new Error(data.error);
    return data;
  }

  reset() { throw new Error('Reset is only available in demo mode'); }
  exportJson() { throw new Error('Export from the Supabase dashboard in live mode'); }
}
