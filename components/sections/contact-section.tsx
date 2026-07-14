"use client";

import { motion } from "motion/react";

import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";
import { GuestbookWall } from "@/components/fanhub/guestbook-wall";
import { NewsletterTerminal } from "@/components/fanhub/newsletter-terminal";

export function ContactSection() {
  const reduced = useReducedMotion();

  return (
    <SectionShell
      id="contact"
      hudLabel="// SECTION 07 — COMMS"
      title="GROUND CONTROL"
      accent="pink"
    >
      <div className="space-y-16">
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
