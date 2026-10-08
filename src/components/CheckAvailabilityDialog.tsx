import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToday } from "@/hooks/use-today";
import { useAvailability } from "@/lib/availability";
import { effectiveHours, formatDuration, formatTime, fromDateKey, minutesToTime, timeToMinutes, toDateKey } from "@/lib/data";
import { availableTimes, checkTimes, type AvailabilityCheck as Mode } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

/** Upcoming two weeks first; "Show more" widens it to the upcoming month. */
const RANGE_TIERS = [14, 30];
const rangeLabel = (days: number) => (days >= 28 ? "month" : `${days / 7} weeks`);

const MODES: { mode: Mode; label: string }[] = [
  { mode: "any", label: "Any time" },
  { mode: "earliest", label: "Earliest" },
  { mode: "latest", label: "Latest" },
  { mode: "specific", label: "Specific time" },
];

type Day = { key: string; inRange: boolean; closed: boolean; all: string[]; matched: string[] };

/**
 * Check Availability (on the booking's Date & time step): which upcoming days have an opening for the chosen
 * length — any time, the earliest or latest opening, or a specific start time. Tapping an open day lists its
 * times; tapping one fills in the booking's date and time.
 */
export function CheckAvailabilityDialog({ open, onOpenChange, durationMin, excludeId, onPick }: { open: boolean; onOpenChange: (open: boolean) => void; durationMin: number; excludeId?: string | undefined; onPick: (date: string, time: string) => void }) {
  const { appointments, blockedTimes } = useStore();
  const availability = useAvailability();
  const today = useToday();
  const [tier, setTier] = useState(0);
  const [mode, setMode] = useState<Mode>("any");
  const [specific, setSpecific] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const days = RANGE_TIERS[tier]!;

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
      list.push({ key, inRange, closed: effectiveHours(key).length === 0, all, matched: checkTimes(all, mode, specific) });
    }
    return list;
    // `availability` re-runs this when the working hours change.
  }, [today, days, durationMin, excludeId, appointments, blockedTimes, mode, specific, availability]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const waitingForTime = mode === "specific" && !specific;

  function pick(date: string, time: string) {
    setOpenDay(null);
    onOpenChange(false);
    onPick(date, time);
  }

  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setOpenDay(null); }}>
    <DialogContent className="flex max-h-[92vh] flex-col overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Check Availability</DialogTitle><DialogDescription>Open days for a {formatDuration(durationMin)} appointment. Tap an open day to pick a time.</DialogDescription></DialogHeader>
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:grid-cols-4">
          {MODES.map((item) => <Button key={item.mode} variant={mode === item.mode ? "default" : "ghost"} className="h-11" onClick={() => { setMode(item.mode); setOpenDay(null); }}>{item.label}</Button>)}
        </div>
        {mode === "specific" && <Select value={specific ?? ""} onValueChange={(value) => { setSpecific(value); setOpenDay(null); }}>
          <SelectTrigger aria-label="Specific time" className={`h-12 w-40 ${specific ? "" : "border-primary ring-2 ring-primary/30"}`}><SelectValue placeholder="Choose a time" /></SelectTrigger>
          <SelectContent>{specificOptions.map((time) => <SelectItem className="h-10" key={time} value={time}>{formatTime(time)}</SelectItem>)}</SelectContent>
        </Select>}
      </div>
      {waitingForTime ? <p className="text-sm text-muted-foreground">Choose a time to see which days have it open.</p>
        : !anyOpen && <p className="text-sm text-destructive">{mode === "specific" && specific ? `${formatTime(specific)} isn't open on any day in this range.` : "No open days in this range."}</p>}

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => <div key={name} className="border-b bg-muted/40 py-1 text-center text-[11px] font-medium uppercase">{name}</div>)}
        {cells.map((cell) => {
          const dayNumber = fromDateKey(cell.key).getDate();
          if (!cell.inRange) return <div key={cell.key} className="min-h-16 border-b border-r p-1 text-xs text-muted-foreground/50 [&:nth-child(7n)]:border-r-0">{dayNumber}</div>;
          if (!cell.matched.length) return <div key={cell.key} className="min-h-16 border-b border-r bg-muted/60 p-1 text-muted-foreground [&:nth-child(7n)]:border-r-0"><span className="block text-sm font-medium">{dayNumber}</span><span className="text-[11px]">{cell.closed ? "Closed" : waitingForTime ? "" : cell.all.length ? "Not open" : "Full"}</span></div>;
          return <Popover key={cell.key} open={openDay === cell.key} onOpenChange={(next) => setOpenDay(next ? cell.key : null)}>
            <PopoverTrigger asChild>
              <button type="button" className={`min-h-16 border-b border-r p-1 text-left text-emerald-950 transition-colors [&:nth-child(7n)]:border-r-0 ${openDay === cell.key ? "bg-emerald-200" : "bg-emerald-50 hover:bg-emerald-100"}`}>
                <span className="block text-sm font-semibold">{dayNumber}</span>
                <span className="block text-[11px] font-medium">Open</span>
                <span className="block text-[11px] text-emerald-800">{mode === "any" ? `${cell.matched.length} ${cell.matched.length === 1 ? "time" : "times"}` : formatTime(cell.matched[0]!)}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-h-[min(60vh,var(--radix-popover-content-available-height))] w-auto max-w-[min(26rem,90vw)] overflow-y-auto p-3" align="center" collisionPadding={12}>
              <DayTimes dateKey={cell.key} times={cell.all} matched={mode === "any" ? [] : cell.matched} onPick={(time) => pick(cell.key, time)} />
            </PopoverContent>
          </Popover>;
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-3"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-400" /> Open</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-muted-foreground/40" /> Full / closed</span></span>
        <span>Showing the upcoming {rangeLabel(days)}.</span>
      </div>
      {tier < RANGE_TIERS.length - 1 && <Button variant="outline" className="h-11" onClick={() => setTier(tier + 1)}>Show more (upcoming {rangeLabel(RANGE_TIERS[tier + 1]!)})</Button>}
    </DialogContent>
  </Dialog>;
}

/** One day's open start times, under a heading for each block of working hours; the checked time stands out. */
function DayTimes({ dateKey, times, matched, onPick }: { dateKey: string; times: string[]; matched: string[]; onPick: (time: string) => void }) {
  const groups = effectiveHours(dateKey)
    .map((block) => ({ block, times: times.filter((time) => timeToMinutes(block.start) <= timeToMinutes(time) && timeToMinutes(time) < timeToMinutes(block.end)) }))
    .filter((group) => group.times.length > 0);
  return <div>
    <p className="font-serif text-lg">{fromDateKey(dateKey).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
    {groups.map(({ block, times: blockTimes }) => <div key={block.start} className="mt-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{formatTime(block.start)} – {formatTime(block.end)}</p>
      <div className="mt-1 grid grid-cols-3 gap-1.5">{blockTimes.map((time) => {
        const hit = matched.includes(time);
        return <Button key={time} variant={hit ? "default" : "outline"} className={`h-11 ${hit ? "font-bold" : ""}`} onClick={() => onPick(time)}>{formatTime(time)}</Button>;
      })}</div>
    </div>)}
  </div>;
}
