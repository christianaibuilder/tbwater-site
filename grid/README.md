# Grid — a dispatch marketplace you own

One back end ("HQ"), many small customer-facing sites ("verticals"). Boat owners post a repair
job on the boat site, you approve it in HQ, a vetted mobile technician takes it, the customer pays
through a payment link, and the platform keeps a 10% fee before paying the tech.

This folder is the whole platform. It lives in the `tbwater-site` repo for now only because that
was the repo available; move it to its own repository before deploying (see "Moving out" below).

## Why this is code and not Base44

Base44 bundles four things: hosting, a database, logins, and a place to run server code. All four
exist for free at small scale:

| Need | What we use | Monthly cost at launch |
|---|---|---|
| Hosting for HQ and the vertical sites | GitHub Pages (same as tbwater.com) | $0 |
| Database, logins, file storage, server functions | Supabase free plan | $0 |
| Taking payments | Stripe, pay per transaction | $0 fixed |
| Email notifications | Resend free tier | $0 |
| Text messages (optional, later) | Twilio with 10DLC registration | about $5 |
| Invoice reading (AI) | Claude API, pennies per invoice | under $5 |

Supabase's free plan pauses a project after 7 idle days. Daily use keeps it alive, and the Pro
plan is $25 a month if you ever want to stop thinking about it.

## What's here

```
grid/
  README.md                     this file
  docs/                         research, plans, playbooks (read 01 first)
  hq/                           the back-end web app (static, no build step)
    index.html                  HQ shell
    app.js                      router + screens
    data/adapter-local.js       demo mode: localStorage + seeded data
    data/adapter-supabase.js    live mode: Supabase
    public/                     customer-facing quote + payment pages
  supabase/
    migrations/0001_schema.sql  tables, constraints, indexes, grants
    migrations/0002_policies.sql  row-level security
    functions/                  edge functions (invoice extraction, Stripe, notify)
  sites/
    boat/                       vertical #1: Tampa Bay marine
      content/                  services, brands, cities (the SEO source of truth)
      templates/                page templates
      build.mjs                 generates the static pages + sitemap
      dist/                     generated output (what gets deployed)
```

## Run HQ in demo mode (no accounts needed)

```
cd grid/hq
python3 -m http.server 8080
```

Open http://localhost:8080. Demo mode uses seeded data in your browser's localStorage. Everything
works end to end: lead → approve → dispatch → quote → invoice → paid → payout, plus the level
system. Reset from Settings → "Reset demo data".

## Go live (about an hour)

1. Create a free Supabase project. In the SQL editor run `supabase/migrations/0001_schema.sql`
   then `0002_policies.sql`. Create two storage buckets: `invoices` (private) and `lead-photos`
   (private).
2. In HQ → Settings, paste the project URL and anon key, switch mode to "live". Sign in with the
   magic link; the first user to sign in becomes admin (see `0002_policies.sql`).
3. Create a Stripe account. Deploy the edge functions with the Supabase CLI and set the secrets
   listed in `supabase/functions/README.md` (Stripe keys, Resend key, Anthropic key).
4. Point the boat site's form at the same Supabase project (`sites/boat/site.config.json`).
5. Publish `hq/` and `sites/boat/dist/` to GitHub Pages on their own domains.

## Moving out of this repo

```
git subtree split -P grid -b grid-only
# create an empty repo on GitHub, then:
git push <new-remote> grid-only:main
```

## Reading order

1. `docs/01-template-spec.md` — the six building blocks and every field
2. `docs/02-architecture.md` — how the pieces connect
3. `docs/03-hq-gamification.md` — levels, XP, and how verticals unlock
4. `docs/04-payments-and-fees.md` — how the money moves and how to beat the card fee
5. `docs/05-legal-compliance.md` — contractor rules, sales tax, texting, insurance
6. `docs/06-seo-plan.md` and `docs/07-outreach-playbook.md` — how customers and techs find you
7. `docs/verticals/` — one plan per vertical, boat first
