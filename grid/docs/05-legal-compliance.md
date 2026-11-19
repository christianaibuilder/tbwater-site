# 05 — Legal and compliance checklist

This is a planning checklist, not legal advice. Items marked **CPA** or **attorney** are worth an
hour of professional time before the first real payout.

## Contractor classification (the big one)

Techs must stay independent contractors. Design rules the platform follows, each tied to a factor
regulators look at:

| Rule in the product | Factor it protects |
|---|---|
| Techs set their own hourly rate and trip fee; they can edit any quote before it is sent | Control over price |
| Techs can decline any offer with no penalty beyond losing that job | Right to refuse work |
| No exclusivity; techs keep their own customers and other platforms | Independence |
| Techs supply their own tools, truck, insurance, and licenses | Investment |
| Techs are paid per job, never per hour by the platform | Opportunity for profit or loss |
| The platform does not supervise the work or set hours | Behavioral control |
| Non-circumvention is limited to platform-introduced customers for 12 months, with a stated finder's fee, not a blanket ban | Reasonableness |

Agreement text lives in `hq/legal/tech-agreement.md`. **Attorney** review once, then reuse.

## Agreements

- **Tech agreement:** independent contractor status, insurance minimum ($1M general liability,
  certificate on file), quality standard, payment terms (paid after customer payment settles),
  platform fee (10%, $25 minimum), chargeback deduction, 12-month non-circumvention with finder's
  fee, indemnity, termination. Signed by checkbox at application and stored with timestamp and
  version.
- **Customer terms:** the platform is a marketplace that introduces independent technicians and
  acts as the tech's limited payment collection agent; the tech performs the work and carries the
  liability; payment due per the invoice; cancellation of recurring plans with 7 days' notice.
  Linked on every form and the payment page.
- **Privacy policy:** what is collected (contact, boat, location, photos), who sees it (the
  assigned tech), payment handled by Stripe, how to request deletion.

## Texting and calling

- **10DLC registration** before sending texts from the business number through Twilio or similar.
  Sole proprietor brand registration is about $4.50 one time; a vetted standard brand roughly $46;
  campaign fee $1.50 to $10 a month; carrier pass-through fees fractions of a cent per message.
- **Consent:** checkbox on every form, "OK to text me about this job". Job-status texts are
  transactional; marketing texts need separate consent. Honor STOP automatically.
- **Calls:** calling a customer back about the job they submitted is fine. Cold-calling boat
  owners is not part of the plan.

## Sales tax (Florida)

- Repairs with parts: entire charge taxable (state 6% plus county surtax). Labor only: not taxable
  if records show no parts.
- The tech is the dealer and remits. The platform shows tax as a line on quotes and invoices using
  the job county's rate.
- **CPA:** confirm whether the platform's role as payment collector makes it a marketplace provider
  under Florida Statute 212.05965 (written for tangible goods). Decide before the first $100,000 of
  processed invoices.

## 1099 reporting

- 1099-NEC to any tech paid $2,000 or more in 2026 (indexed from 2027). Deadline to recipients is
  January 31. HQ tracks year-to-date paid per tech and flags the threshold.
- Collect W-9 at approval. No payout without it.
- If payouts move to Stripe Connect Express, the platform still files; Stripe's Connect tax
  reporting product can generate and deliver the forms for a fee.

## Insurance

- Platform: general liability for the business entity, cyber/privacy rider when handling payment
  data at volume. **Broker** quote once revenue starts.
- Techs: $1M general liability minimum, certificate of insurance on file, expiry tracked, renewal
  reminder at 30 days. Ship Repairers Legal Liability is a plus for marina work. Marinas usually
  require a certificate naming them; techs handle that directly.

## Licensing by vertical (Florida)

| Vertical | State license to perform the work | Notes |
|---|---|---|
| Marine mechanics | None | Boat lift and dock work requires a marine contractor license in several counties; exclude it |
| Golf cart repair | None | Street-legal LSV conversions touch DMV rules; stay on repair and maintenance |
| RV repair | None for coach systems | Propane work: Florida LP gas qualifier license for installing or servicing LP systems; exclude or require the license |
| Mobile auto repair | No license, but shops must register under the Florida Motor Vehicle Repair Act (FDACS), give written estimates over $100, and follow invoice rules | Verify each tech's registration number; the platform's quote flow satisfies the written-estimate rule |

## Local business tax receipts

Techs are responsible for their own. Collect the number. Hillsborough and Pasco require a county
receipt for anyone conducting business, plus a city receipt in incorporated areas. Unincorporated
Pinellas has none; Pinellas cities vary. The platform entity needs its own receipt where it is
based (Tarpon Springs issues city receipts; Pinellas County does not).

## Entity and banking

- Form an LLC for the platform, separate from TB Water. Separate bank account, separate Stripe
  account. Platform fee revenue and tech-owed funds should never mix with the water business.
- Keep tech-owed funds visible and paid weekly at minimum. Treat the owed balance as not yours.
