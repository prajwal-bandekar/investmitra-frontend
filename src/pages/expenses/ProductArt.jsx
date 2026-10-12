// Flat product illustrations for the could-have-bought cards, keyed by WishProduct.image.
// Colours are literal (no CSS variables) so the SVG still renders when serialised for the share image.

const Defs = ({ id }) => (
  <defs>
    <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#E9E4DC" /><stop offset=".5" stopColor="#B9B1A6" /><stop offset="1" stopColor="#8E867C" />
    </linearGradient>
    <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#5B2F5E" /><stop offset=".55" stopColor="#FF6F59" /><stop offset="1" stopColor="#E8A317" />
    </linearGradient>
    <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#3A3340" /><stop offset="1" stopColor="#15111A" />
    </linearGradient>
  </defs>
);

const shapes = {
  phone: (id) => (
    <g>
      <rect x="58" y="18" width="84" height="166" rx="18" fill={`url(#${id}-metal)`} />
      <rect x="63" y="23" width="74" height="156" rx="14" fill={`url(#${id}-screen)`} />
      <rect x="86" y="30" width="28" height="8" rx="4" fill="#15111A" />
      <path d="M70 120 Q100 95 130 130 L130 172 L70 172 Z" fill="#fff" opacity=".12" />
    </g>
  ),
  laptop: (id) => (
    <g>
      <rect x="38" y="44" width="124" height="86" rx="8" fill={`url(#${id}-metal)`} />
      <rect x="44" y="50" width="112" height="74" rx="4" fill={`url(#${id}-screen)`} />
      <path d="M22 136 H178 L170 150 Q168 154 162 154 H38 Q32 154 30 150 Z" fill={`url(#${id}-metal)`} />
      <rect x="86" y="136" width="28" height="5" rx="2.5" fill="#8E867C" />
    </g>
  ),
  headphones: (id) => (
    <g>
      <path d="M44 120 V96 A56 56 0 0 1 156 96 V120" fill="none" stroke={`url(#${id}-dark)`} strokeWidth="12" strokeLinecap="round" />
      <rect x="30" y="108" width="36" height="58" rx="16" fill={`url(#${id}-dark)`} />
      <rect x="134" y="108" width="36" height="58" rx="16" fill={`url(#${id}-dark)`} />
      <rect x="40" y="118" width="16" height="38" rx="8" fill="#FF6F59" opacity=".85" />
      <rect x="144" y="118" width="16" height="38" rx="8" fill="#FF6F59" opacity=".85" />
    </g>
  ),
  earbuds: (id) => (
    <g>
      <rect x="52" y="78" width="96" height="84" rx="34" fill="#F7F4EF" stroke="#D9D2C7" strokeWidth="2" />
      <line x1="52" y1="104" x2="148" y2="104" stroke="#D9D2C7" strokeWidth="2" />
      <circle cx="100" cy="132" r="4" fill="#9BD9A6" />
      <g transform="translate(64 30) rotate(-14)"><circle cx="14" cy="14" r="13" fill="#fff" stroke="#D9D2C7" strokeWidth="2" /><rect x="8" y="20" width="10" height="34" rx="5" fill="#fff" stroke="#D9D2C7" strokeWidth="2" /></g>
      <g transform="translate(108 26) rotate(14)"><circle cx="14" cy="14" r="13" fill="#fff" stroke="#D9D2C7" strokeWidth="2" /><rect x="8" y="20" width="10" height="34" rx="5" fill="#fff" stroke="#D9D2C7" strokeWidth="2" /></g>
    </g>
  ),
  console: (id) => (
    <g>
      <path d="M70 22 Q60 22 62 34 L72 176 Q73 184 82 184 H96 V22 Z" fill="#F7F4EF" stroke="#D9D2C7" strokeWidth="2" />
      <path d="M130 22 Q140 22 138 34 L128 176 Q127 184 118 184 H104 V22 Z" fill="#F7F4EF" stroke="#D9D2C7" strokeWidth="2" />
      <rect x="94" y="22" width="12" height="162" fill={`url(#${id}-dark)`} />
      <rect x="97" y="40" width="6" height="3" fill="#7FB3FF" />
    </g>
  ),
  sneaker: (id) => (
    <g>
      <path d="M24 140 Q22 112 44 104 L84 92 Q96 70 112 74 L126 96 Q150 104 168 112 Q182 118 178 140 Z" fill="#fff" stroke="#15111A" strokeWidth="3" />
      <path d="M84 92 Q100 108 126 96" fill="none" stroke="#15111A" strokeWidth="3" />
      <path d="M52 118 Q92 124 128 106" fill="none" stroke="#FF3B30" strokeWidth="10" strokeLinecap="round" />
      <rect x="20" y="138" width="162" height="16" rx="8" fill="#FF3B30" />
      <line x1="96" y1="84" x2="108" y2="94" stroke="#15111A" strokeWidth="3" /><line x1="104" y1="78" x2="116" y2="90" stroke="#15111A" strokeWidth="3" />
    </g>
  ),
  ticket: (id) => (
    <g transform="rotate(-10 100 100)">
      <path d="M30 64 H170 V88 A12 12 0 0 0 170 112 V136 H30 V112 A12 12 0 0 0 30 88 Z" fill={`url(#${id}-screen)`} />
      <line x1="128" y1="70" x2="128" y2="130" stroke="#fff" strokeWidth="3" strokeDasharray="6 6" />
      <text x="78" y="108" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fill="#fff" fontWeight="700">ADMIT</text>
      <text x="150" y="108" textAnchor="middle" fontFamily="monospace" fontSize="18" fill="#fff">01</text>
    </g>
  ),
  travel: (id) => (
    <g>
      <circle cx="132" cy="62" r="26" fill="#E8A317" />
      <path d="M20 150 Q60 130 100 150 T180 150 V180 H20 Z" fill="#3FA7D6" />
      <path d="M20 162 Q60 144 100 162 T180 162" fill="none" stroke="#fff" strokeWidth="3" opacity=".6" />
      <path d="M70 150 Q74 110 66 78" fill="none" stroke="#8A5A2B" strokeWidth="7" strokeLinecap="round" />
      <path d="M66 78 Q40 66 26 82 M66 78 Q86 58 106 70 M66 78 Q60 52 40 50 M66 78 Q90 80 98 98" fill="none" stroke="#2E9E5B" strokeWidth="9" strokeLinecap="round" />
    </g>
  ),
};

export default function ProductArt({ image, id = 'pa', size = 180 }) {
  const draw = shapes[image] || shapes.ticket;
  return (
    <svg className="product-art" viewBox="0 0 200 200" width={size} height={size} role="img" aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg">
      <Defs id={id} />
      {draw(id)}
    </svg>
  );
}
