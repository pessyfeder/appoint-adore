import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToday } from "@/hooks/use-today";
import { useAvailability } from "@/lib/availability";
import { effectiveHours, formatDuration, formatTime, fromDateKey, minutesToTime, timeToMinutes, toDateKey } from "@/lib/data";
import { availableTimes, checkTimes, type AvailabilityCheck } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

/** Upcoming two weeks first; "Show more" widens the calendar step by step. */
const RANGE_TIERS = [14, 30, 60, 90];
const rangeLabel = (days: number) => (days < 28 ? `${days / 7} weeks` : days < 60 ? "month" : `${Math.round(days / 30)} months`);

/** Start-time choices; the hint says what each one shows on the calendar. */
const CHECKS: { check: AvailabilityCheck; label: string; hint: string }[] = [
  { check: "any", label: "Any time", hint: "Each day shows how many start times are open." },
  { check: "earliest", label: "Earliest time", hint: "Each day shows its earliest open start time." },
  { check: "latest", label: "Latest time", hint: "Each day shows its latest open start time." },
  { check: "specific", label: "Specific time", hint: "Days that have this start time open are green." },
];

type Day = { key: string; inRange: boolean; closed: boolean; all: string[]; matched: string[] };

const daysBetween = (from: string, to: string) => Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / 86_400_000);

/**
 * The booking's Date & time step: a calendar of upcoming days, Open / Full / Closed for the chosen length,
 * narrowed by Any time, Earliest, Latest or a Specific time. Tapping an open day lists its times below.
 */
export function AvailabilityPicker({ durationMin, excludeId, date, time, onChange }: { durationMin: number; excludeId?: string | undefined; date: string; time: string | null; onChange: (date: string, time: string | null) => void }) {
  const { appointments, blockedTimes } = useStore();
  const availability = useAvailability();
  const today = useToday();
  const [tier, setTier] = useState(0);
  const [check, setCheck] = useState<AvailabilityCheck>("any");
  const [specific, setSpecific] = useState<string | null>(null);
  // Always reach far enough to show the picked day (e.g. a reschedule booked months ahead).
  const days = Math.max(RANGE_TIERS[tier]!, daysBetween(today, date) + 1);

  const cells = useMemo<Day[]>(() => {
    const others = appointments.filter((item) => item.id !== excludeId);
    const first = fromDateKey(today);
    const last = fromDateKey(today);
    last.setDate(last.getDate() + days - 1);
    const cursor = fromDateKey(today);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    const end = new Date(last);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const list: Day[] = [];
    for (; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = toDateKey(cursor);
      const inRange = cursor >= first && cursor <= last;
      const all = inRange ? availableTimes(key, durationMin, others, blockedTimes) : [];
      list.push({ key, inRange, closed: effectiveHours(key).length === 0, all, matched: checkTimes(all, check, specific) });
    }
    return list;
    // `availability` re-runs this when the working hours change.
  }, [today, days, durationMin, excludeId, appointments, blockedTimes, check, specific, availability]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every start time the working hours allow for this length in the range, booked or not, for "Specific time".
  const specificOptions = useMemo(() => {
    const set = new Set<string>();
    for (const cell of cells) {
      if (!cell.inRange) continue;
      for (const block of effectiveHours(cell.key)) {
        for (let minute = timeToMinutes(block.start); minute + durationMin <= timeToMinutes(block.end); minute += 15) set.add(minutesToTime(minute));
      }
    }
    return [...set].sort();
  }, [cells, durationMin]);

  const anyOpen = cells.some((cell) => cell.matched.length > 0);
  const waitingForTime = check === "specific" && !specific;
  const selected = cells.find((cell) => cell.key === date);
  const nextTier = RANGE_TIERS.find((value) => value > days);

  return <div>
    <h2 className="font-serif text-xl">Choose time</h2>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-4">
        {CHECKS.map((item) => <Button key={item.check} variant={check === item.check ? "default" : "ghost"} className="h-11" onClick={() => setCheck(item.check)}>{item.label}</Button>)}
      </div>
      {check === "specific" && <Select value={specific ?? ""} onValueChange={setSpecific}>
        <SelectTrigger aria-label="Specific time" className={`h-12 w-40 ${specific ? "" : "border-primary ring-2 ring-primary/30"}`}><SelectValue placeholder="Choose a time" /></SelectTrigger>
        <SelectContent>{specificOptions.map((option) => <SelectItem className="h-10" key={option} value={option}>{formatTime(option)}</SelectItem>)}</SelectContent>
      </Select>}
    </div>
    <h2 className="mt-7 font-serif text-xl">Choose date</h2>
    <p className={`mt-2 text-sm ${!waitingForTime && !anyOpen ? "text-destructive" : "text-muted-foreground"}`}>
      {waitingForTime ? "Choose a time to see which days have it open."
        : !anyOpen ? (check === "specific" && specific ? `${formatTime(specific)} isn't open on any day in this range.` : "No open days in this range.")
        : `${CHECKS.find((item) => item.check === check)!.hint} Tap a green day to see all its times for a ${formatDuration(durationMin)} appointment.`}
    </p>

    <div className="mt-3 grid grid-cols-7 overflow-hidden rounded-lg border">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => <div key={name} className="border-b bg-muted/40 py-1 text-center text-[11px] font-medium uppercase">{name}</div>)}
      {cells.map((cell) => {
        const day = fromDateKey(cell.key);
        const dayLabel = <span className="block text-sm font-semibold">{day.getDate() === 1 || cell.key === today ? day.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : day.getDate()}</span>;
        const isSelected = cell.key === date;
        if (!cell.inRange) return <div key={cell.key} className="min-h-16 border-b border-r p-1 text-xs text-muted-foreground/50 [&:nth-child(7n)]:border-r-0">{day.getDate()}</div>;
        if (!cell.matched.length) return <div key={cell.key} className={`min-h-16 border-b border-r bg-muted/60 p-1 text-muted-foreground [&:nth-child(7n)]:border-r-0 ${isSelected ? "ring-2 ring-inset ring-muted-foreground/50" : ""}`}>{dayLabel}<span className="text-[11px]">{cell.closed ? "Closed" : waitingForTime ? "" : cell.all.length ? "Not open" : "Full"}</span></div>;
        return <button key={cell.key} type="button" aria-pressed={isSelected} className={`min-h-16 border-b border-r p-1 text-left transition-colors [&:nth-child(7n)]:border-r-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-emerald-50 text-emerald-950 hover:bg-emerald-100"}`} onClick={() => onChange(cell.key, check === "any" ? (cell.key === date ? time : null) : cell.matched[0] ?? null)}>
          {dayLabel}
          <span className="block text-[11px] font-medium">Open</span>
          <span className={`block text-[11px] ${isSelected ? "" : "text-emerald-800"}`}>{check === "any" ? `${cell.matched.length} ${cell.matched.length === 1 ? "time" : "times"}` : formatTime(cell.matched[0]!)}</span>
        </button>;
      })}
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="flex items-center gap-3"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-400" /> Open</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-muted-foreground/40" /> Full / closed</span></span>
      <span>Showing the upcoming {rangeLabel(days)}.</span>
    </div>
    {nextTier && <Button variant="outline" className="mt-2 h-11 w-full" onClick={() => setTier(RANGE_TIERS.indexOf(nextTier))}>Show more (upcoming {rangeLabel(nextTier)})</Button>}

    <section className="mt-6 rounded-lg border bg-card p-4" aria-live="polite">
      {/* With Earliest, Latest or Specific time, tapping a day pre-selects its matching time to confirm. */}
      <h3 className="font-serif text-xl">{time ? "Confirm or choose a different time" : "Choose a time"}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{fromDateKey(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}{time ? ` at ${formatTime(time)} — tap Continue to confirm.` : ""}</p>
      {selected && selected.all.length > 0
        ? <DayTimes dateKey={date} times={selected.all} matched={check === "any" ? [] : selected.matched} time={time} onPick={(picked) => onChange(date, picked)} />
        : <p className="mt-2 text-sm text-muted-foreground">{effectiveHours(date).length === 0 ? "Closed this day." : `No open times this day for ${formatDuration(durationMin)}.`} Tap a green day above.</p>}
    </section>
  </div>;
}

/** One day's open start times, under a heading for each block of working hours; the checked time is marked. */
function DayTimes({ dateKey, times, matched, time, onPick }: { dateKey: string; times: string[]; matched: string[]; time: string | null; onPick: (time: string) => void }) {
  const groups = effectiveHours(dateKey)
    .map((block) => ({ block, times: times.filter((value) => timeToMinutes(block.start) <= timeToMinutes(value) && timeToMinutes(value) < timeToMinutes(block.end)) }))
    .filter((group) => group.times.length > 0);
  return <div>
    {groups.map(({ block, times: blockTimes }) => <div key={block.start} className="mt-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{formatTime(block.start)} – {formatTime(block.end)}</p>
      <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">{blockTimes.map((value) => {
        const chosen = value === time;
        const hit = matched.includes(value);
        return <Button key={value} variant={chosen ? "default" : "outline"} className={`h-12 ${hit && !chosen ? "border-2 border-emerald-500 bg-emerald-50 font-bold text-emerald-950" : ""}`} onClick={() => onPick(value)}>{chosen && <Check />}{formatTime(value)}</Button>;
      })}</div>
    </div>)}
  </div>;
}
