"use client";

// "Signed up on this device": after joining the list, the browser remembers
// it so returning Cadets see "You're in" instead of the form again. Nothing
// is unlocked — the site only ever carries the 15-second preview.

import { useSyncExternalStore } from "react";

// the old key name, so people who signed up before still count as joined
const KEY = "ntb-wednesday-unlocked";
const EVENT = "ntb-joined";
// when storage is blocked (private browsing), joined for this visit only
let joinedThisVisit = false;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function saveJoined() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    joinedThisVisit = true;
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
export function useJoined(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => joinedThisVisit || read(),
    () => false,
  );
}
