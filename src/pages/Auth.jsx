import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users } from '../api/client';
import { setUser } from '../api/session';
import { Field, useToast } from '../ui';
import './Auth.css';

const COPY = {
  signup: {
    kind: 'Application',
    title: 'Application for pretend shares',
    dek: 'Allotment is instant and guaranteed, which is how you know it’s fake.',
    fine: 'I understand none of this money is real, and neither are the losses.',
    submit: 'File application',
  },
  login: {
    kind: 'Holder login',
    title: 'Existing holders, this way',
    dek: 'Your book opens where you left it.',
    fine: 'Forgot your password? There’s no reset desk yet. File a new application.',
    submit: 'Log in',
  },
};

function validate(form, signup) {
  const errs = {};
  if (signup && !form.name.trim()) errs.name = 'We need a name for the share certificate.';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'That email wouldn’t get past a KYC desk.';
  if (signup && form.password.length < 6) errs.password = 'Six characters at least. “nifty” is not a password.';
  if (!signup && !form.password) errs.password = 'Password, please.';
  return errs;
}

/** Sign-up and login as one printed form with two tabs. */
export default function Auth({ mode }) {
  const navigate = useNavigate();
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
      toast(signup ? 'Application allotted. ₹10,00,000 credited. None of it is real.' : 'Welcome back. Your book is where you left it.');
      navigate('/app/markets');
    } catch (err) {
      setServerError(err.status === 409 ? 'That email already has a book. Log in instead.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  const n = (i) => String(signup ? i : i - 1).padStart(2, '0');

  return (
    <div className="auth">
      <div className="auth__bar wrap">
        <Link to="/" className="display auth__brand">InvestMitra</Link>
        <Link to="/" className="mono auth__back">← Front page</Link>
      </div>
      <div className="auth__body">
        <form className="auth__form" onSubmit={submit} noValidate>
          <div className="auth__formhead mono">
            <span>Form IM-1 · {copy.kind}</span><span>No. 000417</span>
          </div>
          <div className="segmented auth__tabs">
            <button type="button" aria-pressed={signup} onClick={() => navigate('/signup')}>New application</button>
            <button type="button" aria-pressed={!signup} onClick={() => navigate('/login')}>Existing holder</button>
          </div>
          <div className="auth__fields">
            <h1 className="display">{copy.title}</h1>
            <p className="auth__dek">{copy.dek}</p>

            {signup && (
              <Field number="01" strong large label="Full name, as on the certificate" value={form.name}
                onChange={set('name')} placeholder="Ananya Rao" autoComplete="name" error={errs.name} />
            )}
            <Field number={n(2)} strong mono label="Email" type="email" value={form.email} onChange={set('email')}
              placeholder="you@college.ac.in" autoComplete="email" error={errs.email} />
            <Field number={n(3)} strong mono label="Password" type="password" value={form.password} onChange={set('password')}
              placeholder={signup ? 'Six characters or more' : ''} autoComplete={signup ? 'new-password' : 'current-password'}
              error={errs.password} />

            {signup && (
              <fieldset className="auth__roles">
                <legend className="field__label field__label--strong"><span className="mono">04</span>I'm here as (tick one)</legend>
                <div>
                  {[['USER', "I'm here to learn"], ['ADVISOR', "I'm an advisor"]].map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={form.role === value}
                      onClick={() => setForm({ ...form, role: value })}>
                      <span className="auth__tick mono">{form.role === value ? '✕' : ''}</span>{label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {serverError && <div className="error-box" role="alert"><strong>✕ {serverError}</strong></div>}

            <div className="auth__foot">
              <p>{copy.fine}</p>
              <button type="submit" className="btn btn--stamp" disabled={busy}>{busy ? 'Filing…' : copy.submit}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
