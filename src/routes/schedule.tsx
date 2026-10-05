import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatTime, TIME_SLOTS, toDateKey } from "@/lib/data";
import { serviceById, useStore } from "@/lib/store";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — Lumière Electrolysis" },
      { name: "description", content: "Weekly appointment calendar for Lumière Electrolysis." },
      { property: "og:title", content: "Schedule — Lumière Electrolysis" },
      { property: "og:description", content: "Weekly appointment calendar for Lumière Electrolysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchedulePage,
});

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function SchedulePage() {
  const { appointments, clients } = useStore();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const shiftWeek = (n: number) => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + n * 7);
      return d;
    });
  };

  const todayKey = toDateKey(new Date());
  const firstDay = days[0]!;
  const lastDay = days[6]!;
  const weekLabel = `${firstDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${lastDay.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="animate-fade-up flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Schedule</h1>
          <p className="mt-1 text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-1)} aria-label="Previous week" className="rounded-full border border-border p-2 transition-colors hover:bg-secondary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary">
            This week
          </button>
          <button onClick={() => shiftWeek(1)} aria-label="Next week" className="rounded-full border border-border p-2 transition-colors hover:bg-secondary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const key = toDateKey(d);
          const dayAppts = appointments
            .filter((a) => a.date === key && a.status !== "cancelled")
            .sort((a, b) => a.time.localeCompare(b.time));
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`min-h-48 rounded-2xl border p-3 ${isToday ? "border-primary bg-sage/40" : "border-border bg-card"}`}
            >
              <p className={`text-xs font-medium tracking-wide uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className={`font-display text-xl font-semibold ${isToday ? "text-primary" : ""}`}>{d.getDate()}</p>
              <div className="mt-3 space-y-2">
                {dayAppts.map((a) => {
                  const client = clients.find((c) => c.id === a.clientId);
                  const service = serviceById(a.serviceId);
                  return (
                    <div key={a.id} className="rounded-xl bg-background p-2 text-xs shadow-sm ring-1 ring-border">
                      <p className="font-semibold">{formatTime(a.time)}</p>
                      <p className="truncate font-medium">{client?.name}</p>
                      <p className="truncate text-muted-foreground">{service?.name}</p>
                    </div>
                  );
                })}
                {dayAppts.length === 0 && <p className="pt-2 text-xs text-muted-foreground/60">Open</p>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Studio hours: {formatTime(TIME_SLOTS[0]!)} – {formatTime(TIME_SLOTS[TIME_SLOTS.length - 1]!)}, Monday–Sunday.{" "}
        <Link to="/book" className="font-medium text-primary underline underline-offset-4">
          Book a new appointment
        </Link>
      </p>
    </main>
  );
}
