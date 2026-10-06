import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_BADGE, CLIENT_LABEL, STATUS_CARD, StartEndControls, StatusBadge } from "@/components/AppointmentControls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, CalendarPlus, Clock3, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { appointmentProgress, formatDuration, formatTime, fromDateKey, timeToMinutes, toDateKey, type Appointment } from "@/lib/data";
import { useLock } from "@/lib/lock";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/schedule")({
  head: () => ({ meta: [
    { title: "Schedule | Lumière Electrolysis" },
    { name: "description", content: "Review weekly and monthly electrolysis appointments." },
    { property: "og:title", content: "Schedule | Lumière Electrolysis" },
    { property: "og:description", content: "Review weekly and monthly electrolysis appointments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SchedulePage,
});

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  next.setHours(12, 0, 0, 0);
  return next;
}

function clientNames(item: Appointment, clients: { id: string; name: string }[]) {
  return item.clients.map((entry) => clients.find((client) => client.id === entry.clientId)?.name).filter(Boolean).join(" & ");
}

function SchedulePage() {
  const { appointments, clients, blockedTimes, addBlockedTime, setClientStatus, highlightId, setHighlightId } = useStore();
  const { confirmPassphrase } = useLock();
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [goOpen, setGoOpen] = useState(false);
  useEffect(() => {
    if (!highlightId) return;
    const target = appointments.find((item) => item.id === highlightId);
    if (target) setCursor(fromDateKey(target.date));
    const scroll = window.setTimeout(() => document.querySelector(`[data-appointment="${highlightId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    const clear = window.setTimeout(() => setHighlightId(null), 6000);
    return () => { window.clearTimeout(scroll); window.clearTimeout(clear); };
  }, [highlightId]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = selected ? appointments.find((item) => item.id === selected.id) ?? selected : null;
  const [block, setBlock] = useState({ date: toDateKey(new Date()), startTime: "10:30", endTime: "11:30", reason: "Unavailable" });

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [cursor]);

  function move(direction: number) {
    const next = new Date(cursor);
    if (view === "week") next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    setCursor(next);
  }

  const [blockError, setBlockError] = useState<string | null>(null);

  async function saveBlock() {
    if (block.endTime <= block.startTime) return setBlockError("The end time must be after the start time.");
    if (!(await confirmPassphrase("Blocking out time"))) return;
    addBlockedTime(block);
    setBlockError(null);
    setBlockOpen(false);
  }

  const title = view === "week"
    ? `${weekDays[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Calendar</p>
            <h1 className="mt-1 font-serif text-3xl">Schedule</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-11" onClick={() => setBlockOpen(true)}><Clock3 className="opacity-60" /> Block time</Button>
            <Button asChild className="h-11"><Link to="/book" search={{ edit: undefined }}><CalendarPlus /> New appointment</Link></Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-lg" onClick={() => move(-1)} aria-label={`Previous ${view}`}><ChevronLeft /></Button>
            <div className="flex rounded-lg bg-muted p-1">
              <Button variant={toDateKey(cursor) === toDateKey(new Date()) ? "secondary" : "ghost"} className="h-10 rounded-md px-4 shadow-sm" onClick={() => setCursor(new Date())}>Today</Button>
              <Popover open={goOpen} onOpenChange={setGoOpen}>
                <PopoverTrigger asChild><Button variant={toDateKey(cursor) !== toDateKey(new Date()) ? "secondary" : "ghost"} className="h-10 rounded-md px-4 shadow-sm">Go to date</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={cursor} defaultMonth={cursor} onSelect={(day) => { if (day) { const next = new Date(day); next.setHours(12, 0, 0, 0); setCursor(next); setGoOpen(false); } }} className="pointer-events-auto p-3" /></PopoverContent>
              </Popover>
            </div>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-lg" onClick={() => move(1)} aria-label={`Next ${view}`}><ChevronRight /></Button>
          </div>
          <h2 className="order-last w-full text-center font-serif text-xl leading-none sm:order-none sm:w-auto">{title}</h2>
          <div className="flex rounded-lg bg-muted p-1">
            {(["week", "month"] as const).map((mode) => <Button key={mode} variant={view === mode ? "secondary" : "ghost"} className="h-10 rounded-md capitalize shadow-sm" onClick={() => setView(mode)}>{mode}</Button>)}
          </div>
        </div>
      </header>

      {view === "week" ? (
        <div className="overflow-x-auto"><div className="grid min-w-[760px] grid-cols-7 overflow-hidden border bg-background">
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const dayAppointments = appointments.filter((item) => item.date === key).sort((a, b) => a.time.localeCompare(b.time));
            const dayBlocks = blockedTimes.filter((item) => item.date === key);
            const today = key === toDateKey(new Date());
            return <div key={key} className="min-h-[460px] border-r last:border-r-0">
              <div className={`border-b p-3 text-center ${today ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}><p className="text-xs uppercase">{day.toLocaleDateString("en-US", { weekday: "short" })}</p><p className="mt-1 text-xl font-semibold">{day.getDate()}</p></div>
              <div className="space-y-2 p-2">
                {dayAppointments.map((item) => <Button key={item.id} data-appointment={item.id} variant="outline" className={`h-auto w-full items-start justify-start whitespace-normal p-3 text-left transition-shadow ${STATUS_CARD[appointmentProgress(item)]} ${item.id === highlightId ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2" : ""}`} onClick={() => setSelected(item)}><span className="w-full"><span className="block font-semibold">{formatTime(item.time)}</span><span className="mb-1 block"><StatusBadge item={item} /></span><span className="block text-xs text-muted-foreground">{clientNames(item, clients)}</span><span className="block text-xs text-muted-foreground">{formatDuration(item.durationMin)}</span></span></Button>)}
                {dayBlocks.map((item) => <div key={item.id} className="border border-dashed bg-muted/50 p-2 text-xs text-muted-foreground">{formatTime(item.startTime)}–{formatTime(item.endTime)}<br />{item.reason}</div>)}
                {!dayAppointments.length && !dayBlocks.length && <p className="pt-5 text-center text-xs text-muted-foreground">No entries</p>}
              </div>
            </div>;
          })}
        </div></div>
      ) : <MonthGrid cursor={cursor} appointments={appointments} clients={clients} onSelect={setSelected} highlightId={highlightId} />}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>{current && <>
          <DialogHeader><DialogTitle>{clientNames(current, clients)}</DialogTitle><DialogDescription>{fromDateKey(current.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {formatTime(current.time)} · {formatDuration(current.durationMin)}</DialogDescription></DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3"><StatusBadge item={current} /><StartEndControls item={current} /></div>
          <div className="space-y-3">{current.clients.map((entry) => <div key={entry.clientId} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><span>{clients.find((client) => client.id === entry.clientId)?.name}</span><div className="flex items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${entry.startedAt && !entry.endedAt ? "border-status-progress bg-status-progress text-foreground" : CLIENT_BADGE[entry.status]}`}>{entry.startedAt && !entry.endedAt ? "In progress" : CLIENT_LABEL[entry.status]}</span>{entry.status === "scheduled" && !entry.startedAt && <Button size="sm" variant="outline" className="h-10" onClick={() => setClientStatus(current.id, entry.clientId, "cancelled")}>Cancel</Button>}</div></div>)}</div>
          {current.notes && <p className="text-sm text-muted-foreground">{current.notes}</p>}
          {appointmentProgress(current) === "scheduled" && <DialogFooter><Button asChild variant="outline" className="h-11"><Link to="/book" search={{ edit: current.id }}>Reschedule</Link></Button></DialogFooter>}
        </>}</DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={(open) => { setBlockOpen(open); if (!open) setBlockError(null); }}><DialogContent>
        <DialogHeader><DialogTitle>Block time</DialogTitle><DialogDescription>Keep appointments from being booked during this period.</DialogDescription></DialogHeader>
        <div className="grid gap-3"><Input className="h-11" type="date" value={block.date} onChange={(event) => setBlock({ ...block, date: event.target.value })} /><div className="grid grid-cols-2 gap-3"><Input className="h-11" type="time" value={block.startTime} onChange={(event) => setBlock({ ...block, startTime: event.target.value })} /><Input className="h-11" type="time" value={block.endTime} onChange={(event) => setBlock({ ...block, endTime: event.target.value })} /></div><Input className="h-11" value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })} /></div>
        {blockError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{blockError}</p>}
        <DialogFooter><Button onClick={saveBlock}>Save block</Button></DialogFooter>
      </DialogContent></Dialog>
      </div>
    </main>
  );
}

function MonthGrid({ cursor, appointments, clients, onSelect, highlightId }: { cursor: Date; appointments: Appointment[]; clients: { id: string; name: string }[]; onSelect: (item: Appointment) => void; highlightId: string | null }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(gridStart); day.setDate(gridStart.getDate() + index); return day; });
  return <div className="grid grid-cols-7 overflow-hidden border">
    {days.slice(0, 7).map((day) => <div key={day.getDay()} className="border-b border-r bg-muted/40 p-2 text-center text-xs uppercase last:border-r-0">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>)}
    {days.map((day) => { const key = toDateKey(day); const entries = appointments.filter((item) => item.date === key); const muted = day.getMonth() !== cursor.getMonth(); return <div key={key} className={`min-h-[112px] border-b border-r p-1 last:border-r-0 ${muted ? "bg-muted/30 text-muted-foreground" : ""}`}><div className="p-1 text-sm font-medium">{day.getDate()}</div>{entries.slice(0, 3).map((item) => <Button key={item.id} data-appointment={item.id} variant="ghost" className={`h-auto w-full justify-start overflow-hidden rounded-sm px-1 py-1 text-xs ${STATUS_CARD[appointmentProgress(item)]} ${item.id === highlightId ? "bg-primary/15 ring-2 ring-primary" : ""}`} onClick={() => onSelect(item)}><UserRound className="shrink-0" /> <span className="truncate">{formatTime(item.time)} {clientNames(item, clients)}</span></Button>)}{entries.length > 3 && <p className="px-1 text-xs text-muted-foreground">+{entries.length - 3} more</p>}</div>; })}
  </div>;
}
