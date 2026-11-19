// create-payment-link: approve an invoice and create two Stripe Payment Links (bank default, card
// with disclosed fee), then email the customer the pay page. Admin only.
import {
  adminClient, corsHeaders, getCaller, getSetting, json, logEvent, platformFee, sendEmail, sendSms,
  stripe, toCents,
} from "../_shared/common.ts";

interface Price { id: string }
interface PaymentLink { id: string; url: string }

async function makeLink(opts: {
  name: string; amountCents: number; methods: string[]; metadata: Record<string, string>;
  feeLine?: { name: string; amountCents: number }; destination?: string; appFeeCents?: number;
  returnUrl: string;
}): Promise<PaymentLink> {
  const price = await stripe<Price>("/prices", {
    currency: "usd", unit_amount: opts.amountCents, product_data: { name: opts.name },
  });
  const lineItems: Array<Record<string, unknown>> = [{ price: price.id, quantity: 1 }];
  if (opts.feeLine) {
    const feePrice = await stripe<Price>("/prices", {
      currency: "usd", unit_amount: opts.feeLine.amountCents, product_data: { name: opts.feeLine.name },
    });
    lineItems.push({ price: feePrice.id, quantity: 1 });
  }
  const params: Record<string, unknown> = {
    line_items: lineItems,
    payment_method_types: opts.methods,
    metadata: opts.metadata,
    payment_intent_data: { metadata: opts.metadata },
    after_completion: { type: "redirect", redirect: { url: opts.returnUrl } },
    restrictions: { completed_sessions: { limit: 1 } },
  };
  if (opts.destination && opts.appFeeCents !== undefined) {
    params.transfer_data = { destination: opts.destination };
    params.application_fee_amount = opts.appFeeCents;
  }
  return await stripe<PaymentLink>("/payment_links", params);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  try {
    const { invoice_id, notify = true } = await req.json();
    const caller = await getCaller(req, admin);
    if (!caller || caller.role !== "admin") return json({ error: "admin only" }, 403);

    const { data: inv } = await admin.from("invoices").select("*").eq("id", invoice_id).single();
    if (!inv) return json({ error: "invoice not found" }, 404);
    if (!["review", "approved", "sent"].includes(inv.status)) return json({ error: `invoice is ${inv.status}` }, 400);
    if (!(Number(inv.total) > 0)) return json({ error: "invoice total must be > 0" }, 400);

    const { data: lead } = await admin.from("leads").select("*").eq("id", inv.lead_id).single();
    const { data: tech } = await admin.from("techs").select("*").eq("id", inv.tech_id).single();
    const { data: cat } = await admin.from("categories").select("*").eq("id", lead.category_id).single();

    const feePct = Number(await getSetting(admin, "platform_fee_pct", 10));
    const feeMin = Number(await getSetting(admin, "platform_fee_min", 25));
    const cardPct = Number(await getSetting(admin, "card_fee_pct", 3));
    const rail = await getSetting<string>(admin, "payout_rail", "ach_manual");
    const hqUrl = Deno.env.get("HQ_URL") ?? "";

    const total = Number(inv.total);
    const fee = platformFee(total, feePct, feeMin);
    const cardFee = Math.round(total * (cardPct / 100) * 100) / 100;
    const useConnect = rail === "stripe_connect" && tech?.stripe_account_id;

    const name = `${cat?.brand_name ?? "Service"} invoice — ${lead.customer_name}`;
    const metadata = { invoice_id: inv.id, lead_id: inv.lead_id, tech_id: inv.tech_id };
    const returnUrl = `${hqUrl}/public/pay.html?t=${inv.public_token}&done=1`;

    const achLink = await makeLink({
      name, amountCents: toCents(total), methods: ["us_bank_account"],
      metadata: { ...metadata, method: "ach" }, returnUrl,
      destination: useConnect ? tech.stripe_account_id : undefined,
      appFeeCents: useConnect ? toCents(fee) : undefined,
    });
    const cardLink = await makeLink({
      name, amountCents: toCents(total), methods: ["card"],
      metadata: { ...metadata, method: "card" }, returnUrl,
      feeLine: { name: `Card processing fee (${cardPct}%)`, amountCents: toCents(cardFee) },
      destination: useConnect ? tech.stripe_account_id : undefined,
      appFeeCents: useConnect ? toCents(fee + cardFee) : undefined,
    });

    const { data: updated, error } = await admin.from("invoices").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      payment_link_url: achLink.url,
      payment_link_card_url: cardLink.url,
      stripe_session_id: achLink.id,
      platform_fee_pct: feePct,
      platform_fee_min: feeMin,
      platform_fee_amount: fee,
      card_fee_pct: cardPct,
      tech_share_amount: Math.round((total - fee) * 100) / 100,
    }).eq("id", inv.id).select("*").single();
    if (error) return json({ error: error.message }, 500);

    await admin.from("leads").update({ status: "completed" }).eq("id", inv.lead_id).in("status", ["assigned", "quoted", "scheduled", "in_progress"]);
    await logEvent(admin, inv.lead_id, "invoice_sent", "admin", { invoice_id: inv.id, total, fee });

    if (notify) {
      const payUrl = `${hqUrl}/public/pay.html?t=${inv.public_token}`;
      const body = `Hi ${lead.customer_name},\n\nYour invoice from ${tech?.business_name ?? "your technician"} for $${total.toFixed(2)} is ready.\n` +
        `Pay by bank (no fee) or card here: ${payUrl}\n\nQuestions? Call ${cat?.phone ?? ""}.\n— ${cat?.brand_name ?? "Grid"}`;
      if (lead.email) await sendEmail(admin, lead.email, `Your invoice: $${total.toFixed(2)}`, body, { type: "invoice", id: inv.id });
      if (lead.sms_consent && lead.phone) await sendSms(admin, lead.phone, `${cat?.brand_name ?? "Grid"}: your $${total.toFixed(2)} invoice is ready. Pay here: ${payUrl}`, { type: "invoice", id: inv.id });
    }
    return json({ ok: true, invoice: updated });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
