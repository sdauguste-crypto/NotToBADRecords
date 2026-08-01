import type { Metadata } from "next";

import { LabelTabs } from "@/components/label/label-tabs";
import { Storefront } from "@/components/store/storefront";
import { contactEmail } from "@/lib/content";

export const metadata: Metadata = {
  title: "Store | Not To B.A.D Records",
  description:
    "Official merchandise from Not To B.A.D Records. Streetwear, the elevated line, and the comic-style lookbook. Waitlist-first, small runs.",
  alternates: { canonical: "/store/" },
};

// Tier I surface: the store belongs to the label, not to an era, so it
// keeps the obsidian/chrome/steel/blood palette of the landing page.
export default function StorePage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-obsidian">
      {/* one blood ember, same as the landing page: the room stays dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[12%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-[0.14] blur-[120px]"
        style={{ background: "radial-gradient(circle, #b41c25 0%, transparent 70%)" }}
      />

      <header className="relative z-10 flex flex-col items-center gap-6 px-6 pt-8 sm:flex-row sm:justify-between sm:px-10">
        <p className="font-body text-[0.6rem] tracking-[0.4em] text-steel">
          EST. MAY 2015 — INDEPENDENT
        </p>
        <LabelTabs active="store" />
      </header>

      <main className="relative z-10 pb-24 pt-10 sm:pt-14">
        <Storefront />
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-4 border-t border-white/10 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="font-body text-[0.6rem] tracking-[0.3em] text-steel">
          SIMON DAVE AUGUSTE ·{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="transition-colors hover:text-blood"
          >
            {contactEmail.toUpperCase()}
          </a>
        </p>
        <span className="font-body flex items-center gap-3 text-[0.6rem] tracking-[0.3em] text-steel/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/label/mark.webp" alt="" className="h-8 w-auto opacity-70" />
          ERAS CHANGE — THE VIGIL DOES NOT
        </span>
      </footer>
    </div>
  );
}
