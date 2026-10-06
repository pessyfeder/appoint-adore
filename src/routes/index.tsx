import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, Clock3, Users, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, formatTime, toDateKey } from "@/lib/data";
import { useStore } from "@/lib/store";
import { StartEndControls, StatusBadge } from "@/components/AppointmentControls";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Today | Lumière Electrolysis" },
    { name: "description", content: "Today's appointments and studio totals for Lumière Electrolysis." },
    { property: "og:title", content: "Today | Lumière Electrolysis" },
    { property: "og:description", content: "Today's appointments and studio totals for Lumière Electrolysis." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TodayPage,
});

function TodayPage() {
  const { appointments, clients, setClientStatus } = useStore();
  const today = toDateKey(new Date());
  const entries = appointments.filter((item) => item.date === today && item.clients.some((client) => client.status !== "cancelled")).sort((a, b) => a.time.localeCompare(b.time));
  const label = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return <main className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><h1 className="mt-1 font-serif text-3xl">Today</h1></div><Button asChild className="h-11"><Link to="/book" search={{ edit: undefined }}><CalendarPlus /> New appointment</Link></Button></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2"><Stat icon={<Clock3 />} label="Appointments" value={String(entries.length)} /><Stat icon={<Users />} label="Clients" value={String(clients.length)} /></div>
    <section className="mt-9"><h2 className="font-serif text-2xl">Today’s appointments</h2>{entries.length === 0 ? <p className="mt-4 border border-dashed p-8 text-center text-muted-foreground">No appointments today.</p> : <ul className="mt-4 divide-y border-y">{entries.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-4 py-4"><div className="w-28"><p className="font-semibold">{formatTime(item.time)}</p><StatusBadge item={item} /><p className="text-xs text-muted-foreground">{formatDuration(item.durationMin)}</p></div><div className="min-w-48 flex-1"><p className="font-medium">{item.clients.map((entry) => clients.find((client) => client.id === entry.clientId)?.name).filter(Boolean).join(" & ")}</p>{item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}</div><div className="flex flex-wrap items-center gap-2"><StartEndControls item={item} />{!item.startedAt && item.clients.filter((entry) => entry.status === "scheduled").map((entry) => <div key={entry.clientId} className="flex gap-1"><Button size="icon" variant="ghost" className="h-11 w-11" onClick={() => setClientStatus(item.id, entry.clientId, "cancelled")} aria-label="Cancel appointment"><XCircle /></Button></div>)}</div></li>)}</ul>}</section>
  </main>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div><p className="mt-2 font-serif text-3xl">{value}</p></div>; }