import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Search } from "lucide-react";
import { useState } from "react";
import { formatTime } from "@/lib/data";
import { serviceById, useStore } from "@/lib/store";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Lumière Electrolysis" },
      { name: "description", content: "Client list and visit history for Lumière Electrolysis." },
      { property: "og:title", content: "Clients — Lumière Electrolysis" },
      { property: "og:description", content: "Client list and visit history for Lumière Electrolysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { clients, appointments } = useStore();
  const [query, setQuery] = useState("");

  const filtered = clients.filter((c) =>
    `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-muted-foreground">{clients.length} people in your book</p>
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="w-64 rounded-full border border-input bg-card py-2 pr-4 pl-9 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const theirAppts = appointments.filter((a) => a.clientId === c.id && a.status !== "cancelled");
          const upcoming = theirAppts
            .filter((a) => a.date >= new Date().toISOString().slice(0, 10))
            .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
          const visits = appointments.filter((a) => a.clientId === c.id && a.status === "completed").length;
          return (
            <article key={c.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sage font-display text-lg font-semibold text-sage-foreground">
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
                <div>
                  <h2 className="font-medium">{c.name}</h2>
                  <p className="text-xs text-muted-foreground">{visits} completed visit{visits === 1 ? "" : "s"}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {c.phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {c.email}</p>
              </div>
              {c.notes && (
                <p className="mt-3 rounded-xl bg-blush/60 p-3 text-xs text-blush-foreground italic">“{c.notes}”</p>
              )}
              {upcoming && (
                <p className="mt-3 text-xs font-medium text-primary">
                  Next: {new Date(upcoming.date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {formatTime(upcoming.time)} — {serviceById(upcoming.serviceId)?.name}
                </p>
              )}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            No clients match “{query}”.
          </p>
        )}
      </div>
    </main>
  );
}
