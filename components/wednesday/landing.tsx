import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import {
  AppleMusicIcon,
  InstagramIcon,
  SpotifyIcon,
  TikTokIcon,
  YoutubeIcon,
} from "@/components/icons/platform-icons";
import { releases, shows, socials, videos, type Show, type Social } from "@/lib/content";
import { wednesday } from "@/lib/wednesday";

import { MoreMusic, type MoreMusicRelease } from "./more-music";
import { RevealOnScroll } from "./reveal-on-scroll";
import { HeroDisc } from "./ring";
import { WednesdaySignup } from "./signup";
import { SingleCard } from "./single-card";
import { VideoCarousel } from "./video-carousel";

// /wednesday — the link in Simon's Instagram and TikTok bios, so it is built
// for their in-app browsers first: one dark field, one accent, plain CSS
// motion, no scene, no motion library, and third-party players only after a
// tap. Everything here reads from lib/wednesday.ts and lib/content.ts.

const single = releases.find((r) => r.title === wednesday.title);
// MoreMusic is a client component, so whatever it gets is serialized into
// the page: hand it only what the row shows (no audio files, seeds or tags)
const moreMusic: MoreMusicRelease[] = releases
  .filter((r) => r.title !== wednesday.title && r.coverImage)
  .map(({ id, title, year, coverImage, spotifyUrl, spotifyEmbedUrl, appleMusicUrl }) => ({
    id,
    title,
    year,
    coverImage,
    spotifyUrl,
    spotifyEmbedUrl,
    appleMusicUrl,
  }));
// a page people act on only lists dates that exist
const upcoming = shows.filter((s) => s.status !== "postponed");

const profile = (platform: Social["platform"]) => socials.find((s) => s.platform === platform)?.url;

// Spotify's mark is a solid disc beside outline glyphs: a step smaller and a
// touch dimmer at rest, so the five read as one set
const PLATFORMS = [
  { label: "WEDNESDAY on Spotify", href: wednesday.links.spotify, Icon: SpotifyIcon, icon: "h-[18px] w-[18px] opacity-90" },
  { label: "WEDNESDAY on Apple Music", href: wednesday.links.appleMusic, Icon: AppleMusicIcon, icon: "h-5 w-5" },
  { label: "Simon Auguste on YouTube", href: profile("youtube"), Icon: YoutubeIcon, icon: "h-5 w-5" },
  { label: "Simon Auguste on Instagram", href: profile("instagram"), Icon: InstagramIcon, icon: "h-5 w-5" },
  { label: "Simon Auguste on TikTok", href: profile("tiktok"), Icon: TikTokIcon, icon: "h-5 w-5" },
].filter((p): p is typeof p & { href: string } => !!p.href);

const NAV = [
  { href: "#music", label: "Music" },
  { href: "#videos", label: "Videos" },
  { href: "#shows", label: "Shows" },
];

const delay = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;

// A pill inside a taller 44px hit area: the focus ring hugs the visible pill
// (the anchor's own outline would be a box around a round shape)
const PILL_LINK = "group flex min-h-11 items-center rounded-full focus-visible:outline-none";
const PILL_FOCUS =
  "group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-chrome";

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-chrome"
    >
      <span aria-hidden className="h-px w-6 bg-blood" />
      {children}
    </h2>
  );
}

function ShowRow({ show }: { show: Show }) {
  const [month, day] = show.date.split(" ");
  return (
    <li className="wed-glass flex items-center gap-4 p-3 pr-3.5">
      <time
        dateTime={show.isoDate}
        className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
      >
        <span className="text-[0.6rem] font-medium tracking-[0.2em] text-steel">{month}</span>
        <span className="mt-0.5 text-xl font-semibold leading-none text-chrome">{day}</span>
      </time>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-chrome">{show.venue}</p>
        <p className="truncate text-xs text-steel">{show.city}</p>
      </div>
      {show.status === "sold-out" ? (
        <span className="text-[0.65rem] font-semibold tracking-[0.18em] text-steel">SOLD OUT</span>
      ) : show.ticketUrl ? (
        <a
          href={show.ticketUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Tickets for ${show.venue}, ${show.date}`}
          className={PILL_LINK}
        >
          <span className={`rounded-full bg-chrome px-4 py-2 text-[0.65rem] font-semibold tracking-[0.18em] text-obsidian transition-colors group-hover:bg-white ${PILL_FOCUS}`}>
            TICKETS
          </span>
        </a>
      ) : (
        <a href="#loop" className={PILL_LINK}>
          <span className={`rounded-full border border-white/20 px-4 py-2 text-[0.65rem] font-semibold tracking-[0.18em] text-chrome transition-colors group-hover:border-blood group-hover:bg-blood ${PILL_FOCUS}`}>
            NOTIFY ME
          </span>
        </a>
      )}
    </li>
  );
}

export function WednesdayLanding() {
  return (
    <div className="wed-landing font-body relative min-h-[100svh] overflow-hidden bg-obsidian text-chrome">
      {/* ambient: the cover at 40px, stretched by the browser into a soft
          wash — the look of a blur with no blur filter — under the dark. It
          is taller than the screen, so it never animates: an animated layer
          this size is what the in-app browsers can't afford. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[min(125svh,68rem)] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wednesday.ambient}
          width={40}
          height={40}
          alt=""
          decoding="async"
          className="h-full w-full object-cover opacity-60"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% 32%, rgba(180,28,37,0.22), rgba(180,28,37,0) 70%), linear-gradient(180deg, rgba(9,8,13,0.55) 0%, rgba(9,8,13,0.8) 50%, #09080d 100%)",
          }}
        />
      </div>

      {/* sized to fit one row from 360px phones up; under 350px the section
          links step aside so the name and LISTEN keep their room */}
      <header className="wed-rise relative z-20 mx-auto flex h-16 w-full max-w-[78rem] items-center justify-between gap-2 px-4 sm:px-8">
        <Link
          href="/simon-auguste/"
          prefetch={false}
          className="flex min-h-11 items-center whitespace-nowrap rounded-full text-[0.6rem] font-semibold tracking-[0.2em] text-chrome transition-opacity hover:opacity-80 min-[385px]:text-[0.66rem] min-[385px]:tracking-[0.26em] sm:text-xs sm:tracking-[0.32em]"
        >
          SIMON AUGUSTE
        </Link>
        <div className="flex items-center sm:gap-4">
          <nav aria-label="On this page" className="flex items-center max-[349px]:hidden">
            {NAV.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full px-[0.2rem] text-[0.72rem] text-steel transition-colors hover:text-chrome min-[385px]:px-[0.4rem] min-[385px]:text-[0.75rem] sm:px-3 sm:text-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <a href="#listen" className={`ml-1 ${PILL_LINK}`}>
            <span className={`rounded-full bg-chrome px-3 py-2 text-[0.62rem] font-bold tracking-[0.16em] text-obsidian transition-colors group-hover:bg-white min-[385px]:px-3.5 min-[385px]:text-[0.64rem] min-[385px]:tracking-[0.2em] sm:px-5 sm:text-[0.7rem] ${PILL_FOCUS}`}>
              LISTEN
            </span>
          </a>
        </div>
      </header>

      <main className="relative z-10">
        {/* ---------- hero ---------- */}
        <section
          aria-labelledby="wed-title"
          className="wed-hero mx-auto grid w-full max-w-[78rem] items-center px-4 pb-5 pt-1.5 sm:px-8 sm:pb-12 sm:pt-3 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-12"
        >
          {/* on short screens (small phones, in-app browsers) the disc gives a
              little, so the single's play circle still makes the first screen;
              on laptops it is capped by the height too, so the ring keeps
              its air under the nav and above the fold */}
          <div
            className="wed-rise mx-auto w-[min(88vw,26rem,48svh)] sm:w-[min(88vw,26rem)] lg:w-full lg:max-w-[min(36rem,calc(100svh-11rem))]"
            style={delay(60)}
          >
            <HeroDisc
              src={wednesday.cover.src}
              width={wednesday.cover.width}
              height={wednesday.cover.height}
              srcSet={`${wednesday.coverMedium.src} ${wednesday.coverMedium.width}w, ${wednesday.cover.src} ${wednesday.cover.width}w`}
              sizes="(min-width: 64rem) 32rem, min(78vw, 23rem)"
              alt={`${wednesday.title} by ${wednesday.artist} — cover art`}
            />
          </div>

          {/* the wordmark sits just under the ring, clear of the arc; DOM
              order is the reading order, and on desktop the OUT NOW kicker
              lifts above the title */}
          <div className="relative z-10 mt-0.5 flex flex-col items-center text-center sm:mt-1.5 lg:mt-0 lg:items-start lg:text-left">
            <h1
              id="wed-title"
              className="wed-rise font-display text-[2.6rem] font-bold leading-[1.02] tracking-[0.01em] min-[400px]:text-[2.85rem] sm:text-6xl lg:mt-6 lg:text-[4.4rem] xl:text-[5rem]"
              style={delay(260)}
            >
              <span className="text-chrome-metal">{wednesday.title}</span>
            </h1>
            <p
              className="wed-rise mt-2.5 text-[0.72rem] font-semibold tracking-[0.5em] text-chrome/90 lg:mt-5 lg:text-sm"
              style={delay(340)}
            >
              SIMON AUGUSTE
            </p>
            <p
              className="wed-rise mt-4 inline-flex items-center gap-2.5 rounded-full border border-blood/60 bg-blood/[0.12] px-3.5 py-1.5 text-[0.62rem] font-semibold tracking-[0.28em] text-chrome lg:order-first lg:mt-0"
              style={delay(420)}
            >
              <span aria-hidden className="relative flex size-1.5">
                <span className="animate-led-pulse motion-reduce:animate-none absolute inset-0 rounded-full bg-blood text-blood" />
              </span>
              OUT NOW · NEW SINGLE
            </p>
            <p
              className="wed-rise mt-6 hidden max-w-sm text-base leading-relaxed text-steel lg:block"
              style={delay(480)}
            >
              The new single from Simon Auguste — out now on Spotify and Apple Music, with a
              preview right here on the page.
            </p>

            <ul
              className="wed-rise mt-3 flex items-center gap-1 sm:mt-5 lg:-ml-3 lg:mt-7"
              style={delay(540)}
            >
              {PLATFORMS.map(({ label, href, Icon, icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex size-11 items-center justify-center rounded-full text-chrome transition-[color,background-color,transform] duration-300 hover:bg-blood active:scale-95"
                  >
                    <Icon className={icon} />
                  </a>
                </li>
              ))}
            </ul>

            <a
              href="#listen"
              className="wed-rise group mt-8 hidden h-12 items-center gap-3 rounded-full bg-blood pl-6 pr-2 text-xs font-semibold tracking-[0.24em] text-chrome transition-colors hover:bg-oxblood lg:inline-flex"
              style={delay(620)}
            >
              LISTEN NOW
              <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-obsidian/30 transition-transform duration-300 group-hover:translate-y-0.5">
                ↓
              </span>
            </a>
          </div>
        </section>

        {/* ---------- the rest: one centred column ---------- */}
        <div className="mx-auto w-full max-w-[38rem] px-4 pb-6 sm:px-6">
          <section id="listen" aria-labelledby="listen-h" className="scroll-mt-6" data-reveal>
            {/* on phones the hero pill already says NEW SINGLE: the heading
                stays for screen readers, and the card moves up to the fold */}
            <div className="mb-4 flex min-h-11 items-center max-sm:sr-only">
              <SectionHeading id="listen-h">New single</SectionHeading>
            </div>
            <SingleCard
              title={wednesday.title}
              artist={wednesday.artist}
              year={single?.year ?? new Date(wednesday.releaseAt).getFullYear()}
              thumb={wednesday.thumb}
              previewSrc={wednesday.previewClip}
              spotifyUrl={wednesday.links.spotify}
              appleMusicUrl={wednesday.links.appleMusic}
              spotifyEmbedUrl={single?.spotifyEmbedUrl}
            />
          </section>

          {moreMusic.length > 0 ? (
            <section id="music" aria-labelledby="music-h" className="mt-16 scroll-mt-6" data-reveal>
              <div className="mb-5 flex min-h-11 items-center justify-between gap-4">
                <SectionHeading id="music-h">More music</SectionHeading>
                <p className="text-[0.65rem] tracking-[0.18em] text-steel">PLAYS RIGHT HERE</p>
              </div>
              <MoreMusic releases={moreMusic} />
            </section>
          ) : null}

          {videos.length > 0 ? (
            // isolate: the swipe row is its own composited scroller; as a
            // closed group it keeps everything after it from being pushed
            // into one page-tall layer above it
            <section id="videos" aria-labelledby="videos-h" className="isolate mt-16 scroll-mt-6" data-reveal>
              <VideoCarousel
                videos={videos}
                heading={<SectionHeading id="videos-h">Videos</SectionHeading>}
              />
            </section>
          ) : null}

          <section id="shows" aria-labelledby="shows-h" className="mt-16 scroll-mt-6" data-reveal>
            <div className="mb-4 flex min-h-11 items-center">
              <SectionHeading id="shows-h">Shows</SectionHeading>
            </div>
            {upcoming.length > 0 ? (
              <ul className="space-y-2.5">
                {upcoming.map((show) => (
                  <ShowRow key={show.id} show={show} />
                ))}
              </ul>
            ) : (
              <div className="wed-glass flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex flex-1 items-center gap-4">
                  <span
                    aria-hidden
                    className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 text-steel"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                      <path d="M3.5 10h17M8 3v4M16 3v4" />
                    </svg>
                  </span>
                  <p className="text-sm leading-snug">
                    <span className="block font-semibold text-chrome">No dates on the board right now</span>
                    <span className="mt-1 block text-steel">Join the list and you’ll hear first.</span>
                  </p>
                </div>
                <a
                  href="#loop"
                  className="flex h-11 shrink-0 items-center justify-center rounded-full border border-blood/70 bg-blood/[0.14] px-5 text-[0.66rem] font-semibold tracking-[0.2em] text-chrome transition-colors hover:bg-blood"
                >
                  GET ON THE LIST
                </a>
              </div>
            )}
          </section>

          <section id="loop" aria-labelledby="loop-h" className="mt-16 scroll-mt-6" data-reveal>
            <div className="mb-4 flex min-h-11 items-center">
              <SectionHeading id="loop-h">Stay in the loop</SectionHeading>
            </div>
            <WednesdaySignup
              label="Take Off Thursdays — new drops every Thursday."
              tag={wednesday.tags.weekly}
              success="You're in, Cadet. New drops hit your inbox every Thursday."
            />
          </section>
        </div>
      </main>

      <footer className="relative z-10 mt-20 border-t border-white/[0.08]" data-reveal>
        <div className="mx-auto flex max-w-[38rem] flex-col items-center px-4 pb-12 pt-10 text-center">
          <Link href="/" prefetch={false} aria-label="Not To B.A.D Records" className="rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/label/seal-288.webp"
              width={288}
              height={288}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-24 opacity-90 transition-opacity hover:opacity-100"
            />
          </Link>
          <nav aria-label="Not To B.A.D Records" className="mt-5 flex flex-wrap items-center justify-center">
            {[
              { href: "/simon-auguste/", label: "Artist site" },
              { href: "/listen/", label: "Listen" },
              { href: "/press/", label: "Press" },
            ].map((link, i) => (
              <span key={link.href} className="flex items-center">
                {i > 0 ? <span aria-hidden className="text-steel/50">·</span> : null}
                <Link
                  href={link.href}
                  prefetch={false}
                  className="flex min-h-11 items-center px-3 text-sm text-steel transition-colors hover:text-chrome"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
          <Link
            href="/"
            prefetch={false}
            className="mt-1 flex min-h-11 items-center text-[0.62rem] tracking-[0.34em] text-steel transition-colors hover:text-chrome"
          >
            NOTTOBADRECORDS.COM
          </Link>
        </div>
      </footer>

      <RevealOnScroll />
    </div>
  );
}
