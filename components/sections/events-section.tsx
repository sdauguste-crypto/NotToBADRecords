"use client";

import { motion } from "motion/react";

import { shows, type Show } from "@/lib/content";
import { cn } from "@/lib/utils";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

const STATUS_CONFIG: Record<
  Show["status"],
  { label: string; dot: string; text: string; border: string }
> = {
  "on-sale": {
    label: "ON SALE",
    dot: "bg-emerald-400 text-emerald-400",
    text: "text-emerald-300",
    border: "border-emerald-400/40",
  },
  "sold-out": {
    label: "SOLD OUT",
    dot: "bg-red-500 text-red-500",
    text: "text-red-400",
    border: "border-red-500/40",
  },
  announced: {
    label: "ANNOUNCED",
    dot: "bg-amber-400 text-amber-400",
    text: "text-amber-300",
    border: "border-amber-400/40",
  },
};

function StatusChip({ status }: { status: Show["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]",
        config.border,
        config.text,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          config.dot,
          status !== "sold-out" && "animate-led-pulse motion-reduce:animate-none",
        )}
      />
      {config.label}
    </span>
  );
}

export function EventsSection() {
  const reduced = useReducedMotion();

  return (
    <SectionShell
      id="events"
      hudLabel="// SECTION 05 — LAUNCH WINDOWS"
      title="MISSION SCHEDULE"
      accent="pink"
    >
      <div className="relative pl-8 md:pl-12">
        {/* timeline line */}
        <div
          aria-hidden
          className="absolute bottom-4 left-2 top-4 w-px bg-gradient-to-b from-sunset-pink via-sunset-magenta to-sunset-gold shadow-[0_0_12px_rgba(255,46,136,.5)] md:left-3"
        />

        <ol className="space-y-6">
          {shows.map((show, index) => {
            const [month, day, year] = show.date.split(" ");
            const soldOut = show.status === "sold-out";

            return (
              <motion.li
                key={show.id}
                initial={{ opacity: 0, x: reduced ? 0 : -36 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.7,
                  ease: "easeOut",
                  delay: index * 0.1,
                }}
                className="relative"
              >
                {/* node dot */}
                <span
                  aria-hidden
                  className="absolute -left-8 top-8 h-3 w-3 -translate-x-1/2 rounded-full bg-sunset-gold shadow-[0_0_12px_rgba(255,200,87,.8)] md:-left-9"
                />

                <div className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6">
                  <div className="w-24 shrink-0 text-center">
                    <p className="font-bold leading-none text-4xl text-sunset-gold [text-shadow:0_0_18px_rgba(255,200,87,.5)]">
                      {day}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-sunset-gold/70">
                      {month} {year}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    {index === 0 ? (
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.25em]">
                        <AnimatedGradientText colorFrom="#ff2e88" colorTo="#ffc857">
                          ▲ NEXT LAUNCH
                        </AnimatedGradientText>
                      </p>
                    ) : null}
                    <h3 className="truncate font-bold uppercase tracking-wide text-lg text-foreground">
                      {show.venue}
                    </h3>
                    <p className="mt-1 text-xs tracking-[0.25em] text-foreground/60">
                      {show.city}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <StatusChip status={show.status} />
                    <Button
                      variant="ghost"
                      disabled={soldOut}
                      className="rounded-full border border-sunset-pink/40 px-6 text-xs font-bold uppercase tracking-[0.2em] text-sunset-pink hover:border-sunset-pink hover:bg-sunset-pink/10 hover:text-sunset-pink"
                    >
                      TICKETS
                    </Button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </SectionShell>
  );
}
