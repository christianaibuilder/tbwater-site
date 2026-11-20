# Boat vertical site

Static, generated, no dependencies. Content lives in `content/*.json`; the look lives in
`assets/`; `build.mjs` turns them into `dist/`.

## Build

```
node build.mjs
```

Builds 37 indexable pages (home, post a job, how it works, for technicians, 12 services, 9 brands,
10 areas, terms, privacy) plus thanks and 404, `sitemap.xml`, `robots.txt`, and `assets/config.js`.

## Connect the forms

Edit `site.config.json`: `supabaseUrl`, `supabaseAnonKey` (the public anon key, same one HQ uses),
`phone`, `email`, `siteUrl`, and `domain` (writes a `CNAME` file for GitHub Pages). Rebuild.

Forms post straight to Supabase (`leads` and `tech_applications`) under the anon insert policies in
`supabase/migrations/0002_policies.sql`. Photos go to the private `lead-photos` bucket. With the
database webhooks from `supabase/functions/README.md` set up, you get an email and a text within
seconds of a submission.

Until the keys are in, the form shows a "call us" message with a mailto fallback, so the site is
safe to publish before the back end is live.

## Deploy (GitHub Pages)

1. Create a repo (for example `tampabayboatmechanics`), push the contents of `dist/` to its `main`
   branch (or point Pages at a `docs/` folder you copy `dist/` into).
2. Settings → Pages → deploy from branch. Add the custom domain; DNS: `A` records to GitHub Pages
   IPs or a `CNAME` for `www`. Enforce HTTPS.
3. Google Search Console: verify the domain, submit `https://yourdomain/sitemap.xml`.

Any static host works the same (Cloudflare Pages, Netlify): publish `dist/`.

## Local preview

```
cd dist && python3 -m http.server 8081
```

Links are root-relative (`/services/...`), so preview from the `dist` root, not from a subfolder.

## Adding pages

- New service: add an object to `content/services.json` with `included`, `local_note`, and FAQs. The
  build refuses pages without unique content on purpose.
- New area: `content/areas.json` with real ramps, waters, issues, and zips. Zips also feed the
  zip-to-county guess on the form.
- New brand: `content/brands.json` with intervals and common issues.

Keep `docs/06-seo-plan.md` next to you: one page a week, each with facts that are true only of it.

## Build modes

- `node build.mjs` — root-relative URLs, for a custom domain (default).
- `basePath` in `site.config.json` (for example `"/grid"`) — for a GitHub Pages project site served under a subpath.
- `node build.mjs --relative --out <dir>` — page-relative URLs with explicit `index.html`, for previews and claude.ai artifacts.
