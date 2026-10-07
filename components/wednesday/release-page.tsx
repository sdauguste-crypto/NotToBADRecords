"use client";

import Link from "next/link";

import { useReleaseClock } from "@/lib/release-clock";
import { streamingLinks, wednesday } from "@/lib/wednesday";

import { Countdown } from "./countdown";
import { PreviewPlayer } from "./preview-player";
import { PreviewTag } from "./preview-tag";
import { WednesdaySignup } from "./signup";

/** /wednesday — countdown until the release second, then OUT NOW. */
export function ReleasePage({ initiallyReleased }: { initiallyReleased: boolean }) {
  const clock = useReleaseClock(wednesday.releaseAt, initiallyReleased);
  const out = clock.released;
  const links = streamingLinks();

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-obsidian text-chrome">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full opacity-[0.2] blur-[110px]"
        style={{ background: "radial-gradient(circle, #b41c25 0%, transparent 70%)" }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center px-5 pb-16 pt-8 text-center sm:max-w-lg sm:pt-12">
        <Link
          href="/simon-auguste/"
          className="font-body text-[0.6rem] tracking-[0.4em] text-steel transition-colors hover:text-blood"
        >
          SIMON AUGUSTE · NOT TO B.A.D RECORDS
        </Link>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wednesday.cover.src}
          width={wednesday.cover.width}
          height={wednesday.cover.height}
          alt="WEDNESDAY — cover art"
          fetchPriority="high"
          className="mt-6 aspect-square w-full rounded-md border border-white/10 shadow-[0_30px_80px_-20px_rgba(180,28,37,0.55)]"
        />

        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-blood">
          {out ? "// NEW SINGLE — OUT NOW" : `// NEW SINGLE — ${wednesday.releaseLabel}`}
        </p>
        <h1 className="font-display text-neon-pink mt-3 font-black uppercase leading-[1.05] text-4xl sm:text-5xl">
          {out ? (
            <>
              WEDNESDAY
              <span className="mt-2 block text-2xl tracking-[0.12em] sm:text-3xl">
                — OUT NOW
              </span>
            </>
          ) : (
            "WEDNESDAY"
          )}
        </h1>

        {out ? (
          links.length > 0 ? (
            <ul className="mt-8 w-full space-y-3">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-body flex items-center justify-between border border-white/15 bg-black/30 px-6 py-4 text-xs tracking-[0.3em] text-chrome transition-colors hover:border-blood hover:bg-blood/10"
                  >
                    {link.label}
                    <span className="text-blood">→</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 text-xs tracking-[0.3em] text-steel">
              STREAMING LINKS LANDING NOW — REFRESH IN A MOMENT
            </p>
          )
        ) : (
          <>
            <Countdown remaining={clock.now === null ? null : clock.remaining} className="mt-8 w-full" />
            {wednesday.previewClip ? (
              <div className="mt-6 w-full">
                <PreviewPlayer src={wednesday.previewClip} />
              </div>
            ) : null}
          </>
        )}

        <div className="mt-12 w-full">
          {out ? (
            <WednesdaySignup
              key="weekly"
              label="Take Off Thursdays — new drops every Thursday."
              tag={wednesday.tags.weekly}
              early={false}
            />
          ) : (
            <WednesdaySignup
              key="early"
              label="Space Cadets hear it first."
              tag={wednesday.tags.early}
              early
            />
          )}
        </div>

        <Link
          href="/simon-auguste/"
          className="font-body mt-12 text-[0.65rem] tracking-[0.3em] text-steel transition-colors hover:text-blood"
        >
          ENTER MISSION CONTROL →
        </Link>
      </main>

      {clock.simulated ? <PreviewTag released={out} /> : null}
    </div>
  );
}
