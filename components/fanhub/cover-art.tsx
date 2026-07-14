import { cn } from "@/lib/utils";

/** Deterministic PRNG — same seed, same artwork, SSR-safe. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ["#ff2e88", "#b636ff", "#ff4fc3", "#d9a8ff", "#3d1b66"];

type CoverArtProps = {
  seed: number;
  title?: string;
  className?: string;
};

function RetroSun({ accent, uid }: { accent: string; uid: string }) {
  const fillId = `sun-fill-${uid}`;
  const maskId = `sun-bands-${uid}`;
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9a8ff" />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
        <mask id={maskId}>
          <rect width="100" height="100" fill="white" />
          <rect x="0" y="58" width="100" height="3" fill="black" />
          <rect x="0" y="66" width="100" height="4.5" fill="black" />
          <rect x="0" y="76" width="100" height="6" fill="black" />
          <rect x="0" y="88" width="100" height="7" fill="black" />
        </mask>
      </defs>
      <circle
        cx="50"
        cy="52"
        r="38"
        fill={`url(#${fillId})`}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

function Palm({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
      <g fill="none" stroke={accent} strokeWidth="3.5" strokeLinecap="round">
        <path d="M52 92 C50 70 49 52 50 38" />
        <path d="M50 38 C38 30 26 30 16 38" />
        <path d="M50 38 C40 26 30 22 18 24" />
        <path d="M50 38 C52 24 58 16 70 12" />
        <path d="M50 38 C62 28 74 26 84 32" />
        <path d="M50 38 C60 34 72 36 80 44" />
      </g>
      <ellipse cx="50" cy="93" rx="26" ry="3" fill={accent} opacity="0.5" />
    </svg>
  );
}

function RingedPlanet({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
      <circle cx="50" cy="50" r="24" fill={accent} opacity="0.9" />
      <circle cx="42" cy="42" r="6" fill="#ffffff" opacity="0.25" />
      <ellipse
        cx="50"
        cy="52"
        rx="42"
        ry="12"
        fill="none"
        stroke="#d9a8ff"
        strokeWidth="3"
        transform="rotate(-18 50 52)"
      />
    </svg>
  );
}

function Cassette({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
      <rect
        x="12"
        y="26"
        width="76"
        height="48"
        rx="6"
        fill="none"
        stroke={accent}
        strokeWidth="3.5"
      />
      <rect x="24" y="36" width="52" height="16" rx="4" fill={accent} opacity="0.35" />
      <circle cx="36" cy="44" r="5.5" fill="none" stroke="#d9a8ff" strokeWidth="3" />
      <circle cx="64" cy="44" r="5.5" fill="none" stroke="#d9a8ff" strokeWidth="3" />
      <path d="M30 74 L36 60 H64 L70 74" fill="none" stroke={accent} strokeWidth="3" />
    </svg>
  );
}

/**
 * Procedural cover artwork: seeded gradient background + a synthwave SVG
 * motif picked by seed % 4. Fully deterministic — safe to render on the server.
 */
export function CoverArt({ seed, title, className }: CoverArtProps) {
  const rand = mulberry32(seed);
  const c1 = PALETTE[Math.floor(rand() * PALETTE.length)];
  const c2 = PALETTE[Math.floor(rand() * PALETTE.length)];
  const c3 = PALETTE[Math.floor(rand() * PALETTE.length)];
  const angle = Math.floor(rand() * 360);
  const conic = rand() > 0.6;
  const motif = seed % 4;
  const uid = String(seed);

  const background = conic
    ? `conic-gradient(from ${angle}deg at 50% 42%, ${c1}, ${c2}, ${c3}, ${c1})`
    : `linear-gradient(${angle}deg, ${c1}, ${c2} 55%, ${c3})`;

  return (
    <div
      className={cn(
        "scanlines relative flex items-center justify-center overflow-hidden rounded-xl border border-white/10",
        className,
      )}
      style={{ background }}
      role={title ? "img" : undefined}
      aria-label={title ? `Cover art for ${title}` : undefined}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(10,6,18,.75),transparent_60%)]" />
      <div className="relative flex h-full w-full items-center justify-center drop-shadow-[0_0_14px_rgba(10,6,18,.6)]">
        {motif === 0 ? (
          <RetroSun accent="#ff2e88" uid={uid} />
        ) : motif === 1 ? (
          <Palm accent="#0a0612" />
        ) : motif === 2 ? (
          <RingedPlanet accent="#b636ff" />
        ) : (
          <Cassette accent="#0a0612" />
        )}
      </div>
    </div>
  );
}
