# 04 — Payments and fees: keeping the 10% a real 10%

## The problem

Card processing at 2.9% + 30¢ comes out of the platform's 10%. On a $650 invoice that is $19.15,
so the platform nets $45.85, about 7%. On a $300 invoice it nets $21.00, exactly 7%. The tech
always gets their 90%; the processor eats the platform's margin.

## The fix, in order of impact

### 1. Make bank payment (ACH) the default

Stripe's ACH Direct Debit costs 0.8% capped at $5. The payment page shows "Pay by bank" first,
pre-selected. On the $650 job the fee drops from $19.15 to $5. Net to platform: $60, a true 9.2%.

ACH settles in about 4 business days versus 2 for cards. Techs are paid when the payment settles,
and the payout screen shows the expected date. Say so in the tech agreement.

### 2. Charge a disclosed fee for cards

Florida's surcharge ban was struck down by the federal courts and the Attorney General's office
says merchants may add a credit-card surcharge. Network rules cap it at the processing cost (Visa 3%,
others 4%) and it must be a separate, disclosed line. Debit cards cannot be surcharged under federal
rules. Dual pricing (a bank price and a card price, both shown) is also lawful and covers debit.

Implementation: the payment page shows the bank total and the card total side by side. The card
total adds a "Card processing fee (3%)" line to the Checkout Session. The customer chooses. The
fee goes to the platform and offsets Stripe's charge. Stripe cannot tell us debit versus credit
before checkout, so the dual-pricing presentation is used rather than the word "surcharge".

Restaurants got new disclosure rules in Florida in July 2026; they do not apply here, but the same
habit of disclosing on the page and the receipt is the safe one.

### 3. Round the platform fee to the job, not the dollar

Keep 10% as the headline, but set a $25 minimum platform fee so a $150 diagnostic call does not
net $8. Techs accept a floor far more readily than a higher percentage.

## Worked examples

| Job | Pays by | Processing fee | Card fee paid by customer | Platform keeps | Tech gets |
|---|---|---|---|---|---|
| $650 | ACH | $5.00 | $0 | $60.00 | $585.00 |
| $650 | Card | $19.15 | $19.50 | $65.35 | $585.00 |
| $1,500 | ACH | $5.00 | $0 | $145.00 | $1,350.00 |
| $150 | ACH | $1.20 | $0 | $23.80 (floor $25 less fee) | $125.00 |

Tech share is always `total − platform fee`, where platform fee = max(10%, $25). The customer's
card fee never touches the tech share.

## Payout rails

| | Manual ACH (start here) | Stripe Connect Express (later) |
|---|---|---|
| How | Platform receives full payment, pays tech from the business bank (QuickBooks Bill Pay, Melio, or bank transfer), marks paid in HQ | Customer payment is split at checkout; Stripe deposits tech's share automatically |
| Extra cost | $0 | $2 per active tech per month + 0.25% + 25¢ per payout |
| Tech onboarding | W-9, bank details, payout method | Stripe-hosted onboarding link, Stripe verifies identity |
| 1099s | Platform files (HQ exports the totals) | Platform still files; Stripe's tax reporting add-on can generate and e-deliver |
| When | Under about 40 payouts a month | Above that, or when identity verification of techs is worth outsourcing |

Switching later is a settings change plus an onboarding link per tech; the data model already has
`stripe_account_id` and `payout_method`.

## Sales tax on the invoice

Florida: when parts are supplied, the entire repair charge including labor is taxable at 6% plus
the county surtax (Pinellas 7%, Hillsborough 7.5%, Pasco 7% at the time of writing; confirm on the
Department of Revenue's current surtax list). Labor-only repairs are not taxable if records show no
parts were supplied.

Design: the tech is the seller and owes the tax. The invoice shows tax as its own line computed from
the taxable lines and the job's county rate. The platform collects it as part of the total and it is
part of the tech's share. The platform's 10% is a service fee charged to the tech, which Florida does
not tax. Whether a repair marketplace is a "marketplace provider" under Florida's 2021 law (written
for sales of tangible goods) is unsettled; have a Florida CPA confirm before volume gets large.

## Refunds and disputes

- ACH disputes cost $15 and failed ACH payments $4 at Stripe. Rare for invoices the customer
  initiated, but the tech agreement must say chargebacks on their work are deducted from future
  payouts.
- Never refund from the tech's share without the tech's written agreement; refund the platform fee
  first, then negotiate.

## Where the money sits

Customer → Stripe → platform's Stripe balance → platform business checking (Stripe payout, daily
or weekly) → tech (manual ACH). Keep the tech-owed balance visible in HQ at all times; that
number is the one that gets a one-person platform in trouble if it drifts.
