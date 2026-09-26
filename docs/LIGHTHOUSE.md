# Lighthouse Audit — BATT-X

Recorded against the local dev server (`next dev`, Turbopack) on
`http://localhost:3000/auth/signin` — the only public route that
200s without auth. **Production build scores will be higher**, especially
on Performance (no HMR scripts, code-split, pre-built chunks).

## Scores (mobile, simulated 4× CPU + Slow 4G)

| Category       | Before | After |
|----------------|-------:|------:|
| Performance    | 91     | 89*   |
| Accessibility  | 94     | **100** |
| Best Practices | 96     | **100** |
| SEO            | 91     | **100** |

*Performance variance between runs is ~5 points in dev mode (HMR timing
fluctuates). The trend across multiple runs is Performance 89–93. Build a
production bundle and re-score for a stable number.

## What was fixed in this pass

1. **NextAuth v5 auth crash** — `app/api/auth/[...nextauth]/route.ts`
   exported a single `handler` as both `GET` and `POST`, but NextAuth v5
   returns an object `{ GET, POST }`. At request time Next tried to call
   the object as a function and threw
   `TypeError: Function.prototype.apply was called on #<Object>`.
   Fixed by destructuring `{ GET, POST } = handlers` and re-exporting.
   This was the source of the `errors-in-console` failure and a 500 on
   every `/api/auth/*` endpoint.

2. **Single NextAuth instance** — moved `authOptions` and the
   `NextAuth(authOptions)` call into `lib/auth.ts` so the route handler
   and any server-side `auth()` use the same instance. Previously, the
   route handler created a second instance, and the two sets of session
   cookies / JWT signing keys were not compatible with each other.

3. **`<main>` landmark on auth pages** — `/auth/signin` and `/auth/signup`
   previously rendered directly inside a `<div>`, so screen readers had
   no main content landmark. Wrapped both in `<main>`.

4. **Primary button contrast** — `bg-primary` (HSL 238.7 83.5% 66.7%,
   indigo-500) paired with the clay shadow overlay produced an
   effective 4.17:1 contrast on the "Sign In" button. Replaced the
   default variant in `components/ui/button.tsx` with
   `bg-indigo-700 text-white`, which is unambiguously 4.5:1+.

5. **Demo button caption contrast** — `text-muted-foreground`
   (slate-500) on `bg-muted` (slate-100) was 4.34:1. Replaced with
   `text-slate-700 dark:text-slate-300`, which is ≥ 4.6:1 in both
   themes.

6. **Darkened `--primary` token** — light-mode `--primary` is now HSL
   238.7 83.5% 56.3% (indigo-600-ish) instead of 66.7% lightness. The
   original was too pale for some text/bg pairings even with the
   foreground token.

7. **Public `robots.txt`** — added `public/robots.txt` and excluded it
   from the auth-gated routes in `proxy.ts` (it was being intercepted
   and served the signin page HTML, which the robots.txt parser
   rejects).

8. **Lighthouse audit script** — added `scripts/lighthouse-audit.js`.
   Runs Lighthouse v13 against a URL, using the Playwright-bundled
   Chromium as the launcher. Writes `lighthouse-report.{json,html}`.

## How to re-run

```bash
# In one terminal:
npm run dev

# In another:
npm install --no-save lighthouse@13 chrome-launcher
node scripts/lighthouse-audit.js http://localhost:3000/auth/signin
```

Reports land in `scripts/lighthouse-report.json` and `.html`.

## Known limitations of this score

- **Dev mode** — Performance is artificially low because the Turbopack
  HMR runtime ships with every request, the chunks aren't code-split
  or hashed, and there's no compression. A `next build && next start`
  run will show a higher number.
- **Mobile only** — Lighthouse was run with the mobile profile (4× CPU
  slowdown + Slow 4G). Desktop scores will be substantially higher.
- **Single page** — Only the public signin page was audited because the
  rest of the app requires auth. To audit authenticated pages, log in
  with a real session, capture cookies, and pass them through
  `chrome-launcher`.
- **Forced light color scheme** — the audit Chrome flag
  `--force-prefers-color-scheme=light` is set so the design's
  light-mode tokens are what gets measured. Without it, headless
  Chromium often reports dark, which would force dark-mode tokens on
  a design that's tuned primarily for light.

## Open follow-ups (out of scope for this audit)

- **No source maps** — dev mode doesn't emit them. Production build
  will.
- **Unused JavaScript** — framer-motion and rechats are big. The
  `optimizePackageImports: ['lucide-react', 'recharts']` config in
  `next.config.js` already tree-shakes icons; further reduction would
  require replacing framer-motion with CSS transitions on the simpler
  animations.
- **Render-blocking CSS** — single global stylesheet. Acceptable for a
  dashboard app; splitting per-route would need a build-time analysis.
- **Largest Contentful Paint** — driven by the Inter font swap. Adding
  `font-display: optional` or self-hosting the font in WOFF2 would
  help, but `display: swap` is already set.
