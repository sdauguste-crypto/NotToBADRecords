import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Smooth scrolling via Lenis, driven by the gsap ticker and synced with
 * ScrollTrigger. Returns the Lenis instance, or null when reduced motion
 * is preferred (native scroll is kept).
 *
 * Lenis 1.3.x supports the `anchors` option which intercepts in-page
 * hash links and smooth-scrolls to them (verified against installed
 * lenis@1.3.25 typings).
 *
 * @param {boolean} reducedMotion
 * @returns {Lenis|null}
 */
export function initSmoothScroll(reducedMotion) {
  if (reducedMotion) return null;

  const lenis = new Lenis({
    lerp: 0.1,
    anchors: true,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  return lenis;
}
