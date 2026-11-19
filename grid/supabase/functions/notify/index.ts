// notify: send templated email/SMS for platform events. Admin for all types; techs may trigger
// nothing here (their actions are notified by HQ).
import { adminClient, corsHeaders, getCaller, json, sendEmail, sendSms } from "../_shared/common.ts";

type Kind = "new_lead" | "offer" | "quote" | "invoice" | "payout" | "custom";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  try {
    const raw = await req.json() as Record<string, unknown>;
    // Accept Supabase Database Webhook payloads (INSERT on leads / tech_applications) as well as HQ calls.
    let body = raw as { kind: Kind; lead_id?: string; tech_id?: string; quote_id?: string; invoice_id?: string; payout_id?: string; to?: string; subject?: string; text?: string; sms?: boolean };
    if (raw.type === "INSERT" && raw.table === "leads") body = { kind: "new_lead", lead_id: (raw.record as { id: string }).id };
    if (raw.type === "INSERT" && raw.table === "tech_applications") {
      const r = raw.record as { business_name: string; contact_name: string; phone: string; email: string };
      body = { kind: "custom", to: Deno.env.get("ADMIN_EMAIL") ?? "", subject: `New tech application: ${r.business_name}`, text: `${r.contact_name} · ${r.phone} · ${r.email}\nReview in HQ → Techs → Applications.` };
    }
    const caller = await getCaller(req, admin);
    if (!caller || caller.role !== "admin") return json({ error: "admin only" }, 403);
    const hq = Deno.env.get("HQ_URL") ?? "";
    const results: Record<string, boolean> = {};

    const lead = body.lead_id ? (await admin.from("leads").select("*").eq("id", body.lead_id).single()).data : null;
    const cat = lead ? (await admin.from("categories").select("*").eq("id", lead.category_id).single()).data : null;
    const tech = body.tech_id ? (await admin.from("techs").select("*").eq("id", body.tech_id).single()).data : null;
    const brand = cat?.brand_name ?? "Grid";

    switch (body.kind) {
      case "new_lead": {
        const to = Deno.env.get("ADMIN_EMAIL");
        const adminPhone = Deno.env.get("ADMIN_PHONE");
        if (to && lead) {
          results.email = await sendEmail(admin, to, `New lead: ${lead.customer_name} (${lead.city ?? ""})`,
            `${lead.service_slug ?? "job"} — ${lead.description ?? ""}\nPhone ${lead.phone}\n${hq}/#/leads/${lead.id}`, { type: "lead", id: lead.id });
        }
        if (adminPhone && lead) {
          results.sms = await sendSms(admin, adminPhone, `NEW LEAD ${lead.customer_name} ${lead.city ?? ""} · ${lead.service_slug ?? ""} · ${lead.phone} · ${hq}/#/leads/${lead.id}`, { type: "lead", id: lead.id });
        }
        break;
      }
      case "offer": {
        if (tech && lead) {
          const text = `${brand}: new job near ${lead.zip ?? lead.city ?? "you"} — ${lead.service_slug ?? "repair"}. ` +
            `${(lead.equipment?.make ?? "")} ${(lead.equipment?.model ?? "")}. Accept in your portal: ${hq}/#/portal`;
          if (tech.email) results.email = await sendEmail(admin, tech.email, `New job offer near ${lead.zip ?? lead.city}`, text, { type: "lead", id: lead.id });
          if (tech.phone && body.sms !== false) results.sms = await sendSms(admin, tech.phone, text, { type: "lead", id: lead.id });
        }
        break;
      }
      case "quote": {
        const q = body.quote_id ? (await admin.from("quotes").select("*").eq("id", body.quote_id).single()).data : null;
        if (q && lead) {
          const url = `${hq}/public/quote.html?t=${q.public_token}`;
          const text = `Hi ${lead.customer_name}, your quote from ${brand} is ready: $${Number(q.total).toFixed(2)}. Review and accept: ${url}`;
          if (lead.email) results.email = await sendEmail(admin, lead.email, `Your quote: $${Number(q.total).toFixed(2)}`, text, { type: "quote", id: q.id });
          if (lead.sms_consent && lead.phone) results.sms = await sendSms(admin, lead.phone, text, { type: "quote", id: q.id });
          await admin.from("quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", q.id).eq("status", "draft");
        }
        break;
      }
      case "invoice": {
        const inv = body.invoice_id ? (await admin.from("invoices").select("*").eq("id", body.invoice_id).single()).data : null;
        if (inv && lead) {
          const url = `${hq}/public/pay.html?t=${inv.public_token}`;
          const text = `Hi ${lead.customer_name}, your invoice from ${brand} for $${Number(inv.total).toFixed(2)} is ready. Pay by bank (no fee) or card: ${url}`;
          if (lead.email) results.email = await sendEmail(admin, lead.email, `Your invoice: $${Number(inv.total).toFixed(2)}`, text, { type: "invoice", id: inv.id });
          if (lead.sms_consent && lead.phone) results.sms = await sendSms(admin, lead.phone, text, { type: "invoice", id: inv.id });
        }
        break;
      }
      case "payout": {
        const p = body.payout_id ? (await admin.from("payouts").select("*").eq("id", body.payout_id).single()).data : null;
        const t = p ? (await admin.from("techs").select("*").eq("id", p.tech_id).single()).data : null;
        if (p && t?.email) {
          results.email = await sendEmail(admin, t.email, `Payout sent: $${Number(p.amount).toFixed(2)}`,
            `We sent $${Number(p.amount).toFixed(2)} via ${p.method}${p.reference ? ` (ref ${p.reference})` : ""}. Thanks for the work.`, { type: "payout", id: p.id });
        }
        break;
      }
      case "custom": {
        if (body.to && body.text) results.email = await sendEmail(admin, body.to, body.subject ?? brand, body.text);
        break;
      }
    }
    return json({ ok: true, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
