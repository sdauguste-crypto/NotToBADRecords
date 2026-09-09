import type { Metadata } from "next";
import Link from "next/link";

import { releases, shows, socials } from "@/lib/content";

// The link-in-bio destination: one page, one column, every way to listen.
// No scene, no player — it has to open instantly on a phone from a social app.

const latest = releases[0];

const TITLE = "Listen — Simon Auguste";
const DESCRIPTION =
  "Simon Auguste on Spotify, Apple Music, and YouTube. Not To B.A.D Records.";
const CARD_IMAGE = latest.coverImage ?? "/og-card.jpg";

// Page-level openGraph/twitter replace the root's wholesale, so every field
// a share card needs is restated here.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/listen/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/listen/",
    siteName: "Not To B.A.D Records",
    type: "website",
    images: [{ url: CARD_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [CARD_IMAGE],
  },
};

function platform(name: (typeof socials)[number]["platform"]) {
  return socials.find((s) => s.platform === name);
}

const LISTEN = [
  { label: "SPOTIFY", href: platform("spotify")?.url },
  { label: "APPLE MUSIC", href: platform("apple-music")?.url },
  { label: "YOUTUBE", href: platform("youtube")?.url },
].filter((l): l is { label: string; href: string } => !!l.href);

const FOLLOW = [
  { label: "INSTAGRAM", href: platform("instagram")?.url },
  { label: "TIKTOK", href: platform("tiktok")?.url },
  { label: "X", href: platform("x")?.url },
].filter((l): l is { label: string; href: string } => !!l.href);

export default function ListenPage() {
  // a link-in-bio only points at dates that exist
  const nextShow = shows.find((s) => s.status !== "postponed");

  return (
    <div className="relative min-h-screen overflow-hidden bg-obsidian text-chrome">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[22%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full opacity-[0.18] blur-[110px]"
        style={{ background: "radial-gradient(circle, #b41c25 0%, transparent 70%)" }}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center px-6 pb-16 pt-12 text-center">
        <Link
          href="/"
          className="font-body text-[0.6rem] tracking-[0.4em] text-steel transition-colors hover:text-blood"
        >
          NOT TO B.A.D RECORDS
        </Link>

        {latest.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={latest.coverImage}
            alt={`${latest.title} cover art`}
            className="mt-8 w-56 rounded-md border border-white/10 shadow-[0_30px_80px_-20px_rgba(180,28,37,0.55)]"
          />
        ) : null}

        <h1 className="font-display mt-8 text-2xl font-bold tracking-[0.18em] sm:text-3xl">
          SIMON AUGUSTE
        </h1>
        <p className="font-body mt-2 text-[0.6rem] tracking-[0.35em] text-steel">
          {latest.title} · {latest.year}
        </p>

        <ul className="mt-10 w-full space-y-3">
          {LISTEN.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-body flex items-center justify-between border border-white/15 bg-black/30 px-6 py-4 text-xs tracking-[0.3em] text-chrome transition-colors hover:border-blood hover:bg-blood/10"
              >
                {link.label}
                <span className="text-blood">→</span>
              </a>
            </li>
          ))}
        </ul>

        {nextShow ? (
          <Link
            href="/simon-auguste/#events"
            className="font-body mt-8 text-[0.65rem] tracking-[0.3em] text-steel transition-colors hover:text-blood"
          >
            LIVE · {nextShow.date} · {nextShow.venue.toUpperCase()},{" "}
            {nextShow.city.split(",")[0].toUpperCase()} →
          </Link>
        ) : null}

        <Link
          href="/simon-auguste/#contact"
          className="font-body mt-6 inline-flex w-full items-center justify-center border border-blood/60 bg-blood/10 px-6 py-4 text-xs font-medium tracking-[0.3em] text-chrome transition-colors hover:bg-blood hover:text-white"
        >
          SPACE CADETS — GET ON THE LIST
        </Link>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-6">
          {FOLLOW.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-body text-[0.6rem] tracking-[0.35em] text-steel transition-colors hover:text-blood"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Link
          href="/simon-auguste/"
          className="font-body mt-12 text-[0.6rem] tracking-[0.35em] text-steel/70 transition-colors hover:text-blood"
        >
          ▸ ENTER MISSION CONTROL
        </Link>
      </main>

      <footer className="relative z-10 flex items-center justify-center gap-3 border-t border-white/10 px-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/label/mark.webp" alt="" className="h-7 w-auto opacity-70" />
        <span className="font-body text-[0.6rem] tracking-[0.3em] text-steel/70">
          WE REALLY OUT HERE
        </span>
      </footer>
    </div>
  );
}
