# Tests

Playwright click-throughs. Both need the local servers running from the repo's `grid/` folder:

```
# terminal 1: HQ (demo mode) at http://127.0.0.1:8080/hq/
cd grid && python3 -m http.server 8080 --bind 127.0.0.1

# terminal 2: boat site at http://127.0.0.1:8081/
cd grid/sites/boat && node build.mjs && cd dist && python3 -m http.server 8081 --bind 127.0.0.1

# terminal 3
cd grid/tests && mkdir -p shots && node hq-e2e.js && node site-e2e.js
```

`hq-e2e.js` resets demo data, walks every screen, and runs a full job: lead → call logged → offered
→ accepted in the tech portal → quote sent and accepted on the public page → invoice uploaded, read,
approved → paid on the public pay page → payout marked paid → application approved → vertical
unlocked → settings persisted. 47 checks.

`site-e2e.js` checks the generated site: unique titles, h1 on every page, no broken internal links,
valid JSON-LD, sitemap count, the unconfigured-form fallback, the configured form posting a lead with
a photo to a mocked Supabase, service/brand prefill, the technician application, and no horizontal
scroll on phones. 18 checks.

Screenshots land in `tests/shots/` (git-ignored).
