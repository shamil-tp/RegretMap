/**
 * Decorative travel-journal illustration for the home hero: a dotted route
 * between map pins, a postcard with a passport-style stamp, a luggage tag and
 * soft mountains. Pure inline SVG (no images to download), hidden from
 * assistive tech, and purely visual — it carries no information.
 */
export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 420 340"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft hills */}
      <path d="M0 300 C70 240 120 250 170 280 C220 230 300 220 420 290 L420 340 L0 340 Z" fill="#D9F5E6" />
      <path d="M40 340 C110 280 170 290 230 320 C280 290 350 285 420 320 L420 340 Z" fill="#DCEEFF" />
      {/* Mountain with snowcap */}
      <path d="M250 290 L320 170 L390 290 Z" fill="#E9DFFF" />
      <path d="M302 200 L320 170 L338 200 L328 196 L320 204 L311 196 Z" fill="#FFFFFF" />

      {/* Cloud */}
      <g fill="#FFFFFF" className="hero-float">
        <ellipse cx="88" cy="70" rx="34" ry="16" />
        <ellipse cx="112" cy="62" rx="24" ry="16" />
        <ellipse cx="66" cy="66" rx="18" ry="12" />
      </g>

      {/* Dotted travel route (animated) */}
      <path
        className="hero-route"
        d="M48 250 C90 180 150 230 190 160 S290 90 352 120"
        stroke="#FF7777"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />

      {/* Pins */}
      <g>
        <path d="M48 252 c-10 -14 -16 -22 -16 -30 a16 16 0 1 1 32 0 c0 8 -6 16 -16 30z" fill="#FF7777" />
        <circle cx="48" cy="222" r="6" fill="#FFFFFF" />
      </g>
      <g>
        <path d="M352 122 c-10 -14 -16 -22 -16 -30 a16 16 0 1 1 32 0 c0 8 -6 16 -16 30z" fill="#332B40" />
        <circle cx="352" cy="92" r="6" fill="#FFF0B8" />
      </g>

      {/* Postcard */}
      <g transform="rotate(-8 205 150)">
        <rect x="150" y="105" width="120" height="82" rx="8" fill="#FFFFFF" stroke="#E9E3ED" strokeWidth="2" />
        <rect x="160" y="117" width="54" height="40" rx="4" fill="#FFE2D1" />
        <path d="M160 157 L178 137 L192 150 L202 141 L214 157 Z" fill="#FF7777" opacity="0.6" />
        <line x1="222" y1="122" x2="222" y2="176" stroke="#E9E3ED" strokeWidth="2" />
        <line x1="230" y1="150" x2="260" y2="150" stroke="#E9E3ED" strokeWidth="2" />
        <line x1="230" y1="162" x2="254" y2="162" stroke="#E9E3ED" strokeWidth="2" />
        {/* Passport-style stamp */}
        <circle cx="248" cy="127" r="11" stroke="#FF7777" strokeWidth="2" strokeDasharray="3 2" />
        <path d="M242 127 l4 4 l8 -8" stroke="#FF7777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Luggage tag */}
      <g transform="rotate(12 110 140)" className="hero-float-slow">
        <path d="M86 118 h48 a6 6 0 0 1 6 6 v34 a6 6 0 0 1 -6 6 h-48 l-12 -23 z" fill="#FFF0B8" stroke="#E9E3ED" strokeWidth="2" />
        <circle cx="88" cy="141" r="4" fill="#FFFCF6" stroke="#E9E3ED" strokeWidth="2" />
        <line x1="100" y1="134" x2="130" y2="134" stroke="#332B40" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        <line x1="100" y1="146" x2="122" y2="146" stroke="#332B40" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      </g>
    </svg>
  );
}
