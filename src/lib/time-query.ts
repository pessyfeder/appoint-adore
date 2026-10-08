import { effectiveHours, timeToMinutes } from "./data";

/** Narrows one day's sorted open start times ("HH:MM") to the ones a search matches. */
export type TimeFilter = (times: string[], dateKey: string) => string[];

/** Times inside the day's daytime (block starts before noon) or evening hours. */
function inPeriod(times: string[], dateKey: string, evening: boolean): string[] {
  const blocks = effectiveHours(dateKey).filter((block) => (timeToMinutes(block.start) >= 12 * 60) === evening);
  return times.filter((time) => blocks.some((block) => timeToMinutes(block.start) <= timeToMinutes(time) && timeToMinutes(time) < timeToMinutes(block.end)));
}

const WORDS: Record<string, TimeFilter> = {
  earliest: (times) => times.slice(0, 1),
  latest: (times) => times.slice(-1),
  "earliest day": (times, day) => inPeriod(times, day, false).slice(0, 1),
  "latest day": (times, day) => inPeriod(times, day, false).slice(-1),
  "earliest morning": (times, day) => inPeriod(times, day, false).slice(0, 1),
  "latest morning": (times, day) => inPeriod(times, day, false).slice(-1),
  "earliest evening": (times, day) => inPeriod(times, day, true).slice(0, 1),
  "latest evening": (times, day) => inPeriod(times, day, true).slice(-1),
};

/** An hour, optionally some (possibly partial) minutes, optionally AM/PM: "2", "2:3", "2:30", "2pm", "2:30 p.m.", "14:30". */
const TIME = /^(\d{1,2})(?::?(\d{0,2}))?\s*(?:([ap])\.?\s*(?:m\.?)?)?$/;

/**
 * Reads the "Search start time" box. Returns null when it's empty, false when it isn't a time,
 * otherwise a filter. Partial input matches loosely so results narrow while typing: "2" matches
 * every 2:xx (AM or PM), "2:3" matches 2:30–2:39. An hour over 12 (or 0) is 24-hour time.
 * "earliest" / "latest" (and "… day", "… morning", "… evening", or the start of one) pick each
 * day's first / last opening overall or within its daytime / evening hours.
 */
export function parseTimeQuery(raw: string): TimeFilter | null | false {
  let text = raw.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
  if (!text) return null;
  // Shortest phrase the text could still be the start of, so "earliest" is plain earliest while "earliest e" is evening.
  const phrases = Object.keys(WORDS).filter((phrase) => phrase.startsWith(text)).sort((a, b) => a.length - b.length);
  if (phrases[0]) return WORDS[phrases[0]]!;
  // "230" / "1030" with no colon: the last two digits are the minutes.
  text = text.replace(/^(\d{1,2})(\d{2})(?!\d)/, "$1:$2");
  const match = TIME.exec(text);
  if (!match) return false;
  const hour = Number(match[1]);
  const minutes = match[2] ?? "";
  const ampm = match[3];
  if (hour > 23 || (minutes.length === 2 && Number(minutes) > 59)) return false;
  const twentyFour = hour > 12 || hour === 0;
  if (twentyFour && ampm) return false;
  const matches = (time: string) => {
    const total = timeToMinutes(time);
    const h = Math.floor(total / 60);
    if (twentyFour ? h !== hour : (h % 12 || 12) !== hour) return false;
    if (!twentyFour && ampm && (h < 12) !== (ampm === "a")) return false;
    return String(total % 60).padStart(2, "0").startsWith(minutes);
  };
  return (times) => times.filter(matches);
}
