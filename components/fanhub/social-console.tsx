"use client";

import { socials } from "@/lib/content";
import { PlatformIcon } from "@/components/icons/platform-icons";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

/** Deterministic hash so VU-meter bar heights are stable across SSR/CSR. */
function barHeight(index: number): number {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  const frac = x - Math.floor(x);
  return 18 + Math.round(frac * 82); // 18%..100%
}

export function SocialConsole() {
  const reduced = useReducedMotion();

  return (
    <div className="glass-panel hud-corners p-6 md:p-8">
      <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-blood">
        ▚ COMMS CONSOLE
      </p>

      <ul className="space-y-4">
        {socials.map((social) => (
          <li
            key={social.platform}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-sunset-pink/15 bg-void-deep/50 px-4 py-3"
          >
            <span className="text-blood">
              <PlatformIcon platform={social.platform} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm tracking-wide text-foreground/85">
              {social.handle}
            </span>
            <a
              href={social.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-md border border-blood/40 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-foreground/70 transition-colors hover:border-blood hover:text-blood"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/30 text-blood transition-colors group-hover:animate-led-pulse group-hover:bg-blood motion-reduce:animate-none" />
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
    </div>
  );
}
