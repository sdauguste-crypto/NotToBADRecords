"use client";

import { useEffect } from "react";

/**
 * The page's own links (#listen, #music, #videos, #shows, #loop) glide to
 * their section, one tap at a time. Not scroll-behavior on <html>: that also
 * animates the router's jump to the top when another page opens this one,
 * and Back/Forward putting the page where it was, so a visitor would land on
 * the footer and watch the whole page roll by. Keyboard activation and
 * reduced motion keep the browser's own instant jump (which also moves the
 * Tab order into the section).
 */
export function SmoothAnchors() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".wed-landing");
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.detail === 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      const hash = link?.getAttribute("href") ?? "";
      const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      // the same history step the plain link makes
      if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  return null;
}
