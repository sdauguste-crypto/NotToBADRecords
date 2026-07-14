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
  tags: string[];
};

export type Video = {
  id: string;
  title: string;
  youtubeId: string;
  duration: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  seed: number;
  caption: string;
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
    id: "vid-chrome-hearts",
    title: "VELVET STATIC — CHROME HEARTS (Official Video)",
    youtubeId: "dQw4w9WgXcQ",
    duration: "4:12",
  },
  {
    id: "vid-midnight-alloy-live",
    title: "JULES QUARTER — MIDNIGHT ALLOY (Live at Elsewhere)",
    youtubeId: "kXzp1BqW3f0",
    duration: "6:48",
  },
  {
    id: "vid-gilded-visual",
    title: "OKTAVE — GILDED (Visualizer)",
    youtubeId: "Zt9qL0mNc4E",
    duration: "3:57",
  },
  {
    id: "vid-studio-diaries",
    title: "NTB STUDIO DIARIES — Pressing Vol. II",
    youtubeId: "xR27vTqYd8U",
    duration: "9:31",
  },
];

export const galleryItems: GalleryItem[] = [
  { id: "gal-01", title: "Studio B", seed: 3, caption: "Studio B, 3AM" },
  { id: "gal-02", title: "Pressing Day", seed: 17, caption: "Pressing day" },
  { id: "gal-03", title: "Neon Check", seed: 29, caption: "Neon check, Berlin" },
  { id: "gal-04", title: "Soundcheck", seed: 41, caption: "Soundcheck at El Rey" },
  { id: "gal-05", title: "Tape Vault", seed: 53, caption: "The tape vault" },
  { id: "gal-06", title: "Rooftop", seed: 67, caption: "Rooftop listening party" },
  { id: "gal-07", title: "Console", seed: 71, caption: "Console warm-up, take 12" },
  { id: "gal-08", title: "Van Life", seed: 83, caption: "Tour van, somewhere in Nevada" },
  { id: "gal-09", title: "Crate Digging", seed: 91, caption: "Crate digging, Paris" },
  { id: "gal-10", title: "Last Encore", seed: 104, caption: "Last encore, lights up" },
];

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
