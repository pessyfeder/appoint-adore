import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blocksIssue, setAvailability, sortBlocks, useAvailability } from "@/lib/availability";
import { formatTime, fromDateKey, toDateKey, type BusinessBlock } from "@/lib/data";
import { usePassphraseGate } from "@/lib/lock";
import { blockedTimeIssue } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/availability")({
  head: () => ({ meta: [
    { title: "Hours & Availability | Lumière Electrolysis" },
    { name: "description", content: "Set weekly working hours, change hours for a specific date, and block out time." },
    { property: "og:title", content: "Hours & Availability | Lumière Electrolysis" },
    { property: "og:description", content: "Set weekly working hours, change hours for a specific date, and block out time." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AvailabilityPage,
});

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Section = "weekly" | "date" | "block";

function RangeEditor({ blocks, onChange }: { blocks: BusinessBlock[]; onChange: (next: BusinessBlock[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks.length === 0 && <p className="py-2 text-sm text-muted-foreground">Closed</p>}
      {blocks.map((block, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <Input type="time" aria-label="Start time" className="w-36" value={block.start} onChange={(e) => onChange(blocks.map((b, i) => i === index ? { ...b, start: e.target.value } : b))} />
          <span className="text-muted-foreground">to</span>
          <Input type="time" aria-label="End time" className="w-36" value={block.end} onChange={(e) => onChange(blocks.map((b, i) => i === index ? { ...b, end: e.target.value } : b))} />
          <Button variant="ghost" size="icon" aria-label="Remove time range" onClick={() => onChange(blocks.filter((_, i) => i !== index))}><Trash2 /></Button>
        </div>
      ))}
      <div><Button variant="outline" onClick={() => onChange([...blocks, { start: "10:00", end: "13:00" }])}><Plus /> Add hours</Button></div>
    </div>
  );
}

function AvailabilityPage() {
  const availability = useAvailability();
  const { appointments, blockedTimes, addBlockedTime, removeBlockedTime } = useStore();
  const { request, prompt } = usePassphraseGate();
  const [gateAt, setGateAt] = useState<Section | null>(null);
  const [weekly, setWeekly] = useState(availability.weekly);
  const [weeklyMsg, setWeeklyMsg] = useState<{ error?: string; ok?: string }>({});
  const [date, setDate] = useState(toDateKey(new Date()));
  const [dateBlocks, setDateBlocks] = useState<BusinessBlock[]>([]);
  const [dateMsg, setDateMsg] = useState<{ error?: string; ok?: string }>({});
  const [block, setBlock] = useState({ date: toDateKey(new Date()), startTime: "10:30", endTime: "11:30", reason: "" });
  const [blockMsg, setBlockMsg] = useState<{ error?: string; ok?: string }>({});

  useEffect(() => setWeekly(availability.weekly), [availability.weekly]);
  useEffect(() => {
    setDateBlocks(availability.overrides[date] ?? availability.weekly[fromDateKey(date).getDay()] ?? []);
  }, [date, availability]);

  async function gated(section: Section, label: string) {
    setGateAt(section);
    const ok = await request(label);
    setGateAt(null);
    return ok;
  }

  async function saveWeekly() {
    for (let d = 0; d < 7; d++) {
      const issue = blocksIssue(weekly[d] ?? []);
      if (issue) return setWeeklyMsg({ error: `${DAYS[d]}: ${issue}` });
    }
    if (!(await gated("weekly", "Changing weekly hours"))) return;
    const sorted = Object.fromEntries(Object.entries(weekly).map(([d, b]) => [d, sortBlocks(b)]));
    setAvailability({ ...availability, weekly: sorted });
    setWeeklyMsg({ ok: "Weekly hours saved." });
  }

  async function saveDate(closed: boolean) {
    const blocks = closed ? [] : dateBlocks;
    const issue = blocksIssue(blocks);
    if (issue) return setDateMsg({ error: issue });
    if (!(await gated("date", "Changing hours for a date"))) return;
    setAvailability({ ...availability, overrides: { ...availability.overrides, [date]: sortBlocks(blocks) } });
    setDateMsg({ ok: closed ? "Marked closed." : "Hours saved for this date." });
  }

  async function clearDate(key: string) {
    if (!(await gated("date", "Going back to weekly hours"))) return;
    const { [key]: _removed, ...rest } = availability.overrides;
    setAvailability({ ...availability, overrides: rest });
    setDateMsg({ ok: "Weekly hours restored for that date." });
  }

  async function removeBlock(id: string) {
    if (!(await gated("block", "Removing blocked time"))) return;
    removeBlockedTime(id);
    setBlockMsg({ ok: "Blocked time removed." });
  }

  async function saveBlock() {
    const issue = blockedTimeIssue(block, appointments);
    if (issue) return setBlockMsg({ error: issue });
    if (!(await gated("block", "Blocking out time"))) return;
    addBlockedTime({ ...block, reason: block.reason.trim() });
    setBlock({ ...block, reason: "" });
    setBlockMsg({ ok: "Time blocked." });
  }

  const longDate = (key: string) => fromDateKey(key).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const today = toDateKey(new Date());
  const overrides = Object.entries(availability.overrides).filter(([k]) => k >= today).sort(([a], [b]) => a.localeCompare(b));
  const blocks = [...blockedTimes].filter((b) => b.date >= today).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const msg = (m: { error?: string; ok?: string }) => m.error ? <p className="text-sm text-destructive">{m.error}</p> : m.ok ? <p className="text-sm text-muted-foreground">{m.ok}</p> : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Availability</p>
        <h1 className="font-serif text-4xl">Hours</h1>
        <p className="mt-1 text-sm text-muted-foreground">Booking only offers times inside these hours. Existing appointments are not moved.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Weekly hours</h2>
          <div className="flex flex-col divide-y divide-border">
            {DAYS.map((name, d) => (
              <div key={name} className="grid gap-2 py-3 sm:grid-cols-[110px_1fr]">
                <span className="pt-3 font-medium">{name}</span>
                <RangeEditor blocks={weekly[d] ?? []} onChange={(next) => { setWeeklyMsg({}); setWeekly({ ...weekly, [d]: next }); }} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {msg(weeklyMsg)}
            {gateAt === "weekly" && prompt}
            <div><Button onClick={saveWeekly}>Save weekly hours</Button></div>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-1 text-lg font-semibold">Change hours for one date</h2>
            <p className="mb-4 text-sm text-muted-foreground">Add extra hours, shorten a day, or close it — only for that date.</p>
            <div className="mb-3 flex flex-col gap-1.5">
              <Label htmlFor="override-date">Date</Label>
              <Input id="override-date" type="date" className="w-48" value={date} onChange={(e) => { setDateMsg({}); setDate(e.target.value); }} />
            </div>
            <RangeEditor blocks={dateBlocks} onChange={(next) => { setDateMsg({}); setDateBlocks(next); }} />
            <div className="mt-4 flex flex-col gap-3">
              {msg(dateMsg)}
              {gateAt === "date" && prompt}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveDate(false)}>Save for this date</Button>
                <Button variant="outline" onClick={() => saveDate(true)}><CalendarOff /> Closed this day</Button>
              </div>
            </div>
            {overrides.length > 0 && (
              <ul className="mt-5 flex flex-col divide-y divide-border border-t border-border">
                {overrides.map(([key, list]) => (
                  <li key={key} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span><span className="font-medium">{longDate(key)}</span> · {list.length ? list.map((b) => `${formatTime(b.start)}–${formatTime(b.end)}`).join(", ") : "Closed"}</span>
                    <Button variant="ghost" onClick={() => clearDate(key)}>Use weekly hours</Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold">Block out time</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5"><Label htmlFor="b-date">Date</Label><Input id="b-date" type="date" value={block.date} onChange={(e) => setBlock({ ...block, date: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="b-start">From</Label><Input id="b-start" type="time" value={block.startTime} onChange={(e) => setBlock({ ...block, startTime: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="b-end">To</Label><Input id="b-end" type="time" value={block.endTime} onChange={(e) => setBlock({ ...block, endTime: e.target.value })} /></div>
            </div>
            <div className="mt-3 flex flex-col gap-1.5"><Label htmlFor="b-reason">Reason</Label><Input id="b-reason" value={block.reason} maxLength={200} placeholder="e.g. Doctor appointment" onChange={(e) => setBlock({ ...block, reason: e.target.value })} /></div>
            <div className="mt-4 flex flex-col gap-3">
              {msg(blockMsg)}
              {gateAt === "block" && prompt}
              <div><Button onClick={saveBlock}>Block time</Button></div>
            </div>
            {blocks.length > 0 && (
              <ul className="mt-5 flex flex-col divide-y divide-border border-t border-border">
                {blocks.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span><span className="font-medium">{longDate(b.date)}</span> · {formatTime(b.startTime)}–{formatTime(b.endTime)} · {b.reason}</span>
                    <Button variant="ghost" size="icon" aria-label={`Remove blocked time on ${longDate(b.date)}`} onClick={() => removeBlock(b.id)}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
