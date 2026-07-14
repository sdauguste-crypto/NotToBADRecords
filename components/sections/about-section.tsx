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
      title="THE STORY"
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
              Some artists make music. Simon Auguste builds worlds.
            </span>{" "}
            Born in the Bronx to a Haitian household and raised in Florida by a
            single mother whose resilience became his first creative blueprint,
            he turned loneliness, sacrifice, and an unshakeable imagination
            into one of independent music&apos;s most compelling emerging
            universes.
          </p>
          <p className="text-sm text-foreground/80 md:text-base">
            His catalog lives inside{" "}
            <em>The Adventures of Young Simon &amp; The Silver Surfer</em> — a
            cinematic multiverse where a child&apos;s unhinged innocence
            collides with cosmic self-discovery. Self-produced. Master-owned.
            Entirely self-funded. We really out here.
          </p>
          <p className="text-sm text-foreground/80 md:text-base">
            The name? <span className="font-bold text-sunset-gold">Not To
            B.A.D</span> is a spin on the Haitian Creole phrase{" "}
            <em>&ldquo;nou pa pi mal&rdquo;</em> — we&apos;re not too bad — and
            the acronym stands for &ldquo;Be A D—&rdquo; (fill in any negative
            word that starts with D). A humble brag, and a way of looking at
            life.
          </p>
          <p className="pt-2 text-sm font-bold uppercase tracking-[0.25em] text-sunset-pink">
            — Simon Auguste, the waviest dude in the universe
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
