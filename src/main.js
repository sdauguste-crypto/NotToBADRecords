// Fonts
import '@fontsource/unbounded/700.css';
import '@fontsource/unbounded/900.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';

// Styles (order matters)
import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/components.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { renderSections } from './dom/render-sections.js';
import { initNav } from './dom/nav.js';
import Scene from './scene/Scene.js';
import { detectQuality } from './scene/quality.js';
import { initSmoothScroll } from './scroll/smooth-scroll.js';
import { initSceneScroll } from './scroll/scene-scroll.js';
import { initReveals } from './scroll/reveals.js';
import { prefersReducedMotion, hasFinePointer, saveData } from './utils/prefers.js';
import { clamp } from './utils/math.js';

// 1. Populate dynamic DOM first — ScrollTriggers must see final layout.
renderSections();
initNav();

// 2. GSAP plugins.
gsap.registerPlugin(ScrollTrigger, SplitText);

// 3. Preferences / quality.
const reducedMotion = prefersReducedMotion();
let quality = detectQuality();

if (saveData() && quality !== 'none') {
  const tiers = ['high', 'med', 'low', 'none'];
  const idx = tiers.indexOf(quality);
  quality = tiers[Math.min(idx + 1, tiers.length - 1)] ?? 'low';
}

// 4. Scene (guarded — the site must never white-screen).
let scene = null;

if (quality !== 'none') {
  try {
    const canvas = document.getElementById('scene');
    if (!canvas) throw new Error('Canvas #scene not found');

    scene = new Scene(canvas, { quality, reducedMotion });

    // Drive the scene from gsap's ticker (Scene has no own RAF; dt in seconds).
    let sleeping = false;
    gsap.ticker.add((time, deltaTime) => {
      if (sleeping || !scene) return;
      scene.update(deltaTime / 1000);
    });

    // Debounced resize → scene + ScrollTrigger.
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        scene?.resize();
        ScrollTrigger.refresh();
      }, 150);
    });

    // Pointer parallax — fine pointers only, and never under reduced motion.
    if (hasFinePointer() && !reducedMotion) {
      window.addEventListener(
        'pointermove',
        (e) => {
          const nx = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
          const ny = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
          scene?.setPointer(nx, ny);
        },
        { passive: true }
      );
    }

    // Pause rendering when the tab is hidden.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        sleeping = true;
        gsap.ticker.sleep();
      } else {
        sleeping = false;
        gsap.ticker.wake();
      }
    });
  } catch (err) {
    console.warn('[NotToBAD] WebGL scene failed to start, continuing DOM-only:', err);
    scene = null;
    document.documentElement.classList.add('no-webgl');
  }
} else {
  document.documentElement.classList.add('no-webgl');
}

// 5. Scroll + reveals. Smooth scroll and scene-scroll only make sense with
//    a working scene pipeline; reveals always run (they self-branch on
//    reduced motion via gsap.matchMedia).
try {
  if (scene) {
    initSmoothScroll(reducedMotion);
    initSceneScroll(scene);
  }
  initReveals();
} catch (err) {
  console.warn('[NotToBAD] Scroll/reveal init failed, content remains visible:', err);
}
