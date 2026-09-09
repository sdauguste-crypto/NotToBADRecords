// schema.org graph for the artist: label, MusicGroup, recordings, dates.
// Rendered as JSON-LD on the artist page and the press kit so search
// engines can show the catalog and the next date as rich results.
import { releases, shows, socials, videos } from "@/lib/content";

export const SITE_URL = "https://www.nottobadrecords.com";

const LABEL_ID = `${SITE_URL}/#label`;
const ARTIST_ID = `${SITE_URL}/simon-auguste/#artist`;

/** "THE PRINCESS (OFFICIAL LYRIC VIDEO)" → "The Princess (Official Lyric Video)". */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\s(])([a-z])/g, (_, gap: string, ch: string) => gap + ch.toUpperCase());
}

export function artistJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": LABEL_ID,
        name: "Not To B.A.D Records",
        url: `${SITE_URL}/`,
        foundingDate: "2015",
        logo: `${SITE_URL}/label/mark.webp`,
      },
      {
        "@type": "MusicGroup",
        "@id": ARTIST_ID,
        name: "Simon Auguste",
        alternateName: "Simon Dave Auguste",
        url: `${SITE_URL}/simon-auguste/`,
        image: `${SITE_URL}/og-card.jpg`,
        genre: ["Hip-Hop", "R&B"],
        foundingLocation: { "@type": "Place", name: "New York, NY" },
        // schema.org puts recordLabel on MusicRelease, not MusicGroup — the
        // label is the parent organization here.
        parentOrganization: { "@id": LABEL_ID },
        sameAs: socials.map((s) => s.url),
        track: releases.map((r) => ({
          "@type": "MusicRecording",
          name: titleCase(r.title),
          datePublished: String(r.year),
          url: r.spotifyUrl,
          image: r.coverImage ? `${SITE_URL}${r.coverImage}` : undefined,
          byArtist: { "@id": ARTIST_ID },
        })),
        // Thing.subjectOf → the videos are works about the artist
        subjectOf: videos.map((v) => ({
          "@type": "VideoObject",
          name: titleCase(v.title),
          url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
          thumbnailUrl: `https://i.ytimg.com/vi/${v.youtubeId}/maxresdefault.jpg`,
        })),
        event: shows.map((show) => ({
          "@type": "MusicEvent",
          name: `Simon Auguste live at ${show.venue}`,
          startDate: show.isoDate,
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "MusicVenue",
            name: show.venue,
            address: {
              "@type": "PostalAddress",
              addressLocality: "New York",
              addressRegion: "NY",
              addressCountry: "US",
            },
          },
          performer: { "@id": ARTIST_ID },
          url: `${SITE_URL}/simon-auguste/#events`,
        })),
      },
    ],
  };
}
