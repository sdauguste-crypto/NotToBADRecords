"use client";

import { motion } from "motion/react";

import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";
import { SocialConsole } from "@/components/fanhub/social-console";

export function AboutSection() {
  const reduced = useReducedMotion();

  return (
    <SectionShell
      id="about"
      hudLabel="// SECTION 06 — ORIGIN"
      title="THE LABEL"
      accent="gold"
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="glass-panel space-y-6 p-6 leading-relaxed md:p-8"
        >
          <p className="text-sm text-foreground/80 md:text-base">
            <span className="font-bold text-sunset-gold">
              Not To B.A.D Records was founded in a basement
            </span>{" "}
            with a borrowed mixer, a broken tape deck, and the unshakable
            conviction that the sun never really sets — it just changes
            frequency. What started as two friends pressing fifty cassettes is
            now a mission control tower for artists who refuse to land.
          </p>
          <p className="text-sm text-foreground/80 md:text-base">
            We have zero patience for average. Every release is engineered,
            argued over, remastered at 3AM, and shipped only when it makes the
            room feel like a highway at dusk. If it doesn&apos;t glow, it
            doesn&apos;t go.
          </p>
          <p className="text-sm text-foreground/80 md:text-base">
            Today we broadcast from the edge of the sunset: six artists, one
            frequency, and a growing crew of cadets tuned in from every time
            zone. Transmission continues until further notice.
          </p>
          <p className="pt-2 text-sm font-bold uppercase tracking-[0.25em] text-sunset-pink">
            — Ground Control
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        >
          <SocialConsole />
        </motion.div>
      </div>
    </SectionShell>
  );
}
