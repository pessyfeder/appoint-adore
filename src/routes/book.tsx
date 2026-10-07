import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, UserPlus } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { availableTimes, validateAppointment } from "@/lib/scheduling";
import { appointmentProgress, DURATION_OPTIONS, notesIssue, formatDuration, formatPhone, formatTime, fromDateKey, toDateKey } from "@/lib/data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>) => ({ edit: typeof search["edit"] === "string" ? search["edit"] : undefined }),
  head: () => ({ meta: [
    { title: "New Appointment | Lumière Electrolysis" },
    { name: "description", content: "Schedule an electrolysis appointment safely within business hours." },
    { property: "og:title", content: "New Appointment | Lumière Electrolysis" },
    { property: "og:description", content: "Schedule an electrolysis appointment safely within business hours." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BookPage,
});

const STEPS = ["Duration", "Date & time", "Clients", "Confirm"];

function BookPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const store = useStore();
  const { status } = useLock();
  // Without the Admin password the Book screen is public: no client list, no rescheduling.
  const isPublic = status !== "unlocked";
  const edit = isPublic ? undefined : search.edit;
  const existing = edit ? store.appointments.find((item) => item.id === edit) : undefined;
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [step, setStep] = useState(0);
  const [durationMin, setDuration] = useState(existing?.durationMin ?? 30);
  const [date, setDate] = useState(existing?.date ?? toDateKey(new Date()));
  const [time, setTime] = useState<string | null>(existing?.time ?? null);
  const [clientIds, setClientIds] = useState<string[]>(existing?.clients.map((item) => item.clientId) ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [guest, setGuest] = useState({ name: "", phone: "" });
  const [booked, setBooked] = useState<string | null>(null);
  const seeded = store.ready && Boolean(edit);

  // Saved data loads just after first paint, so re-sync the form once the
  // store is ready (keeps reschedule prefill correct after a refresh).
  useEffect(() => {
    if (!seeded || !existing) return;
    setDuration(existing.durationMin);
    setDate(existing.date);
    setTime(existing.time);
    setClientIds(existing.clients.map((item) => item.clientId));
    setNotes(existing.notes);
  }, [seeded]);

  const times = useMemo(() => availableTimes(date, durationMin, store.appointments.filter((item) => item.id !== edit), store.blockedTimes), [date, durationMin, edit, store.appointments, store.blockedTimes]);
  const guestValid = guest.name.trim().length > 0 && guest.phone.replace(/\D/g, "").length === 10;
  const canContinue = step === 0 || (step === 1 && Boolean(time)) || (step === 2 && (isPublic ? guestValid : clientIds.length > 0));

  function resetForm() {
    setStep(0); setDuration(30); setDate(toDateKey(new Date())); setTime(null);
    setClientIds([]); setNotes(""); setGuest({ name: "", phone: "" }); setError(""); setBooked(null);
  }

  function addNewClient() {
    try {
      const client = store.addClient({ name: newClient.name, phone: formatPhone(newClient.phone) });
      setClientIds((current) => [...current, client.id]);
      setNewClient({ name: "", phone: "" });
      setShowNew(false);
      setError("");
    } catch { setError("Enter a name and 10-digit phone number."); }
  }

  async function finish() {
    if (!time) return;
    if (existing && appointmentProgress(existing) !== "scheduled") { setError("Only scheduled appointments can be rescheduled."); return; }
    const noteError = notesIssue(notes);
    if (noteError) { setError(noteError); setStep(2); return; }
    const issue = validateAppointment({ date, time, durationMin, ...(edit ? { excludeId: edit } : {}) }, store.appointments, store.blockedTimes);
    if (issue) { setError(issue); setStep(1); return; }
    if (edit && existing) {
      const names = clientIds.map((id) => store.clients.find((client) => client.id === id)?.name).filter(Boolean).join(" & ") || "this";
      const oldWhen = `${fromDateKey(existing.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${formatTime(existing.time)}`;
      const newWhen = `${fromDateKey(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${formatTime(time)}`;
      const ok = await confirm({ title: `Reschedule ${names}'s appointment?`, description: `From ${oldWhen} to ${newWhen}.`, confirmLabel: "Reschedule appointment", cancelLabel: "Keep original" });
      if (!ok) return;
    }
    let ids = clientIds;
    if (isPublic) {
      // Reuse a matching client record by phone number; otherwise create one. Nothing about it is shown back.
      const phone = formatPhone(guest.phone);
      const digits = phone.replace(/\D/g, "");
      const match = store.clients.find((client) => client.phone.replace(/\D/g, "") === digits);
      try { ids = [match ? match.id : store.addClient({ name: guest.name.trim(), phone }).id]; }
      catch { setError("Enter a name and 10-digit phone number."); setStep(2); return; }
    }
    const input = { date, time, durationMin, clientIds: ids, notes };
    const savedId = edit ? (store.updateAppointment(edit, input), edit) : store.addAppointment(input).id;
    const when = `${fromDateKey(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${formatTime(time)}`;
    if (isPublic) { setBooked(when); return; }
    store.setHighlightId(savedId);
    toast.success(edit ? "Appointment updated" : "Appointment confirmed", { description: when });
    navigate({ to: "/schedule" });
  }

  if (booked) return <main className="mx-auto max-w-xl px-4 py-16 text-center">
    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-7 w-7" /></span>
    <h1 className="mt-5 font-serif text-3xl">Appointment booked</h1>
    <p className="mt-3 text-lg">{booked}</p>
    <p className="mt-1 text-muted-foreground">{formatDuration(durationMin)}</p>
    <Button className="mt-8 h-12 px-6" onClick={resetForm}><CalendarPlus /> Book another appointment</Button>
  </main>;

  return <main className="mx-auto max-w-3xl px-4 py-8">
    <p className="text-xs font-medium uppercase text-muted-foreground">Appointment</p>
    <h1 className="mt-1 font-serif text-3xl">{edit ? "Reschedule appointment" : "New appointment"}</h1>
    <ol className="mt-6 grid grid-cols-4 gap-1">{STEPS.map((label, index) => <li key={label} className="min-w-0 text-center"><span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${index <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{index < step ? <Check /> : index + 1}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{label}</span></li>)}</ol>

    <section className="mt-7 border-y py-6">
      {step === 0 && <div><h2 className="font-serif text-xl">How long?</h2><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">{DURATION_OPTIONS.map((duration) => <Button key={duration} variant={durationMin === duration ? "default" : "outline"} className="h-12" onClick={() => { setDuration(duration); setTime(null); }}>{formatDuration(duration)}</Button>)}</div></div>}
      {step === 1 && <div><h2 className="font-serif text-xl">Choose date and time</h2><Input type="date" className="mt-4 h-12 max-w-xs" min={toDateKey(new Date())} value={date} onChange={(event) => { setDate(event.target.value); setTime(null); setError(""); }} /><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{times.map((slot) => <Button key={slot} variant={time === slot ? "default" : "outline"} className="h-12" onClick={() => setTime(slot)}>{formatTime(slot)}</Button>)}</div>{times.length === 0 && <p className="mt-5 border border-dashed p-5 text-center text-muted-foreground">No available times for this duration.</p>}</div>}
      {step === 2 && <div><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl">Who is coming?</h2><Button variant="outline" className="h-11" onClick={() => setShowNew((value) => !value)}><UserPlus /> New client</Button></div>{showNew && <div className="mt-4 grid gap-2 border-b pb-4 sm:grid-cols-[1fr_1fr_auto]"><Input className="h-11" placeholder="Full name" value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} /><Input className="h-11" inputMode="tel" placeholder="Phone" value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: formatPhone(event.target.value) })} /><Button className="h-11" onClick={addNewClient}>Save</Button></div>}<div className="mt-4 grid gap-2 sm:grid-cols-2">{store.clients.filter((client) => !client.archived).map((client) => { const selected = clientIds.includes(client.id); return <Button key={client.id} variant={selected ? "secondary" : "outline"} className="h-auto min-h-14 justify-between whitespace-normal p-3 text-left" onClick={() => setClientIds((current) => selected ? current.filter((id) => id !== client.id) : [...current, client.id])}><span><span className="block font-medium">{client.name}</span><span className="block text-xs text-muted-foreground">{client.phone}</span></span>{selected && <Check />}</Button>; })}</div><label className="mt-5 block text-sm font-medium" htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></label><Textarea id="notes" className="mt-1" maxLength={500} placeholder="e.g. treatment area, special instructions" value={notes} onChange={(event) => { setNotes(event.target.value); setError(""); }} /></div>}
      {step === 3 && <div><h2 className="font-serif text-xl">Ready to schedule</h2><dl className="mt-4 divide-y border-y"><Summary label="When" value={`${fromDateKey(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${time ? formatTime(time) : ""}`} /><Summary label="Duration" value={formatDuration(durationMin)} /><Summary label="Clients" value={clientIds.map((id) => store.clients.find((client) => client.id === id)?.name).filter(Boolean).join(", ")} /></dl><p className="mt-5 text-sm text-muted-foreground">Appointments cancelled with less than 24 hours’ notice may still be charged.</p></div>}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
    <div className="mt-5 flex justify-between"><Button variant="outline" className="h-11" disabled={step === 0} onClick={() => setStep((current) => current - 1)}><ArrowLeft /> Back</Button>{step < 3 ? <Button className="h-11" disabled={!canContinue} onClick={() => { if (step === 2) { const issue = notesIssue(notes); if (issue) { setError(issue); return; } } setError(""); setStep((current) => current + 1); }}>Continue <ArrowRight /></Button> : <Button className="h-11" onClick={finish}><Check /> {edit ? "Save changes" : "Confirm"}</Button>}</div>
    {confirmDialog}</main>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-5 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>; }