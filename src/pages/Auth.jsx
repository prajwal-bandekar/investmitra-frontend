import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users } from '../api/client';
import { setUser } from '../api/session';
import { Field, useToast } from '../ui';
import './Auth.css';

const COPY = {
  signup: { title: 'Create your account', submit: 'Sign up' },
  login: { title: 'Log in', submit: 'Log in' },
};

function validate(form, signup) {
  const errs = {};
  if (signup && !form.name.trim()) errs.name = 'Please enter your name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address.';
  if (signup && form.password.length < 6) errs.password = 'Use at least 6 characters.';
  if (!signup && !form.password) errs.password = 'Enter your password.';
  return errs;
}

/** Sign-up and login as one printed form with two tabs. */
export default function Auth({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const signup = mode === 'signup';
  const copy = COPY[mode];
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' });
  const [errs, setErrs] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form, signup);
    setErrs(found);
    setServerError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = signup
        ? await Users.signUp({ ...form, name: form.name.trim(), email: form.email.trim() })
        : await Users.login(form.email.trim(), form.password);
      setUser(res.data);
      toast(signup ? 'Welcome! ₹10,00,000 of practice cash is ready.' : 'Welcome back.');
      // A session that expired mid-use leaves its page in sessionStorage; consume it either way.
      let saved = null;
      try { saved = sessionStorage.getItem('im.returnTo'); sessionStorage.removeItem('im.returnTo'); } catch { /* storage blocked */ }
      const from = location.state?.from;
      // Only ever return to a page inside the app; "//host" and other shapes are ignored.
      const ok = (p) => typeof p === 'string' && /^\/app(\/|$)/.test(p);
      navigate(ok(saved) ? saved : ok(from) ? from : '/app/markets', { replace: true });
    } catch (err) {
      setServerError(err.status === 409 ? 'That email already has an account. Log in instead.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__bar wrap">
        <Link to="/" className="display auth__brand">InvestMitra</Link>
        <Link to="/" className="auth__back">← Back</Link>
      </div>
      <div className="auth__body">
        <form className="auth__form" onSubmit={submit} noValidate>
          <div className="segmented auth__tabs">
            <button type="button" aria-pressed={signup} onClick={() => navigate('/signup')}>Sign up</button>
            <button type="button" aria-pressed={!signup} onClick={() => navigate('/login')}>Log in</button>
          </div>
          <div className="auth__fields">
            <h1 className="display">{copy.title}</h1>

            {signup && (
              <Field strong label="Name" value={form.name} onChange={set('name')}
                placeholder="Ananya Rao" autoComplete="name" error={errs.name} />
            )}
            <Field strong label="Email" type="email" value={form.email} onChange={set('email')}
              placeholder="you@example.com" autoComplete="email" error={errs.email} />
            <Field strong label="Password" type="password" value={form.password} onChange={set('password')}
              placeholder={signup ? 'At least 6 characters' : ''} autoComplete={signup ? 'new-password' : 'current-password'}
              error={errs.password} />

            {signup && (
              <fieldset className="auth__roles">
                <legend className="field__label field__label--strong">I am</legend>
                <div>
                  {[['USER', 'Learning'], ['ADVISOR', 'An advisor']].map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={form.role === value}
                      onClick={() => setForm({ ...form, role: value })}>
                      <span className="auth__tick mono">{form.role === value ? '✕' : ''}</span>{label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {serverError && <div className="error-box" role="alert"><strong>✕ {serverError}</strong></div>}

            <button type="submit" className="btn btn--lg btn--primary auth__submit" disabled={busy}>
              {busy ? 'Please wait…' : copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
