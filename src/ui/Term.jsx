/** Jargon with a plain-language tooltip. Keyboard focusable; the full glossary also lives on the page. */
export default function Term({ children, tip }) {
  return <abbr className="term" title={tip} tabIndex={0}>{children}</abbr>;
}
