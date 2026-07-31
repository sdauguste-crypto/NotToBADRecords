"use client";

// The label/artist switch. The label is the permanent house; each artist is
// an era under it, so the tabs live on the label surface and travel with the
// visitor onto the artist site.

import Link from "next/link";

import { cn } from "@/lib/utils";

export type LabelTab = "label" | "artist";

const TABS: { key: LabelTab; label: string; href: string }[] = [
  { key: "label", label: "NOT TO B.A.D RECORDS", href: "/" },
  { key: "artist", label: "SIMON AUGUSTE", href: "/simon-auguste/" },
];

export function LabelTabs({
  active,
  className,
}: {
  active: LabelTab;
  className?: string;
}) {
  return (
    <nav
      aria-label="Label and artist"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur",
        className,
      )}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-[0.62rem] tracking-[0.22em] transition-colors sm:text-xs sm:tracking-[0.28em]",
              isActive
                ? "bg-blood text-white shadow-[0_0_18px_rgba(180,28,37,0.55)]"
                : "text-steel hover:text-chrome",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
