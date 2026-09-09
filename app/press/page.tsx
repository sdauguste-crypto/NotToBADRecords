import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { contactEmail, releases, shows, socials, videos } from "@/lib/content";
import { artistJsonLd } from "@/lib/structured-data";

// The press kit is a label surface: Tier I only (obsidian, chrome, steel,
// blood). Booking-first — a talent buyer should find the ask, the proof, and
// the email without scrolling past a single decorative element.

export const metadata: Metadata = {
  title: "Press Kit — Simon Auguste",
  description:
    "Simon Auguste press kit: bio, photos, releases, live format, and booking contact. Not To B.A.D Records, New York.",
  alternates: { canonical: "/press/" },
  openGraph: {
    title: "Press Kit — Simon Auguste",
    description:
      "Bio, photos, releases, live format, and booking contact for Simon Auguste.",
    url: "/press/",
  },
};

const PHOTOS = ["01", "02", "03", "04"].map((n) => `/gallery/photo-${n}.webp`);

const FACTS: [string, string][] = [
  ["Base", "New York City — born in the Bronx, raised in Florida"],
  ["Sound", "Hip-Hop / R&B"],
  ["Label", "Not To B.A.D Records — independent, est. 2015"],
  ["Masters", "100% artist-owned"],
  ["Credential", "Roc Nation Music Program graduate"],
  ["On stage", "Three — vocals with live processing, electric guitar, DJ"],
  ["Set", "Full set 45 min; 20 or 30 min cuts for support slots"],
  ["Tech", "Rider on request"],
  ["Management", "Twan — Motivation Music Management"],
];

function platform(name: (typeof socials)[number]["platform"]) {
  return socials.find((s) => s.platform === name);
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-body mb-5 text-[0.6rem] tracking-[0.4em] text-blood">
      {children}
    </h2>
  );
}

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|\s|\()(\S)/g, (_, gap: string, ch: string) => gap + ch.toUpperCase());
}

export default function PressPage() {
  const nextShow = shows[0];

  return (
    <div className="relative min-h-screen bg-obsidian text-chrome">
      <JsonLd data={artistJsonLd()} />

      <header className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="font-body text-[0.6rem] tracking-[0.4em] text-steel transition-colors hover:text-blood"
        >
          ← NOT TO B.A.D RECORDS
        </Link>
        <a
          href={`mailto:${contactEmail}?subject=Booking%20—%20Simon%20Auguste`}
          className="font-body inline-flex items-center gap-3 border border-blood/60 bg-blood/10 px-5 py-3 text-[0.65rem] tracking-[0.3em] text-chrome transition-colors hover:bg-blood hover:text-white"
        >
          BOOKING →
        </a>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 pb-24 pt-14">
        <p className="font-body text-[0.6rem] tracking-[0.4em] text-steel">
          PRESS KIT
        </p>
        <h1 className="font-display mt-4 text-3xl font-bold tracking-[0.14em] sm:text-5xl">
          SIMON AUGUSTE
        </h1>
        <p className="font-body mt-5 max-w-2xl text-base font-light leading-relaxed text-steel sm:text-lg">
          Cinematic Hip-Hop and R&amp;B out of New York — ambitious
          production, melodic candor, and a dreamlike, unhurried cool.
        </p>

        {/* Photos — photography leads; every frame is a real shot */}
        <section className="mt-16">
          <Heading>PHOTOS</Heading>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PHOTOS.map((src, index) => (
              <li key={src} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Simon Auguste — press photo ${index + 1}`}
                  loading={index === 0 ? "eager" : "lazy"}
                  className="aspect-[3/4] w-full border border-white/10 object-cover"
                />
                <a
                  href={src}
                  download
                  className="font-body absolute inset-x-0 bottom-0 bg-obsidian/85 px-3 py-2 text-center text-[0.6rem] tracking-[0.3em] text-chrome opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                >
                  DOWNLOAD
                </a>
              </li>
            ))}
          </ul>
          <p className="font-body mt-3 text-[0.6rem] tracking-[0.2em] text-steel/70">
            Hover a frame to download. Additional formats on request.
          </p>
        </section>

        {/* Bio — third person, place and sound first, real things only */}
        <section className="mt-16 grid gap-10 md:grid-cols-[1fr_18rem]">
          <div>
            <Heading>BIO</Heading>
            <div className="font-body space-y-4 text-sm leading-relaxed text-chrome/85 sm:text-base">
              <p>
                Simon Auguste makes cinematic Hip-Hop and R&amp;B out of New
                York City: ambitious production under melodic, candid writing,
                delivered with an unhurried cool. Born in the Bronx and raised
                in Florida, he runs his own imprint, Not To B.A.D Records,
                founded in 2015, and owns his masters and publishing outright.
              </p>
              <p>
                His catalog — &ldquo;No Lights&rdquo; (2016), &ldquo;Rockin
                with My&rdquo; (2021), and &ldquo;The Princess&rdquo; (2023)
                — lives inside <em>The Adventures of Young Simon &amp; The
                Silver Surfer</em>, a cinematic multiverse where a
                child&rsquo;s unhinged innocence collides with cosmic
                self-discovery. He is a graduate of the Roc Nation Music
                Program.
              </p>
              <p>
                On stage he performs with live vocal processing, electric
                guitar, and a DJ, and headlines his own ticketed franchise,
                The Coastal Viewing Show, at The Delancey in New York.
              </p>
            </div>
          </div>

          <div>
            <Heading>AT A GLANCE</Heading>
            <dl className="font-body divide-y divide-white/10 border-y border-white/10 text-sm">
              {FACTS.map(([term, detail]) => (
                <div key={term} className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                  <dt className="text-[0.6rem] uppercase tracking-[0.25em] text-steel">
                    {term}
                  </dt>
                  <dd className="text-chrome/85">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Live */}
        <section className="mt-16">
          <Heading>LIVE</Heading>
          <div className="font-body space-y-3 text-sm text-chrome/85 sm:text-base">
            {nextShow ? (
              <p>
                <span className="text-steel">Next date · </span>
                {nextShow.venue}, {nextShow.city} —{" "}
                {titleCase(nextShow.date)}
              </p>
            ) : null}
            <p>
              <span className="text-steel">Past · </span>
              The Coastal Viewing Show, The Delancey, New York (Jan 8, 2026 —
              self-promoted, ticketed) · The Coastal Viewing Concert (Mar
              2026) · house concerts and studio shows
            </p>
            <p>
              <span className="text-steel">Video · </span>
              <a
                href="https://www.youtube.com/watch?v=f_KezE1l4-c"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-blood/60 underline-offset-4 transition-colors hover:text-blood"
              >
                Live performance
              </a>
              <span className="text-steel"> (archival)</span>
            </p>
          </div>
        </section>

        {/* Releases + videos */}
        <section className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <Heading>RELEASES</Heading>
            <ul className="font-body divide-y divide-white/10 border-y border-white/10 text-sm">
              {releases.map((release) => (
                <li
                  key={release.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span>
                    <span className="text-chrome">{titleCase(release.title)}</span>
                    <span className="text-steel"> · {release.year}</span>
                  </span>
                  <span className="flex gap-4 text-[0.6rem] tracking-[0.25em]">
                    {release.spotifyUrl ? (
                      <a
                        href={release.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-steel transition-colors hover:text-blood"
                      >
                        SPOTIFY
                      </a>
                    ) : null}
                    {release.appleMusicUrl ? (
                      <a
                        href={release.appleMusicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-steel transition-colors hover:text-blood"
                      >
                        APPLE
                      </a>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Heading>VIDEOS</Heading>
            <ul className="font-body divide-y divide-white/10 border-y border-white/10 text-sm">
              {videos.map((video) => (
                <li key={video.id} className="py-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 transition-colors hover:text-blood"
                  >
                    <span>{titleCase(video.title)}</span>
                    <span className="text-[0.6rem] tracking-[0.25em] text-steel">
                      YOUTUBE
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Links */}
        <section className="mt-16">
          <Heading>LINKS</Heading>
          <ul className="font-body flex flex-wrap gap-x-6 gap-y-3 text-[0.65rem] tracking-[0.3em]">
            {(
              [
                ["SPOTIFY", platform("spotify")],
                ["APPLE MUSIC", platform("apple-music")],
                ["YOUTUBE", platform("youtube")],
                ["INSTAGRAM", platform("instagram")],
                ["TIKTOK", platform("tiktok")],
                ["X", platform("x")],
              ] as const
            ).map(([label, social]) =>
              social ? (
                <li key={label}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-steel transition-colors hover:text-blood"
                  >
                    {label}
                  </a>
                </li>
              ) : null,
            )}
            <li>
              <Link
                href="/simon-auguste/"
                className="text-steel transition-colors hover:text-blood"
              >
                ARTIST SITE
              </Link>
            </li>
          </ul>
        </section>

        {/* Booking — the ask */}
        <section className="mt-16 border-t border-white/10 pt-10">
          <Heading>BOOKING</Heading>
          <p className="font-body text-sm text-chrome/85 sm:text-base">
            Twan — Motivation Music Management. Email is the only booking
            channel.
          </p>
          <a
            href={`mailto:${contactEmail}?subject=Booking%20—%20Simon%20Auguste`}
            className="font-body mt-5 inline-flex items-center gap-3 border border-blood/60 bg-blood/10 px-6 py-4 text-xs tracking-[0.3em] text-chrome transition-colors hover:bg-blood hover:text-white"
          >
            {contactEmail.toUpperCase()} →
          </a>
        </section>
      </main>

      <footer className="flex flex-col items-center gap-4 border-t border-white/10 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="font-body text-[0.6rem] tracking-[0.3em] text-steel">
          © 2026 NOT TO B.A.D RECORDS
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
