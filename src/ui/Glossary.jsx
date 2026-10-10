const TERMS = [
  ['Folio', 'A pretend portfolio. It holds the shares you buy.'],
  ['Last close', 'The price a share ended the last trading day at. Trades here happen at this price.'],
  ['Avg buy', 'The average price you paid per share.'],
  ['Unrealised', 'Gain or loss on shares you still hold. It only becomes real when you sell.'],
  ['Realised', 'Gain or loss locked in by selling.'],
];

/** Collapsed plain-language glossary for beginners. */
export default function Glossary() {
  return (
    <details className="glossary">
      <summary>What do these words mean?</summary>
      <dl>{TERMS.map(([t, d]) => (<div key={t} style={{ display: 'contents' }}><dt>{t}</dt><dd>{d}</dd></div>))}</dl>
    </details>
  );
}
