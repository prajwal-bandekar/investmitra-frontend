# Frontend decisions (ADR log)

Format: date, decision, why, alternatives rejected, status.

## F01 Project rename (2026-10-06)
- **Decision:** Frontend folder is `investmitra-frontend`; old Wells Fargo naming removed.
- **Why:** Part of the project copy and rename (see backend D01).
- **Status:** Done.

## F02 Full redesign from a Claude Design export (2026-10-08)
- **Decision:** Rebuild the UI from the Claude Design export ("newsprint" personality): Rozha One + Source Serif 4 + IBM Plex Mono, purple ink #46014A + marigold #E8A317, stamps, ticker tape, light "Newsprint" and dark "Ink" editions.
- **Why:** Distinctive identity instead of a generic Bootstrap look.
- **Rejected:** Keeping the Bootstrap/GSAP original UI (those dependencies are now unused).
- **Status:** Implemented; not yet visually verified in a browser by the assistant.

## F03 Beginner-friendly refinement via design-taste-frontend (2026-10-09)
- **Decision:** Apply the `design-taste-frontend` skill in redesign-preserve mode: less intimidating, glossary and tooltips, plainer labels, receipt print / tear / shake slip animations.
- **Why:** Target users are students and freshers who may not know trading jargon.
- **Rejected:** A fully new visual direction (preserve the newsprint identity).
- **Status:** Done.

## F04 Keep the parody testimonials (2026-10-09)
- **Decision:** Landing "Letters to the Editor" keep the original parody quotes (Erlich Bachman, Gavin Belson, Russ Hanneman).
- **Why:** User wanted them preserved from the original site.
- **Status:** Done.

## F05 Taste-skill repo review (2026-10-10)
- **Decision:** Leonxlnx/taste-skill was reviewed and judged safe; only `design-taste-frontend` is in use.
- **Rejected:** Installing the other skills from that repo.
- **Status:** Done.

## F06 Plain CSS, context instead of a state library (2026-10-09)
- **Decision:** Plain CSS with tokens; small `useRemote` hook plus a React context (`useApp`) from `AppShell`; session in `localStorage`.
- **Why:** App is small; keeps dependencies minimal.
- **Rejected:** Redux, React Query, CSS framework.
- **Status:** Done.

## F07 Placeholder session (2026-10-08)
- **Decision:** Store the whole user object in `localStorage` and send `X-User-Id`.
- **Why:** Mirrors the backend placeholder auth.
- **Status:** To be replaced when the backend issues tokens.

## F08 ExpenseMitra as a mode of the same app (2026-10-12)
- **Decision:** A two-way switch in the shell turns InvestMitra into ExpenseMitra under `/app/expenses`, same session and design system with a coral accent.
- **Why:** One login and one app; users hop between spending and investing.
- **Rejected:** A separate `/expenses` landing site; a separate app.
- **Status:** Done (web). Phase 2 Android app with SMS auto-capture is in the PRD.

## F09 Advisor stands in for admin on the Price Desk (2026-10-11)
- **Decision:** Show/guard Price Desk only for `role === 'ADVISOR'` until a real admin role exists. UI gate only; backend must enforce.
- **Rejected:** Hiding it for everyone (loses the quota view).
- **Status:** Done.

## F10 Fresh price via Stocks.get, not Stocks.quote (2026-10-11)
- **Decision:** The slip refetches the stored price with `Stocks.get` on open. `Stocks.quote` can spend a daily price check and returns 503 for untracked stocks.
- **Status:** Done.

## F11 clientRequestId per distinct order (2026-10-11)
- **Decision:** One id per (portfolio, side, quantity); retrying the same order reuses it, changing the order makes a new one (backend returns 409 for same id with a different order).
- **Status:** Done.

## 2026-10-12 ExpenseMitra simplification
- History switched from day-grouped list with inline Edit/Delete to flat simple rows + expand (same pattern as Markets/Watchlist), new `.xrow` classes in `simple-expenses.css` rather than reusing `.srow` so the two pages stay independent.
- Payment mode removed from the add/edit form (minimal form). Rejected: hiding it behind an "More" toggle (extra control for a rarely used field). It is still shown on expand and filterable in History; edits keep the stored value.
- Kept the could-have-bought cards and sparkle/story share; only copy trimmed.

## 2026-10-12 review fixes
- **Payment mode is back on the QuickAdd form**, as a compact optional "Paid by" chip row (UPI, Cash, Card, Net banking, Other; mirrors backend `PaymentMode`). Defaults to the last used mode (`localStorage['im.lastPaymentMode']`, try/catch); edits show and can change the stored value. This reverses the earlier "dropped from form" decision above. Rejected: a "More" toggle.
- Header uses one `ModeSwitch` element positioned by CSS (header on >=1280px, wrapped row under the brand below it) instead of two copies; the 4-tab advisor row needs ~1270px, so below 1280px tabs move to the bottom bar. Rejected: tablist roles (it is not a tab panel pattern), so `aria-pressed` buttons in a labelled group.
- A session change to a different user in another tab reloads the page (simplest way to drop all in-memory state). Same user: no-op.
- Remembered paths are only list pages from the allowed nav (detail routes fall back to section root; desk only for advisors).
- Month fields accept only `YYYY-MM`; browsers without `type=month` get a select of the last 24 months.
- Data shown for a month/filter is tagged with its key; mismatches show Shimmer rather than stale rows.

## 2026-10-13 Bhavcopy import is the primary Price Desk action
- The BSE import loads every NSE and BSE stock in one run, so it is the primary button; Alpha Vantage (25 calls/day) is secondary. No date picker: the server defaults to the last completed trading day. Rejected: a date field (backfills are an API/admin task, not a beginner one).
