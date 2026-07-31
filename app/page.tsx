import type { Metadata } from "next";
import Link from "next/link";

import { LabelTabs } from "@/components/label/label-tabs";
import { contactEmail } from "@/lib/content";

export const metadata: Metadata = {
  title: "Not To B.A.D Records",
  description:
    "Not To B.A.D Records — independent label. We Really Out Here. Eras change; the vigil does not.",
  alternates: { canonical: "/" },
};

// Tier I only on label surfaces: obsidian, chrome, steel, blood.
const ROSTER = [
  {
    name: "SIMON AUGUSTE",
    era: "SILVER SURFER ERA",
    status: "ACTIVE",
    href: "/simon-auguste/",
  },
];

export default function LabelPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-chrome">
      {/* a single blood ember behind the crest — the only light in the room */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[120px]"
        style={{ background: "radial-gradient(circle, #b41c25 0%, transparent 70%)" }}
      />

      <header className="relative z-10 flex flex-col items-center gap-6 px-6 pt-8 sm:flex-row sm:justify-between sm:px-10">
        <p className="font-body text-[0.6rem] tracking-[0.4em] text-steel">
          EST. MAY 2015 — INDEPENDENT
        </p>
        <LabelTabs active="label" />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-24 pt-12 text-center sm:pt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/label/lockup.webp"
          alt="Not To B.A.D Records"
          className="w-[min(78vw,26rem)]"
        />

        <p className="font-body mt-6 text-sm font-medium tracking-[0.42em] text-blood sm:text-base">
          WE REALLY OUT HERE
        </p>

        <div
          aria-hidden
          className="mt-10 h-px w-40 bg-gradient-to-r from-transparent via-blood to-transparent"
        />

        <p className="font-body mt-10 max-w-xl text-sm font-light leading-relaxed tracking-[0.04em] text-steel">
          An independent record label built in the Bronx and run on its own
          terms — masters owned, records self-produced, nothing asked for.
          Every artist here gets an era. The house behind them does not change.
        </p>

        {/* Roster — the artist sites live under the label */}
        <section className="mt-16 w-full max-w-2xl text-left">
          <h2 className="font-body text-[0.6rem] tracking-[0.4em] text-steel">
            ROSTER
          </h2>
          <ul className="mt-4">
            {ROSTER.map((artist) => (
              <li key={artist.name}>
                <Link
                  href={artist.href}
                  className="group flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 transition-colors hover:border-blood/60"
                >
                  <span>
                    <span className="font-display text-chrome block text-xl font-bold tracking-[0.18em] transition-colors group-hover:text-white sm:text-2xl">
                      {artist.name}
                    </span>
                    <span className="font-body mt-1 block text-[0.6rem] tracking-[0.3em] text-steel">
                      {artist.era}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="font-body rounded-full border border-blood/50 px-3 py-1 text-[0.6rem] tracking-[0.25em] text-blood">
                      {artist.status}
                    </span>
                    <span className="text-steel transition-transform group-hover:translate-x-1 group-hover:text-blood">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="font-body border-t border-white/10 py-6 text-[0.6rem] tracking-[0.3em] text-steel/70">
            SIGNINGS CLOSED — ERAS ANNOUNCED HERE
          </p>
        </section>

        <Link
          href="/simon-auguste/"
          className="font-body mt-14 inline-flex items-center gap-3 border border-blood/60 bg-blood/10 px-8 py-4 text-xs font-medium tracking-[0.3em] text-chrome transition-colors hover:bg-blood hover:text-white"
        >
          ▸ ENTER MISSION CONTROL
        </Link>
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
        {/* System Law I — the seal marks every surface */}
        <span className="font-body flex items-center gap-3 text-[0.6rem] tracking-[0.3em] text-steel/70">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/label/mark.webp"
            alt=""
            className="h-8 w-auto opacity-70"
          />
          ERAS CHANGE — THE VIGIL DOES NOT
        </span>
      </footer>
    </div>
  );
}
