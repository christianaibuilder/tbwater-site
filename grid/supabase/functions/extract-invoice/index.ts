// extract-invoice: read an uploaded invoice (photo or PDF) with Claude and write the line items
// back to the invoice row. Caller must be admin or the tech who owns the invoice.
import Anthropic from "npm:@anthropic-ai/sdk";
import { adminClient, corsHeaders, getCaller, json, logEvent } from "../_shared/common.ts";

const SYSTEM = `You read repair invoices from independent technicians (marine, golf cart, RV, auto).
Return ONLY a JSON object, no prose, no code fences, with this exact shape:
{
  "vendor_name": string|null,
  "invoice_number": string|null,
  "invoice_date": "YYYY-MM-DD"|null,
  "customer_name": string|null,
  "line_items": [
    {"description": string, "qty": number, "unit_price": number, "kind": "labor"|"parts"|"fee"|"other", "taxable": boolean}
  ],
  "subtotal": number|null,
  "tax": number|null,
  "total": number|null,
  "notes": string|null,
  "confidence": number
}
Rules: amounts in US dollars as plain numbers. If a line shows only a total, use qty 1 and unit_price = total.
Mark parts as taxable; mark labor taxable only if the invoice itself taxed it. If the document is not an
invoice, return line_items [] and explain in notes. confidence is 0 to 1 for how sure you are of the total.`;

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function parseJsonLoose(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function guessMediaType(path: string, fallback: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", gif: "image/gif", heic: "image/heic",
  };
  return map[ext] ?? fallback ?? "image/jpeg";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = adminClient();
  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) return json({ error: "invoice_id required" }, 400);

    const caller = await getCaller(req, admin);
    if (!caller) return json({ error: "unauthorized" }, 401);

    const { data: inv, error } = await admin.from("invoices").select("*").eq("id", invoice_id).single();
    if (error || !inv) return json({ error: "invoice not found" }, 404);
    if (caller.role !== "admin" && caller.techId !== inv.tech_id) return json({ error: "forbidden" }, 403);
    if (!inv.file_path) return json({ error: "invoice has no file" }, 400);

    const { data: blob, error: dlErr } = await admin.storage.from("invoices").download(inv.file_path);
    if (dlErr || !blob) return json({ error: `download failed: ${dlErr?.message}` }, 500);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mediaType = guessMediaType(inv.file_path, blob.type);
    const data = bytesToBase64(bytes);

    const fileBlock = mediaType === "application/pdf"
      ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } }
      : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data } };

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{
        role: "user",
        content: [fileBlock, { type: "text", text: "Extract this invoice as JSON." }],
      }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "model declined to read this document", details: response.stop_details }, 422);
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const parsed = parseJsonLoose(text);

    const items = Array.isArray(parsed.line_items) ? parsed.line_items as Array<Record<string, unknown>> : [];
    const lineItems = items.map((li) => ({
      description: String(li.description ?? "").slice(0, 200),
      qty: Number(li.qty ?? 1) || 1,
      unit_price: Math.round(Number(li.unit_price ?? 0) * 100) / 100,
      kind: ["labor", "parts", "fee", "other"].includes(String(li.kind)) ? String(li.kind) : "other",
      taxable: Boolean(li.taxable),
    }));
    const computedSubtotal = Math.round(lineItems.reduce((s, li) => s + li.qty * li.unit_price, 0) * 100) / 100;
    const subtotal = Number(parsed.subtotal ?? computedSubtotal) || computedSubtotal;
    const tax = Number(parsed.tax ?? 0) || 0;
    const total = Number(parsed.total ?? subtotal + tax) || subtotal + tax;

    const { data: updated, error: upErr } = await admin.from("invoices").update({
      extracted: parsed,
      line_items: lineItems,
      subtotal,
      tax,
      total,
      status: "review",
    }).eq("id", invoice_id).select("*").single();
    if (upErr) return json({ error: upErr.message }, 500);

    await logEvent(admin, inv.lead_id, "invoice_extracted", "system", {
      invoice_id, total, confidence: parsed.confidence ?? null,
      model: response.model, usage: response.usage,
    });
    return json({ ok: true, invoice: updated });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
