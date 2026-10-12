import { useRef, useState } from 'react';
import { rupees } from '../../format';
import ProductArt from './ProductArt';

const BLOBS = [
  ['#FFB3C7', '#FFD7A8', '#C9B6FF'],
  ['#A8E6CF', '#FFD3B6', '#B5D8FF'],
  ['#FFC4E1', '#C2F0FC', '#FFE29A'],
  ['#D7C4FF', '#FFB8A8', '#B8F2D0'],
];

/** One line of copy: "That's a PS5." / "That's 2× AirPods Pro." / "62% of a movie night." */
export function headline(card) {
  if (card.count > 1) return `That's ${card.count}× ${card.productName}.`;
  if (card.count === 1) return `That's a ${card.productName}.`;
  return `That's ${card.progressPercent}% of a ${card.productName}.`;
}

/**
 * Could-have-bought card: soft drifting colour layers, the product in the middle, one sharp sparkle on reveal.
 * Share draws a 1080×1920 story image of the same card.
 */
export default function WishCard({ card, index = 0, year }) {
  const artRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const palette = BLOBS[index % BLOBS.length];
  const artId = `wish-${card.categoryId}`;
  const period = year ? `in ${year}` : 'this year';

  const share = async () => {
    setSharing(true);
    try {
      const blob = await storyImage(card, palette, artRef.current?.querySelector('svg'), period);
      const file = new File([blob], `expensemitra-${card.categoryId}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ExpenseMitra' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn('Share failed', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <article className="wish" style={{ '--b1': palette[0], '--b2': palette[1], '--b3': palette[2], animationDelay: `${index * 90}ms` }}>
      <div className="wish__layers" aria-hidden="true">
        <span className="wish__blob wish__blob--1" />
        <span className="wish__blob wish__blob--2" />
        <span className="wish__blob wish__blob--3" />
      </div>

      <div className="wish__top">
        <span className="wish__cat">{card.icon} {card.category}</span>
        <span className="mono wish__spent">{rupees(card.spent)} {period}</span>
      </div>

      <div className="wish__stage" ref={artRef}>
        <svg className="wish__sparkle" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 0 C53 38 62 47 100 50 C62 53 53 62 50 100 C47 62 38 53 0 50 C38 47 47 38 50 0 Z" />
        </svg>
        <span className="wish__glint wish__glint--a" aria-hidden="true" />
        <span className="wish__glint wish__glint--b" aria-hidden="true" />
        <span className="wish__glint wish__glint--c" aria-hidden="true" />
        <div className="wish__product"><ProductArt image={card.productImage} id={artId} size={168} /></div>
      </div>

      <h3 className="wish__headline">{headline(card)}</h3>
      {card.count === 0 && (
        <div className="wish__progress" aria-label={`${card.progressPercent}% of the way`}>
          <span style={{ width: `${Math.min(100, card.progressPercent)}%` }} />
        </div>
      )}
      <p className="wish__invest">
        {card.investShares != null
          ? <>Or <b>{card.investShares}</b> {card.investShares === 1 ? 'share' : 'shares'} of <b>{card.investSymbol}</b> at the last close.</>
          : <>Priced at {rupees(card.productPrice)}. No judgement, just maths.</>}
      </p>
      <div className="wish__actions">
        <button className="btn btn--link" onClick={share} disabled={sharing}>{sharing ? 'Printing…' : 'Share as story'}</button>
      </div>
    </article>
  );
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

function sparklePath(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.bezierCurveTo(cx + r * 0.06, cy - r * 0.24, cx + r * 0.24, cy - r * 0.06, cx + r, cy);
  ctx.bezierCurveTo(cx + r * 0.24, cy + r * 0.06, cx + r * 0.06, cy + r * 0.24, cx, cy + r);
  ctx.bezierCurveTo(cx - r * 0.06, cy + r * 0.24, cx - r * 0.24, cy + r * 0.06, cx - r, cy);
  ctx.bezierCurveTo(cx - r * 0.24, cy - r * 0.06, cx - r * 0.06, cy - r * 0.24, cx, cy - r);
  ctx.closePath();
}

function wrap(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineHeight;
    } else {
      line = next;
    }
  }
  ctx.fillText(line, x, y);
  return y;
}

/** Draws the card as a 9:16 PNG for Instagram or WhatsApp stories. */
async function storyImage(card, palette, svgEl, period) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FBF6EE';
  ctx.fillRect(0, 0, W, H);
  ctx.filter = 'blur(110px)';
  [[260, 620, 380, palette[0]], [820, 760, 420, palette[1]], [540, 1080, 360, palette[2]]].forEach(([x, y, r, c]) => {
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#46014A';
  ctx.textAlign = 'center';
  ctx.font = '600 40px "IBM Plex Mono", monospace';
  ctx.fillText(`${card.category.toUpperCase()} · ${rupees(card.spent)} ${period.toUpperCase()}`, W / 2, 200);

  if (svgEl) {
    const xml = new XMLSerializer().serializeToString(svgEl);
    const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
    ctx.drawImage(img, W / 2 - 330, 520, 660, 660);
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(255,255,255,.9)';
  ctx.shadowBlur = 40;
  sparklePath(ctx, 820, 520, 110);
  ctx.fill();
  sparklePath(ctx, 260, 1130, 46);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#46014A';
  ctx.font = '96px "Rozha One", Georgia, serif';
  const end = wrap(ctx, headline(card), W / 2, 1380, 900, 110);

  ctx.font = '44px "Source Serif 4", Georgia, serif';
  ctx.fillStyle = '#5B2F5E';
  if (card.investShares != null) {
    ctx.fillText(`Or ${card.investShares} shares of ${card.investSymbol}.`, W / 2, end + 110);
  }
  ctx.font = '600 36px "IBM Plex Mono", monospace';
  ctx.fillText('EXPENSEMITRA × INVESTMITRA', W / 2, H - 140);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'));
}
