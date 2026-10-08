import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToday } from "@/hooks/use-today";
import { useAvailability } from "@/lib/availability";
import { DURATION_OPTIONS, effectiveHours, formatDuration, formatTime, fromDateKey, timeToMinutes, toDateKey } from "@/lib/data";
import { availableTimes } from "@/lib/scheduling";
import { useStore } from "@/lib/store";
import { parseTimeQuery } from "@/lib/time-query";

/** Upcoming two weeks first; "Show more" widens it to the upcoming month. */
const RANGE_TIERS = [14, 30];
const rangeLabel = (days: number) => (days >= 28 ? "month" : `${days / 7} weeks`);

type Day = { key: string; inRange: boolean; closed: boolean; all: string[]; matched: string[] };

/**
 * Search Available Time Slot: pick a session length and see which upcoming days have an opening for it.
 * Tapping an open day lists its start times; tapping a time opens the booking already filled in.
 */
export function OpenTimeSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { appointments, blockedTimes } = useStore();
  const availability = useAvailability();
  const today = useToday();
  const [length, setLength] = useState(30);
  const [tier, setTier] = useState(0);
  const [query, setQuery] = useState("");
  const [openDay, setOpenDay] = useState<string | null>(null);
  const filter = parseTimeQuery(query);
  const days = RANGE_TIERS[tier]!;

  const cells = useMemo<Day[]>(() => {
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
      const all = inRange ? availableTimes(key, length, appointments, blockedTimes) : [];
      list.push({ key, inRange, closed: effectiveHours(key).length === 0, all, matched: filter ? filter(all, key) : all });
    }
    return list;
    // `availability` re-runs this when the working hours change.
  }, [today, days, length, appointments, blockedTimes, query, availability]); // eslint-disable-line react-hooks/exhaustive-deps

  const anyOpen = cells.some((cell) => cell.matched.length > 0);

  function pick(date: string, time: string) {
    setOpenDay(null);
    onOpenChange(false);
    void navigate({ to: "/book", search: { edit: undefined, date, time, length } });
  }

  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setOpenDay(null); }}>
    <DialogContent className="flex max-h-[92vh] flex-col overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Search available time slot</DialogTitle><DialogDescription>See which upcoming days have an opening for a session length. Tap an open day to pick a time.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <label className="grid gap-1 text-sm font-medium">Session length
          <Select value={String(length)} onValueChange={(value) => { setLength(Number(value)); setTier(0); setOpenDay(null); }}>
            <SelectTrigger className="h-12 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{DURATION_OPTIONS.map((duration) => <SelectItem className="h-10" key={duration} value={String(duration)}>{formatDuration(duration)}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">Search start time
          <Input className="h-12 text-base font-normal" placeholder="Any time — e.g. 2:30 pm, 14:00, earliest, earliest evening" value={query} onChange={(event) => { setQuery(event.target.value); setOpenDay(null); }} />
        </label>
      </div>
      {filter === false && <p className="text-sm text-destructive">Couldn't read that as a time — try e.g. 2:30 pm, 14:30, earliest, earliest day or latest evening.</p>}
      {filter && !anyOpen && <p className="text-sm text-destructive">No open days at that start time in this range.</p>}

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => <div key={name} className="border-b bg-muted/40 py-1 text-center text-[11px] font-medium uppercase">{name}</div>)}
        {cells.map((cell) => {
          const dayNumber = fromDateKey(cell.key).getDate();
          if (!cell.inRange) return <div key={cell.key} className="min-h-16 border-b border-r p-1 text-xs text-muted-foreground/50 [&:nth-child(7n)]:border-r-0">{dayNumber}</div>;
          if (!cell.matched.length) return <div key={cell.key} className="min-h-16 border-b border-r bg-muted/60 p-1 text-muted-foreground [&:nth-child(7n)]:border-r-0"><span className="block text-sm font-medium">{dayNumber}</span><span className="text-[11px]">{cell.closed ? "Closed" : "Full"}</span></div>;
          return <Popover key={cell.key} open={openDay === cell.key} onOpenChange={(next) => setOpenDay(next ? cell.key : null)}>
            <PopoverTrigger asChild>
              <button type="button" className={`min-h-16 border-b border-r p-1 text-left transition-colors [&:nth-child(7n)]:border-r-0 ${openDay === cell.key ? "bg-emerald-200" : "bg-emerald-50 hover:bg-emerald-100"} text-emerald-950`}>
                <span className="block text-sm font-semibold">{dayNumber}</span>
                <span className="block text-[11px] font-medium">Open</span>
                <span className="block text-[11px] text-emerald-800">{cell.matched.length} {cell.matched.length === 1 ? "time" : "times"}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-h-[60vh] w-auto max-w-[min(26rem,90vw)] overflow-y-auto p-3" align="center">
              <DayTimes dateKey={cell.key} times={cell.all} matched={filter ? cell.matched : []} onPick={(time) => pick(cell.key, time)} />
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

/** One day's open start times, under a heading for each block of working hours; searched-for times are bold. */
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
