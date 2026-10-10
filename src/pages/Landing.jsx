import { Link } from 'react-router-dom';
import { Stocks } from '../api/client';
import letters from '../content/letters';
import { arrow, longDate, money, pct, tone } from '../format';
import { isMarketOpen, istDateline, latestClose } from '../lib/market';
import useRemote from '../lib/useRemote';
import { Stamp, Tape } from '../ui';
import './Landing.css';

const STEPS = [
  ['Open your book.', 'Sign up and we credit ₹10,00,000 of pretend money. Learners get a book of their own; advisors can open folios for clients.'],
  ['Read the wire.', 'Every weekday morning we pull closing prices from Alpha Vantage. Old ones get a STALE stamp, so you always know how fresh your numbers are.'],
  ['Trade, lose, learn.', 'Buy and sell at the close. Every trade goes in the ledger with its realised P&L. Bad calls cost nothing here, so make them here.'],
];

export default function Landing() {
  const { data: tracked } = useRemote(() => Stocks.tracked(), []);
  const priced = (tracked || []).filter((s) => s.price);
  const latest = latestClose(priced.map((s) => s.price));
  const open = isMarketOpen();

  const sorted = [...priced].sort((a, b) => (b.price.changePercent ?? 0) - (a.price.changePercent ?? 0));
  const movers = sorted.length > 5 ? [...sorted.slice(0, 3), ...sorted.slice(-2)] : sorted;

  return (
    <div className="landing">
      <div className="wrap">
        <div className="landing__dateline mono">
          <span>{istDateline()} · Mumbai</span>
          <span>Vol. 1 · Free edition · ₹0.00</span>
          <Link to="/login" className="landing__login">Log in →</Link>
        </div>
        <header className="landing__masthead">
          <div className="display landing__title">InvestMitra</div>
          <div className="landing__motto">
            <span>The paper-trading daily</span><span aria-hidden="true">·</span>
            <span>NIFTY 500 edition</span><span aria-hidden="true">·</span>
            <span>All money pretend, all lessons real</span>
          </div>
        </header>
        <div className="double-rule" />
      </div>
      <div className="wrap wrap--flush"><Tape stocks={tracked} latest={latest} /></div>

      <div className="wrap">
        <section className="landing__lead">
          <div className="landing__story">
            <div className="kicker">Lead story · Page 1</div>
            <h1 className="display">Managing portfolios, made easy.</h1>
            <p className="landing__deck">Practise on the NIFTY 500 with ₹10,00,000 that isn't yours. Lose it here, not out there.</p>
            <div className="landing__ctas">
              <Link to="/signup" className="btn btn--lg btn--primary">Open your book</Link>
              <Link to="/login" className="btn btn--lg">Log in</Link>
            </div>
            <p className="landing__byline">By our Markets Desk. Free forever, because there's nothing to charge for.</p>
          </div>

          <aside className="landing__report">
            <div className="landing__report-head">
              <span className="kicker">Market report</span>
              <Stamp tone={open ? 'gain' : 'loss'}>{open ? 'Market open' : 'Market closed'}</Stamp>
            </div>
            <p className="display landing__report-title">{open ? 'Dalal Street is trading.' : 'Dalal Street is asleep.'}</p>
            <p style={{ margin: 0 }}>
              {latest ? `Prices from the close of ${longDate(latest)}.` : 'The first morning wire hasn’t run yet.'}
            </p>
            <div className="kicker landing__movers-head">Latest movers</div>
            {movers.length ? movers.map((m) => (
              <div key={m.symbol} className="landing__mover mono">
                <b>{m.symbol}</b>
                <span>{money(m.price.close)}</span>
                <span className={tone(m.price.changePercent)}>{arrow(m.price.changePercent)} {pct(m.price.changePercent)}</span>
              </div>
            )) : <p className="muted italic" style={{ margin: '10px 0 0' }}>No closes on file yet.</p>}
            <p className="landing__note">Daily closes via our morning wire. Nothing here is live, and that's the point.</p>
          </aside>
        </section>

        <section className="landing__section">
          <div className="landing__section-head">
            <h2 className="display">How it works</h2>
            <span className="kicker">Three columns · No jargon</span>
          </div>
          <div className="landing__steps">
            {STEPS.map(([title, body], i) => (
              <article key={title}>
                <div className="landing__step-num"><span className="display">{i + 1}</span><span /></div>
                <h3 className="display">{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__section">
          <div className="landing__section-head">
            <h2 className="display">Letters to the Editor</h2>
            <span className="kicker">The editor endorses none of this</span>
          </div>
          <div className="landing__letters">
            {letters.map((l) => (
              <article key={l.name} className="letter">
                <Stamp tone={l.stampTone} tilt={l.tilt} onPaper2 className="letter__stamp">{l.stamp}</Stamp>
                <div className="letter__who">
                  <img src={l.avatar} alt="" className="letter__avatar" loading="lazy" />
                  <div>
                    <div className="letter__name">{l.name}</div>
                    <div className="letter__title">{l.title}</div>
                  </div>
                </div>
                <blockquote>{l.quote ? `“${l.quote}”` : <span className="muted italic">Letter awaiting the editor.</span>}</blockquote>
                <div className="letter__foot mono">{l.footer}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__closer">
          <p className="display">Ready to lose money that isn't yours?</p>
          <div className="landing__ctas" style={{ marginTop: 0 }}>
            <Link to="/signup" className="btn btn--lg btn--primary">Open your book</Link>
            <Link to="/login" className="btn btn--lg">Log in</Link>
          </div>
        </section>
        <footer className="landing__footer mono">
          InvestMitra is a paper-trading simulator. No real money, no real shares, not SEBI-registered, not advice.
          Prices are daily closes from Alpha Vantage and can be stale. Printed nowhere, read everywhere.
        </footer>
      </div>
    </div>
  );
}
