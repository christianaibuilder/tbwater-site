# 01 — Template spec: the six building blocks

Every vertical runs on the same six records. This document is the result of the research pass on
each one, the decision taken, and the exact fields and status rules the code implements.

Research sources are collected in `00-research-notes.md`.

---

## 1. Category (a vertical)

**What it is.** One trade, one brand, one customer-facing site, one phone number. Marine is
category one. Golf cart, RV, and mobile auto are categories two to four and start locked.

**Research takeaways.**
- BoatGrid's taxonomy is a flat list of 8 to 10 services plus a brand directory. That is the right
  size. Thumbtack-style deep taxonomies confuse customers and dilute SEO.
- Each service needs three things to be useful: a customer-facing name, a two-sentence description
  of what's included, and the intake questions that let a tech quote it without a call back
  (engine make, hours, symptom).
- Brands matter more than services for search. "Yamaha outboard repair near me" is searched far
  more than "outboard repair near me". Every category needs an equipment-brand list.

**Decision.** Category is configuration, not code. Adding a vertical means adding one row and one
content folder, not touching HQ.

**Fields.**

| Field | Type | Notes |
|---|---|---|
| id | text slug | `marine`, `golf_cart`, `rv`, `auto` |
| name | text | "Marine" |
| brand_name | text | What customers see, e.g. "Tampa Bay Boat Mechanics" |
| site_url, phone, email | text | Per-vertical contact points |
| status | `locked` / `active` / `paused` | Locked until unlocked in HQ |
| unlock_rule | json | `{ "jobs_7d": 10 }` or `{ "gmv_30d": 5000 }` |
| services | json array | `{slug, name, blurb, avg_ticket, intake_fields[]}` |
| equipment_brands | json array | `{slug, name, notes}` |
| default_tax_rate | numeric | Overridden per job by county |
| service_area | json | Counties and the zip list used for tech matching |

**Status rules.** `locked → active` requires the unlock rule to be met or an explicit override.
`active → paused` hides the vertical's site forms and stops dispatch; existing jobs continue.

---

## 2. Tech (a contractor)

**What it is.** An independent marine mechanic or shop that takes jobs through the platform.

**Research takeaways.**
- **Classification is the real risk.** The Department of Labor's reinstated opinion letter on
  "virtual marketplace companies" treats providers as contractors when they set or negotiate their
  own prices, can decline work, can work elsewhere, and can keep customers they engaged off
  platform. Every design choice below protects that: techs set their rates, edit every quote, can
  decline any offer, and no exclusivity.
- **Non-solicitation, not a ban.** BoatGrid bans techs from ever contacting customers off platform.
  A blanket ban is a control factor and is unenforceable in practice. Use a 12-month
  non-circumvention for customers the platform introduced, with a stated finder's fee if breached.
- **Insurance norms.** No Florida statute sets insurance minimums for marine mechanics. Marinas and
  yards require a certificate of insurance naming them; Derecktor's Florida yards ask for $2M
  general liability plus Ship Repairers Legal Liability. For a mobile tech, $1M general liability
  is the realistic floor; collect the certificate and its expiry date.
- **Local registration.** Hillsborough and Pasco require a county business tax receipt for anyone
  conducting business (plus a city receipt inside Tampa, Temple Terrace, Plant City, and every
  Pasco city). Unincorporated Pinellas has no county receipt; Pinellas cities such as Clearwater
  require one. Collect the receipt number, don't gate on it.
- **Taxes.** 1099-NEC is due to any tech paid $2,000 or more in 2026 (threshold indexed from 2027).
  Collect a W-9 at approval so you are never chasing it in January. If payouts run through Stripe
  Connect Express, the platform still files the 1099s; Stripe files only for Standard accounts.

**Decision.** Applications are a separate table that anyone can submit from the vertical site. HQ
approval creates the tech record and (optionally) invites them to the tech portal.

**Fields (techs).**

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid, nullable | Set when the tech signs in to the portal |
| category_ids | text[] | A tech can serve more than one vertical |
| business_name, contact_name, phone, email | text | |
| home_zip, service_zips | text, text[] | Matching uses zip list first, radius second |
| service_radius_miles, lat, lng | numeric | |
| specialties | text[] | From the category's service slugs |
| brands | text[] | From the category's brand slugs |
| certifications | text[] | Free text, e.g. "Yamaha Master Tech", "ABYC Electrical" |
| years_experience | int | |
| hourly_rate, trip_fee | numeric | The tech's own numbers, shown to them only |
| insurance_carrier, insurance_expires, coi_url | | Warn at 30 days before expiry |
| w9_url, btr_number | | Required before first payout |
| payout_method | `stripe_connect` / `ach_manual` / `zelle` / `check` | |
| stripe_account_id | text | Connect Express account, if used |
| status | `applied` / `approved` / `paused` / `rejected` | |
| rating, jobs_completed, gmv_total, ytd_paid | numeric | Denormalized counters |
| notes | text | Admin only |

**Status rules.** `applied → approved` requires phone verified by a call, insurance document on
file, and signed tech agreement. `approved → paused` on insurance expiry or two declined-without-
reason offers in a week (soft rule, admin decides).

---

## 3. Lead (a job request)

**What it is.** A customer's request from a site form, a phone call, or a referral, tracked from
first contact to paid.

**Research takeaways.**
- **Speed decides everything.** The most-cited study of home-services companies found 95% never
  answer a web lead within five minutes; ServiceTitan's 2026 survey says half take over an hour.
  The multipliers quoted by vendors are shaky, but the direction is not: the first business to call
  back usually gets the job. HQ shows a live timer on every new lead and scores the response.
- **Fewer form fields, more intake by phone.** Ask what's needed to dispatch (contact, location,
  equipment, symptom, photos, urgency) and nothing else. Everything else is captured on the call
  and logged.
- **Consent for texting.** Appointment and job texts are transactional, but the safe pattern is a
  checkbox on the form ("OK to text me about this job") and STOP handling. Business texting from a
  normal number requires 10DLC registration (one-time brand fee of about $4.50 for a sole
  proprietor or roughly $46 for a vetted standard brand, campaign fee $1.50 to $10 a month).
- **Dispatch model.** BoatGrid assigns every job by hand. Pure broadcast marketplaces let techs buy
  leads. The hybrid works best for one operator: admin approves in one tap, the system offers the
  job to the three best-matched techs, first to accept wins, admin can override.

**Fields (leads).**

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| category_id | text | |
| source | text | `site`, `phone`, `referral`, `google_ads`, `facebook`, `tech_overflow` |
| customer_name, phone, email | text | |
| address, city, zip, county | text | County drives the default tax rate |
| lat, lng | numeric | Geocoded for matching (optional) |
| equipment | json | `{make, model, year, engine, hours, fuel}` varies by category |
| service_slug | text | From the category's services |
| description | text | The customer's words |
| photos | text[] | Storage paths |
| urgency | `asap` / `this_week` / `flexible` | |
| sms_consent | bool | |
| status | see below | |
| assigned_tech_id | uuid | |
| first_response_at | timestamp | Set the first time admin logs a call or text |
| scheduled_at | timestamp | |
| estimated_value | numeric | Admin's guess after the call, feeds forecasting |
| lost_reason | text | Required when status becomes `dead` |

**Status pipeline.**

```
new → contacted → approved → offered → assigned → quoted → scheduled → in_progress → completed → paid
   ↘ dead (any time, with a reason)
```

- `new`: just arrived; the 5-minute timer is running.
- `contacted`: admin logged a call or text. Stops the timer and records response time.
- `approved`: real job, worth dispatching. Triggers offers to matched techs.
- `offered`: at least one tech has an open offer. Expires after 30 minutes and re-offers.
- `assigned`: a tech accepted. Customer contact details unlock for that tech.
- `quoted`: a quote was sent. `scheduled`: date set. `in_progress`: tech marked started.
- `completed`: tech uploaded an invoice. `paid`: customer paid; payout created.

**Events.** Every action writes a `lead_events` row (call, text, note, status change, offer,
accept, decline, quote sent, invoice uploaded, paid). The timeline on the lead and the XP in HQ
both read from this table.

---

## 4. Quote

**What it is.** A priced proposal to the customer, built by admin or the tech, accepted online.

**Research takeaways.**
- Published mobile marine labor in Pinellas and Hillsborough runs about $120 to $150 an hour. A full
  300-hour outboard service lands around $900 to $2,000 at Tampa Bay shops. These set the ranges
  for sanity checks in the quote builder, not the prices; techs price their own work.
- Practitioner norms (unsourced, confirm with your first five techs): a trip or diagnostic fee of
  $100 to $150 for mobile calls, parts marked up 20 to 40%, a 50% deposit when parts are ordered,
  quotes valid 14 days.
- Florida treats a repair with parts as fully taxable, labor included. Labor-only work is not
  taxable if the records show no parts were supplied. The quote therefore carries a `taxable` flag
  per line item and a county tax rate, and the tech is the seller of record for sales tax.
- Letting the tech edit the quote before it goes out is both better service and a classification
  safeguard (the tech sets the price).

**Fields (quotes).**

| Field | Type | Notes |
|---|---|---|
| id, lead_id, tech_id | | |
| line_items | json array | `{description, qty, unit_price, taxable, kind: labor|parts|fee}` |
| subtotal, tax_rate, tax, total | numeric | Computed server-side on save |
| deposit_required | numeric | Optional |
| status | `draft` / `sent` / `accepted` / `declined` / `expired` | |
| valid_until | date | Default 14 days |
| public_token | text | Customer views and accepts at `/public/quote.html?t=` |
| sent_at, accepted_at, customer_note | | |

**Status rules.** `draft → sent` emails or texts the link. `sent → accepted` moves the lead to
`quoted` with `estimated_value` = total and nudges scheduling. `sent → expired` after
`valid_until`; the reminder loop stops.

---

## 5. Invoice

**What it is.** The tech's bill for finished work, read by AI, approved by admin, paid by the
customer through a link.

**Research takeaways.**
- BoatGrid's best idea is here: the tech uploads whatever invoice they already produce (a photo, a
  PDF from Jobber or QuickBooks, a handwritten ticket). The platform reads it, so techs never learn
  a new tool. We keep that exactly.
- Fee math on a $650 job: card processing at 2.9% + 30¢ is $19.15, eating 30% of a $65 platform
  fee. ACH debit at 0.8% capped at $5 costs $5. Default the payment link to bank payment and show
  the card option with a disclosed fee (details in `04-payments-and-fees.md`).
- The invoice must separate taxable and non-taxable lines and show tax as its own line, because the
  tech owes that tax to the state.

**Fields (invoices).**

| Field | Type | Notes |
|---|---|---|
| id, lead_id, tech_id, quote_id | | |
| file_path | text | Storage path of the upload |
| extracted | json | Raw AI output kept for audit |
| line_items, subtotal, tax, total | | Editable in review |
| status | `uploaded` / `review` / `approved` / `sent` / `paid` / `void` | |
| payment_link_url, stripe_session_id | text | |
| paid_at, paid_amount, payment_method | | `ach` or `card` |
| platform_fee_pct, platform_fee_amount | numeric | Default 10 |
| processing_fee_amount | numeric | Actual Stripe fee from the webhook |
| card_fee_charged | numeric | Any card fee the customer paid |
| tech_share_amount | numeric | What the tech is owed |
| public_token | text | Customer pays at `/public/pay.html?t=` |

**Status rules.** `uploaded → review` when extraction finishes. `review → approved` is a human
tap in HQ. `approved → sent` when the payment link is created and emailed. `sent → paid` from the
Stripe webhook only. `paid` creates the payout row and moves the lead to `paid`.

---

## 6. Payout

**What it is.** The tech's share, paid after the customer pays, tracked for 1099s.

**Research takeaways.**
- Two viable rails. **Manual:** the platform receives the full payment, then pays the tech by ACH
  from the business bank (QuickBooks Bill Pay, Melio, or a plain bank transfer) and marks it paid.
  Zero extra fees, one manual step per job, platform files 1099s. **Stripe Connect Express:** the
  customer's payment is split automatically, Stripe deposits the tech's share to their bank, and
  the platform's fee lands in the platform account. Costs $2 per active tech per month plus 0.25% +
  25¢ per payout, and the platform still files 1099s (Stripe files only for Standard accounts).
- Start manual. Switch to Connect when payouts exceed roughly 40 a month, when the time saved beats
  the fees.
- Track year-to-date paid per tech; flag at $2,000 (the 2026 1099-NEC threshold).

**Fields (payouts).**

| Field | Type | Notes |
|---|---|---|
| id, invoice_id, tech_id | | |
| amount | numeric | = tech_share_amount |
| method | `stripe_connect` / `ach_manual` / `zelle` / `check` | |
| status | `owed` / `scheduled` / `paid` / `failed` | |
| paid_at, reference | | Bank reference or Stripe transfer id |
| tax_year | int | For the 1099 export |

**Status rules.** Created as `owed` the moment the invoice is paid. For Connect, created as `paid`
with the transfer id. A payout cannot be marked paid without a W-9 on file; HQ blocks it.

---

## What the template does not include on purpose

- Customer accounts and logins. Customers get links, not passwords. Fewer support calls.
- Tech-to-customer chat. Phone and text work; chat is a second inbox to monitor.
- Automatic pricing. Techs price. The platform never sets a rate.
- A mobile app. HQ is a responsive web page that installs to the home screen.
