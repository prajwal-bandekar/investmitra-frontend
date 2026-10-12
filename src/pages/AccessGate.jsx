import { useState, useSyncExternalStore } from 'react';
import { Field } from '../ui';
import { getGateState, setAccessKey, subscribeGate } from '../api/access';
import './Auth.css';

/** Shows the access-key screen when the server asks for one, and a wake-up note during a slow first load. */
export default function AccessGate({ children }) {
  const { needKey, rejected, waking } = useSyncExternalStore(subscribeGate, getGateState);
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) { setErr('Enter the access key.'); return; }
    setAccessKey(value);
    window.location.reload(); // simplest way to refetch everything with the key attached
  };

  if (needKey) {
    return (
      <div className="auth">
        <div className="auth__bar wrap"><span className="display auth__brand">InvestMitra</span></div>
        <div className="auth__body">
          <form className="auth__form" onSubmit={submit} noValidate>
            <div className="auth__fields">
              <h1 className="display">Enter access key</h1>
              <p style={{ margin: 0 }}>This site is private for now. Ask the owner for the key.</p>
              <Field strong label="Access key" type="password" value={value} onChange={(e) => { setValue(e.target.value); setErr(''); }}
                autoComplete="off" autoFocus error={err} />
              {rejected && !err && <div className="error-box" role="alert"><strong>✕ That key was not accepted.</strong></div>}
              <button type="submit" className="btn btn--lg btn--primary auth__submit">Continue</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {waking && (
        <div role="status" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '12px 16px', textAlign: 'center',
          background: 'var(--paper)', color: 'var(--ink)', borderBottom: '3px double var(--ink)' }}>
          Waking up the server, this can take up to a minute…
        </div>
      )}
      {children}
    </>
  );
}
