/* ------------------------------------------------------------------
   NotToBAD Records — site content
   Single source of truth for everything render-sections.js builds.
------------------------------------------------------------------- */
export default {
  label: {
    name: 'NotToBAD Records',
    monogram: 'NTB',
    tagline: 'Not to be average. Not to be ignored.',
    founded: '2021',
    email: 'hello@nottobadrecords.com',
  },

  releases: [
    { title: 'CHROME HEARTS EP', artist: 'VELVET STATIC', year: '2026' },
    { title: 'MIDNIGHT ALLOY', artist: 'JULES QUARTER', year: '2025' },
    { title: 'GILDED', artist: 'OKTAVE', year: '2025' },
    { title: 'NO BAD DAYS, VOL. II', artist: 'VARIOUS ARTISTS', year: '2024' },
  ],

  videos: [
    { caption: "OKTAVE — 'GILDED' (VISUALIZER)", dur: '04:12' },
    { caption: 'JULES QUARTER — LIVE AT ELSEWHERE', dur: '12:30' },
    { caption: 'INSIDE NTB — STUDIO DIARIES 001', dur: '08:05' },
  ],

  gallery: [
    { caption: 'Studio B, 3AM', variant: 1, parallax: '0.15' },
    { caption: 'Oktave — Berlin run', variant: 2, parallax: '-0.1' },
    { caption: 'Pressing day', variant: 3, parallax: '0.1' },
    { caption: 'Tour bus confessional', variant: 4, parallax: '-0.15' },
    { caption: 'The board', variant: 5, parallax: '0.2' },
    { caption: 'Gold party, night two', variant: 6, parallax: '-0.08' },
  ],

  products: [
    {
      name: 'CHROME HEARTS EP — 180g SILVER VINYL',
      price: '$34',
      badge: 'LIMITED /300',
    },
    { name: 'NTB MONOGRAM TEE — BLACK/GOLD', price: '$45' },
    { name: 'LABEL CREST HOODIE — HEAVYWEIGHT', price: '$85' },
  ],

  events: [
    { date: 'JUL 18', city: 'Brooklyn', venue: 'Elsewhere', artist: 'Velvet Static' },
    { date: 'AUG 02', city: 'Los Angeles', venue: 'El Rey', artist: 'Oktave' },
    { date: 'AUG 23', city: 'London', venue: 'Village Underground', artist: 'Jules Quarter' },
    { date: 'SEP 12', city: 'Berlin', venue: 'Gretchen', artist: 'Label Showcase' },
    { date: 'OCT 04', city: 'Paris', venue: 'La Bellevilloise', artist: 'NTB Takeover' },
  ],

  about: {
    body: 'Founded in a basement with one compressor and zero patience for average, NotToBAD Records is an independent label built on a simple bet: that craft still cuts through. We develop artists slowly, press records loudly, and never chase an algorithm we wouldn’t listen to ourselves.',
    stats: [
      { value: '24', label: 'RELEASES' },
      { value: '9', label: 'ARTISTS' },
      { value: '3', label: 'CONTINENTS' },
    ],
    quote: 'Not to be average. Not to be ignored.',
  },

  contact: {
    headline: "LET'S MAKE SOMETHING LOUD.",
    emails: [
      { address: 'demos@nottobadrecords.com', role: 'Demos (streaming links only)' },
      { address: 'press@nottobadrecords.com', role: 'Press' },
      { address: 'booking@nottobadrecords.com', role: 'Booking' },
    ],
  },
};
