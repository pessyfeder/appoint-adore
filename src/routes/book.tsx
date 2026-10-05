import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { formatTime, SERVICES, TIME_SLOTS, toDateKey } from "@/lib/data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an Appointment — Lumière Electrolysis" },
      { name: "description", content: "Book an electrolysis appointment at Lumière Electrolysis." },
      { property: "og:title", content: "Book an Appointment — Lumière Electrolysis" },
      { property: "og:description", content: "Book an electrolysis appointment at Lumière Electrolysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookPage,
});

const steps = ["Service", "Date & time", "Client", "Confirm"] as const;

function BookPage() {
  const navigate = useNavigate();
  const { clients, appointments, addClient, addAppointment } = useStore();

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", notes: "" });
  const [notes, setNotes] = useState("");

  const service = SERVICES.find((s) => s.id === serviceId);

  const bookedTimes = useMemo(
    () => new Set(appointments.filter((a) => a.date === date && a.status !== "cancelled").map((a) => a.time)),
    [appointments, date],
  );

  const canNext =
    (step === 0 && !!serviceId) ||
    (step === 1 && !!time) ||
    (step === 2 && (clientMode === "existing" ? !!clientId : newClient.name.trim().length > 0));

  const finish = () => {
    let id = clientId;
    if (clientMode === "new") {
      const c = addClient({ ...newClient, notes: newClient.notes });
      id = c.id;
    }
    if (!id || !serviceId || !time) return;
    addAppointment({ clientId: id, serviceId, date, time, notes });
    navigate({ to: "/" });
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="animate-fade-up text-4xl font-semibold tracking-tight">Book an appointment</h1>

      <ol className="mt-6 flex items-center gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`text-sm ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  serviceId === s.id ? "border-primary bg-sage/50 ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium">{s.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-2 text-sm font-semibold">
                  ${s.price} · {s.durationMin} min
                </p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <label className="text-sm font-medium" htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              min={toDateKey(new Date())}
              onChange={(e) => {
                setDate(e.target.value);
                setTime(null);
              }}
              className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="mt-5 text-sm font-medium">Available times</p>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {TIME_SLOTS.map((t) => {
                const taken = bookedTimes.has(t);
                return (
                  <button
                    key={t}
                    disabled={taken}
                    onClick={() => setTime(t)}
                    className={`rounded-full px-2 py-2 text-xs font-medium transition-colors ${
                      taken
                        ? "cursor-not-allowed bg-secondary text-muted-foreground/40 line-through"
                        : time === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-accent"
                    }`}
                  >
                    {formatTime(t)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex gap-2">
              {(["existing", "new"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setClientMode(m)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    clientMode === m ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"
                  }`}
                >
                  {m === "existing" ? "Existing client" : "New client"}
                </button>
              ))}
            </div>

            {clientMode === "existing" ? (
              <div className="mt-4 space-y-2">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClientId(c.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-all ${
                      clientId === c.id ? "border-primary bg-sage/50 ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                    {clientId === c.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={newClient.name} onChange={(v) => setNewClient({ ...newClient, name: v })} />
                <Field label="Phone" value={newClient.phone} onChange={(v) => setNewClient({ ...newClient, phone: v })} />
                <Field label="Email" value={newClient.email} onChange={(v) => setNewClient({ ...newClient, email: v })} />
                <Field label="Notes (optional)" value={newClient.notes} onChange={(v) => setNewClient({ ...newClient, notes: v })} />
              </div>
            )}

            <div className="mt-4">
              <label className="text-sm font-medium" htmlFor="appt-notes">Appointment notes (optional)</label>
              <textarea
                id="appt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-semibold">Review & confirm</h2>
            <SummaryRow label="Service" value={service?.name ?? ""} />
            <SummaryRow label="Price" value={`$${service?.price} · ${service?.durationMin} min`} />
            <SummaryRow
              label="When"
              value={`${new Date(date + "T12:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at ${time ? formatTime(time) : ""}`}
            />
            <SummaryRow
              label="Client"
              value={clientMode === "new" ? newClient.name : (clients.find((c) => c.id === clientId)?.name ?? "")}
            />
            {notes && <SummaryRow label="Notes" value={notes} />}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-40"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              <Check className="h-4 w-4" /> Confirm booking
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
