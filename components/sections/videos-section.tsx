"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Play } from "lucide-react";

import { videos, type Video } from "@/lib/content";
import { cn } from "@/lib/utils";
import { BorderBeam } from "@/components/magicui/border-beam";
import { SectionShell } from "@/components/sections/section-shell";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";

type VideoCardProps = {
  video: Video;
  featured?: boolean;
};

function VideoCard({ video, featured = false }: VideoCardProps) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={cn(
        "glass-panel group relative aspect-video w-full overflow-hidden",
        !featured &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-sunset-gold/50",
      )}
    >
      {featured ? (
        <BorderBeam size={70} duration={10} colorFrom="#d9a8ff" colorTo="#ff2e88" />
      ) : null}

      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full rounded-[inherit] border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${video.title}`}
          className="scanlines absolute inset-0 flex cursor-pointer items-center justify-center rounded-[inherit] bg-gradient-to-br from-void-panel via-void-panel to-sunset-magenta/20"
        >
          {/* real YouTube thumbnail, tinted into the synthwave palette;
              eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full rounded-[inherit] object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-95"
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-void-deep/80 via-transparent to-sunset-magenta/15"
          />
          <span
            className={cn(
              "flex items-center justify-center rounded-full border-2 border-sunset-pink text-sunset-pink shadow-[0_0_24px_rgba(255,46,136,.6),inset_0_0_16px_rgba(255,46,136,.25)] transition-transform duration-300 group-hover:scale-110",
              featured ? "h-20 w-20" : "h-14 w-14",
            )}
          >
            <Play
              className={cn("translate-x-0.5", featured ? "h-8 w-8" : "h-6 w-6")}
              fill="currentColor"
            />
          </span>

          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-void-deep/95 to-transparent px-4 pb-3 pt-8 text-left">
            <span
              className={cn(
                "truncate font-bold uppercase tracking-wide text-foreground/90",
                featured ? "text-sm md:text-base" : "text-xs",
              )}
            >
              {video.title}
            </span>
            {video.duration ? (
              <span className="shrink-0 rounded-full border border-sunset-gold/40 px-2 py-0.5 text-xs tracking-[0.15em] text-sunset-gold">
                {video.duration}
              </span>
            ) : null}
          </span>
        </button>
      )}
    </div>
  );
}

export function VideosSection() {
  const reduced = useReducedMotion();
  const [featured, ...rest] = videos;

  return (
    <SectionShell
      id="videos"
      hudLabel="// SECTION 02 — TRANSMISSIONS"
      title="IN MOTION"
      accent="gold"
    >
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <VideoCard video={featured} featured />
      </motion.div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: reduced ? 0 : 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.1 }}
          >
            <VideoCard video={video} />
          </motion.div>
        ))}
      </div>
    </SectionShell>
  );
}
