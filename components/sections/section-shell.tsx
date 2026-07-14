"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

type SectionShellProps = {
  id: string;
  hudLabel: string;
  title: string;
  accent?: "pink" | "gold";
  subtitle?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Shared mission-control section wrapper: HUD label + neon Cinzel heading,
 * transparent background (3D scene renders behind), generous vertical rhythm.
 */
export function SectionShell({
  id,
  hudLabel,
  title,
  accent = "pink",
  subtitle,
  className,
  children,
}: SectionShellProps) {
  const reduced = useReducedMotion();

  return (
    <section
      id={id}
      className={cn("relative min-h-screen w-full overflow-hidden", className)}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-[clamp(5rem,12vh,9rem)]">
        <motion.header
          initial={{ opacity: 0, y: reduced ? 0 : 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-12 md:mb-16"
        >
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-sunset-gold/70">
            {hudLabel}
          </p>
          <h2
            className={cn(
              "font-black uppercase leading-[1.05] text-4xl md:text-6xl",
              accent === "pink" ? "text-neon-pink" : "text-neon-gold",
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-4 max-w-xl text-sm tracking-wide text-foreground/60">
              {subtitle}
            </p>
          ) : null}
        </motion.header>
        {children}
      </div>
    </section>
  );
}
