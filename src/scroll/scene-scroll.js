import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Binds scroll position to the Three.js scene:
 * - one global trigger mapping full-page progress to scene.setGlobalProgress
 * - one trigger per [data-scene-section] mapping its viewport crossing
 *   (top-at-bottom = 0, bottom-at-top = 1) to scene.setSectionProgress.
 *
 * @param {{ setGlobalProgress(p: number): void, setSectionProgress(name: string, p: number): void }} scene
 */
export function initSceneScroll(scene) {
  if (!scene) return;

  ScrollTrigger.create({
    trigger: document.body,
    start: 0,
    end: 'max',
    scrub: true,
    onUpdate: (st) => scene.setGlobalProgress(st.progress),
  });

  const sections = document.querySelectorAll('[data-scene-section]');
  sections.forEach((el) => {
    const name = el.dataset.sceneSection;
    if (!name) return;

    ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (st) => scene.setSectionProgress(name, st.progress),
    });
  });
}
