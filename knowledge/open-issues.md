# Frontend open issues

- Not visually verified in a browser yet (layout, animations, dark theme, mobile).
- No frontend tests at all (`npm test` has nothing to run).
- Unused dependencies in `package.json`: `bootstrap`, `react-bootstrap`, `gsap`, `scrolltrigger`. Remove after confirming nothing imports them.
- Placeholder session: whole user object in `localStorage`, `X-User-Id` header. Replace with tokens when the backend gets real auth.
- Markets 503 toast says the quota "resets at 05:30 IST"; the backend counts from IST midnight, so the text may be wrong (see backend open-issues).
- Price Desk is visible to every user (backend admin endpoints are unprotected).
- `Stocks.get` in `api/client.js` is unused.
- Fonts load from Google Fonts at runtime (offline dev shows fallback fonts).
- No password reset flow (stated in Auth copy).
- No git commits yet in this repo.
