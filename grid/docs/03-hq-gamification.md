# 03 — HQ: one screen, one loop, levels that unlock verticals

HQ is deliberately plain. One left rail, one main panel, big numbers, no decoration. The game
layer exists for one reason: to make the daily loop (answer fast, dispatch, quote, collect) feel
like progress and to make "add another vertical" a reward you earn rather than a distraction you
drift into.

## The daily loop (what you do every day)

1. **Answer** every new lead within 5 minutes. Timer on each card. Call, then log it.
2. **Approve** real jobs. One tap sends offers to the three best techs.
3. **Chase** open offers (30-minute expiry) and open quotes (daily reminder).
4. **Review** uploaded invoices and send payment links.
5. **Pay** techs for anything marked paid. Mark it done.

The home screen is those five queues in that order, each with a count and the oldest item's age.

## XP

| Action | XP |
|---|---|
| Lead responded to under 5 minutes | +15 (under 30 minutes +5) |
| Lead approved and offered | +5 |
| Offer accepted by a tech | +10 |
| Quote sent | +10, accepted +15 |
| Invoice paid | +50, plus 1 per $10 of invoice total |
| Payout completed same day | +10 |
| Tech approved with insurance and W-9 on file | +20 |
| Review collected from customer | +20 |

XP is computed from `lead_events`, never stored by hand, so it can't drift.

## Streaks

- **Fast hands:** consecutive leads answered under 5 minutes. Shown as a flame with the count.
- **Clean desk:** consecutive days ending with zero invoices in review and zero payouts owed.

## Levels

| Level | Name | Requirement | Unlocks |
|---|---|---|---|
| 0 | Dock | Setup checklist: Supabase connected, brand + phone set, 5 approved techs, site live | Lead intake |
| 1 | First wake | First lead responded under 5 minutes, first offer accepted | Quotes |
| 2 | Paid | First invoice paid, first payout completed | Payout reports, 1099 tracker |
| 3 | Steady | 10 completed jobs in any rolling 7 days, or $5,000 paid invoices in 30 days | **Vertical 2 (golf carts)** |
| 4 | Fleet | 20 jobs / 7 days or $15,000 / 30 days, and vertical 2 active for 30 days | **Vertical 3 (RV)** |
| 5 | Grid | 35 jobs / 7 days or $30,000 / 30 days | **Vertical 4 (mobile auto)** |

Locks are soft. Every locked vertical card has an "Unlock anyway" button that asks for a typed
confirmation. The rule is a guardrail, not a wall.

## Progress widgets on the home screen

- Level badge, XP bar to next level.
- Two progress bars toward the next unlock: jobs this week (x of 10) and paid volume this month
  ($x of $5,000).
- Today's response times as small dots: green under 5 minutes, yellow under 30, red beyond.
- Month to date: paid invoices, platform fee kept, processing fees paid, tech payouts.

## Numbers that matter (shown on Dashboard → Money)

| Metric | Why |
|---|---|
| Median response time | The single best predictor of close rate |
| Lead → assigned rate | Dispatch health and tech coverage |
| Assigned → paid rate | Tech quality and follow-through |
| Average invoice | Decides whether a vertical is worth the 10% |
| Platform fee kept after processing | The real revenue line |
| Payouts owed, oldest | Tech trust depends on this being near zero |

## What it is not

No leaderboards between techs (that is a control signal), no points shown to techs, no
notifications that nag. The game is for the operator only.
