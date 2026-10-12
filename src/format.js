// Number and date formatting in the paper's house style: ₹1,23,456.78, true minus signs, arrows.

const NF = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NI = new Intl.NumberFormat('en-IN');
const E = 0.004;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isNum = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v));

export const money = (v) => (isNum(v) ? (Number(v) < -E ? '−' : '') + '₹' + NF.format(Math.abs(Number(v))) : '-');

/** Signed money: +₹1,000.00 / −₹500.00 / ±₹0.00 */
export const signedMoney = (v) => {
  if (!isNum(v)) return '-';
  const n = Number(v);
  return (n > E ? '+' : n < -E ? '−' : '±') + '₹' + NF.format(Math.abs(n));
};

export const pct = (v) => {
  if (!isNum(v)) return '-';
  const n = Number(v);
  return (n > E ? '+' : n < -E ? '−' : '±') + Math.abs(n).toFixed(2) + '%';
};

export const arrow = (v) => (!isNum(v) ? '' : Number(v) > E ? '▲' : Number(v) < -E ? '▼' : '■');

/** CSS class for a gain, loss or flat value. Colour is always paired with a sign. */
export const tone = (v) => (!isNum(v) ? 'flat' : Number(v) > E ? 'gain' : Number(v) < -E ? 'loss' : 'flat');

export const qty = (v) => (isNum(v) ? NI.format(Number(v)) : '-');

const parts = (iso) => String(iso).slice(0, 10).split('-').map(Number);

/** "9 Oct" */
export const shortDate = (iso) => {
  if (!iso) return '-';
  const [, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
};

/** "9 Oct 2026" */
export const longDate = (iso) => {
  if (!iso) return '-';
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** "10 Oct, 07:00" in IST, for timestamps */
export const stamp = (instant) => {
  if (!instant) return '-';
  return new Date(instant).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

/** "IM-2031" to 2031; returns null for anything else. */
export const parseClientId = (s) => {
  const m = /^IM-(\d{1,9})$/i.exec(String(s || '').trim());
  return m ? Number(m[1]) : null;
};

/** Whole rupees, no paise: ₹1,49,900 */
export const rupees = (v) => (isNum(v) ? (Number(v) < -E ? '−' : '') + '₹' + NI.format(Math.round(Math.abs(Number(v)))) : '-');

/** Current month in IST as "2026-10". */
export const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);

/** "2026-10" to "October 2026" */
export const monthName = (ym) => {
  if (!ym) return '-';
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

/** Today in IST as "2026-10-12". */
export const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
