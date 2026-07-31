"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "motion/react";

import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { useReducedMotion } from "@/components/sections/use-reduced-motion";
import { relayToGroundControl } from "@/lib/relay";

const STORAGE_KEY = "ntb-newsletter";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SUCCESS_TEXT = "✓ TRANSMISSION RECEIVED — WELCOME ABOARD, CADET";

export function NewsletterTerminal() {
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Restore prior enlistment after mount (SSR-safe).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        setSubscribed(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("INVALID FREQUENCY — CHECK EMAIL FORMAT");
      return;
    }
    setError("");
    setSending(true);
    try {
      await relayToGroundControl({
        email: trimmed,
        _subject: "NTB Mission Control — new newsletter signup",
      });
      setSubscribed(true);
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // storage unavailable
      }
    } catch {
      setError("SIGNAL LOST — TRANSMISSION FAILED, TRY AGAIN");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-sunset-gold/80">
        ▚ JOIN MISSION CONTROL
      </p>

      <div className="glass-panel p-4 md:p-6">
        <div className="scanlines rounded-lg border border-sunset-pink/30 bg-void-deep p-6 md:p-8">
          {subscribed ? (
            <p
              className="text-sm tracking-[0.15em] text-sunset-gold md:text-base"
              role="status"
            >
              {reduced ? (
                SUCCESS_TEXT
              ) : (
                <span aria-label={SUCCESS_TEXT}>
                  {SUCCESS_TEXT.split("").map((char, index) => (
                    <motion.span
                      key={index}
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.02, delay: index * 0.03 }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              )}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm tracking-[0.15em] text-sunset-gold">
                NTB:// awaiting-recruit &gt;
                <span className="animate-blink motion-reduce:animate-none ml-1 inline-block">
                  ▊
                </span>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="cadet@frequency.fm"
                  aria-label="Email address"
                  className="min-w-0 flex-1 rounded-md border border-sunset-pink/35 bg-void/70 px-3 py-3 text-sm tracking-[0.12em] text-foreground caret-sunset-pink transition-colors placeholder:text-foreground/30 hover:border-sunset-pink/60 focus:border-sunset-gold focus:bg-void focus:outline-none focus:ring-2 focus:ring-sunset-gold/60"
                />
                <ShimmerButton
                  type="submit"
                  disabled={sending}
                  shimmerColor="#ff2e88"
                  background="rgba(4, 7, 15, .95)"
                  className="border-sunset-gold/30 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-sunset-gold disabled:opacity-60"
                >
                  {sending ? "TRANSMITTING…" : "TRANSMIT"}
                </ShimmerButton>
              </div>
              {error ? (
                <p className="mt-3 text-xs font-bold tracking-[0.15em] text-sunset-pink">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>
        <p className="mt-3 text-xs tracking-[0.1em] text-foreground/40">
          Signals route directly to ground control. No spam — launch alerts
          and new drops only.
        </p>
      </div>
    </div>
  );
}
