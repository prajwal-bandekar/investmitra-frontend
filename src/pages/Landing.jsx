import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stocks } from '../api/client';
import letters from '../content/letters';
import { latestClose } from '../lib/market';
import useRemote from '../lib/useRemote';
import { Stamp, Tape } from '../ui';
import './Landing.css';

const STEPS = [
  ['Sign up', 'Get ₹10,00,000 of practice money.'],
  ['Pick stocks', 'Browse NIFTY 500 companies and prices.'],
  ['Buy and sell', 'Track your profit and loss. Nothing is at risk.'],
];

function Letter({ l }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="letter">
      <Stamp tone={l.stampTone} tilt={l.tilt} onPaper2 className="letter__stamp">{l.stamp}</Stamp>
      <div className="letter__who">
        <img src={l.avatar} alt="" className="letter__avatar" loading="lazy" />
        <div>
          <div className="letter__name">{l.name}</div>
          <div className="letter__title">{l.title}</div>
        </div>
      </div>
      <blockquote className={open ? '' : 'letter__clamp'}>“{l.quote}”</blockquote>
      <button type="button" className="btn btn--link letter__more" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Show less' : 'Read more'}
      </button>
    </article>
  );
}

export default function Landing() {
  const { data: tracked } = useRemote(() => Stocks.tracked(), []);
  const priced = (tracked || []).filter((s) => s.price);
  const latest = latestClose(priced.map((s) => s.price));

  return (
    <div className="landing">
      <div className="wrap">
        <div className="landing__bar">
          <span className="display landing__brand">InvestMitra</span>
          <Link to="/login" className="landing__login">Log in</Link>
        </div>
        <div className="double-rule" />
      </div>
      <div className="wrap wrap--flush"><Tape stocks={tracked} latest={latest} /></div>

      <div className="wrap">
        <section className="landing__lead">
          <h1 className="display">Learn investing with pretend money.</h1>
          <p className="landing__deck">Trade NIFTY 500 stocks with ₹10,00,000 of practice cash. No real risk.</p>
          <div className="landing__ctas">
            <Link to="/signup" className="btn btn--lg btn--primary">Start free</Link>
          </div>
        </section>

        <section className="landing__section">
          <h2 className="display">How it works</h2>
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
          <h2 className="display">What investors say</h2>
          <div className="landing__letters">
            {letters.map((l) => <Letter key={l.name} l={l} />)}
          </div>
        </section>

        <section className="landing__closer">
          <p className="display">Ready to try it?</p>
          <Link to="/signup" className="btn btn--lg btn--primary">Start free</Link>
        </section>
        <footer className="landing__footer mono">
          Practice simulator only. No real money or shares. Not investment advice. Prices are daily closes and may be out of date.
        </footer>
      </div>
    </div>
  );
}
