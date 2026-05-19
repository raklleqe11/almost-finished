## Goal
Replace the current project contents with the uploaded `project.zip` so it becomes editable in Lovable, without breaking the TanStack Start build.

## What's in the upload
- Standard TanStack Start + shadcn/ui scaffolding (matches current template).
- `public/` — a large prebuilt multilingual static site for "Ardit Fish Shop, Saranda":
  - English landing pages and articles at `public/*.html`
  - Italian mirror under `public/it/`
  - Albanian mirror under `public/sq/`
  - `public/blog/` with ~30 articles (plus `it/blog/` and `sq/blog/` mirrors)
  - SEO assets: `sitemap.xml`, `robots.txt`, `llms.txt`, `seo/`, `js/lang-switcher.js`, logos under `public/images/`
- `scripts/rewrite-posts.py` — Python helper for blog rewriting.
- `src/` contains only `__root.tsx` in `routes/` (no `index.tsx`), plus the standard `components/ui/*`, `hooks/`, `lib/`, `router.tsx`, `server.ts`, `start.ts`, `styles.css`.

## Steps
1. Sync the unzipped project over the current project tree:
   - Copy `public/` (entire static site) into `public/`.
   - Copy `scripts/` into `scripts/`.
   - Copy `src/routes/__root.tsx` (overwriting current).
   - Copy any other differing source files (`src/lib/*`, `src/styles.css`, configs) where they differ — current `package.json`, `vite.config.ts`, `tsconfig.json`, `wrangler.jsonc`, `components.json`, `eslint.config.js` are functionally equivalent, so keep current versions to avoid lockfile churn unless inspection shows a meaningful difference.
2. Ensure `src/routes/index.tsx` exists. The zip doesn't include one, and the static homepage lives at `public/index.html`. Two options — I'll go with (a) by default:
   - (a) Keep a minimal React `index.tsx` route that links into the static site (so the dev server doesn't 404 at `/`), and let the published static `public/index.html` serve the actual homepage.
   - (b) Convert `public/index.html` into a real React route. Larger task — skip unless requested.
3. Verify the build runs cleanly (router generates, no missing imports).

## Technical notes
- Static files in `public/` are served as-is by Vite at their paths (e.g. `/blog/...`, `/it/...`), so the existing internal links in the HTML keep working.
- The `__root.tsx` from the zip will replace the current one; I'll diff first to make sure it still renders `<Outlet />` and the HTML shell.
- No dependency changes expected; if the zip's `package.json` differs meaningfully I'll call it out before installing.

## Out of scope (ask if you want these)
- Porting the static HTML pages into React routes.
- SEO/meta rewrites, content edits, or design changes.
- Running the Python `rewrite-posts.py` script.