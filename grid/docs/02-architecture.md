# 02 — Architecture: broad back end, narrow front ends

```
 customer                      tech                          you
    │                            │                             │
 boat site (static)        tech portal (HQ, role=tech)    HQ (role=admin)
 post-a-job form                 │                             │
    │                            │                             │
    └──────────────┬─────────────┴──────────────┬──────────────┘
                   ▼                            ▼
             Supabase (free)              edge functions
             Postgres + RLS               extract-invoice  → Claude API
             Auth (magic link)            create-payment-link → Stripe
             Storage (private)            stripe-webhook   ← Stripe
                                          notify           → Resend / Twilio
```

## Hosting

- **HQ** is a static single-page app: `hq/index.html`, `hq/app.js`, `hq/styles.css`, and a data
  adapter. No bundler, no framework, no build step. Deploys to GitHub Pages (or any static host)
  on its own domain, e.g. `hq.yourbrand.com`.
- **Vertical sites** are generated static HTML (`sites/boat/build.mjs` → `sites/boat/dist/`). Each
  deploys to its own domain. Forms post straight to Supabase with the public anon key under a
  row-level-security policy that allows insert only.
- **Supabase** is one project for all verticals. The `category_id` column on every record is what
  keeps them apart.

## Data layer

`hq/data/adapter-local.js` and `hq/data/adapter-supabase.js` expose the same interface:

```
list(table, {filter, order, limit})   get(table, id)
insert(table, row)                    update(table, id, patch)
remove(table, id)                     uploadFile(bucket, path, file)
fileUrl(bucket, path)                 call(fnName, payload)      // edge functions
auth: { user(), signIn(email), signOut(), onChange(cb) }
```

Demo mode (local) ships with seeded Tampa Bay data and simulates the edge functions, so the whole
flow can be clicked through with no accounts. Live mode swaps the adapter and nothing else changes.

## Roles and security

| Role | How assigned | Sees |
|---|---|---|
| admin | first user to sign in, or added in `profiles` | everything |
| tech | `profiles.tech_id` set at approval | own offers, assigned leads, own quotes/invoices/payouts |
| anon (no login) | public anon key | can insert `leads`, `tech_applications`, upload to `lead-photos`; can read a quote or invoice only through a token RPC |

Row-level security policies are in `supabase/migrations/0002_policies.sql`. Since October 2026,
Supabase requires explicit Postgres grants for the Data API, so the schema migration grants table
access to `anon` and `authenticated` explicitly; RLS then narrows it.

Secrets (Stripe, Resend, Anthropic, Twilio) live only in edge-function secrets, never in the
browser.

## Edge functions (`supabase/functions/`)

| Function | Trigger | Does |
|---|---|---|
| `extract-invoice` | HQ or tech portal after upload | Signed URL for the file → Claude reads it → line items, subtotal, tax, total written to the invoice, status `review` |
| `create-payment-link` | HQ "Approve & send" | Stripe Checkout Session with ACH default and card option (card fee as its own line), stores URL, emails customer |
| `stripe-webhook` | Stripe | On `checkout.session.completed`: invoice `paid`, actual processing fee recorded, payout row created, lead `paid`, event logged |
| `notify` | HQ actions | Email (Resend) and optional SMS (Twilio) for: new lead to admin, offer to tech, quote to customer, payment link to customer, payout sent to tech |
| `connect-onboard` | HQ, optional | Creates a Stripe Connect Express account link for a tech |

Dispatch matching runs in HQ (small data, simple rule): same category, zip in the tech's list or
within radius, specialty match, then best rating. It writes `dispatch_offers` and calls `notify`.

## Tables (summary)

`categories`, `techs`, `tech_applications`, `leads`, `lead_events`, `dispatch_offers`, `quotes`,
`invoices`, `payouts`, `profiles`, `settings`, `achievements`. Full DDL with constraints and
indexes in `supabase/migrations/0001_schema.sql`.

## Free-tier limits that matter

| Limit (Supabase free) | Value | When you'd hit it |
|---|---|---|
| Database | 500 MB | Never at this scale (a lead is about 2 KB) |
| File storage | 1 GB | About 2,000 invoice photos; prune or upgrade |
| Egress | 5 GB / month | Photos viewed in HQ; fine under a few hundred jobs a month |
| Projects pause | after 7 idle days | Daily HQ use prevents it; a weekly cron ping is in the functions README |

Upgrade trigger: when you are doing 50+ jobs a month, pay the $25 Pro plan and stop worrying.

## Why not X

- **Airtable / Softr / Glide:** $20 to $60 a month each, and you'd still need Stripe and a form.
- **A real framework (Next.js) on Vercel:** fine later. A build step adds a failure mode for a
  one-person shop and buys nothing at this scale.
- **Base44:** $50 to $100 a month for the same four services, with the data in someone else's box.
