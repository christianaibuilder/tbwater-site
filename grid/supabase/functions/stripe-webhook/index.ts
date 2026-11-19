// stripe-webhook: marks invoices paid, records real processing fees, creates payouts.
// Deploy with --no-verify-jwt (Stripe does not send a Supabase JWT). Signature is verified here.
import { adminClient, json, logEvent, platformFee, sendEmail, stripe } from "../_shared/common.ts";

async function verifySignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = parts["t"], v1 = parts["v1"];
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

interface Session {
  id: string; payment_status: string; amount_total: number; payment_intent: string | null;
  metadata?: Record<string, string>; customer_details?: { email?: string };
}

async function markPaid(admin: ReturnType<typeof adminClient>, session: Session) {
  const invoiceId = session.metadata?.invoice_id;
  const method = session.metadata?.method === "card" ? "card" : "ach";
  if (!invoiceId) return;
  const { data: inv } = await admin.from("invoices").select("*").eq("id", invoiceId).single();
  if (!inv || inv.status === "paid") return;

  // Pull the actual Stripe fee from the balance transaction.
  let processingFee = 0, transferId: string | null = null;
  if (session.payment_intent) {
    try {
      const pi = await stripe<{ latest_charge?: { balance_transaction?: { fee?: number }; transfer?: string } }>(
        `/payment_intents/${session.payment_intent}`, { "expand[]": "latest_charge.balance_transaction" }, "GET",
      );
      processingFee = (pi.latest_charge?.balance_transaction?.fee ?? 0) / 100;
      transferId = pi.latest_charge?.transfer ?? null;
    } catch (_) { /* fee can lag for ACH; webhook on async success will update */ }
  }

  const total = Number(inv.total);
  const paidAmount = session.amount_total / 100;
  const cardFeeCharged = Math.max(0, Math.round((paidAmount - total) * 100) / 100);
  const fee = inv.platform_fee_amount ?? platformFee(total, Number(inv.platform_fee_pct), Number(inv.platform_fee_min));
  const techShare = Math.round((total - fee) * 100) / 100;

  await admin.from("invoices").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    paid_amount: paidAmount,
    payment_method: method,
    stripe_payment_intent: session.payment_intent,
    processing_fee_amount: processingFee,
    card_fee_charged: cardFeeCharged,
    platform_fee_amount: fee,
    tech_share_amount: techShare,
  }).eq("id", invoiceId);

  const { data: tech } = await admin.from("techs").select("*").eq("id", inv.tech_id).single();
  const connect = Boolean(transferId);
  await admin.from("payouts").insert({
    invoice_id: invoiceId,
    tech_id: inv.tech_id,
    amount: techShare,
    method: connect ? "stripe_connect" : (tech?.payout_method ?? "ach_manual"),
    status: connect ? "paid" : "owed",
    paid_at: connect ? new Date().toISOString() : null,
    reference: transferId,
  });
  await admin.from("techs").update({
    jobs_completed: (tech?.jobs_completed ?? 0) + 1,
    gmv_total: Number(tech?.gmv_total ?? 0) + total,
  }).eq("id", inv.tech_id);
  await admin.from("leads").update({ status: "paid" }).eq("id", inv.lead_id);
  await logEvent(admin, inv.lead_id, "paid", "customer", {
    invoice_id: invoiceId, total, paid_amount: paidAmount, method, processing_fee: processingFee, platform_fee: fee,
  });

  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  if (adminEmail) {
    await sendEmail(admin, adminEmail, `Paid: $${paidAmount.toFixed(2)} (${method})`,
      `Invoice ${invoiceId} paid. Platform fee $${fee.toFixed(2)}, processing $${processingFee.toFixed(2)}, tech owed $${techShare.toFixed(2)} (${connect ? "sent via Connect" : "pay manually"}).`,
      { type: "invoice", id: invoiceId });
  }
}

Deno.serve(async (req) => {
  const admin = adminClient();
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (!secret || !(await verifySignature(payload, sig, secret))) return json({ error: "bad signature" }, 400);

  const event = JSON.parse(payload) as { type: string; data: { object: Session } };
  const session = event.data.object;
  try {
    switch (event.type) {
      case "checkout.session.completed":
        if (session.payment_status === "paid") await markPaid(admin, session);
        else if (session.metadata?.invoice_id) {
          await admin.from("invoices").update({ status: "processing", stripe_payment_intent: session.payment_intent })
            .eq("id", session.metadata.invoice_id).in("status", ["sent", "approved"]);
          await logEvent(admin, session.metadata.lead_id, "payment_processing", "customer", { method: session.metadata.method });
        }
        break;
      case "checkout.session.async_payment_succeeded":
        await markPaid(admin, session);
        break;
      case "checkout.session.async_payment_failed":
        if (session.metadata?.invoice_id) {
          await admin.from("invoices").update({ status: "sent" }).eq("id", session.metadata.invoice_id).eq("status", "processing");
          await logEvent(admin, session.metadata.lead_id, "payment_failed", "system", { method: session.metadata.method });
        }
        break;
      default:
        break;
    }
    return json({ received: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
