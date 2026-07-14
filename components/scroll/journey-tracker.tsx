"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { SECTION_IDS, journeyState } from "@/lib/journey-state";

/**
 * Headless scroll/pointer tracker. Renders nothing.
 * SOLE WRITER of the journeyState singleton (see lib/journey-state.ts).
 */
export function JourneyTracker() {
  const { scrollYProgress } = useScroll();
  const topsRef = useRef<number[]>([]);

  // Attribute scroll position to a continuous 0..7 section value using the
  // measured offsetTop of each section, piecewise-linear between tops.
  const update = () => {
    const tops = topsRef.current;
    if (tops.length < 2 || typeof window === "undefined") return;

    // Bias the sample point ~35% into the viewport for better attribution.
    const y = window.scrollY + window.innerHeight * 0.35;
    const last = tops.length - 1;

    let i = last;
    for (let s = 0; s < last; s++) {
      if (y < tops[s + 1]) {
        i = s;
        break;
      }
    }

    let value: number;
    if (i >= last) {
      value = last;
    } else {
      const span = Math.max(1, tops[i + 1] - tops[i]);
      value = i + (y - tops[i]) / span;
    }

    journeyState.sectionProgress = Math.min(last, Math.max(0, value));
  };

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    journeyState.progress = v;
    update();
  });

  useEffect(() => {
    const measure = () => {
      topsRef.current = SECTION_IDS.map(
        (id) => document.getElementById(id)?.offsetTop ?? 0,
      );
      update();
    };

    measure();

    // Re-measure when layout shifts (images/fonts/sections mounting).
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    window.addEventListener("load", measure);
    window.addEventListener("resize", measure);

    // Belt-and-braces scroll updates alongside the motion value event.
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, { passive: true });

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const zeroPointer = () => {
      journeyState.pointerX = 0;
      journeyState.pointerY = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!finePointer.matches || journeyState.reducedMotion) return;
      journeyState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      journeyState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onReducedMotionChange = () => {
      journeyState.reducedMotion = reducedMotion.matches;
      if (reducedMotion.matches) zeroPointer();
    };
    onReducedMotionChange();
    reducedMotion.addEventListener("change", onReducedMotionChange);

    const onFinePointerChange = () => {
      if (!finePointer.matches) zeroPointer();
    };
    onFinePointerChange();
    finePointer.addEventListener("change", onFinePointerChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("load", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      reducedMotion.removeEventListener("change", onReducedMotionChange);
      finePointer.removeEventListener("change", onFinePointerChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
