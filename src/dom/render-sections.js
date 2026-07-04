/* ------------------------------------------------------------------
   NotToBAD Records — renders dynamic lists from content.js into
   the stable containers declared in index.html.
------------------------------------------------------------------- */
import content from '../content/content.js';

function esc(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderReleases() {
  const grid = document.getElementById('release-grid');
  if (!grid) return;

  // per-card chrome sheen variation
  const covers = [
    { angle: '115deg', tint: 220 },
    { angle: '245deg', tint: 260 },
    { angle: '35deg', tint: 45 },
    { angle: '170deg', tint: 200 },
  ];

  grid.innerHTML = content.releases
    .map((release, i) => {
      const { angle, tint } = covers[i % covers.length];
      return `
        <article class="release-card" data-reveal data-reveal-delay="${(i * 0.08).toFixed(2)}"
          style="--sheen-angle:${angle};--cover-tint:${tint};">
          <div class="release-cover" data-embed="spotify" data-uri="">
            <button class="play-btn" type="button" aria-label="Play ${esc(release.title)} by ${esc(release.artist)}">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M7 4.5v15l13-7.5-13-7.5z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <h3 class="release-title">${esc(release.title)}</h3>
          <p class="release-meta">
            <span class="release-artist">${esc(release.artist)}</span>
            <span class="release-year">${esc(release.year)}</span>
          </p>
        </article>`;
    })
    .join('');
}

function renderVideos() {
  const row = document.getElementById('video-thumbs');
  if (!row) return;

  row.innerHTML = content.videos
    .map(
      (video, i) => `
        <article class="video-thumb" data-reveal data-reveal-delay="${(i * 0.1).toFixed(2)}">
          <div class="video-thumb-frame" data-embed="youtube" data-uri="">
            <button class="play-btn play-btn-sm" type="button" aria-label="Play: ${esc(video.caption)}">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M7 4.5v15l13-7.5-13-7.5z" fill="currentColor" />
              </svg>
            </button>
            <span class="chip">${esc(video.dur)}</span>
          </div>
          <p class="video-caption">${esc(video.caption)}</p>
        </article>`
    )
    .join('');
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  grid.innerHTML = content.gallery
    .map(
      (tile, i) => `
        <figure class="gallery-tile tile-${tile.variant}" data-reveal
          data-reveal-delay="${(i * 0.06).toFixed(2)}" data-parallax="${esc(tile.parallax)}">
          <!-- image slot: add <img src="…" alt="…"> here for real photography -->
          <figcaption>${esc(tile.caption)}</figcaption>
        </figure>`
    )
    .join('');
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const orderHref =
    'mailto:store@nottobadrecords.com?subject=Order%20inquiry';

  grid.innerHTML = content.products
    .map(
      (product, i) => `
        <article class="product-card" data-reveal data-reveal-delay="${(i * 0.1).toFixed(2)}">
          <div class="product-media">
            ${product.badge ? `<span class="product-badge">${esc(product.badge)}</span>` : ''}
          </div>
          <h3 class="product-name">${esc(product.name)}</h3>
          <p class="product-price">${esc(product.price)}</p>
          <a class="btn btn-ghost" href="${orderHref}">Add to Cart</a>
        </article>`
    )
    .join('');
}

function renderEvents() {
  const rows = document.getElementById('event-rows');
  if (!rows) return;

  rows.innerHTML = content.events
    .map(
      (event, i) => `
        <a class="event-row" href="#" data-reveal data-reveal-delay="${(i * 0.06).toFixed(2)}">
          <span class="event-date">${esc(event.date)}</span>
          <span class="event-place">${esc(event.city)} <span class="event-venue">&mdash; ${esc(event.venue)}</span></span>
          <span class="event-artist">${esc(event.artist)}</span>
          <span class="event-tickets">TICKETS <span class="event-arrow" aria-hidden="true">&rarr;</span></span>
        </a>`
    )
    .join('');
}

export function renderSections() {
  renderReleases();
  renderVideos();
  renderGallery();
  renderProducts();
  renderEvents();
}
