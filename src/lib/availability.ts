import { useSyncExternalStore } from "react";
import type { BusinessBlock } from "./data";

/** Practitioner-editable working hours, stored on this device only. */
export type Availability = {
  weekly: Record<number, BusinessBlock[]>;
  /** Date-specific hours ("YYYY-MM-DD"); an empty list means closed that day. */
  overrides: Record<string, BusinessBlock[]>;
};

const KEY = "lumiere-hours-v1";

export const DEFAULT_WEEKLY: Record<number, BusinessBlock[]> = {
  0: [{ start: "11:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  1: [{ start: "10:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  2: [{ start: "19:30", end: "22:30" }],
  3: [{ start: "10:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  4: [{ start: "10:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  5: [],
  6: [],
};

let current: Availability = { weekly: DEFAULT_WEEKLY, overrides: {} };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) current = JSON.parse(raw) as Availability;
  } catch { /* keep defaults */ }
}

export function getAvailability(): Availability {
  load();
  return current;
}

export function setAvailability(next: Availability) {
  current = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn());
}

/** Returns an error when blocks overlap or end before they start. */
export function blocksIssue(blocks: BusinessBlock[]): string | null {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i]!.end <= sorted[i]!.start) return "Each end time must be after its start time.";
    if (i > 0 && sorted[i]!.start < sorted[i - 1]!.end) return "Time ranges can't overlap.";
  }
  return null;
}

export function sortBlocks(blocks: BusinessBlock[]) {
  return [...blocks].sort((a, b) => a.start.localeCompare(b.start));
}

export function useAvailability(): Availability {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    getAvailability,
    () => ({ weekly: DEFAULT_WEEKLY, overrides: {} }),
  );
}
