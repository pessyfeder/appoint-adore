import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToday } from "@/hooks/use-today";
import { useAvailability } from "@/lib/availability";
import { effectiveHours, formatDuration, formatTime, fromDateKey, minutesToTime, timeToMinutes, toDateKey } from "@/lib/data";
import { availableTimes } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

/** How far ahead the month arrows go. */
const MONTHS_AHEAD = 12;
const ANY = "any";

const monthStart = (key: string) => { const day = fromDateKey(key); day.setDate(1); return day; };
const longDay = (key: string) => fromDateKey(key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

/**
 * The booking's Date & time step. Choose date: a month calendar where days with an opening for this length
 * have a dot (optionally only days with a chosen start time open). Then confirm the day's earliest or latest
 * time, or pick another from the full list.
 */
export function AvailabilityPicker({ durationMin, excludeId, date, time, onChange }: { durationMin: number; excludeId?: string | undefined; date: string; time: string | null; onChange: (date: string, time: string | null) => void }) {
  const { appointments, blockedTimes } = useStore();
  const availability = useAvailability();
  const today = useToday();
  const [month, setMonth] = useState(() => monthStart(date < today ? today : date));
  const [hasTime, setHasTime] = useState<string>(ANY);
  const [showAll, setShowAll] = useState(false);
  const others = useMemo(() => appointments.filter((item) => item.id !== excludeId), [appointments, excludeId]);

  // Open start times for every bookable day of the shown month.
  const openTimes = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const cursor = new Date(month); cursor.getMonth() === month.getMonth(); cursor.setDate(cursor.getDate() + 1)) {
      const key = toDateKey(cursor);
      if (key >= today) map.set(key, availableTimes(key, durationMin, others, blockedTimes));
    }
    return map;
    // `availability` re-runs this when the working hours change.
  }, [month, today, durationMin, others, blockedTimes, availability]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every start time the working hours allow this month, booked or not, for "Has this time open".
  const filterOptions = useMemo(() => {
    const set = new Set<string>();
    for (const key of openTimes.keys()) {
      for (const block of effectiveHours(key)) {
        for (let minute = timeToMinutes(block.start); minute + durationMin <= timeToMinutes(block.end); minute += 15) set.add(minutesToTime(minute));
      }
    }
    return [...set].sort();
  }, [openTimes, durationMin]);

  const isOpen = (key: string) => {
    const times = openTimes.get(key) ?? [];
    return hasTime === ANY ? times.length > 0 : times.includes(hasTime);
  };
  // The picked day's times (it may sit in another month than the one shown).
  const dayTimes = useMemo(() => openTimes.get(date) ?? (date >= today ? availableTimes(date, durationMin, others, blockedTimes) : []), [openTimes, date, today, durationMin, others, blockedTimes]);

  const firstMonth = monthStart(today);
  const lastMonth = monthStart(today);
  lastMonth.setMonth(lastMonth.getMonth() + MONTHS_AHEAD);
  const moveMonth = (step: number) => { const next = new Date(month); next.setMonth(next.getMonth() + step); setMonth(next); };

  function pickDay(key: string) {
    const times = openTimes.get(key) ?? [];
    // Tapping a day picks a time to confirm: the filtered time, otherwise the day's earliest.
    onChange(key, hasTime !== ANY && times.includes(hasTime) ? hasTime : times[0] ?? null);
  }

  const days: string[] = [];
  for (const cursor = new Date(month); cursor.getMonth() === month.getMonth(); cursor.setDate(cursor.getDate() + 1)) days.push(toDateKey(cursor));
  const earliest = dayTimes[0];
  const latest = dayTimes[dayTimes.length - 1];
  // A time that is neither the earliest nor the latest (e.g. when rescheduling) keeps the full list open so it shows.
  const midDayPicked = Boolean(time && time !== earliest && time !== latest);
  const listOpen = showAll || midDayPicked;

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-serif text-2xl">Choose date</h2>
      <Select value={hasTime} onValueChange={setHasTime}>
        <SelectTrigger aria-label="Has this time open" className="h-11 w-auto min-w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem className="h-10" value={ANY}>Has this time open: any time</SelectItem>
          {filterOptions.map((option) => <SelectItem className="h-10" key={option} value={option}>Has {formatTime(option)} open</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <div className="mt-4 flex items-center justify-between">
      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Previous month" disabled={month <= firstMonth} onClick={() => moveMonth(-1)}><ChevronLeft /></Button>
      <p className="font-medium">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Next month" disabled={month >= lastMonth} onClick={() => moveMonth(1)}><ChevronRight /></Button>
    </div>
    <div className="mt-1 grid grid-cols-7 gap-1.5 text-center">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => <div key={name} className="py-1 text-xs uppercase tracking-wide text-muted-foreground">{name}</div>)}
      {Array.from({ length: month.getDay() }, (_, index) => <div key={`blank-${index}`} />)}
      {days.map((key) => {
        const number = fromDateKey(key).getDate();
        if (!isOpen(key)) return <div key={key} className="flex h-13 items-center justify-center text-base text-muted-foreground/45">{number}</div>;
        const selected = key === date;
        return <button key={key} type="button" aria-pressed={selected} aria-label={longDay(key)} className={`flex h-13 flex-col items-center justify-center rounded-xl text-base font-medium transition-colors ${selected ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`} onClick={() => pickDay(key)}>
          {number}
          <span className={`mt-1 h-1.5 w-1.5 rounded-full ${selected ? "bg-primary-foreground" : "bg-primary"}`} />
        </button>;
      })}
    </div>
    {![...openTimes.keys()].some(isOpen) && <p className="mt-3 text-center text-sm text-muted-foreground">{hasTime === ANY ? `No open days this month for ${formatDuration(durationMin)}.` : `No days this month have ${formatTime(hasTime)} open.`} Try the next month.</p>}

    <div className="mt-6 border-t pt-6" aria-live="polite">
      {dayTimes.length === 0 ? <p className="text-muted-foreground">Tap a day with a dot to see its times.</p> : <>
        <h2 className="font-serif text-2xl">{time ? "Confirm or choose a different time" : "Choose a time"}</h2>
        <p className="mt-1 text-muted-foreground">{longDay(date)}{time ? ` at ${formatTime(time)} — tap Continue to confirm.` : ""}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <BigTime label={earliest === latest ? "Only time" : "Earliest"} value={earliest!} chosen={time === earliest} onPick={() => onChange(date, earliest!)} />
          {earliest !== latest && <BigTime label="Latest" value={latest!} chosen={time === latest} onPick={() => onChange(date, latest!)} />}
        </div>
        {dayTimes.length > 2 && !midDayPicked && <Button variant="link" className="mt-2 h-11 px-0 text-base" onClick={() => setShowAll(!listOpen)}>{listOpen ? <>Hide times <ChevronUp /></> : <>See all times <ChevronDown /></>}</Button>}
        {listOpen && <AllTimes dateKey={date} times={dayTimes} time={time} onPick={(picked) => onChange(date, picked)} />}
      </>}
    </div>
  </div>;
}

function BigTime({ label, value, chosen, onPick }: { label: string; value: string; chosen: boolean; onPick: () => void }) {
  return <button type="button" aria-pressed={chosen} className={`flex h-20 flex-col items-center justify-center rounded-2xl border transition-colors ${chosen ? "border-2 border-primary bg-primary/10" : "bg-card hover:bg-secondary"}`} onClick={onPick}>
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-xl font-semibold">{formatTime(value)}</span>
  </button>;
}

/** Every open start time of the day, grouped by block of working hours. */
function AllTimes({ dateKey, times, time, onPick }: { dateKey: string; times: string[]; time: string | null; onPick: (time: string) => void }) {
  const groups = effectiveHours(dateKey)
    .map((block) => ({ block, times: times.filter((value) => timeToMinutes(block.start) <= timeToMinutes(value) && timeToMinutes(value) < timeToMinutes(block.end)) }))
    .filter((group) => group.times.length > 0);
  return <div>{groups.map(({ block, times: blockTimes }) => <div key={block.start} className="mt-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{timeToMinutes(block.start) < 12 * 60 ? "Morning" : "Evening"}</p>
    <div className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">{blockTimes.map((value) => <Button key={value} variant={value === time ? "default" : "outline"} className="h-12" onClick={() => onPick(value)}>{formatTime(value)}</Button>)}</div>
  </div>)}</div>;
}
