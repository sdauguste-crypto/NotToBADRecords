/* ------------------------------------------------------------------
   NotToBAD Records — nav behavior. Plain DOM only (no gsap/lenis):
   - background fades in after ~100px of scroll
   - IntersectionObserver drives the active-link gold underline
   - hamburger toggles the full-screen overlay menu
------------------------------------------------------------------- */
export function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  /* ---- scrolled background ---- */
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 100);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- active section link (desktop + overlay links share ids) ---- */
  const links = Array.from(document.querySelectorAll('[data-nav-link]'));
  const linksById = new Map();
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) continue;
    const id = href.slice(1);
    if (!linksById.has(id)) linksById.set(id, []);
    linksById.get(id).push(link);
  }

  const sections = Array.from(linksById.keys())
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          for (const link of links) link.classList.remove('is-active');
          for (const link of linksById.get(entry.target.id) || []) {
            link.classList.add('is-active');
          }
        }
      },
      // fire when a section's band crosses the upper-middle of the viewport
      { rootMargin: '-35% 0px -60% 0px', threshold: 0 }
    );
    for (const section of sections) observer.observe(section);
  }

  /* ---- mobile overlay menu ---- */
  const toggle = nav.querySelector('.nav-toggle');
  const overlay = nav.querySelector('.nav-overlay');
  if (!toggle || !overlay) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    overlay.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // close on link click so in-page anchors work under the overlay
  overlay.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}
