# Frontend audit (2026-10-11, read-only, not yet fixed)

No `dangerouslySetInnerHTML` found; routes and links match after the label renames.

1. CRITICAL: user id lives in localStorage and is sent as `X-User-Id` (api/client.js, api/session.js); editing it impersonates anyone. Needs server-issued token (backend).
2. HIGH: Price Desk shown to and runnable by every signed-in user (App.js, AppShell NAV, Desk.jsx). Add role gate in UI + 403 on server; define an admin role.
3. HIGH: no global 401/403 handling; logout in one tab leaves other tabs signed in. Add axios response interceptor + `storage` listener.
4. HIGH: TradeSlip qty filter allows `-` and `.`; huge digit strings pass. Strip to digits, cap ~9 digits.
5. MEDIUM: double submit (fast Enter) can send two trades; add a useRef in-flight flag (+ idempotency key server-side).
6. MEDIUM: slip uses the price snapshot from when it opened; refetch on open.
7. MEDIUM: SELL pre-fills the whole holding with autofocus, so Enter sells everything; switching portfolio doesn't revalidate qty.
8. MEDIUM: watchlist target allows many decimals / huge values; bad input not reverted; reload wipes half-typed targets in other rows.
9. MEDIUM: `aria-controls` points to panels not rendered while collapsed; open-row state survives list reloads.
10. MEDIUM: Portfolio has no state when server returns 200 with null portfolio; TradeSlip `res.data.holdings.find` needs optional chaining.
11. LOW: login doesn't return to the deep link the user came from.
12. LOW: both navs share `aria-label="Main"`; check slip scrim vs bottom nav at 320px.
