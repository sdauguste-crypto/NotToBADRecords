"use client";

import { motion } from "motion/react";

import { releases } from "@/lib/content";
import { Marquee } from "@/components/magicui/marquee";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";
import { NowPlaying } from "@/components/fanhub/now-playing";
import { ReleaseCard } from "@/components/fanhub/release-card";

export function MusicSection() {
  const reduced = useReducedMotion();

  return (
    <SectionShell
      id="music"
      hudLabel="// SECTION 01 — MUSIC"
      title="LATEST TRANSMISSIONS"
      accent="pink"
    >
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <NowPlaying />
      </motion.div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {releases.map((release, index) => (
          <motion.div
            key={release.id}
            initial={{ opacity: 0, y: reduced ? 0 : 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 0.7,
              ease: "easeOut",
              delay: index * 0.08,
            }}
          >
            <ReleaseCard release={release} />
          </motion.div>
        ))}
      </div>

      <div className="relative left-1/2 mt-16 w-screen -translate-x-1/2">
        <Marquee pauseOnHover className="[--duration:45s] py-2">
          {releases.map((release) => (
            <span
              key={release.id}
              className="whitespace-nowrap text-sm font-bold uppercase tracking-[0.3em] text-sunset-gold/80"
            >
              {release.title}
              <span className="mx-4 text-sunset-pink">★ NOT TO BAD ★</span>
            </span>
          ))}
        </Marquee>
        <ProgressiveBlur
          direction="left"
          className="pointer-events-none absolute inset-y-0 left-0 w-24"
        />
        <ProgressiveBlur
          direction="right"
          className="pointer-events-none absolute inset-y-0 right-0 w-24"
        />
      </div>
    </SectionShell>
  );
}
