import { monthName, thisMonth } from '../format';
import Field from './Field';

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

let nativeMonth;
const supportsMonth = () => {
  if (nativeMonth === undefined) {
    try {
      const probe = document.createElement('input');
      probe.setAttribute('type', 'month');
      nativeMonth = probe.type === 'month';
    } catch { nativeMonth = false; }
  }
  return nativeMonth;
};

const recentMonths = (count) => {
  const [y, m] = thisMonth().split('-').map(Number);
  return Array.from({ length: count + 1 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
};

/**
 * Month field. Uses the native month input where the browser has one, otherwise a select of the last 24 months
 * plus the current one. `onChange` only ever receives a "YYYY-MM" string.
 */
export default function MonthPicker({ label = 'Month', value, onChange, max, className = 'month-input' }) {
  const accept = (v) => { if (MONTH_RE.test(v) && (!max || v <= max)) onChange(v); };
  if (supportsMonth()) {
    return <Field label={label} type="month" mono className={className} value={value} max={max}
      onChange={(e) => accept(e.target.value)} />;
  }
  const options = recentMonths(24);
  if (!options.includes(value)) options.unshift(value);
  return (
    <Field label={label} as="select" mono className={className} value={value} onChange={(e) => accept(e.target.value)}>
      {options.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
    </Field>
  );
}
