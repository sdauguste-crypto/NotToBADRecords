"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Radio } from "lucide-react";

import { guestbookEntries, type GuestbookEntry } from "@/lib/content";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";
import { relayToGroundControl } from "@/lib/relay";

const STORAGE_KEY = "ntb-guestbook";

/** Deterministic rotation from the entry id — SSR-safe (no Math.random in render). */
function rotationFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const unit = (Math.abs(hash) % 1000) / 1000; // 0..1
  return -1.5 + unit * 3; // -1.5..1.5 deg
}

function formatStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `[${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}.${pad(
    date.getUTCDate(),
  )} // ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC]`;
}

export function GuestbookWall() {
  const reduced = useReducedMotion();
  const [entries, setEntries] = useState<GuestbookEntry[]>(guestbookEntries);
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // Hydrate persisted entries after mount to avoid SSR mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as GuestbookEntry[];
        if (Array.isArray(stored) && stored.length) {
          setEntries(stored);
        }
      }
    } catch {
      // corrupted storage — keep defaults
    }
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedHandle = handle.trim();
    const trimmedMessage = message.trim();
    if (!trimmedHandle || !trimmedMessage) {
      setError("HANDLE AND MESSAGE REQUIRED — SIGNAL INCOMPLETE");
      return;
    }
    const callsign = trimmedHandle.startsWith("@")
      ? trimmedHandle
      : `@${trimmedHandle}`;

    setError("");
    setSending(true);
    try {
      // Deliver for real before showing it on the wall, so a card never
      // appears for a message that never reached the label.
      await relayToGroundControl({
        handle: callsign,
        message: trimmedMessage,
        _subject: `NTB Fan Transmission — ${callsign}`,
      });
    } catch {
      setError("SIGNAL LOST — TRANSMISSION FAILED, TRY AGAIN");
      setSending(false);
      return;
    }
    setSending(false);

    const entry: GuestbookEntry = {
      id: `gb-user-${Date.now()}`,
      handle: callsign,
      message: trimmedMessage,
      stamp: formatStamp(new Date()),
    };
    const next = [entry, ...entries];
    setEntries(next);
    setHandle("");
    setMessage("");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — in-memory only
    }
  };

  return (
    <div>
      <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-sunset-gold/80">
        ▚ FAN TRANSMISSIONS
      </p>

      <form onSubmit={handleSubmit} className="glass-panel mb-8 p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-foreground/60">
              HANDLE
            </span>
            <input
              type="text"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="@your_callsign"
              className="w-full rounded-lg border border-sunset-pink/25 bg-void-deep/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-sunset-pink"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-foreground/60">
              MESSAGE
            </span>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Say something not too bad…"
              className="w-full rounded-lg border border-sunset-pink/25 bg-void-deep/60 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-sunset-pink"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <ShimmerButton
            type="submit"
            disabled={sending}
            shimmerColor="#22d3ee"
            background="linear-gradient(105deg, #ff2e88, #1e6fff)"
            className="px-7 py-2.5 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-60"
          >
            {sending ? "TRANSMITTING…" : "TRANSMIT"}
          </ShimmerButton>
          {error ? (
            <p className="text-xs font-bold tracking-[0.15em] text-sunset-pink">
              {error}
            </p>
          ) : null}
        </div>
        <p className="mt-4 text-xs tracking-[0.1em] text-foreground/40">
          Transmissions route straight to ground control. Your message stays
          pinned on your own screen — the best ones get featured.
        </p>
      </form>

      {entries.length === 0 ? (
        <div className="hud-corners rounded-xl border border-sunset-pink/20 bg-void-deep/40 px-6 py-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-sunset-gold/70">
            // CHANNEL OPEN
          </p>
          <p className="mt-3 text-sm tracking-[0.15em] text-foreground/60">
            No transmissions yet — be the first.
          </p>
        </div>
      ) : null}

      <div className="scanlines rounded-xl">
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.article
                key={entry.id}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="glass-panel mb-4 break-inside-avoid p-4"
                style={{ rotate: `${rotationFor(entry.id)}deg` }}
              >
                <div className="flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 shrink-0 text-sunset-gold/70" />
                  <p className="truncate font-bold text-sunset-pink">
                    {entry.handle}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                  {entry.message}
                </p>
                <p className="mt-3 text-xs tracking-[0.15em] text-foreground/50">
                  {entry.stamp}
                </p>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
