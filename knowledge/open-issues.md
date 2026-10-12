# Frontend open issues

- Not visually verified in a browser yet (layout, animations, dark theme, mobile).
- No frontend tests at all (`npm test` has nothing to run).
- Unused dependencies in `package.json`: `bootstrap`, `react-bootstrap`, `gsap`, `scrolltrigger`. Remove after confirming nothing imports them.
- Placeholder session: whole user object in `localStorage`, `X-User-Id` header. Replace with tokens when the backend gets real auth.
- Markets 503 toast says the quota "resets at 05:30 IST"; the backend counts from IST midnight, so the text may be wrong (see backend open-issues).
- Price Desk is hidden for non-advisors in the UI only; the backend admin endpoints still need enforcement and a real admin role.
- `Stocks.get` is now used by TradeSlip.
- Fonts load from Google Fonts at runtime (offline dev shows fallback fonts).
- No password reset flow (stated in Auth copy).
- Repo now has commits; next ingest should switch `.ingest-state.json` to git mode.
- ExpenseMitra not visually verified on a real device yet; story share uses `ctx.filter` blur (Safari may render blobs without blur).
- ExpenseMitra recurring expenses, income, CSV export and SMS capture not built yet.
- `public/index.html` loads a missing `/src/components/Scripts/script.js` (served as HTML, throws "Unexpected token '<'" in the console). Pre-existing; remove the tag.
- Access/admin keys are a stopgap gate (localStorage, shared secret); replace with real auth (JWT). Only the 3 s / 70 s cold-start values are hardcoded.
