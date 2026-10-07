"use client";

import Link from "next/link";

import { useReleaseClock } from "@/lib/release-clock";
import { WEDNESDAY_PATH, streamingLinks, wednesday } from "@/lib/wednesday";

/** Tops the MUSIC section from the release second on. */
export function WednesdayFeature() {
  const clock = useReleaseClock(wednesday.releaseAt);
  if (!clock.released) return null;
  const links = streamingLinks();

  return (
    <div className="glass-panel mb-12 p-6 md:p-8">
      <div className="grid gap-8 md:grid-cols-[minmax(0,280px)_1fr] md:items-center">
        <Link href={WEDNESDAY_PATH}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wednesday.cover.src}
            alt="WEDNESDAY — cover art"
            loading="lazy"
            className="aspect-square w-full max-w-[280px] rounded-xl border border-sunset-pink/20 object-cover"
          />
        </Link>
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-blood">
            ▸ NEW SINGLE — OUT NOW
          </p>
          <h3 className="font-display text-neon-pink font-black uppercase text-2xl md:text-3xl">
            {wednesday.title}
          </h3>
          <p className="mt-2 text-sm tracking-[0.2em] text-foreground/70">
            {wednesday.artist} · 2026
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {(links.length > 0
              ? links
              : [{ label: "LISTEN", href: WEDNESDAY_PATH }]
            ).map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="btn-blood rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
