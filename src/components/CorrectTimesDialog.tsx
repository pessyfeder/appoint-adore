import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DURATION_OPTIONS, formatDuration, formatTime, fromDateKey, isoToTime, timeToISO, type Appointment } from "@/lib/data";
import { RATE_PER_MINUTE, sessionMinutes, validateAppointment } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

type Row = { start: string; end: string };

/** Lets the practitioner fix a start time, an end time, or a booked length entered by mistake. */
export function CorrectTimesDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: Appointment }) {
  const { clients, appointments, blockedTimes, correctTimes } = useStore();
  const timed = item.clients.filter((client) => client.startedAt);
  const [durationMin, setDuration] = useState(item.durationMin);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDuration(item.durationMin);
    setRows(Object.fromEntries(item.clients.filter((client) => client.startedAt).map((client) => [client.clientId, { start: isoToTime(client.startedAt!), end: client.endedAt ? isoToTime(client.endedAt) : "" }])));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const name = (id: string) => clients.find((client) => client.id === id)?.name ?? "Client";
  const setRow = (clientId: string, patch: Partial<Row>) => setRows((current) => ({ ...current, [clientId]: { ...(current[clientId] ?? { start: "", end: "" }), ...patch } }));

  function preview(clientId: string) {
    const row = rows[clientId];
    if (!row?.start || !row.end) return null;
    const minutes = sessionMinutes(timeToISO(item.date, row.start), timeToISO(item.date, row.end));
    return { minutes, amount: minutes * RATE_PER_MINUTE };
  }

  function save() {
    const entries: { clientId: string; startedAt: string; endedAt?: string }[] = [];
    for (const client of timed) {
      const row = rows[client.clientId] ?? { start: "", end: "" };
      if (!row.start) return setError(`${name(client.clientId)} needs a start time.`);
      if (client.endedAt && !row.end) return setError(`${name(client.clientId)} already finished — keep or correct the end time.`);
      if (row.end && row.end <= row.start) return setError(`${name(client.clientId)}: the end time must be after the start time.`);
      const entry = { clientId: client.clientId, startedAt: timeToISO(item.date, row.start) };
      if (row.end) entries.push({ ...entry, endedAt: timeToISO(item.date, row.end) });
      else entries.push(entry);
    }
    if (durationMin !== item.durationMin) {
      const issue = validateAppointment({ date: item.date, time: item.time, durationMin, excludeId: item.id }, appointments, blockedTimes);
      if (issue) return setError(issue);
    }
    correctTimes(item.id, { durationMin, clients: entries });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Correct times</DialogTitle>
          <DialogDescription>Fix a start, an end, or a booked length entered by mistake. Charges follow the corrected times.</DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{fromDateKey(item.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · booked at {formatTime(item.time)}</p>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="correct-duration">Booked length</label>
          <Select value={String(durationMin)} onValueChange={(value) => setDuration(Number(value))}>
            <SelectTrigger id="correct-duration" className="h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{DURATION_OPTIONS.map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{formatDuration(minutes)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
          {timed.map((client) => {
            const row = rows[client.clientId] ?? { start: "", end: "" };
            const running = Boolean(client.startedAt && !client.endedAt);
            const shown = preview(client.clientId);
            return (
              <div key={client.clientId} className="rounded-lg border p-3">
                <p className="font-medium">{name(client.clientId)}</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-xs text-muted-foreground">Start<Input type="time" step={60} className="h-11" value={row.start} onChange={(event) => setRow(client.clientId, { start: event.target.value })} /></label>
                  <label className="grid gap-1 text-xs text-muted-foreground">End<Input type="time" step={60} className="h-11" value={row.end} disabled={running} onChange={(event) => setRow(client.clientId, { end: event.target.value })} /></label>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{running ? "Still running — end the session to record an end time." : shown ? `${formatDuration(shown.minutes)} · $${shown.amount.toFixed(2)}` : "Add an end time to see the charge."}</p>
              </div>
            );
          })}
        </div>
        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <DialogFooter className="flex-wrap gap-2">
          <Button className="h-11" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-11" onClick={save}>Save corrections</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
