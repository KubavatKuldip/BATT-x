# Accessibility — BATT-X (WCAG 2.1 AA)

This document records the accessibility work applied to the BATT-X dashboard
and the limits of the static audit. It is **not** a substitute for
screen-reader / keyboard / contrast testing in a real browser.

## What was changed in the in-tree code

| File | Change | WCAG criterion |
|------|--------|----------------|
| `components/navigation/sidebar.tsx` | Added `aria-label="Primary"` to the `<nav>`, `aria-current="page"` on the active link, `aria-hidden="true"` on decorative icons (logo, dropdown chevron, sign-out icon), `aria-label` on the dropdown trigger, and replaced the `LogOut` icon used on the "Sign in" link with `LogIn`. | 1.3.1 Info & Relationships; 2.4.6 Headings & Labels; 4.1.2 Name, Role, Value; 1.4.1 Use of Color (semantic icon ≠ semantic action) |
| `components/navigation/bottom-nav.tsx` | Added `aria-label="Primary, mobile"` to distinguish the two `<nav>` landmarks, `aria-current="page"` on the active link, and `aria-hidden="true"` on the icons. | 1.3.1; 2.4.6; 4.1.2 |
| `app/dashboard/layout.tsx` | Added a skip-to-content link targeting `#main-content`, and `id="main-content" tabIndex={-1}` on `<main>`. | 2.4.1 Bypass Blocks; 2.4.3 Focus Order |
| `components/dashboard/battery-card.tsx` | Card now has `role="group"` with an `aria-label` that combines "Battery level NN percent, status, charging". The decorative SVG progress ring is `aria-hidden="true"`. The visible percentage is prefixed with `<span class="sr-only">Battery:</span>` for AT. | 1.1.1 Non-text Content; 1.3.1; 4.1.2 |
| `components/dashboard/sensor-card.tsx` | Card now has `role="group"` with an `aria-label` that combines "Label: value unit, status". The status is duplicated in a `sr-only` paragraph so color is no longer the only signal. | 1.3.1; 1.4.1; 4.1.2 |
| `components/dashboard/status-header.tsx` | Added `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and a summarizing `aria-label`. `lastSyncAt` is wrapped in a `<time>` element with a valid `dateTime` attribute. Decorative icons are `aria-hidden="true"`. | 1.3.1; 4.1.3 Status Messages; 4.1.2 |
| `app/auth/signin/page.tsx` | Error message is `role="alert"` with an `id` referenced by `aria-describedby` on both inputs. Inputs also get `aria-invalid={!!error}`. Loader icon is `aria-hidden`. The "fill demo" button gained an explicit focus ring. | 1.3.1; 3.3.1 Error Identification; 3.3.3 Error Suggestion; 4.1.2 |
| `app/dashboard/page.tsx` | The Live/Demo/Offline status text container has `aria-live="polite"` so the connection transition is announced. Sync button has `aria-label="Sync now"`. Decorative icons are `aria-hidden="true"`. | 4.1.3; 4.1.2 |
| `app/globals.css` | The existing `prefers-reduced-motion` block is preserved; `focus-ring` utility is available. | 2.3.3 Animation from Interactions |
| `app/layout.tsx` | `<html lang="en">` is set. | 3.1.1 Language of Page |

## What is verified by automated tests

`__tests__/accessibility/wcag-aa.test.tsx` covers:

- Bottom nav has a distinguishing `aria-label`
- Active nav link has `aria-current="page"`
- SensorCard accessible name combines label, value, unit, and status
- Status text is exposed to AT (not color-only)
- BatteryCard accessible name combines percentage, status, charging state
- StatusHeader uses `role="status"` + `aria-live="polite"`
- StatusHeader `lastSyncAt` is a valid `<time>` element

These tests are the regression net. **121 tests pass** as of this writing.

## What still needs real browser / AT testing

A static audit can catch the things above, but the following need a real
browser, a keyboard, and ideally a screen reader:

- **Color contrast** — every status pill, button, and text token needs to
  be checked in both light and dark mode against WCAG AA's 4.5:1 (or 3:1
  for large text / UI components). The design tokens in
  `app/globals.css` are correct on paper (`--foreground` slate-950 on
  `--background` slate-50 = ~17:1), but the `muted-foreground` and
  status variants should be verified with a tool like the Stark
  plugin or axe DevTools.
- **Keyboard-only navigation** — Tab order, focus visibility, and
  Esc-to-close on the dropdown menu. The `Button` primitive has
  `focus-visible:ring-2` so focus visibility is in place, but the
  full Tab walkthrough has not been done.
- **Screen reader pass** — VoiceOver on macOS, NVDA on Windows, TalkBack
  on Android. Listen for the "Device status: Cutoff Active" announcement
  and the sensor-card accessible names.
- **Touch targets** — every clickable element should be at least 24×24 CSS
  pixels (WCAG 2.5.8, Level AA). The bottom-nav items are 16×16 cells of
  a 64px row, so each tap target is at least 64×64 — fine. But the
  dropdown trigger in the sidebar should be verified.
- **Form labels on /auth/signup and /settings** — same pattern as signin
  (Label htmlFor, aria-describedby on error) but not audited here.
- **Tables and chart data** in /analytics — chart alternatives for AT
  users is its own project.

## Known limitations / open follow-ups

- **HTML `lang` is hard-coded to `en`.** The app has a `preferredLanguage`
  field on the user model, but no runtime language switcher. A localized
  build would need to set `lang` per page.
- **No `prefers-contrast: more` support.** Some users with vision
  conditions ask for high contrast via OS settings; the design system
  does not currently provide a high-contrast theme.
- **Color-only signal still present in places that were not in this
  audit pass**, e.g. the analytics charts, the alert severity colors on
  /alerts, and the SOS button animation. A second pass should cover
  those.
