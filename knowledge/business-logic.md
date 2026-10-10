# Frontend logic

## Data flow
1. `api/client.js` is the only HTTP layer. Pages call `Users/Stocks/Portfolios/Watchlist/PriceDesk` and read `res.data` (envelope already unwrapped one level).
2. Read pages use `useRemote(fetcher, deps)`; mutations call the API then `reload()` or an `onDone` callback.
3. Session: the user object returned by login/signup is stored in `localStorage` (`investmitra.user`). Every request gets `X-User-Id` from it (placeholder auth; no token).
4. `AppShell` refreshes the user via `GET /users/{id}` on mount and after each trade (`refreshUser`) to keep cash current; a 404 clears the session.

## `useApp()` context (provided by `AppShell`)
`{ user, refreshUser, tracked, reloadTracked, latest, openSlip }`.
- `tracked`: `GET /stocks/tracked` result (feeds Tape and Desk).
- `latest`: newest `price.asOf` among tracked stocks; anything older is "stale".
- `openSlip({ stock, side, portfolioId, latest, onDone })`: opens the order slip from any page. `onDone` is called after a successful trade; the shell also calls `refreshUser()`.

## Order slip (`TradeSlip.jsx`)
- Loads folios (`Portfolios.list`), usable ones = no sector lock or sector equals the stock sector; locked-out folios are listed under "Not shown". Selected folio detail gives `held` quantity of the stock and `ownerCash` (the client's cash for advisors).
- If no usable folio: inline "open a folio" form creates one (`sector: null`) and continues.
- **Validation (client side, mirrors the server):** quantity must be whole digits `> 0`; BUY needs `total <= cash` (message shows affordable shares); SELL needs `qty <= held`. Invalid submit triggers a shake and an error box. Server errors (e.g. 400, 409) are shown in the same box and also shake.
- Price is the stored close (`stock.price.close`); no price disables the order with a "Get price first" notice; stale price shows a warning but still trades.
- Cash after = cash minus total (buy) or plus total (sell); shown in red if negative.
- On success: `done` holds the `TradeResult`; the slip is replaced by a receipt. Receipt "mood": `buy`, `win` (realised > 0), `loss` (< 0), `flat`. The receipt auto-files after about 4.5s or on "File it"; toast "Bought/Sold N SYMBOL. Filed."
- Esc closes (files if done). Clicking the scrim closes. "Tear up slip" cancels with a tear animation. `prefers-reduced-motion` skips all timed animations.

## Animations (logic side)
Phases `slip` > `tearing` (760ms then close) or `filing` (800ms then close). Shake restarts via `requestAnimationFrame`. Timers are tracked in a ref and cleared on unmount. CSS keyframes are described in ui-design.md.

## Market open/closed
`lib/market.js` converts the clock to IST (UTC+5:30) and says open between 09:15 and 15:30 on weekdays. Holidays are not modelled. The banner in `AppShell` shows MARKET OPEN/CLOSED and "Prices from the close of <latest>". The Landing page uses the same helper.

## Markets page rules
- Search is debounced 250ms and resets to page 0. Page size 20. Results come from the DB (no Alpha Vantage cost).
- "Get price" calls `GET /stocks/{symbol}/quote`; toast depends on `source` (ALPHA_VANTAGE spent a call) and `fresh`. HTTP 503 shows "Out of wires for today" (the 05:30 IST reset text is a known inaccuracy, see open-issues).
- Watch toggle: add sets target to `floor(close*95)/100` (5% below last close); remove deletes.

## Watchlist rules
Target input is saved when changed; blank clears it; must be `> 0`. `targetReached` (server) renders the TARGET HIT stamp.

## Book rules
Advisor may enter a client ID like `IM-0031`; `parseClientId` converts to the numeric `ownerId` or shows an error. A 404 from the API shows "No account with that client ID".

## Formatting
Rupee amounts use `en-IN` grouping (`₹1,23,456.78`), true minus sign, `▲ ▼ ■` arrows; colour is always paired with a sign (`tone()` gives gain/loss/flat).
