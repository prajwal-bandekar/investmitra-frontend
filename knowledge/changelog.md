# Frontend changelog

Newest at the bottom. Append one `## YYYY-MM-DD` section per ingest.

## 2026-10-06
- Project copied and renamed to `investmitra-frontend`.

## 2026-10-08 to 2026-10-09
- Frontend rebuilt from the Claude Design export: tokens, themes, Stamp, Tape, Shimmer, StateBlock, Field, Toast; pages Landing, Auth, AppShell, Markets, Book, Portfolio, WatchlistPage, Desk.
- `api/client.js` against the new backend (`X-User-Id`, envelope unwrapping).
- Refinement with design-taste-frontend: Glossary, Term tooltips, first-run hints, plainer labels.
- `TradeSlip`: validation, shake, printed receipt, tear-up and filing animations, inline "open a folio".

## 2026-10-10
- Knowledge base created; initial `.ingest-state.json` written with sha256 hashes (no git commits).

## 2026-10-11 (security audit fixes, #1 out of scope)
- Price Desk tab and `/app/desk` limited to ADVISOR (`RequireAdvisor.jsx`); others go to Markets.
- Axios 401 interceptor clears the session and goes to /login; `storage` listener syncs sessions across tabs.
- TradeSlip: digits-only qty (max 8), in-flight ref guard, `clientRequestId` (new id per distinct order, reused on retry), fresh price via `Stocks.get` on open, SELL starts at 1 with "Sell all (N)" and clamps on portfolio change, optional-chained holdings.
- Watchlist target: 12 integer digits, 2 decimals, revert on invalid, reload keeps unsaved edits.
- Expand rows: `aria-controls` only while open; open state reset when the item disappears.
- Portfolio empty state; login returns to `location.state.from` under /app; distinct nav aria-labels; scrim z-index 25 above bottom nav (z 10).
- Markets: sector counts, First/Last paging, "Get price" only for `tracked` stocks (others show "Price arrives with the evening update").
- Book: optional "Advisor ID" when a normal user creates a portfolio (`advisorId`); advisor 403 message.

## 2026-10-12
- ExpenseMitra: mode switch in AppShell, Overview, History, Budgets, QuickAdd, WishCard with sparkle and story share, `Expenses` API, `rupees`/`thisMonth`/`monthName`/`todayIso` in `format.js`.
- Review fix: could-have-bought headline uses "an" before vowel-initial products ("an iPhone Pro Max").
- Review fix: QuickAdd and Budgets send amounts and limits as JSON numbers, not strings.
- ExpenseMitra simplified for beginners (same theme, no API changes): headings match tab labels (Ledger, History, Budgets) with one plain line, kickers and editorial headlines dropped, labelled Month/Category/Paid by inputs (`Field`), History is now simple rows (date, category, amount) that expand for note, paid by, Edit and Delete (one open at a time, resets if the entry disappears), QuickAdd reduced to amount, category, date, optional note (payment mode stays UPI on create and unchanged on edit), could-have-bought copy trimmed. New `pages/expenses/simple-expenses.css`.
- Review fixes (frontend only): Budgets tracks `loadedMonth` (form cleared and Save/Copy disabled until the selected month loads, stale responses ignored, re-fetch after save, limits `/^\d{1,12}(\.\d{1,2})?$/`, "Copy last month" only fills the form). New shared `ui/MonthPicker` (native month input or a 24-month select; only `YYYY-MM` is accepted) used by Overview, History, Budgets. Overview/History tag data with the month/filter key and show Shimmer until it matches; error and old rows never together. History moves focus to the next row (or heading) after a delete. QuickAdd: "Paid by" chip row restored (last used mode in `im.lastPaymentMode`, edits show the stored value), amount sanitising (".5", "249.", commas, 12 digits, 2 decimals), in-flight guard, no close during the print animation, Tab focus trap, focus returns to the opener. AppShell: other-account change in another tab does `window.location.reload()`, remembered paths validated (no detail pages, `/app/desk` advisors only, cleared on logout via `clearUser`), single `ModeSwitch` (`aria-pressed` buttons in a labelled group), header breakpoint moved to 1280px with the switch wrapping onto its own row below it, cash label hidden at 480px. TradeSlip clears owner cash on portfolio change and shows "…" until loaded. Markets watch toggle has a per-symbol busy guard and re-syncs on failure. 401 saves the path to `sessionStorage['im.returnTo']`; Auth uses it after login (only `/app...`) and clears it.

## 2026-10-12 deploy prep
- Added `vercel.json` (SPA rewrite), `.env.example`, `knowledge/deploy.md`.
- Access-key gate (`api/access.js`, `pages/AccessGate.jsx`, interceptor headers, Desk admin-key field) and Render cold-start banner with 70 s first-call timeout. `REACT_APP_API_URL` was already supported.
- **Decision:** shared access key instead of JWT for now; the 401 handler tells access-key 401s apart from session 401s by message. Rejected: reusing the /login redirect for both. Key changes reload the page rather than re-running failed requests.

## 2026-10-13
- Price Desk: primary "Run BSE import" button (`PriceDesk.runBhavcopy` -> `POST /admin/bhavcopy/run`, 120 s timeout, no date so the server picks the last completed trading day) with a note about NSE and BSE closing prices and the 7:30 PM weekday run. Shows "Importing… this can take a minute" while running; toasts "Imported 5,017 prices for 12 Oct.", "An import is already running." on 409, shows the admin-key field on 403, reloads the log afterwards.
- The Alpha Vantage button is now the secondary "Update 20 tracked stocks (Alpha Vantage)"; its note mentions the 25 calls/day free limit.
- Log rows show their source (BSE import or Alpha Vantage; a missing `source` means Alpha Vantage) in the row and in the expanded details.

## 2026-10-13 (ExpenseMitra review fixes, branch fix/expensemitra-review)
- QuickAdd: empty date is rejected ("Pick a date.") instead of saving as today; new expenses start with no category selected; editing an expense in an archived category shows it as a "(archived)" chip.
- Breakpoints aligned with the 1279px bottom tab bar: app toasts sit above it, the + button shows wherever the tab bar does, and expense pages get 96px bottom padding so the button never covers the last row.
- Overview: "Over budget" stamp sits in the flow (no longer overlaps the amount on phones); category name and amount wrap on narrow screens; budget marker clamped inside the bar.
- Budgets: all rows share the same 10px side padding so labels and inputs line up with "Whole month".
- Mode switch spans the full width below 1280px (360px cap removed).
- MonthPicker fallback select offers the next 12 months when there is no max (Budgets on browsers without a month input).
- Removed unused History `.entries`/`.day` styles, `.receipt-form__row` and the duplicate `.month-input` width.
