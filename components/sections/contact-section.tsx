"use client";

import { motion } from "motion/react";

import { contactEmail } from "@/lib/content";
import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";
import { GuestbookWall } from "@/components/fanhub/guestbook-wall";
import { NewsletterTerminal } from "@/components/fanhub/newsletter-terminal";

export function ContactSection() {
  const reduced = useReducedMotion();

  return (
    <SectionShell
      id="contact"
      hudLabel="// SECTION 08 — COMMS"
      title="GROUND CONTROL"
      accent="pink"
    >
      <div className="space-y-16">
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="glass-panel hud-corners px-6 py-10 text-center md:px-10"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-blood">
            ▚ BOOKING &amp; INQUIRIES
          </p>
          <a
            href={`mailto:${contactEmail}`}
            className="mt-4 inline-block break-all font-black uppercase text-xl text-blood [text-shadow:0_0_18px_rgba(180,28,37,.35)] transition-all hover:scale-[1.02] hover:text-oxblood md:text-3xl"
          >
            {contactEmail}
          </a>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-foreground/50">
            Shows · features · press · anything not too bad
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <GuestbookWall />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        >
          <NewsletterTerminal />
        </motion.div>
      </div>
    </SectionShell>
  );
}
