"use client";

// GAMES — the arcade bay. One cabinet for now: OVERDRIVE, a chase-cam lane
// racer through the label's three worlds. The game bundle only loads when a
// visitor hits START ENGINE, so the section costs nothing until played.

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "motion/react";

import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

const OverdriveGame = dynamic(() => import("@/components/game/overdrive"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#05030c]">
      <p className="font-body animate-blink text-xs tracking-[0.3em] text-[#ebeef1]/70 motion-reduce:animate-none">
        SPOOLING ENGINES…
      </p>
    </div>
  ),
});

export function GamesSection() {
  const reduced = useReducedMotion();
  const [launched, setLaunched] = useState(false);

  return (
    <SectionShell
      id="games"
      hudLabel="// SECTION 04 — ARCADE"
      title="THE ARCADE"
      accent="gold"
      subtitle="One credit. Three circuits. No brakes required."
    >
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="glass-panel hud-corners relative overflow-hidden p-3 md:p-4"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          {launched ? (
            <OverdriveGame />
          ) : (
            <button
              type="button"
              onClick={() => setLaunched(true)}
              aria-label="Start OVERDRIVE"
              className="scanlines group absolute inset-0 flex w-full cursor-pointer flex-col items-center justify-center gap-5 bg-[radial-gradient(ellipse_at_50%_120%,rgba(180,28,37,0.28),transparent_60%),linear-gradient(180deg,#0b0716,#05030c)]"
            >
              <p className="font-body text-[0.6rem] tracking-[0.45em] text-[#5dbcd9]">
                NTB ARCADE PRESENTS
              </p>
              <h3 className="font-display text-neon-pink px-4 text-4xl font-black uppercase leading-none md:text-6xl">
                OVERDRIVE
              </h3>
              <p className="font-body max-w-md px-6 text-center text-xs leading-relaxed text-[#c9cbd3]/80">
                Grand Prix of the Silver Surfer multiverse. Five cars, two
                laps, three circuits — NO LIGHTS, ROCKIN WITH MY, THE
                PRINCESS. Finish top three to unlock the next level.
              </p>
              <span className="btn-blood font-body mt-2 rounded-full px-10 py-4 text-xs font-bold tracking-[0.3em] transition-transform group-hover:scale-105">
                ▸ START ENGINE
              </span>
              <p className="font-body text-[0.6rem] tracking-[0.25em] text-[#ebeef1]/40">
                KEYBOARD ◀ ▶ ▼ · OR TAP TO STEER
              </p>
            </button>
          )}
        </div>
      </motion.div>
    </SectionShell>
  );
}
