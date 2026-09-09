import Link from "next/link";
import { Music2 } from "lucide-react";

import { socials, type Social } from "@/lib/content";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .595.047.88.14V9.4a6.33 6.33 0 0 0-1-.08 6.34 6.34 0 1 0 6.34 6.34V8.69a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.88-.12z" />
    </svg>
  );
}

const SOCIAL_ICONS: {
  platform: Social["platform"];
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { platform: "instagram", label: "Instagram", Icon: InstagramIcon },
  { platform: "youtube", label: "YouTube", Icon: YoutubeIcon },
  { platform: "spotify", label: "Spotify", Icon: Music2 },
  { platform: "tiktok", label: "TikTok", Icon: TiktokIcon },
];

const PAGES = [
  { href: "/listen/", label: "LISTEN" },
  { href: "/press/", label: "PRESS KIT" },
  { href: "/", label: "THE LABEL" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 -mt-px border-t border-sunset-pink/20 bg-void-deep/60 px-6 py-10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 md:flex-row md:justify-between">
        <div className="flex flex-col items-center gap-4 md:items-start">
          <span className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-crest.webp" alt="" className="h-10 w-auto" />
            <span className="font-display text-neon-gold text-xs font-bold uppercase tracking-widest">
              NOT TO B.A.D RECORDS
            </span>
          </span>
          <div className="flex items-center gap-5">
            {SOCIAL_ICONS.map(({ platform, label, Icon }) => {
              const social = socials.find((s) => s.platform === platform);
              if (!social) return null;
              return (
                <a
                  key={platform}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="text-foreground/60 transition hover:text-blood"
                >
                  <Icon className="size-5" />
                </a>
              );
            })}
          </div>
          <nav
            aria-label="Site pages"
            className="flex flex-wrap items-center justify-center gap-5 md:justify-start"
          >
            {PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="text-xs tracking-[0.25em] text-foreground/60 transition hover:text-blood"
              >
                {page.label}
              </Link>
            ))}
          </nav>
          <p className="text-center text-xs text-foreground/50 md:text-left">
            &copy; 2026 Not To B.A.D Records &mdash; We Really Out Here.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs tracking-[0.25em] text-foreground/60">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blood opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-blood" />
          </span>
          INDEPENDENT — MASTERS OWNED
        </div>
      </div>
    </footer>
  );
}
