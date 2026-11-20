// Lead and application forms → Supabase (anon insert under RLS). No framework.
(function () {
  const C = window.SITE_CONFIG || {};
  const configured = Boolean(C.supabaseUrl && C.supabaseAnonKey);
  const params = new URLSearchParams(location.search);
  const utm = (params.get('utm_source') || params.get('src') || document.referrer || '').toLowerCase();
  const source = /google|gclid/.test(utm) || params.has('gclid') ? 'google_ads' : /facebook|fb|instagram/.test(utm) ? 'facebook' : /nextdoor/.test(utm) ? 'nextdoor' : params.get('src') ? params.get('src') : 'site';
  const headers = { apikey: C.supabaseAnonKey, Authorization: `Bearer ${C.supabaseAnonKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };

  function msg(form, text, kind) { const el = form.querySelector('.form-msg'); if (el) { el.textContent = text; el.className = `form-msg ${kind || ''}`; } }
  // Where "/" is for this build: a custom domain, a GitHub Pages subpath, or page-relative (previews).
  function siteBase() {
    if (!C.relative) return C.base || '/';
    const css = document.querySelector('link[rel=stylesheet][href*="site.css"]');
    return (css ? css.getAttribute('href') : './assets/site.css').replace(/assets\/site\.css$/, '');
  }
  const thanksUrl = siteBase() + (C.relative ? 'thanks/index.html' : 'thanks/');
  function values(form) {
    const o = {};
    for (const el of form.querySelectorAll('[name]')) {
      if (el.type === 'checkbox') { if (el.name === 'specialties' || el.name === 'brands') { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
      else if (el.type === 'file') continue;
      else if (el.type === 'number') o[el.name] = el.value === '' ? null : Number(el.value);
      else o[el.name] = el.value.trim();
    }
    return o;
  }
  function countyFor(zip, fallback) { return (C.zipCounty && C.zipCounty[zip]) || (/^337/.test(zip) ? 'Pinellas' : /^33[56]/.test(zip) ? 'Hillsborough' : /^346/.test(zip) ? 'Pasco' : fallback || null); }
  function markInvalid(form) { form.querySelectorAll('input,select,textarea').forEach((el) => el.classList.add('touched')); const bad = form.querySelector(':invalid'); if (bad) bad.focus(); return !bad; }

  async function uploadPhotos(files) {
    const paths = [];
    const folder = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    for (const f of Array.from(files).slice(0, 3)) {
      if (f.size > 8 * 1024 * 1024) continue;
      const name = f.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
      const p = `${folder}/${name}`;
      const r = await fetch(`${C.supabaseUrl}/storage/v1/object/lead-photos/${p}`, { method: 'POST', headers: { apikey: C.supabaseAnonKey, Authorization: `Bearer ${C.supabaseAnonKey}`, 'Content-Type': f.type || 'application/octet-stream', 'x-upsert': 'false' }, body: f });
      if (r.ok) paths.push(p);
    }
    return paths;
  }

  async function submitLead(form) {
    if (form.querySelector('.hp')?.value) return; // bot
    if (!markInvalid(form)) return msg(form, 'Please fill in the highlighted fields.', 'bad');
    const v = values(form);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; msg(form, 'Sending…');
    const lead = {
      category_id: C.categoryId || 'marine', source, status: 'new',
      customer_name: v.customer_name, phone: v.phone, email: v.email || null, address: v.address || null, zip: v.zip, county: v.county || countyFor(v.zip),
      city: null,
      equipment: { make: v.make || form.dataset.make || null, model: v.model || null, year: v.year ?? null, hours: v.hours ?? null },
      service_slug: v.service_slug || form.dataset.service || null, description: v.description, urgency: v.urgency || 'this_week', sms_consent: Boolean(v.sms_consent), photos: [],
    };
    try {
      if (!configured) throw new Error('not-configured');
      const files = form.querySelector('input[type=file]')?.files;
      if (files && files.length) { try { lead.photos = await uploadPhotos(files); } catch (_) { /* photos are optional */ } }
      const r = await fetch(`${C.supabaseUrl}/rest/v1/leads`, { method: 'POST', headers, body: JSON.stringify(lead) });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
      try { window.dataLayer && window.dataLayer.push({ event: 'lead_submitted', source }); } catch (_) { /* no analytics */ }
      location.href = thanksUrl;
    } catch (e) {
      btn.disabled = false;
      const body = encodeURIComponent(`Name: ${lead.customer_name}\nPhone: ${lead.phone}\nZip: ${lead.zip}\nService: ${lead.service_slug}\nBoat: ${[lead.equipment.year, lead.equipment.make, lead.equipment.model].filter(Boolean).join(' ')}\n\n${lead.description}`);
      msg(form, e.message === 'not-configured'
        ? `The form isn't connected yet. Call ${C.phone} or email us.`
        : `Something went wrong sending that. Please call ${C.phone} and we'll take it by phone.`, 'bad');
      const el = form.querySelector('.form-msg');
      if (el) el.insertAdjacentHTML('beforeend', ` <a href="mailto:${C.email}?subject=Boat%20repair%20request&body=${body}">Email it instead</a>`);
      if (e.message !== 'not-configured') console.error(e);
    }
  }

  async function submitApplication(form) {
    if (form.querySelector('.hp')?.value) return;
    if (!markInvalid(form)) return msg(form, 'Please fill in the highlighted fields and accept the agreement.', 'bad');
    const v = values(form);
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; msg(form, 'Sending…');
    const row = { category_id: C.categoryId || 'marine', status: 'new', business_name: v.business_name, contact_name: v.contact_name, phone: v.phone, email: v.email, home_zip: v.home_zip, service_area_text: v.service_area_text || null, specialties: v.specialties || [], brands: v.brands || [], years_experience: v.years_experience ?? null, has_insurance: Boolean(v.has_insurance), insurance_carrier: v.insurance_carrier || null, notes: v.notes || null, agreement_accepted: Boolean(v.agreement_accepted) };
    try {
      if (!configured) throw new Error('not-configured');
      const r = await fetch(`${C.supabaseUrl}/rest/v1/tech_applications`, { method: 'POST', headers, body: JSON.stringify(row) });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
      form.reset();
      msg(form, "Got it. We'll call you within a day to talk through how it works.", 'ok');
    } catch (e) {
      btn.disabled = false;
      msg(form, e.message === 'not-configured' ? `Applications aren't connected yet. Call or text ${C.phone}.` : `Something went wrong. Call or text ${C.phone} and we'll take your details.`, 'bad');
    }
  }

  document.querySelectorAll('[data-lead-form]').forEach((f) => {
    if (f.dataset.service) { const s = f.querySelector('select[name=service_slug]'); if (s) s.value = f.dataset.service; }
    if (f.dataset.make) { const m = f.querySelector('select[name=make]'); if (m) m.value = f.dataset.make; }
    const zip = f.querySelector('input[name=zip]'), county = f.querySelector('select[name=county]');
    if (zip && county) zip.addEventListener('input', () => { if (zip.value.length === 5) { const c = countyFor(zip.value); if (c && [...county.options].some((o) => o.value === c)) county.value = c; } });
    f.addEventListener('submit', (e) => { e.preventDefault(); submitLead(f); });
  });
  document.querySelectorAll('[data-apply-form]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); submitApplication(f); }));
  document.querySelectorAll('a[href^="tel:"]').forEach((a) => a.addEventListener('click', () => { try { window.dataLayer && window.dataLayer.push({ event: 'call_click', source }); } catch (_) { /* no analytics */ } }));
})();
