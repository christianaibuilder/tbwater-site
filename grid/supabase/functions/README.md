# Edge functions

Five small server functions. Everything that touches a secret lives here, never in the browser.

| Function | Who calls it | Needs |
|---|---|---|
| `extract-invoice` | HQ / tech portal after an upload | `ANTHROPIC_API_KEY` |
| `create-payment-link` | HQ "Approve & send" | `STRIPE_SECRET_KEY`, `HQ_URL`, email/SMS keys |
| `stripe-webhook` | Stripe | `STRIPE_WEBHOOK_SECRET`, `ADMIN_EMAIL` |
| `notify` | HQ actions | `RESEND_API_KEY`, `FROM_EMAIL`, optional Twilio |
| `connect-onboard` | HQ, only if using Stripe Connect | `STRIPE_SECRET_KEY`, `HQ_URL` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by Supabase.

## Deploy

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>

supabase secrets set ANTHROPIC_API_KEY=sk-ant-... STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... RESEND_API_KEY=re_... FROM_EMAIL="Tampa Bay Boat Mechanics <billing@yourdomain.com>" \
  ADMIN_EMAIL=you@yourdomain.com HQ_URL=https://hq.yourdomain.com
# optional texting:
supabase secrets set TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+1727xxxxxxx

supabase functions deploy extract-invoice
supabase functions deploy create-payment-link
supabase functions deploy notify
supabase functions deploy connect-onboard
supabase functions deploy stripe-webhook --no-verify-jwt
```

Then in Stripe → Developers → Webhooks, add an endpoint:
`https://<project-ref>.supabase.co/functions/v1/stripe-webhook` with events
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

In Stripe → Settings → Payment methods, enable **ACH Direct Debit** (us_bank_account) and cards.

## New-lead alerts (the 5-minute timer starts here)

In Supabase → Database → Webhooks, create two webhooks that call the `notify` function with the
service-role key in the Authorization header (the dashboard offers this):

- table `leads`, event INSERT → `https://<project-ref>.supabase.co/functions/v1/notify`
- table `tech_applications`, event INSERT → same URL

`notify` recognizes the webhook payload and emails `ADMIN_EMAIL`; set `ADMIN_PHONE` (E.164, e.g.
`+17275550100`) and Twilio to also get a text. Site form → database → your phone in seconds.

## Notes

- `extract-invoice` uses Claude Opus 5.5 with server-side refusal fallbacks enabled
  (`fallbacks: "default"`), so a safety-classifier decline is automatically retried on another
  model inside the same request. Remove the `betas`/`fallbacks` lines if you'd rather it just fail.
- Payment Links do not expire and are limited to one completed payment each. Two links are made per
  invoice: bank (no fee) and card (fee line added). The public pay page shows both.
- ACH payments complete asynchronously. The invoice shows `processing` until Stripe sends
  `async_payment_succeeded`, then `paid`. Payouts are created only at `paid`.
- Keeping the free Supabase project awake: add a Supabase cron (Database → Cron) that runs
  `select 1;` daily, or simply open HQ every day. Projects pause after 7 idle days.
