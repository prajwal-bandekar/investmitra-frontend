/**
 * Underlined form field, like a line on a printed application form.
 * @param number  optional field number shown before the label ("01")
 * @param error   message shown under the field, prefixed with ✕
 * @param mono    monospace input (emails, IDs, prices)
 * @param as      'input' (default) or 'select'
 */
export default function Field({ label, number, error, mono, large, strong, as = 'input', children, className = '', style, ...rest }) {
  const inputClass = ['field__input', mono && 'field__input--mono', large && 'field__input--lg'].filter(Boolean).join(' ');
  const Control = as;
  return (
    <label className={`field ${className}`} style={style}>
      <span className={`field__label${strong ? ' field__label--strong' : ''}`}>
        {number && <span className="mono">{number}</span>}
        {label}
      </span>
      <Control className={inputClass} aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </Control>
      {error && <span role="alert" className="field__error">✕ {error}</span>}
    </label>
  );
}
