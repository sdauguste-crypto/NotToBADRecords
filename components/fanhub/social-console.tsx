"use client";

import { Instagram, Music2, Youtube } from "lucide-react";

import { socials, type Social } from "@/lib/content";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

/** Deterministic hash so VU-meter bar heights are stable across SSR/CSR. */
function barHeight(index: number): number {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  const frac = x - Math.floor(x);
  return 18 + Math.round(frac * 82); // 18%..100%
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .595.043.88.13V9.4a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
    </svg>
  );
}

function PlatformIcon({ platform }: { platform: Social["platform"] }) {
  const className = "h-5 w-5";
  switch (platform) {
    case "instagram":
      return <Instagram className={className} />;
    case "youtube":
      return <Youtube className={className} />;
    case "spotify":
      return <Music2 className={className} />;
    case "tiktok":
      return <TikTokIcon className={className} />;
  }
}

export function SocialConsole() {
  const reduced = useReducedMotion();

  return (
    <div className="glass-panel hud-corners p-6 md:p-8">
      <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-sunset-gold/80">
        ▚ COMMS CONSOLE
      </p>

      <ul className="space-y-4">
        {socials.map((social) => (
          <li
            key={social.platform}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-sunset-pink/15 bg-void-deep/50 px-4 py-3"
          >
            <span className="text-sunset-pink">
              <PlatformIcon platform={social.platform} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm tracking-wide text-foreground/85">
              {social.handle}
            </span>
            <span className="rounded-full border border-sunset-gold/40 px-2.5 py-0.5 text-xs font-bold tracking-[0.15em] text-sunset-gold">
              {social.followers} ▲
            </span>
            <a
              href={social.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-md border border-sunset-pink/30 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-foreground/70 transition-colors hover:border-sunset-pink hover:text-sunset-pink"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/30 text-sunset-pink transition-colors group-hover:animate-led-pulse group-hover:bg-sunset-pink motion-reduce:animate-none" />
              OPEN CHANNEL
            </a>
          </li>
        ))}
      </ul>

      {/* fake VU meter */}
      <div
        aria-hidden
        className="mt-8 flex h-16 items-end justify-between gap-1"
      >
        {Array.from({ length: 24 }).map((_, index) => (
          <span
            key={index}
            className="w-full origin-bottom rounded-sm bg-gradient-to-t from-sunset-pink via-sunset-orange to-sunset-gold opacity-80"
            style={{
              height: `${barHeight(index)}%`,
              animation: reduced
                ? undefined
                : `vu-bounce ${1.1 + (index % 5) * 0.18}s ease-in-out ${index * 0.07}s infinite alternate`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes vu-bounce {
          from { transform: scaleY(1); }
          to { transform: scaleY(0.35); }
        }
      `}</style>
      <p className="mt-3 text-right text-[10px] uppercase tracking-[0.3em] text-foreground/40">
        SIGNAL STRENGTH — NOMINAL
      </p>
    </div>
  );
}
