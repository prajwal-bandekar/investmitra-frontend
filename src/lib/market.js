// Indian market clock. BSE trades 09:15-15:30 IST, Monday to Friday. Exchange holidays aren't modelled.

const IST_OFFSET_MIN = 330;

function nowInIst(now = new Date()) {
  return new Date(now.getTime() + (IST_OFFSET_MIN + now.getTimezoneOffset()) * 60000);
}

export function isMarketOpen(now = new Date()) {
  const ist = nowInIst(now);
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  return minutes >= 9 * 60 + 15 && minutes < 15 * 60 + 30;
}

/** Today's date in IST, e.g. "Saturday, 10 October 2026". */
export function istDateline(now = new Date()) {
  return nowInIst(now).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function istShortDate(now = new Date()) {
  return nowInIst(now).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Newest "as of" date across stored prices: the close everything should match. */
export function latestClose(prices) {
  return prices.reduce((max, p) => (p && p.asOf && (!max || p.asOf > max) ? p.asOf : max), null);
}
