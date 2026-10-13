import { rupees } from '../../format';

const R = 48;
const C = 2 * Math.PI * R;

/**
 * Salary split as a donut: commitments, savings, spent, remaining. Centre shows what is free to spend.
 * Segments are plain stroke-dasharray arcs, so no chart library is needed.
 */
export default function MoneyRing({ plan }) {
  const income = Number(plan.totalIncome);
  const committed = Math.max(0, Number(plan.committedTotal));
  const savings = Math.max(0, Number(plan.savingsTotal));
  const free = Number(plan.freeToSpend);
  const remaining = Number(plan.remaining);
  const spent = Math.max(0, Math.min(Number(plan.spent), free));
  const left = Math.max(remaining, 0);
  const over = remaining < 0;

  const segs = [
    { key: 'committed', label: 'Committed', value: committed },
    { key: 'savings', label: 'Set aside', value: savings },
    { key: 'spent', label: 'Spent', value: spent },
    { key: 'left', label: 'Left', value: left },
  ];
  // If commitments exceed income the segments are scaled so the ring is still exactly full.
  const base = Math.max(income, segs.reduce((n, s) => n + s.value, 0)) || 1;
  const shown = segs.filter((s) => s.value > 0);
  let offset = 0;
  const arcs = shown.map((s) => {
    const len = (s.value / base) * C;
    const gap = shown.length > 1 ? Math.min(1.5, len / 2) : 0;
    const arc = { ...s, dash: `${Math.max(len - gap, 0)} ${C}`, offset: -offset };
    offset += len;
    return arc;
  });

  return (
    <div className="ring">
      <div className="ring__chart">
        <svg viewBox="0 0 120 120" role="img"
          aria-label={`${rupees(remaining)} free to spend of ${rupees(income)}`}>
          <defs>
            <pattern id="ring-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="ring__hatchbg" />
              <line x1="0" y1="0" x2="0" y2="5" className="ring__hatchline" />
            </pattern>
          </defs>
          <circle cx="60" cy="60" r={R} className="ring__track" />
          <g transform="rotate(-90 60 60)">
            {arcs.map((a) => (
              <circle key={a.key} cx="60" cy="60" r={R} className={`ring__arc ring__arc--${a.key}`}
                strokeDasharray={a.dash} strokeDashoffset={a.offset} />
            ))}
          </g>
        </svg>
        <div className="ring__centre">
          <span className="ring__label">Free to spend</span>
          <span className={`ring__big mono${over ? ' loss' : ''}`}>{rupees(remaining)}</span>
          <span className="ring__small mono">of {rupees(income)}</span>
        </div>
      </div>
      <ul className="ring__legend">
        {segs.filter((s) => s.value > 0).map((s) => (
          <li key={s.key}>
            <i className={`ring__sw ring__sw--${s.key}`} aria-hidden="true" />
            <span>{s.label}</span>
            <span className="mono">{rupees(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
