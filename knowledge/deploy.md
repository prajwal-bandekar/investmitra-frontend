# Deploy (Vercel frontend + Render backend, free tiers)

## Frontend on Vercel
1. Import the private GitHub repo in Vercel (New Project). Framework preset: Create React App. Build `npm run build`, output `build` (defaults; `vercel.json` only adds the SPA rewrite so deep links like `/app/markets` work on refresh).
2. Environment variables (Project Settings > Environment Variables; they are baked in at build time):
   - `REACT_APP_API_URL`: the Render backend URL including `/api`, e.g. `https://<service>.onrender.com/api`.
   - `REACT_APP_REQUIRE_ACCESS_KEY`: `true` if the backend enforces the access key, so the key screen shows before any request.
3. Redeploy after changing any variable (CRA reads them at build, not runtime).

## Backend (Render)
- `CORS_ORIGINS` must include the Vercel URL (e.g. `https://<project>.vercel.app`), no trailing slash. Add preview/custom domains too if used.

## Access gate (temporary, instead of JWT)
- Backend may require `X-Access-Key` on every `/api` call (401 "Access key required") and `X-Admin-Key` on `/api/admin/**` (403).
- `src/api/access.js` holds the keys in `localStorage` (`investmitra.accessKey`, `investmitra.adminKey`) and a small store; the axios interceptor adds `X-Access-Key` to every call and `X-Admin-Key` to `/admin` calls.
- A 401 whose message matches "access key required" shows `AccessGate` (key screen); any other 401 keeps the old clear-session -> /login behaviour.
- Price Desk: a 403 shows an "Admin key" field; saving stores it and reloads quota and log.
- Keys are typed by the owner; none are in code or env files.

## Cold start (Render free tier sleeps)
- The first API call gets a 70 s timeout; if it is still pending after 3 s, a banner says "Waking up the server, this can take up to a minute". It clears when any first response (or error) arrives.
