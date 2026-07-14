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
  platform: "instagram" | "tiktok" | "youtube" | "spotify";
  handle: string;
  url: string;
  followers: string;
};

export const releases: Release[] = [
  {
    id: "rel-the-princess",
    coverImage: "/NotToBADRecords/covers/the-princess.webp",
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
    coverImage: "/NotToBADRecords/covers/rockin-with-my.webp",
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
    coverImage: "/NotToBADRecords/covers/no-lights.webp",
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
    image: `/NotToBADRecords/gallery/photo-${n}.webp`,
  };
});

export const products: Product[] = [
  {
    id: "prod-chrome-vinyl",
    name: "Chrome Hearts 180g Vinyl",
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
  {
    id: "show-brooklyn",
    date: "JUL 18 2026",
    venue: "Elsewhere",
    city: "Brooklyn, NY",
    status: "on-sale",
  },
  {
    id: "show-la",
    date: "AUG 02 2026",
    venue: "El Rey Theatre",
    city: "Los Angeles, CA",
    status: "on-sale",
  },
  {
    id: "show-london",
    date: "AUG 23 2026",
    venue: "Village Underground",
    city: "London, UK",
    status: "announced",
  },
  {
    id: "show-berlin",
    date: "SEP 12 2026",
    venue: "Gretchen",
    city: "Berlin, DE",
    status: "sold-out",
  },
  {
    id: "show-paris",
    date: "OCT 04 2026",
    venue: "La Bellevilloise",
    city: "Paris, FR",
    status: "announced",
  },
];

export const guestbookEntries: GuestbookEntry[] = [
  {
    id: "gb-01",
    handle: "@neonrider_99",
    message: "Chrome Hearts has not left my deck since the drop. Absolute transmission.",
    stamp: "[2026.07.02 // 23:14 UTC]",
  },
  {
    id: "gb-02",
    handle: "@sunset_courier",
    message: "Saw Velvet Static in Brooklyn last year. Still recovering. Take my money.",
    stamp: "[2026.06.28 // 01:47 UTC]",
  },
  {
    id: "gb-03",
    handle: "@tape_ghost",
    message: "The Vol. II cassette hiss is a feature, not a bug. Ground Control knows.",
    stamp: "[2026.06.21 // 19:03 UTC]",
  },
  {
    id: "gb-04",
    handle: "@midnight.alloy.fan",
    message: "Jules Quarter live set = religious experience. When Berlin restock??",
    stamp: "[2026.06.15 // 22:30 UTC]",
  },
  {
    id: "gb-05",
    handle: "@vhs_valkyrie",
    message: "This website looks like my dreams. The label sounds like them too.",
    stamp: "[2026.06.09 // 03:12 UTC]",
  },
  {
    id: "gb-06",
    handle: "@okt4ve_stan",
    message: "GILDED on gold vinyl when? Asking for the entire internet.",
    stamp: "[2026.05.30 // 17:55 UTC]",
  },
  {
    id: "gb-07",
    handle: "@lowband_lena",
    message: "Luna Voss harmonies at 88.3 on the drive home. Perfect frequency.",
    stamp: "[2026.05.22 // 21:08 UTC]",
  },
  {
    id: "gb-08",
    handle: "@analog_astro",
    message: "Joined mission control. Zero regrets. The merch smells like the future.",
    stamp: "[2026.05.14 // 12:26 UTC]",
  },
];

export const socials: Social[] = [
  {
    platform: "instagram",
    handle: "@nottobadrecords",
    url: "https://instagram.com/nottobadrecords",
    followers: "12.4K",
  },
  {
    platform: "tiktok",
    handle: "@ntbrecords",
    url: "https://tiktok.com/@ntbrecords",
    followers: "8.1K",
  },
  {
    platform: "youtube",
    handle: "Not To B.A.D Records",
    url: "https://youtube.com/@nottobadrecords",
    followers: "24K",
  },
  {
    platform: "spotify",
    handle: "Not To B.A.D Records",
    url: "https://open.spotify.com/user/nottobadrecords",
    followers: "31K",
  },
];
