"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { releases } from "@/lib/content";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { CoverArt } from "@/components/fanhub/cover-art";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

export function NowPlaying() {
  const reduced = useReducedMotion();
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const release = releases[0];

  return (
    <div className="glass-panel relative overflow-hidden p-6 md:p-8">
      <BorderBeam size={70} duration={9} colorFrom="#ff2e88" colorTo="#d9a8ff" />

      <div className="grid gap-8 md:grid-cols-[minmax(0,280px)_1fr] md:items-center">
        <CoverArt
          seed={release.seed}
          title={release.title}
          className="aspect-square w-full max-w-[280px]"
        />

        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-sunset-gold/70">
            ▸ NOW PLAYING
          </p>
          <h3 className="text-neon-pink font-black uppercase text-2xl md:text-3xl">
            {release.title}
          </h3>
          <p className="mt-2 text-sm tracking-[0.2em] text-foreground/70">
            {release.artist} · {release.year}
          </p>

          <div className="mt-6">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sunset-orange to-sunset-gold shadow-[0_0_12px_rgba(255,200,87,.7)]"
                initial={{ width: "37%" }}
                animate={
                  reduced ? { width: "37%" } : { width: ["37%", "40%", "37%"] }
                }
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs tracking-[0.2em] text-foreground/50">
              <span>1:24</span>
              <span>3:47</span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={release.spotifyUrl ?? "https://open.spotify.com"}
              target="_blank"
              rel="noreferrer"
              className="inline-block"
            >
              <ShimmerButton
                shimmerColor="#d9a8ff"
                background="linear-gradient(105deg, #ff2e88, #b636ff)"
                className="px-7 py-3 text-xs font-bold uppercase tracking-[0.2em]"
              >
                PLAY ON SPOTIFY
              </ShimmerButton>
            </a>
            {release.appleMusicUrl ? (
              <a
                href={release.appleMusicUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-sunset-gold/40 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-sunset-gold transition-colors hover:border-sunset-gold hover:bg-sunset-gold/10"
              >
                APPLE MUSIC
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {release.spotifyEmbedUrl ? (
        <div className="mt-8">
          {playerLoaded ? (
            <iframe
              src={release.spotifyEmbedUrl}
              title={`Spotify player — ${release.title}`}
              loading="lazy"
              width="100%"
              height="152"
              allow="encrypted-media"
              className="rounded-xl border-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlayerLoaded(true)}
              className="hud-corners w-full cursor-pointer rounded-xl border border-sunset-pink/25 bg-void-deep/60 px-6 py-5 text-xs font-bold uppercase tracking-[0.25em] text-sunset-gold/80 transition-colors hover:border-sunset-pink/60 hover:text-sunset-gold"
            >
              ▸ LOAD SPOTIFY PLAYER
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
