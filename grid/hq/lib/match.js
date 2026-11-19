// Dispatch matching: rank approved techs for a lead. Small data, simple rules, explainable scores.

export function rankTechs(lead, techs, { limit = 3, openOffers = [] } = {}) {
  const make = String(lead.equipment?.make || '').toLowerCase();
  const scored = [];
  for (const t of techs) {
    if (t.status !== 'approved') continue;
    if (!(t.category_ids || []).includes(lead.category_id)) continue;
    const reasons = [];
    let score = 0;
    if (lead.zip && (t.service_zips || []).includes(lead.zip)) { score += 5; reasons.push('serves zip'); }
    else if (lead.lat && lead.lng && t.lat && t.lng && t.service_radius_miles) {
      const d = miles(lead.lat, lead.lng, t.lat, t.lng);
      if (d <= t.service_radius_miles) { score += 3; reasons.push(`${Math.round(d)} mi away`); } else continue;
    } else if (lead.county && (t.service_zips || []).length === 0) { score += 1; reasons.push('no zip list'); }
    else continue;
    if (lead.service_slug && (t.specialties || []).includes(lead.service_slug)) { score += 3; reasons.push('specialty match'); }
    if (make && (t.brands || []).includes(make)) { score += 2; reasons.push(`works on ${make}`); }
    score += Number(t.rating || 0);
    const busy = openOffers.filter((o) => o.tech_id === t.id && o.status === 'offered').length;
    if (busy) { score -= busy; reasons.push(`${busy} open offer${busy > 1 ? 's' : ''}`); }
    if (t.insurance_expires && new Date(t.insurance_expires) < new Date()) { score -= 10; reasons.push('insurance expired'); }
    scored.push({ tech: t, score: Math.round(score * 10) / 10, reasons });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function miles(lat1, lon1, lat2, lon2) {
  const R = 3958.8, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
