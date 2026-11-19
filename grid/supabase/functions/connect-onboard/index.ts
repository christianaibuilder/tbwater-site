// connect-onboard (optional): create a Stripe Connect Express account for a tech and return the
// hosted onboarding link. Only needed when settings.payout_rail = "stripe_connect". Admin only.
import { adminClient, corsHeaders, getCaller, json, stripe } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  try {
    const { tech_id } = await req.json();
    const caller = await getCaller(req, admin);
    if (!caller || caller.role !== "admin") return json({ error: "admin only" }, 403);
    const { data: tech } = await admin.from("techs").select("*").eq("id", tech_id).single();
    if (!tech) return json({ error: "tech not found" }, 404);
    const hq = Deno.env.get("HQ_URL") ?? "";

    let accountId = tech.stripe_account_id as string | null;
    if (!accountId) {
      const acct = await stripe<{ id: string }>("/accounts", {
        type: "express", country: "US", email: tech.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        business_type: "individual",
        business_profile: { name: tech.business_name, product_description: "Mobile repair services" },
        metadata: { tech_id },
      });
      accountId = acct.id;
      await admin.from("techs").update({ stripe_account_id: accountId, payout_method: "stripe_connect" }).eq("id", tech_id);
    }
    const link = await stripe<{ url: string }>("/account_links", {
      account: accountId, type: "account_onboarding",
      refresh_url: `${hq}/#/techs/${tech_id}`, return_url: `${hq}/#/techs/${tech_id}?connected=1`,
    });
    return json({ ok: true, url: link.url, account_id: accountId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
