import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDuration, formatTime, fromDateKey, timeToMinutes, toDateKey, type Appointment } from "@/lib/data";
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
  const { appointments, clients, blockedTimes, addBlockedTime, setClientStatus } = useStore();
  const { confirmPassphrase } = useLock();
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
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

  async function saveBlock() {
    if (!(await confirmPassphrase("Blocking out time"))) return;
    addBlockedTime(block);
    setBlockOpen(false);
  }

  const title = view === "week"
    ? `${weekDays[0]?.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6]?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-medium uppercase text-muted-foreground">Calendar</p><h1 className="mt-1 font-serif text-3xl">Schedule</h1></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" onClick={() => setBlockOpen(true)}><Clock3 /> Block time</Button>
          <Button asChild className="h-11"><Link to="/book" search={{ edit: undefined }}><Plus /> New appointment</Link></Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => move(-1)} aria-label={`Previous ${view}`}><ChevronLeft /></Button>
          <Button variant="outline" className="h-11" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => move(1)} aria-label={`Next ${view}`}><ChevronRight /></Button>
        </div>
        <h2 className="font-serif text-xl">{title}</h2>
        <div className="flex rounded-md border p-1">
          {(["week", "month"] as const).map((mode) => <Button key={mode} variant={view === mode ? "secondary" : "ghost"} className="h-9 capitalize" onClick={() => setView(mode)}>{mode}</Button>)}
        </div>
      </div>

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
                {dayAppointments.map((item) => <Button key={item.id} variant="outline" className="h-auto w-full items-start justify-start whitespace-normal p-3 text-left" onClick={() => setSelected(item)}><span><span className="block font-semibold">{formatTime(item.time)}</span><span className="block text-xs text-muted-foreground">{clientNames(item, clients)}</span><span className="block text-xs text-muted-foreground">{formatDuration(item.durationMin)}</span></span></Button>)}
                {dayBlocks.map((item) => <div key={item.id} className="border border-dashed bg-muted/50 p-2 text-xs text-muted-foreground">{formatTime(item.startTime)}–{formatTime(item.endTime)}<br />{item.reason}</div>)}
                {!dayAppointments.length && !dayBlocks.length && <p className="pt-5 text-center text-xs text-muted-foreground">No entries</p>}
              </div>
            </div>;
          })}
        </div></div>
      ) : <MonthGrid cursor={cursor} appointments={appointments} clients={clients} onSelect={setSelected} />}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>{selected && <>
          <DialogHeader><DialogTitle>{clientNames(selected, clients)}</DialogTitle><DialogDescription>{fromDateKey(selected.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {formatTime(selected.time)} · {formatDuration(selected.durationMin)}</DialogDescription></DialogHeader>
          <div className="space-y-3">{selected.clients.map((entry) => <div key={entry.clientId} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"><span>{clients.find((client) => client.id === entry.clientId)?.name}</span><div className="flex gap-1">{(["completed", "no_show", "cancelled"] as const).map((status) => <Button key={status} size="sm" variant={entry.status === status ? "secondary" : "outline"} onClick={() => setClientStatus(selected.id, entry.clientId, status)}>{status === "no_show" ? "No-show" : status}</Button>)}</div></div>)}</div>
          {selected.notes && <p className="text-sm text-muted-foreground">{selected.notes}</p>}
          <DialogFooter><Button asChild variant="outline"><Link to="/book" search={{ edit: selected.id }}>Reschedule</Link></Button></DialogFooter>
        </>}</DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}><DialogContent>
        <DialogHeader><DialogTitle>Block time</DialogTitle><DialogDescription>Keep appointments from being booked during this period.</DialogDescription></DialogHeader>
        <div className="grid gap-3"><Input className="h-11" type="date" value={block.date} onChange={(event) => setBlock({ ...block, date: event.target.value })} /><div className="grid grid-cols-2 gap-3"><Input className="h-11" type="time" value={block.startTime} onChange={(event) => setBlock({ ...block, startTime: event.target.value })} /><Input className="h-11" type="time" value={block.endTime} onChange={(event) => setBlock({ ...block, endTime: event.target.value })} /></div><Input className="h-11" value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })} /></div>
        <DialogFooter><Button onClick={saveBlock}>Save block</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}

function MonthGrid({ cursor, appointments, clients, onSelect }: { cursor: Date; appointments: Appointment[]; clients: { id: string; name: string }[]; onSelect: (item: Appointment) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, index) => { const day = new Date(gridStart); day.setDate(gridStart.getDate() + index); return day; });
  return <div className="grid grid-cols-7 overflow-hidden border">
    {days.slice(0, 7).map((day) => <div key={day.getDay()} className="border-b border-r bg-muted/40 p-2 text-center text-xs uppercase last:border-r-0">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>)}
    {days.map((day) => { const key = toDateKey(day); const entries = appointments.filter((item) => item.date === key); const muted = day.getMonth() !== cursor.getMonth(); return <div key={key} className={`min-h-[112px] border-b border-r p-1 last:border-r-0 ${muted ? "bg-muted/30 text-muted-foreground" : ""}`}><div className="p-1 text-sm font-medium">{day.getDate()}</div>{entries.slice(0, 3).map((item) => <Button key={item.id} variant="ghost" className="h-auto w-full justify-start overflow-hidden px-1 py-1 text-xs" onClick={() => onSelect(item)}><UserRound className="shrink-0" /> <span className="truncate">{formatTime(item.time)} {clientNames(item, clients)}</span></Button>)}{entries.length > 3 && <p className="px-1 text-xs text-muted-foreground">+{entries.length - 3} more</p>}</div>; })}
  </div>;
}
