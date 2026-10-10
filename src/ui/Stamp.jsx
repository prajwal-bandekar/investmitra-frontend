/**
 * Rubber-stamp label: BOUGHT, SOLD, STALE, TARGET HIT, FILED...
 *
 * @param tone   'ink' (default) | 'loss' | 'gain' | 'filled'
 * @param size   'sm' | 'md' (default) | 'lg' | 'slam' (animated, used on the order slip)
 * @param tilt   rotation in degrees
 * @param onPaper2 set when the stamp sits on the darker paper2 background
 */
export default function Stamp({ children, tone = 'ink', size = 'md', tilt, onPaper2, className = '', style }) {
  const classes = ['stamp'];
  if (tone !== 'ink') classes.push(`stamp--${tone}`);
  if (size !== 'md') classes.push(`stamp--${size}`);
  if (onPaper2) classes.push('stamp--on-paper2');
  if (className) classes.push(className);
  return (
    <span className={classes.join(' ')} style={tilt !== undefined ? { '--r': `${tilt}deg`, ...style } : style}>
      {children}
    </span>
  );
}
