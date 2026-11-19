# 06 — SEO plan: how customers find the site without ads

## What "pages" means and why it's not 50 clones

Google ranks pages, not websites. Someone in Dunedin types "Yamaha outboard mechanic near me".
Google looks for a page that is specifically about Yamaha outboard repair in or near Dunedin. A
home page that says "we fix boats in Tampa Bay" is a weak match. A page titled "Yamaha outboard
repair in Dunedin, Palm Harbor and Tarpon Springs" with real local detail is a strong one.

So the site is a set of focused pages, each aimed at one kind of search:

| Page type | Example URL | Aimed at | Count at launch |
|---|---|---|---|
| Service | `/services/outboard-service/` | "300 hour outboard service Tampa" | 12 |
| Brand | `/brands/yamaha/` | "Yamaha outboard mechanic near me" | 9 |
| Area | `/areas/dunedin/` | "boat mechanic Dunedin" | 10 |
| Core | home, post a job, for technicians, how it works | brand searches, conversions | 4 |

About 35 pages. The earlier "50 pages" number was the same idea with more brand-and-city combos.
We hold those back on purpose.

## The doorway-page trap

Google penalizes pages that exist only to catch a search and differ from each other by a swapped
city name. Those are called doorway pages, and sites that mass-generate them get suppressed. The
rule we follow: **every page carries facts that are true only of that page.**

- A brand page carries that brand's real service intervals, known failure points, and parts notes
  (Yamaha VST filters, Verado supercharger oil, Suzuki lean-burn fuel sensitivity).
- An area page carries that town's real ramps, marinas, waterways, and what boats there typically
  need (saltwater corrosion on lift-kept boats in Apollo Beach, shallow-water prop damage near
  Anclote Key, trailer bearings for ramp-launch boats in Ruskin).
- A service page carries what's included, how long it takes, what it usually costs in this market,
  and when to do it.

The generator in `sites/boat/build.mjs` reads this content from JSON files. If a page's JSON has no
unique facts, the generator refuses to build it. That is the safeguard.

## On-page checklist (built into the templates)

- One `<title>` and `<h1>` per page that reads like the search, not like a slogan.
- First paragraph answers the question in plain words. Price range where honest.
- A short FAQ block (3 to 5 questions) with `FAQPage` structured data.
- `LocalBusiness` or `Service` structured data with `areaServed` listing the real towns.
- The post-a-job form embedded on every page, above the fold on phones.
- Internal links: brand → services → areas → back. Every page reachable in two clicks.
- Fast: static HTML, no frameworks, images under 150 KB, one CSS file.
- `sitemap.xml` and `robots.txt` generated with each build; submit the sitemap in Search Console.

## The timeline, honestly

| When | What happens |
|---|---|
| Day 1 | Submit sitemap in Google Search Console. Google crawls within days. |
| Weeks 1 to 4 | Pages get indexed. You can rank immediately for the brand name and for zero-competition phrases ("Suzuki DF140 water pump Safety Harbor"). |
| Months 2 to 3 | Area and service pages start appearing on page 2 or 3 for "boat mechanic [town]". Clicks are a trickle. |
| Months 3 to 6 | With a Google Business Profile collecting reviews from paid jobs, map-pack and page-1 placements for town-level searches. This is when SEO starts to carry its share. |
| Month 6+ | One new page a week (a brand-plus-town combo, a "why is my F150 alarming" explainer) compounds. |

"3 to 6 months" means: don't expect leads from Google search in the first 60 days. Ads and the
Google Business Profile bring the first leads; the pages are the asset that makes ads unnecessary
later.

## Google Business Profile (the map pack)

This is the single highest-value free listing, and for a mobile business it is fiddly.

- Set up as a **service-area business** from a real address you operate from (home base is fine,
  hidden from the public). Never a virtual office or UPS box. Google suspends those.
- Verification is by **video** for most service-area businesses now: one continuous take showing the
  street outside the base, a branded vehicle or magnet, tools, and a work order with the customer
  info covered. Order a vehicle magnet before you record.
- Category: "Boat repair shop". Secondary: "Marine supply store" is wrong, skip it; "Boat dealer"
  wrong; keep it to repair categories.
- Service area: list the towns, not a radius circle.
- **Reviews are the ranking fuel.** HQ sends a review request text after each payout is marked paid;
  the link goes straight to the Google review form. Ten real reviews beat any amount of page
  content.
- Post weekly: a photo from a job (with the customer's OK), a seasonal tip.

## Measurement

- Google Search Console: impressions and clicks per page, weekly.
- Google Business Profile insights: calls, direction requests, website clicks.
- A separate tracking phone number per channel (site, GBP, flyers) so the "source" field on each
  lead is true. Cheap call-tracking numbers cost a few dollars a month each.
- In HQ: leads by source and their close rate. Kill channels that produce leads that die.

## Content cadence after launch

One page a week, in this order of value:

1. Brand-plus-town pages for the top three brands in the top four towns (12 pages over 12 weeks),
   each with a real job story from HQ (anonymized).
2. Problem explainers that match what customers type: "outboard won't idle", "boat battery dies
   overnight", "milky lower unit oil". These rank nationally and funnel locals to the form.
3. Seasonal: hurricane prep checklist (May), post-storm inspection guide (October), spring
   recommissioning (February).

## What not to do

- Don't buy backlinks or directory spam. Local citations (Yelp, BBB, Boatplanet) are fine and free.
- Don't generate pages for towns you don't serve.
- Don't put fake reviews on the site. BoatGrid did; it is the first thing a careful customer notices.
- Don't block the form behind an account.
