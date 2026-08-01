// Not To B.A.D Records — Mission Control
// Typed single source of truth for all page-section content.

export type Release = {
  id: string;
  title: string;
  artist: string;
  year: number;
  /** Seed for the procedural CoverArt generator. */
  seed: number;
  /** Share link to the track/album on Spotify (opens in a new tab). */
  spotifyUrl?: string;
  /** Spotify iframe embed URL (https://open.spotify.com/embed/track/...). */
  spotifyEmbedUrl?: string;
  /** Share link to the song on Apple Music. */
  appleMusicUrl?: string;
  /** Real cover artwork under public/covers (falls back to procedural art). */
  coverImage?: string;
  /**
   * Master audio under public/audio, used by the site-wide ambient player.
   * The first release carrying one becomes the always-on track; the player
   * hides itself entirely when the file is absent.
   */
  audioUrl?: string;
  tags: string[];
};

export type Video = {
  id: string;
  title: string;
  youtubeId: string;
  duration?: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  seed: number;
  caption: string;
  /** Real photo under public/gallery (falls back to procedural art). */
  image?: string;
};

export type Product = {
  id: string;
  name: string;
  kind: "tee" | "hoodie" | "vinyl" | "cap" | "poster";
  price: number;
  featured?: boolean;
  /** Real product photo under public/store (falls back to the silhouette). */
  image?: string;
  /**
   * Shopify product/checkout URL. When set, the card renders a live BUY
   * button; while absent the card stays in coming-soon NOTIFY ME mode.
   */
  shopifyUrl?: string;
};

export type Show = {
  id: string;
  date: string;
  venue: string;
  city: string;
  status: "on-sale" | "sold-out" | "announced";
};

export type GuestbookEntry = {
  id: string;
  handle: string;
  message: string;
  stamp: string;
};

export type Social = {
  platform: "instagram" | "tiktok" | "youtube" | "spotify" | "x" | "apple-music";
  handle: string;
  url: string;
  followers: string;
};

/** Booking / inquiries address shown in Contact. */
export const contactEmail = "motivationmusicmgmt@gmail.com";

export const releases: Release[] = [
  {
    id: "rel-the-princess",
    coverImage: "/covers/the-princess.webp",
    audioUrl: "/audio/the-princess.mp3",
    title: "THE PRINCESS",
    artist: "SIMON AUGUSTE",
    year: 2023,
    seed: 23,
    spotifyUrl:
      "https://open.spotify.com/track/4CVEdSUd9WpRT1LZmr9H5z?si=f012a578ce8b4a23",
    spotifyEmbedUrl: "https://open.spotify.com/embed/track/4CVEdSUd9WpRT1LZmr9H5z",
    appleMusicUrl: "https://music.apple.com/us/song/the-princess/1701777152",
    tags: ["hip-hop", "art-pop", "single"],
  },
  {
    id: "rel-rockin-with-my",
    coverImage: "/covers/rockin-with-my.webp",
    title: "ROCKIN WITH MY",
    artist: "SIMON AUGUSTE",
    year: 2021,
    seed: 11,
    spotifyUrl:
      "https://open.spotify.com/track/5QumA0MbEQsLboWwjkWxIR?si=8e5ce7281eae4e45",
    spotifyEmbedUrl: "https://open.spotify.com/embed/track/5QumA0MbEQsLboWwjkWxIR",
    appleMusicUrl: "https://music.apple.com/us/song/rockin-with-my/1569082054",
    tags: ["hip-hop", "grunge", "single"],
  },
  {
    id: "rel-no-lights",
    coverImage: "/covers/no-lights.webp",
    title: "NO LIGHTS",
    artist: "SIMON AUGUSTE",
    year: 2016,
    seed: 77,
    spotifyUrl:
      "https://open.spotify.com/track/2ocnBN4eVcaW4Rv1GEkapD?si=5c284a96ac2441d1",
    spotifyEmbedUrl: "https://open.spotify.com/embed/track/2ocnBN4eVcaW4Rv1GEkapD",
    appleMusicUrl: "https://music.apple.com/us/song/no-lights-can-i/1577344766",
    tags: ["hip-hop", "electro-pop", "single"],
  },
];

export const videos: Video[] = [
  {
    id: "vid-fall-in-love",
    title: "FALL IN LOVE (OFFICIAL MUSIC VIDEO)",
    youtubeId: "kLXO5goajyA",
  },
  {
    id: "vid-vampire-diaries",
    title: "VAMPIRE DIARIES (OFFICIAL LYRIC VIDEO)",
    youtubeId: "5yUpmuCbCVM",
  },
  {
    id: "vid-the-princess",
    title: "THE PRINCESS (OFFICIAL LYRIC VIDEO)",
    youtubeId: "30GwU97NGdg",
  },
];

export const galleryItems: GalleryItem[] = Array.from({ length: 14 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `gal-${n}`,
    title: `Archive ${n}`,
    seed: 3 + i * 13,
    caption: `// ARCHIVE ${n}`,
    image: `/gallery/photo-${n}.webp`,
  };
});

export const products: Product[] = [
  {
    id: "prod-princess-vinyl",
    name: "The Princess — Limited Vinyl",
    kind: "vinyl",
    price: 34,
    featured: true,
  },
  { id: "prod-monogram-tee", name: "NTB Monogram Tee", kind: "tee", price: 45 },
  { id: "prod-crest-hoodie", name: "Label Crest Hoodie", kind: "hoodie", price: 85 },
  { id: "prod-sunset-cap", name: "Sunset Cap", kind: "cap", price: 28 },
  { id: "prod-mission-poster", name: "Mission Poster", kind: "poster", price: 18 },
  { id: "prod-cassette-bundle", name: "Cassette Bundle", kind: "vinyl", price: 22 },
];

export const shows: Show[] = [
  // No active missions — new dates soon.
];

// Intentionally empty — the wall shows only genuine visitor messages.
export const guestbookEntries: GuestbookEntry[] = [];

export const socials: Social[] = [
  {
    platform: "instagram",
    handle: "@simondaveauguste",
    url: "https://www.instagram.com/simondaveauguste",
    followers: "3,559",
  },
  {
    platform: "tiktok",
    handle: "@simondaveauguste",
    url: "https://www.tiktok.com/@simondaveauguste",
    followers: "123",
  },
  {
    platform: "youtube",
    handle: "@simondaveauguste",
    url: "https://www.youtube.com/@simondaveauguste",
    followers: "39",
  },
  {
    platform: "spotify",
    handle: "Simon Auguste",
    url: "https://open.spotify.com/artist/1zAgIkurm4hqFL1hf1lg8q",
    followers: "—",
  },
  {
    platform: "x",
    handle: "@simondaveaugust",
    url: "https://x.com/simondaveaugust",
    followers: "318",
  },
  {
    platform: "apple-music",
    handle: "Simon Auguste",
    url: "https://music.apple.com/us/artist/simon-auguste/1528473465",
    // Apple Music publishes no follower stat — show a status instead.
    followers: "ON ROTATION",
  },
];
