"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { SECTION_IDS, type SectionId } from "@/lib/journey-state";

const NAV_LINKS: { id: SectionId; label: string }[] = [
  { id: "music", label: "MUSIC" },
  { id: "videos", label: "VIDEOS" },
  { id: "gallery", label: "GALLERY" },
  { id: "store", label: "STORE" },
  { id: "events", label: "EVENTS" },
  { id: "about", label: "ABOUT" },
  { id: "contact", label: "CONTACT" },
];

export function SiteNav() {
  const [active, setActive] = useState<SectionId>("hero");
  const [open, setOpen] = useState(false);

  // Track the section currently in the middle band of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  // Close the mobile overlay on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Intercept anchor clicks: scrollIntoView avoids basePath/anchor edge
  // cases in the static export and lets us honor reduced motion.
  const goTo = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: SectionId) => {
      e.preventDefault();
      setOpen(false);
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      history.replaceState(null, "", `#${id}`);
    },
    [],
  );

  return (
    <header className="fixed top-0 z-40 w-full">
      <div className="glass-panel mx-3 mt-3 flex items-center justify-between px-5 py-3 md:mx-auto md:max-w-6xl">
        <a
          href="#hero"
          onClick={(e) => goTo(e, "hero")}
          className="flex items-center gap-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-crest.webp"
            alt=""
            className="h-9 w-auto drop-shadow-[0_0_10px_rgba(255,46,136,0.45)] md:h-10"
          />
          <span className="text-neon-gold text-sm font-bold uppercase tracking-widest md:text-base">
            NOT TO B.A.D RECORDS
          </span>
        </a>

        {/* Desktop links */}
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map(({ id, label }) => {
            const isActive = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => goTo(e, id)}
                aria-current={isActive ? "true" : undefined}
                className={
                  "text-xs tracking-[0.25em] transition " +
                  (isActive
                    ? "border-b border-sunset-pink text-sunset-pink shadow-[0_6px_14px_-6px_#ff2e88]"
                    : "text-foreground/70 hover:text-sunset-pink")
                }
              >
                {label}
              </a>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="text-foreground/80 hover:text-sunset-pink transition lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-void/95 backdrop-blur lg:hidden"
          >
            <div className="flex items-center justify-between px-8 py-6">
              <span className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-crest.webp" alt="" className="h-9 w-auto" />
                <span className="text-neon-gold text-sm font-bold uppercase tracking-widest">
                  NOT TO B.A.D RECORDS
                </span>
              </span>
              <button
                type="button"
                className="text-foreground/80 hover:text-sunset-pink transition"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-7" />
              </button>
            </div>
            <nav
              aria-label="Primary"
              className="flex flex-1 flex-col items-center justify-center gap-7"
            >
              {NAV_LINKS.map(({ id, label }, index) => (
                <motion.a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => goTo(e, id)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index, duration: 0.3 }}
                  className={
                    "text-2xl uppercase tracking-[0.2em] transition " +
                    (active === id
                      ? "text-sunset-pink"
                      : "text-foreground/80 hover:text-sunset-pink")
                  }
                >
                  {label}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
