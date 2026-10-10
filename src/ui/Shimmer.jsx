const WORDS = '··· FETCHING THE WIRE ··· RELIANCE ··· TCS ··· HDFCBANK ··· INFY ··· ITC ··· SBIN ··· LT ··· MARUTI ';
const WIDTHS = ['80%', '55%', '70%', '45%', '65%'];

/** Loading state: a ticker-tape crawl over shimmering ledger rows. */
export default function Shimmer({ rows = 5 }) {
  return (
    <div className="shimmer" role="status" aria-label="Loading">
      <div className="shimmer__tape">
        <div>
          <span>{WORDS + WORDS}</span>
          <span>{WORDS + WORDS}</span>
        </div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="shimmer__row">
          {WIDTHS.map((w, j) => <span key={j} className="shimmer__bar" style={{ width: w }} />)}
        </div>
      ))}
    </div>
  );
}
