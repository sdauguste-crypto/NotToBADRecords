"use client";

import { useEffect } from "react";

/**
 * Fades [data-reveal] blocks up as they scroll in. Only what starts below the
 * fold is hidden, and only once this has run — without script, or before
 * hydration, every block is simply there. One observer, CSS transitions.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const blocks = [...document.querySelectorAll<HTMLElement>(".wed-landing [data-reveal]")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.replace("wed-pending", "wed-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const block of blocks) {
      if (block.getBoundingClientRect().top < window.innerHeight) continue;
      block.classList.add("wed-pending");
      observer.observe(block);
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
