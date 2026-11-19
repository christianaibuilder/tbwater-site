// Shared helpers for Grid edge functions (Deno / Supabase Edge Runtime).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function env(name: string, required = true): string {
  const v = Deno.env.get(name) ?? "";
  if (required && !v) throw new Error(`Missing env ${name}`);
  return v;
}

export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export interface Caller {
  userId: string;
  role: "admin" | "tech";
  techId: string | null;
}

// Resolve the signed-in caller from the request's Authorization header.
export async function getCaller(req: Request, admin: SupabaseClient): Promise<Caller | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return null;
  // Database webhooks and cron call with the service-role key: treat as admin.
  if (jwt === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return { userId: "service", role: "admin", techId: null };
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("role, tech_id")
    .eq("id", data.user.id)
    .single();
  if (!profile) return null;
  return { userId: data.user.id, role: profile.role, techId: profile.tech_id };
}

export async function getSetting<T>(admin: SupabaseClient, key: string, fallback: T): Promise<T> {
  const { data } = await admin.from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

export async function logEvent(
  admin: SupabaseClient,
  leadId: string,
  type: string,
  actor: string,
  payload: Record<string, unknown> = {},
) {
  await admin.from("lead_events").insert({ lead_id: leadId, type, actor, payload });
}

// Platform fee = max(pct, min). Returns dollars rounded to cents.
export function platformFee(total: number, pct: number, min: number): number {
  return Math.round(Math.max(total * (pct / 100), min) * 100) / 100;
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// Encode nested objects to application/x-www-form-urlencoded the way Stripe expects.
export function formEncode(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  const walk = (val: unknown, key: string) => {
    if (val === undefined || val === null) return;
    if (Array.isArray(val)) {
      val.forEach((v, i) => walk(v, `${key}[${i}]`));
    } else if (typeof val === "object") {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        walk(v, key ? `${key}[${k}]` : k);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  };
  walk(obj, prefix);
  return parts.join("&");
}

export async function stripe<T = Record<string, unknown>>(
  path: string,
  params: Record<string, unknown> = {},
  method: "POST" | "GET" = "POST",
): Promise<T> {
  const key = env("STRIPE_SECRET_KEY");
  const url = `https://api.stripe.com/v1${path}` + (method === "GET" && Object.keys(params).length ? `?${formEncode(params)}` : "");
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2025-08-27.basil",
    },
    body: method === "POST" ? formEncode(params) : undefined,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${body?.error?.message ?? res.status}`);
  return body as T;
}

// --- notifications -------------------------------------------------------------------------
export async function sendEmail(
  admin: SupabaseClient,
  to: string,
  subject: string,
  text: string,
  ref?: { type: string; id: string },
) {
  const key = env("RESEND_API_KEY", false);
  const from = env("FROM_EMAIL", false) || "Grid <noreply@example.com>";
  let status = "sent", error: string | null = null;
  if (!key) {
    status = "failed"; error = "RESEND_API_KEY not set";
  } else {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) { status = "failed"; error = `Resend ${res.status}: ${await res.text()}`; }
  }
  await admin.from("notifications").insert({
    channel: "email", to_addr: to, subject, body: text, status, error,
    ref_type: ref?.type ?? null, ref_id: ref?.id ?? null,
  });
  return status === "sent";
}

export async function sendSms(
  admin: SupabaseClient,
  to: string,
  text: string,
  ref?: { type: string; id: string },
) {
  const sid = env("TWILIO_ACCOUNT_SID", false);
  const tok = env("TWILIO_AUTH_TOKEN", false);
  const from = env("TWILIO_FROM", false);
  let status = "sent", error: string | null = null;
  if (!sid || !tok || !from) {
    status = "failed"; error = "Twilio not configured";
  } else {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${sid}:${tok}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode({ To: to, From: from, Body: text }),
    });
    if (!res.ok) { status = "failed"; error = `Twilio ${res.status}: ${await res.text()}`; }
  }
  await admin.from("notifications").insert({
    channel: "sms", to_addr: to, body: text, status, error,
    ref_type: ref?.type ?? null, ref_id: ref?.id ?? null,
  });
  return status === "sent";
}
