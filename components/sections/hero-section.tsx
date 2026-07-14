"use client";

import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";

import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

const TITLE_LINES = ["NOT TO B.A.D", "RECORDS"];

export function HeroSection() {
  const reduced = useReducedMotion();

  return (
    <section
      id="hero"
      className="scanlines relative flex min-h-screen w-full flex-col overflow-hidden"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-28 pt-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="glass-panel mb-10 px-5 py-2"
        >
          <AnimatedGradientText
            colorFrom="#ff2e88"
            colorTo="#d9a8ff"
            className="text-xs font-bold uppercase tracking-[0.25em] md:text-sm"
          >
            ⦿ TRANSMISSION LIVE — MISSION CONTROL ONLINE
          </AnimatedGradientText>
        </motion.div>

        <h1 className="text-neon-gold animate-flicker font-black uppercase leading-[0.95] text-6xl md:text-8xl lg:text-9xl">
          {TITLE_LINES.map((line, lineIndex) => (
            <motion.span
              key={line}
              className="block"
              initial={{ opacity: 0, y: reduced ? 0 : 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: 0.15 + lineIndex * 0.2,
              }}
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.65 }}
          className="mt-8 max-w-xl text-sm tracking-[0.15em] text-foreground/70 md:text-base"
        >
          An independent record label broadcasting from the edge of the sunset.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.85 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a href="#music">
            <ShimmerButton
              shimmerColor="#d9a8ff"
              background="linear-gradient(105deg, #ff2e88, #b636ff)"
              className="px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_28px_rgba(255,46,136,.45)]"
            >
              ENTER MISSION CONTROL
            </ShimmerButton>
          </a>
          <Button
            asChild
            variant="ghost"
            className="h-12 rounded-full border border-sunset-gold/40 px-8 text-xs font-bold uppercase tracking-[0.2em] text-sunset-gold hover:border-sunset-gold hover:bg-sunset-gold/10 hover:text-sunset-gold"
          >
            <a href="#store">LATEST DROP</a>
          </Button>
        </motion.div>
      </div>

      <motion.a
        href="#music"
        aria-label="Scroll to music"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 text-sunset-gold/70 transition-colors hover:text-sunset-gold"
      >
        <motion.span
          className="block"
          animate={reduced ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-7 w-7" />
        </motion.span>
      </motion.a>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-4">
        <div className="hud-corners mx-auto flex max-w-4xl items-center justify-center gap-4 px-6 py-2">
          <p className="truncate text-center text-xs tracking-[0.2em] text-sunset-gold/60">
            LAT 25.79°N — LON 80.13°W&ensp;//&ensp;FREQ 88.3&ensp;//&ensp;SOL
            ELEVATION −4.2°
          </p>
        </div>
      </div>
    </section>
  );
}
