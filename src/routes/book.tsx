import { toast } from "sonner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useToday } from "@/hooks/use-today";
import { ArrowLeft, ArrowRight, CalendarPlus, Check, UserPlus, X } from "lucide-react";
import { useLock } from "@/lib/lock";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availableTimes, pastStartIssue, validateAppointment } from "@/lib/scheduling";
import { appointmentProgress, DURATION_OPTIONS, notesIssue, formatDuration, formatPhone, formatTime, fromDateKey, toDateKey, type Client } from "@/lib/data";
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
/** Lengths offered as big buttons; every other length is in the "Other length" list. */
const COMMON_DURATIONS = [15, 30, 45, 60, 90, 120];

/** First day after `from` (within ~3 months) that has an open time for this length. */
function nextOpenDate(from: string, durationMin: number, appointments: Parameters<typeof availableTimes>[2], blocks: Parameters<typeof availableTimes>[3]) {
  const day = fromDateKey(from);
  for (let i = 1; i <= 92; i++) {
    day.setDate(day.getDate() + 1);
    const key = toDateKey(day);
    if (availableTimes(key, durationMin, appointments, blocks).length) return key;
  }
  return null;
}

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
  const today = useToday();
  const [date, setDate] = useState(existing?.date ?? today);
  const [time, setTime] = useState<string | null>(existing?.time ?? null);
  // When the day rolls over with yesterday still picked, move the booking to the new day (yesterday's times are gone).
  const [shownToday, setShownToday] = useState(today);
  if (shownToday !== today) {
    setShownToday(today);
    if (date < today) { setDate(today); setTime(null); }
  }
  const [clientIds, setClientIds] = useState<string[]>(existing?.clients.map((item) => item.clientId) ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [newClient, setNewClient] = useState({ name: "", phone: "" });
  const [showNew, setShowNew] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
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

  /** Leave the reschedule without saving: the appointment keeps its original time. Asks first only if something was changed. */
  async function cancelReschedule() {
    if (!existing) return;
    const changed = durationMin !== existing.durationMin || date !== existing.date || time !== existing.time || notes !== existing.notes
      || clientIds.join() !== existing.clients.map((item) => item.clientId).join();
    if (changed && !(await confirm({ title: "Are you sure?", description: `Discard your changes? The appointment stays on ${fromDateKey(existing.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${formatTime(existing.time)}.`, confirmLabel: "Discard changes", cancelLabel: "Keep editing" }))) return;
    store.setHighlightId(existing.id);
    navigate({ to: "/schedule" });
  }

  const times = useMemo(() => availableTimes(date, durationMin, store.appointments.filter((item) => item.id !== edit), store.blockedTimes), [date, durationMin, edit, store.appointments, store.blockedTimes]);
  const nextOpen = useMemo(() => (step === 1 && times.length === 0 ? nextOpenDate(date, durationMin, store.appointments.filter((item) => item.id !== edit), store.blockedTimes) : null), [step, times.length, date, durationMin, edit, store.appointments, store.blockedTimes]);
  // Clients already picked always stay visible; the rest are filtered by the search (name, or phone digits).
  const pickable = useMemo(() => {
    const needle = clientQuery.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const matches = (client: Client) => !needle || client.name.toLowerCase().includes(needle) || (digits.length > 0 && client.phone.replace(/\D/g, "").includes(digits));
    const active = store.clients.filter((client) => !client.archived);
    return [...active.filter((client) => clientIds.includes(client.id)), ...active.filter((client) => !clientIds.includes(client.id) && matches(client)).sort((a, b) => a.name.localeCompare(b.name))];
  }, [store.clients, clientIds, clientQuery]);
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
    const issue = pastStartIssue(date, time) ?? validateAppointment({ date, time, durationMin, ...(edit ? { excludeId: edit } : {}) }, store.appointments, store.blockedTimes);
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
      // Reuse a matching client record by name and phone number; otherwise create one. Nothing about it is shown back.
      const phone = formatPhone(guest.phone);
      const digits = phone.replace(/\D/g, "");
      // Requiring the name too means a typed phone number alone can't attach a booking to someone else.
      const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();
      const match = store.clients.find((client) => !client.archived && client.phone.replace(/\D/g, "") === digits && sameName(client.name, guest.name));
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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Appointment</p>
        <h1 className="mt-1 font-serif text-3xl">{edit ? "Reschedule appointment" : "New appointment"}</h1>
      </div>
      {existing && <Button variant="outline" className="h-11" onClick={cancelReschedule}><X /> Cancel reschedule</Button>}
    </div>
    <ol className="mt-6 grid grid-cols-4 gap-1">{STEPS.map((label, index) => <li key={label} className="min-w-0 text-center"><span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm ${index <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{index < step ? <Check /> : index + 1}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{isPublic && label === "Clients" ? "Your details" : label}</span></li>)}</ol>

    <section className="mt-7 border-y py-6">
      {step === 0 && <div><h2 className="font-serif text-xl">How long?</h2><div className="mt-4 grid grid-cols-3 gap-2">{COMMON_DURATIONS.map((duration) => <Button key={duration} variant={durationMin === duration ? "default" : "outline"} className="h-14 text-base" onClick={() => { setDuration(duration); setTime(null); }}>{formatDuration(duration)}</Button>)}</div><div className="mt-4 flex flex-wrap items-center gap-3"><label className="text-sm text-muted-foreground" htmlFor="other-length">Other length</label><Select value={String(durationMin)} onValueChange={(value) => { setDuration(Number(value)); setTime(null); }}><SelectTrigger id="other-length" className={`h-12 w-44 ${COMMON_DURATIONS.includes(durationMin) ? "" : "border-primary ring-2 ring-primary/30"}`}><SelectValue /></SelectTrigger><SelectContent>{DURATION_OPTIONS.map((duration) => <SelectItem className="h-10" key={duration} value={String(duration)}>{formatDuration(duration)}</SelectItem>)}</SelectContent></Select></div></div>}
      {step === 1 && <div><h2 className="font-serif text-xl">Choose date and time</h2><Input type="date" className="mt-4 h-12 max-w-xs" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime(null); setError(""); }} /><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{times.map((slot) => <Button key={slot} variant={time === slot ? "default" : "outline"} className="h-12" onClick={() => setTime(slot)}>{formatTime(slot)}</Button>)}</div>{times.length === 0 && <div className="mt-5 border border-dashed p-5 text-center text-muted-foreground"><p>No available times on this day for {formatDuration(durationMin)}.</p>{nextOpen ? <Button className="mt-3 h-12" variant="outline" onClick={() => { setDate(nextOpen); setTime(null); setError(""); }}>Next available: {fromDateKey(nextOpen).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} <ArrowRight /></Button> : <p className="mt-2 text-sm">Nothing open in the next 3 months.</p>}</div>}</div>}
      {step === 2 && isPublic && <div><h2 className="font-serif text-xl">Your details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="block text-sm font-medium" htmlFor="guest-name">Full name</label><Input id="guest-name" className="mt-1 h-12" autoComplete="off" value={guest.name} onChange={(event) => { setGuest({ ...guest, name: event.target.value }); setError(""); }} /></div><div><label className="block text-sm font-medium" htmlFor="guest-phone">Phone</label><Input id="guest-phone" className="mt-1 h-12" inputMode="tel" autoComplete="off" placeholder="(555) 555-5555" value={guest.phone} onChange={(event) => { setGuest({ ...guest, phone: formatPhone(event.target.value) }); setError(""); }} /></div></div><label className="mt-5 block text-sm font-medium" htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></label><Textarea id="notes" className="mt-1" maxLength={500} placeholder="e.g. treatment area, special instructions" value={notes} onChange={(event) => { setNotes(event.target.value); setError(""); }} /></div>}
      {step === 2 && !isPublic && <div><div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl">Who is coming?</h2><Button variant="outline" className="h-11" onClick={() => setShowNew((value) => !value)}><UserPlus /> New client</Button></div>{showNew && <div className="mt-4 grid gap-2 border-b pb-4 sm:grid-cols-[1fr_1fr_auto]"><Input className="h-11" placeholder="Full name" value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} /><Input className="h-11" inputMode="tel" placeholder="Phone" value={newClient.phone} onChange={(event) => setNewClient({ ...newClient, phone: formatPhone(event.target.value) })} /><Button className="h-11" onClick={addNewClient}>Save</Button></div>}<Input className="mt-4 h-12 text-base" aria-label="Search clients" placeholder="Search by name or phone" value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} /><div className="mt-3 grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">{pickable.map((client) => { const selected = clientIds.includes(client.id); return <Button key={client.id} variant={selected ? "secondary" : "outline"} className="h-auto min-h-14 justify-between whitespace-normal p-3 text-left" onClick={() => setClientIds((current) => selected ? current.filter((id) => id !== client.id) : [...current, client.id])}><span><span className="block font-medium">{client.name}</span><span className="block text-xs text-muted-foreground">{client.phone}</span></span>{selected && <Check />}</Button>; })}{pickable.length === 0 && <div className="border border-dashed p-4 text-center text-sm text-muted-foreground sm:col-span-2"><p>No clients match “{clientQuery.trim()}”.</p><Button variant="outline" className="mt-2 h-11" onClick={() => { setNewClient({ name: /\d/.test(clientQuery) ? "" : clientQuery.trim(), phone: /\d/.test(clientQuery) ? formatPhone(clientQuery) : "" }); setShowNew(true); }}><UserPlus /> Add as new client</Button></div>}</div><label className="mt-5 block text-sm font-medium" htmlFor="notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></label><Textarea id="notes" className="mt-1" maxLength={500} placeholder="e.g. treatment area, special instructions" value={notes} onChange={(event) => { setNotes(event.target.value); setError(""); }} /></div>}
      {step === 3 && <div><h2 className="font-serif text-xl">Ready to schedule</h2><dl className="mt-4 divide-y border-y"><Summary label="When" value={`${fromDateKey(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${time ? formatTime(time) : ""}`} /><Summary label="Duration" value={formatDuration(durationMin)} /><Summary label={isPublic ? "Name" : "Clients"} value={isPublic ? guest.name : clientIds.map((id) => store.clients.find((client) => client.id === id)?.name).filter(Boolean).join(", ")} /></dl><p className="mt-5 text-sm text-muted-foreground">Appointments cancelled with less than 24 hours’ notice may still be charged.</p></div>}
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
    </section>
    <div className="mt-5 flex justify-between"><Button variant="outline" className="h-11" disabled={step === 0} onClick={() => setStep((current) => current - 1)}><ArrowLeft /> Back</Button>{step < 3 ? <Button className="h-11" disabled={!canContinue} onClick={() => { if (step === 2) { const issue = notesIssue(notes); if (issue) { setError(issue); return; } } setError(""); setStep((current) => current + 1); }}>Continue <ArrowRight /></Button> : <Button className="h-11" onClick={finish}><Check /> {edit ? "Save changes" : "Confirm"}</Button>}</div>
    {confirmDialog}</main>;
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-5 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>; }