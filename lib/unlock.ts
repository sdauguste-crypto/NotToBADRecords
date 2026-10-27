"use client";

// "Signed up on this device": joining the list unlocks the full WEDNESDAY
// stream on /wednesday, and the browser remembers it so returning Cadets
// don't have to sign up again. A soft gate by design — the site is static,
// so it hides the song from casual visitors rather than locking the file.

import { useSyncExternalStore } from "react";

const KEY = "ntb-wednesday-unlocked";
const EVENT = "ntb-unlocked";
// when storage is blocked (private browsing), unlocked for this visit only
let unlockedThisVisit = false;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function saveUnlocked() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    unlockedThisVisit = true;
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** True once this browser has signed up. False in the static HTML. */
export function useUnlocked(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => unlockedThisVisit || read(),
    () => false,
  );
}
