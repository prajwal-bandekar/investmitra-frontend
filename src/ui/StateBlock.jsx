import Stamp from './Stamp';

/**
 * Empty or error state written in the paper's voice.
 * @param stamp   optional stamp text, e.g. "Wire down"
 * @param error   renders as an alert with a loss-coloured stamp
 * @param plain   no top rule (used when the block sits under a page header)
 */
export default function StateBlock({ stamp, title, children, action, error, plain }) {
  return (
    <div className={`state${plain ? ' state--plain' : ''}`} role={error ? 'alert' : undefined}>
      {stamp && <Stamp tone={error ? 'loss' : 'ink'} size={error ? 'lg' : 'md'}>{stamp}</Stamp>}
      <p className="state__title">{title}</p>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}
