# Frontend API usage

All calls go through `src/api/client.js` (base `http://localhost:8080/api` or `REACT_APP_API_URL`). Header `X-User-Id` is added automatically when a user is stored. Full contracts are in `knowledge/backend/api.md`.

## Client functions
| Function | HTTP |
|---|---|
| `Users.signUp(body)` | POST `/users` |
| `Users.login(email, password)` | POST `/users/login` |
| `Users.get(id)` | GET `/users/{id}` |
| `Stocks.search(params)` | GET `/stocks` (`query`, `sector`, `page`, `size`) |
| `Stocks.tracked()` | GET `/stocks/tracked` |
| `Stocks.get(symbol)` | GET `/stocks/{symbol}` (defined, not used by any page yet) |
| `Stocks.quote(symbol)` | GET `/stocks/{symbol}/quote` |
| `Stocks.sectors()` | GET `/sectors` |
| `Portfolios.list()` / `create(body)` / `get(id)` | GET / POST `/portfolios`, GET `/portfolios/{id}` |
| `Portfolios.trade(id, body)` / `trades(id)` | POST / GET `/portfolios/{id}/trades` |
| `Watchlist.list()` / `save(symbol, targetPrice)` / `remove(symbol)` | GET / POST `/watchlist`, DELETE `/watchlist/{symbol}` |
| `PriceDesk.run()` / `runs()` / `quota()` | POST `/admin/price-job/run`, GET `/runs`, GET `/quota` |

## Page to endpoint map
| Page / component | Endpoints |
|---|---|
| Landing | `Stocks.tracked` |
| Auth | `Users.signUp`, `Users.login` |
| AppShell | `Users.get` (refresh cash), `Stocks.tracked` (tape, banner) |
| Markets | `Stocks.search`, `Stocks.sectors`, `Stocks.quote`, `PriceDesk.quota`, `Portfolios.list`, `Watchlist.list/save/remove` |
| Book | `Portfolios.list`, `Portfolios.create`, `Stocks.sectors` |
| Portfolio (`/app/book/:id`) | `Portfolios.get`, `Portfolios.trades` |
| WatchlistPage | `Watchlist.list/save/remove` |
| Desk | `PriceDesk.quota/runs/run`, plus `tracked` from context |
| TradeSlip | `Portfolios.list`, `Portfolios.get`, `Portfolios.trade`, `Portfolios.create` |

## Error handling
Interceptor turns failures into `Error(message)` where message is the server `message`, or "The server is not answering." when offline. `err.status` is used for 404 (Book unknown client, AppShell session reset), 409 (Desk run already in progress), 503 (Markets out of calls).
