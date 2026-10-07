import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarPlus, Clock3, HardDriveDownload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, formatTime, toDateKey } from "@/lib/data";
import { useStore } from "@/lib/store";
import { StartEndControls, StatusBadge } from "@/components/AppointmentControls";
import { ClientStatusActions } from "@/components/ClientStatusActions";
import { BACKUP_REMINDER_DAYS, daysSinceBackup, readLastBackup } from "@/lib/backup";

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
  const { appointments, clients, payments, ready } = useStore();
  const today = toDateKey(new Date());
  const entries = appointments.filter((item) => item.date === today && item.clients.some((client) => client.status !== "cancelled")).sort((a, b) => a.time.localeCompare(b.time));
  const label = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return <main className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><h1 className="mt-1 font-serif text-3xl">Today</h1></div><Button asChild className="h-11"><Link to="/book" search={{ edit: undefined }}><CalendarPlus /> New appointment</Link></Button></div>
    {ready && (clients.length > 0 || appointments.length > 0 || payments.length > 0) && <BackupReminder />}
    <div className="mt-7 grid gap-3 sm:grid-cols-2"><Stat icon={<Clock3 />} label="Appointments" value={String(entries.length)} /><Stat icon={<Users />} label="Clients today" value={String(entries.flatMap((item) => item.clients).filter((entry) => entry.status !== "cancelled").length)} /></div>
    <section className="mt-9"><h2 className="font-serif text-2xl">Today’s appointments</h2>{entries.length === 0 ? <p className="mt-4 border border-dashed p-8 text-center text-muted-foreground">No appointments today.</p> : <ul className="mt-4 divide-y border-y">{entries.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-4 py-4"><div className="w-28"><p className="font-semibold">{formatTime(item.time)}</p><StatusBadge item={item} /><p className="text-xs text-muted-foreground">{formatDuration(item.durationMin)}</p></div><div className="min-w-48 flex-1"><p className="font-medium">{item.clients.map((entry) => clients.find((client) => client.id === entry.clientId)?.name).filter(Boolean).join(" & ")}</p>{item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}</div><div className="flex flex-wrap items-center gap-2"><StartEndControls item={item} />{item.clients.map((entry) => <ClientStatusActions key={entry.clientId} item={item} clientId={entry.clientId} showName={item.clients.length > 1} />)}</div></li>)}</ul>}</section>
  </main>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div><p className="mt-2 font-serif text-3xl">{value}</p></div>; }

/** Nudges the practitioner to save a backup when there has never been one, or the last is over a week old. */
function BackupReminder() {
  const [days, setDays] = useState<number | null | undefined>(undefined);
  useEffect(() => setDays(daysSinceBackup(readLastBackup(window.localStorage))), []);
  if (days === undefined || (days !== null && days < BACKUP_REMINDER_DAYS)) return null;
  return <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-noshow/40 bg-status-noshow/10 p-4">
    <p className="flex items-center gap-2 text-sm"><HardDriveDownload className="h-5 w-5 shrink-0" />{days === null ? "You haven't backed up your records yet." : `Your last backup was ${days} days ago.`} Your records live only on this tablet.</p>
    <Button asChild className="h-11" variant="outline"><Link to="/backup">Back up now</Link></Button>
  </div>;
}
