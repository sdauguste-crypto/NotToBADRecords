"use client";

import { motion } from "motion/react";

import { galleryItems, type GalleryItem } from "@/lib/content";
import { Marquee } from "@/components/magicui/marquee";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { CoverArt } from "@/components/fanhub/cover-art";
import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

function GalleryTile({ item }: { item: GalleryItem }) {
  return (
    <figure className="group relative w-56 shrink-0 overflow-hidden rounded-xl">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="aspect-[3/4] w-full rounded-xl border border-sunset-pink/15 object-cover"
        />
      ) : (
        <CoverArt seed={item.seed} title={item.title} className="aspect-[3/4] w-full" />
      )}
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end rounded-b-xl bg-gradient-to-t from-void-deep/95 via-void-deep/50 to-transparent px-4 pb-3 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-sunset-gold">
          {item.caption}
        </span>
      </figcaption>
    </figure>
  );
}

const STATS = [
  { value: "2024", label: "EST." },
  { value: "12", label: "RELEASES" },
  { value: "∞", label: "VIBES" },
];

export function GallerySection() {
  const reduced = useReducedMotion();
  const half = Math.ceil(galleryItems.length / 2);
  const rowOne = galleryItems.slice(0, half);
  const rowTwo = galleryItems.slice(half);

  return (
    <SectionShell
      id="gallery"
      hudLabel="// SECTION 03 — ARCHIVE"
      title="BEHIND THE CHROME"
      accent="pink"
    >
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative left-1/2 w-screen -translate-x-1/2"
      >
        <Marquee pauseOnHover className="[--duration:55s]">
          {rowOne.map((item) => (
            <GalleryTile key={item.id} item={item} />
          ))}
        </Marquee>
        <Marquee pauseOnHover reverse className="[--duration:60s]">
          {rowTwo.map((item) => (
            <GalleryTile key={item.id} item={item} />
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
      </motion.div>

      <div className="mt-16 flex flex-wrap items-center justify-center gap-6">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.12 }}
            className="hud-corners px-8 py-4 text-center"
          >
            <p className="font-bold text-3xl text-sunset-gold [text-shadow:0_0_18px_rgba(255,200,87,.5)]">
              {stat.value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-foreground/60">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}
