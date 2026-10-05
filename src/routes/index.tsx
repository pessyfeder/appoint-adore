import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, CheckCircle2, Clock, Users, XCircle } from "lucide-react";
import { formatTime, toDateKey } from "@/lib/data";
import { serviceById, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Lumière Electrolysis" },
      { name: "description", content: "Today's appointments and studio overview for Lumière Electrolysis." },
      { property: "og:title", content: "Today — Lumière Electrolysis" },
      { property: "og:description", content: "Today's appointments and studio overview for Lumière Electrolysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { appointments, clients, setAppointmentStatus } = useStore();
  const todayKey = toDateKey(new Date());
  const todays = appointments
    .filter((a) => a.date === todayKey && a.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const estRevenue = todays
    .filter((a) => a.status === "confirmed")
    .reduce((sum, a) => sum + (serviceById(a.serviceId)?.price ?? 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{todayLabel}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">Good day, here's your studio</h1>
        </div>
        <Link
          to="/book"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
        >
          <CalendarPlus className="h-4 w-4" /> New appointment
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Clock className="h-5 w-5" />} label="Appointments today" value={String(todays.length)} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total clients" value={String(clients.length)} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Expected revenue" value={`$${estRevenue}`} />
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Today's schedule</h2>
        {todays.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            No appointments today. Enjoy the calm — or book one in.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {todays.map((a) => {
              const client = clients.find((c) => c.id === a.clientId);
              const service = serviceById(a.serviceId);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="w-24 shrink-0 text-center">
                    <p className="font-display text-lg font-semibold">{formatTime(a.time)}</p>
                    <p className="text-xs text-muted-foreground">{service?.durationMin} min</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{client?.name ?? "Unknown client"}</p>
                    <p className="text-sm text-muted-foreground">{service?.name}</p>
                    {a.notes && <p className="mt-1 text-xs text-muted-foreground italic">“{a.notes}”</p>}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      a.status === "completed" ? "bg-sage text-sage-foreground" : "bg-blush text-blush-foreground"
                    }`}
                  >
                    {a.status === "completed" ? "Completed" : "Confirmed"}
                  </span>
                  {a.status === "confirmed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAppointmentStatus(a.id, "completed")}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-sage"
                      >
                        Mark done
                      </button>
                      <button
                        onClick={() => setAppointmentStatus(a.id, "cancelled")}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
