import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * Scroll-linked reveal animations. Everything lives inside gsap.matchMedia()
 * so reduced-motion users get an opacity-only treatment (and it adapts live
 * if the preference changes).
 *
 * All animations use gsap.from(...) with autoAlpha so content remains
 * visible if JS fails and visibility is handled alongside opacity.
 * Every selector is null-checked; missing sections/elements no-op.
 */
export function initReveals() {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    initHero();
    initDataReveals();
    initParallax();
    initCounters();
    initFeaturedVideoWipe();
    initRules();
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    // Nothing hides [data-reveal] in CSS, so content is already visible.
    // Honoring the preference means no motion and no fades at all.
  });

  return mm;
}

/* ------------------------------------------------------------------ */

/**
 * background-clip: text on a parent doesn't reach into SplitText's child
 * divs, which leaves the headline transparent. Re-apply the chrome gradient
 * per character, sized to the full headline and offset per glyph so the
 * sweep stays continuous across the split.
 */
function applyChromeGradient(headline, chars) {
  if (!headline.classList.contains('chrome-text')) return;
  const bounds = headline.getBoundingClientRect();
  if (!bounds.width) return;
  chars.forEach((ch) => {
    const r = ch.getBoundingClientRect();
    ch.style.backgroundImage = 'var(--grad-chrome)';
    ch.style.backgroundSize = `${bounds.width}px 100%`;
    ch.style.backgroundPosition = `${bounds.left - r.left}px 0`;
    ch.style.webkitBackgroundClip = 'text';
    ch.style.backgroundClip = 'text';
    ch.style.webkitTextFillColor = 'transparent';
    ch.style.color = 'transparent';
  });
}

function initHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const headline = hero.querySelector('h1');
  if (headline) {
    try {
      // words wrappers keep line-breaks between words, not mid-word
      const split = new SplitText(headline, { type: 'words,chars' });
      if (split.chars && split.chars.length) {
        applyChromeGradient(headline, split.chars);
        gsap.from(split.chars, {
          y: 60,
          autoAlpha: 0,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.02,
          delay: 0.15,
        });
      }
    } catch (err) {
      // SplitText can fail on unusual markup — fall back to a simple fade.
      gsap.from(headline, {
        y: 40,
        autoAlpha: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.15,
      });
    }
  }

  // Hero sub-copy + CTAs fade up shortly after the headline.
  // Includes hero [data-reveal] elements — these are excluded from the
  // generic scroll reveals (see initDataReveals) so they animate once here.
  const seen = new Set();
  const followers = [];
  hero
    .querySelectorAll('[data-reveal], p, .hero-sub, .hero-ctas, .cta, a.button, .btn')
    .forEach((el) => {
      if (headline && (el === headline || headline.contains(el))) return;
      if (seen.has(el)) return;
      seen.add(el);
      followers.push(el);
    });
  if (followers.length) {
    gsap.from(followers, {
      y: 30,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.8,
    });
  }
}

function initDataReveals() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    // Hero elements are animated by initHero's load intro — skip them here
    // so they don't get a conflicting immediate scroll-trigger tween.
    if (el.closest('#hero')) return;

    gsap.from(el, {
      y: 40,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power3.out',
      delay: parseFloat(el.dataset.revealDelay) || 0,
      scrollTrigger: {
        trigger: el,
        start: 'top 82%',
        once: true,
      },
    });
  });
}

function initParallax() {
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.dataset.parallax);
    if (!Number.isFinite(speed) || speed === 0) return;

    gsap.to(el, {
      y: () => -(speed * 100),
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

function initCounters() {
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const target = parseFloat(el.dataset.counter);
    if (!Number.isFinite(target)) return;

    // Preserve any suffix/prefix around the number in the existing text
    // (e.g. "24+" with data-counter="24").
    const original = el.textContent || '';
    const numStr = String(el.dataset.counter);
    const idx = original.indexOf(numStr);
    const prefix = idx > -1 ? original.slice(0, idx) : '';
    const suffix = idx > -1 ? original.slice(idx + numStr.length) : '';

    const state = { value: 0 };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(state, {
          value: target,
          duration: 1.2,
          ease: 'power2.out',
          snap: { value: 1 },
          onUpdate: () => {
            el.textContent = prefix + Math.round(state.value) + suffix;
          },
          onComplete: () => {
            // Restore the exact original text (covers formatting edge cases).
            el.textContent = original;
          },
        });
      },
    });
  });
}

function initFeaturedVideoWipe() {
  const frame = document.querySelector('.video-featured');
  if (!frame) return;

  gsap.from(frame, {
    clipPath: 'inset(12% 12% 12% 12%)',
    autoAlpha: 0,
    duration: 1.2,
    ease: 'power3.inOut',
    scrollTrigger: {
      trigger: frame,
      start: 'top 80%',
      once: true,
    },
  });
}

function initRules() {
  const rules = document.querySelectorAll('.rule, main hr');
  rules.forEach((el) => {
    gsap.from(el, {
      scaleX: 0,
      transformOrigin: 'left center',
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 95%',
        end: 'top 60%',
        scrub: true,
        once: true,
      },
    });
  });
}
