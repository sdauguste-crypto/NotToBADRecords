"use client";

import { useState, type FormEvent } from "react";

import { saveJoined, useJoined } from "@/lib/joined";
import { joinList } from "@/lib/wednesday-signup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** The field's error line, so a screen reader hears it on refocus too. */
const ERROR_ID = "wednesday-email-error";

/**
 * The list signup on /wednesday ("Stay in the loop"): the weekly drop list.
 * Joining shows the `success` line (and keeps showing it on this device).
 * Nothing plays beyond the public preview.
 */
export function WednesdaySignup({
  label,
  tag,
  success,
  pitch,
}: {
  label: string;
  tag: string;
  success: string;
  /** An optional lead-in before the small print; the label may say it already. */
  pitch?: string;
}) {
  const joined = useJoined();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
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
      await joinList(trimmed, tag, website);
      saveJoined();
      setDone(true);
    } catch {
      setError("SIGNAL LOST — TRANSMISSION FAILED, TRY AGAIN");
    } finally {
      setSending(false);
    }
  };

  const signedUp = done || joined;

  return (
    <div className="wed-glass w-full p-5 text-left sm:p-7">
      <p className="text-lg font-semibold leading-snug text-chrome sm:text-xl">{label}</p>

      {signedUp ? (
        <p
          className="mt-5 flex items-start gap-3 rounded-2xl border border-blood/50 bg-blood/10 p-4 text-sm leading-relaxed text-chrome"
          role="status"
        >
          <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-blood text-[0.7rem]">
            ✓
          </span>
          <span>{success}</span>
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-5">
          {/* the field's name starts with the words on screen (label in
              name), then says what goes in it; the cursor is decoration */}
          <label htmlFor="wednesday-email" className="text-[0.68rem] tracking-[0.2em] text-steel">
            NTB:// awaiting-recruit &gt;
            <span className="sr-only"> Email address</span>
            <span aria-hidden className="animate-blink motion-reduce:animate-none ml-1 inline-block text-blood">
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
          <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ERROR_ID : undefined}
              // 16px keeps iOS from zooming the page on focus
              className="h-12 w-full min-w-0 rounded-full sm:flex-1 border border-white/12 bg-obsidian/70 px-5 text-base text-chrome caret-blood transition-colors placeholder:text-steel hover:border-white/25 focus:border-blood focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-blood/40"
            />
            <button
              type="submit"
              disabled={sending}
              className="h-12 shrink-0 rounded-full bg-blood px-7 text-xs font-semibold tracking-[0.24em] text-chrome transition-[background-color,transform] duration-300 hover:bg-oxblood active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? "TRANSMITTING…" : "TRANSMIT"}
            </button>
          </div>
          {error ? (
            <p id={ERROR_ID} className="mt-3 border-l-2 border-blood pl-3 text-xs font-semibold tracking-[0.12em] text-chrome" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}

      <p className="mt-4 text-xs leading-relaxed text-steel">
        {!signedUp && pitch ? `${pitch} ` : ""}No spam — launch alerts and new drops only. Unsubscribe anytime.
      </p>
    </div>
  );
}
