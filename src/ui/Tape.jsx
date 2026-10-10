import { arrow, money, pct, shortDate, tone } from '../format';

/**
 * Scrolling ticker tape of closing prices. The run is rendered twice so the loop is seamless.
 * @param stocks  StockView[] from /stocks/tracked; stocks without a price are skipped
 * @param latest  ISO date of the newest close; older closes are marked stale
 */
export default function Tape({ stocks, latest }) {
  const items = (stocks || []).filter((s) => s.price);
  if (!items.length) return null;

  const run = (key) => (
    <div key={key} style={{ display: 'flex', flex: 'none' }} aria-hidden={key === 'b'}>
      {items.map((s) => (
        <span key={s.symbol} className="tape__item">
          <b style={{ fontWeight: 600 }}>{s.symbol}</b>
          <span>
            {money(s.price.close)}
            {latest && s.price.asOf < latest ? ` · stale, ${shortDate(s.price.asOf)}` : ''}
          </span>
          <span className={tone(s.price.changePercent)}>
            {arrow(s.price.changePercent)} {pct(s.price.changePercent)}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="tape" aria-label="Closing prices">
      <div className="tape__label">CLOSE · {latest ? shortDate(latest).toUpperCase() : '-'}</div>
      <div className="tape__track">
        <div className="tape__run">{[run('a'), run('b')]}</div>
      </div>
    </div>
  );
}
