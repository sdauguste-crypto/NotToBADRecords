"use client";

import { useState, type FormEvent } from "react";

import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { joinList, sendsEarlyAccess } from "@/lib/wednesday-signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The JOIN MISSION CONTROL terminal, relabeled for the release: before it,
 * "Space Cadets hear it first." (tagged for early access); after it, the
 * weekly drop list.
 */
export function WednesdaySignup({
  label,
  tag,
  early,
}: {
  label: string;
  tag: string;
  /** Before release: a successful signup means an early-access email. */
  early: boolean;
}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<"sent" | "queued" | null>(null);
  // a field people never see; bots fill it in
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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
      setDone(await joinList(trimmed, tag, website));
    } catch {
      setError("SIGNAL LOST — TRANSMISSION FAILED, TRY AGAIN");
    } finally {
      setSending(false);
    }
  };

  const success = !(early && sendsEarlyAccess)
    ? "✓ TRANSMISSION RECEIVED — WELCOME ABOARD, CADET"
    : done === "queued"
      ? "✓ YOU'RE ON THE LIST — YOUR EARLY LISTEN LINK FOLLOWS SHORTLY"
      : "✓ CHECK YOUR INBOX — YOUR EARLY LISTEN IS ON ITS WAY";

  return (
    <div className="w-full text-left">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-blood">
        ▚ {label}
      </p>

      <div className="glass-panel p-3 sm:p-4">
        <div className="scanlines rounded-lg border border-blood/40 bg-void-deep p-5 sm:p-6">
          {done ? (
            <p className="text-sm tracking-[0.15em] text-[#ebeef1]" role="status">
              {success}
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="wednesday-email" className="text-sm tracking-[0.15em] text-blood">
                NTB:// awaiting-recruit &gt;
                <span className="animate-blink motion-reduce:animate-none ml-1 inline-block">
                  ▊
                </span>
              </label>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="absolute -left-[9999px] h-px w-px opacity-0"
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  id="wednesday-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="send"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="cadet@frequency.fm"
                  aria-label="Email address"
                  // 16px keeps iOS from zooming the page on focus
                  className="min-w-0 flex-1 rounded-md border border-blood/40 bg-void/70 px-3 py-3 text-base text-foreground caret-blood transition-colors placeholder:text-foreground/30 hover:border-blood/70 focus:border-blood focus:bg-void focus:outline-none focus:ring-2 focus:ring-blood/30 sm:text-sm"
                />
                <ShimmerButton
                  type="submit"
                  disabled={sending}
                  shimmerColor="#ebeef1"
                  background="linear-gradient(180deg, rgba(180,28,37,.30), rgba(180,28,37,.14))"
                  className="border border-blood px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ebeef1] disabled:opacity-60 hover:border-oxblood"
                >
                  {sending ? "TRANSMITTING…" : "TRANSMIT"}
                </ShimmerButton>
              </div>
              {error ? (
                <p className="mt-3 text-xs font-bold tracking-[0.15em] text-blood" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          )}
        </div>
        <p className="mt-3 text-xs text-foreground/40">
          No spam — launch alerts and new drops only. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
