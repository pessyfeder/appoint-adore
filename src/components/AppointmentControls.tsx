import { useState } from "react";
import { CreditCard, Play, Square } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { clientInSession, formatDuration, appointmentProgress, PROGRESS_LABEL, type Appointment, type AppointmentProgress } from "@/lib/data";
import { useLock } from "@/lib/lock";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { useStore, type EndSummary } from "@/lib/store";

export const STATUS_BADGE: Record<AppointmentProgress, string> = {
  scheduled: "border-status-scheduled/40 bg-status-scheduled/15 text-status-scheduled",
  in_progress: "border-status-progress bg-status-progress text-foreground",
  ended: "border-status-completed/40 bg-status-completed/15 text-status-completed",
  cancelled: "border-status-cancelled/40 bg-status-cancelled/15 text-status-cancelled line-through",
  no_show: "border-status-noshow/40 bg-status-noshow/15 text-status-noshow",
};

export const CLIENT_BADGE = { scheduled: STATUS_BADGE.scheduled, completed: STATUS_BADGE.ended, cancelled: STATUS_BADGE.cancelled, no_show: STATUS_BADGE.no_show } as const;
export const CLIENT_LABEL = { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled", no_show: "No-show" } as const;

/** Left accent + tint for calendar cards. */
export const STATUS_CARD: Record<AppointmentProgress, string> = {
  scheduled: "border-l-4 border-l-status-scheduled bg-status-scheduled/5",
  in_progress: "border-l-4 border-l-status-progress bg-status-progress/15",
  ended: "border-l-4 border-l-status-completed bg-status-completed/5",
  cancelled: "border-l-4 border-l-status-cancelled bg-status-cancelled/10 opacity-70",
  no_show: "border-l-4 border-l-status-noshow bg-status-noshow/5",
};

export function StatusBadge({ item }: { item: Appointment }) {
  const progress = appointmentProgress(item);
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[progress]}`}>{PROGRESS_LABEL[progress]}</span>;
}

function clock(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

export function StartEndControls({ item }: { item: Appointment }) {
  const { startClient, endClient, clients, appointments } = useStore();
  const busyElsewhere = appointments.some((a) => a.id !== item.id && a.clients.some(clientInSession));
  const { confirmPassphrase } = useLock();
  const [summary, setSummary] = useState<EndSummary | null>(null);
  const [paying, setPaying] = useState<EndSummary | null>(null);
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? "Client";
  const first = (id: string) => name(id).split(" ")[0];
  const running = item.clients.find(clientInSession);
  const waiting = item.clients.find((c) => c.status === "scheduled" && !c.startedAt);
  const shared = item.clients.length > 1;
  async function start(clientId: string) { if (await confirmPassphrase(`Starting ${name(clientId)}'s session`)) startClient(item.id, clientId); }
  function end() { setSummary(endClient(item.id)); }
  const popup = <Dialog open={Boolean(summary)} onOpenChange={(open) => !open && setSummary(null)}>
    <DialogContent>{summary && <>
      <DialogHeader><DialogTitle className="font-serif text-2xl">Session complete</DialogTitle><DialogDescription>Billed for actual time worked.</DialogDescription></DialogHeader>
      <div className="divide-y rounded-lg border">
        <div className="flex justify-between p-4"><span className="text-muted-foreground">Client</span><span className="font-semibold">{name(summary.clientId)}</span></div>
        <div className="flex justify-between p-4"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{formatDuration(summary.minutes)}</span></div>
        <div className="flex justify-between p-4"><span className="text-muted-foreground">Amount owed</span><span className="text-lg font-semibold">${summary.amount.toFixed(2)}</span></div>
      </div>
      {summary.nextClientId && <p className="rounded-lg bg-muted p-3 text-sm">{name(summary.nextClientId)} is still waiting on this appointment.</p>}
      <DialogFooter className="flex-wrap gap-2">
        <Button className="h-11" variant="outline" onClick={() => setSummary(null)}>Done</Button>
        <Button className="h-11" variant="outline" onClick={() => { setPaying(summary); setSummary(null); }}><CreditCard /> Record payment</Button>
        {summary.nextClientId && <Button className="h-11" onClick={() => { const next = summary.nextClientId!; setSummary(null); void start(next); }}><Play /> Start {first(summary.nextClientId)}</Button>}
      </DialogFooter>
    </>}</DialogContent>
  </Dialog>;
  const payment = <RecordPaymentDialog open={Boolean(paying)} onOpenChange={(o: boolean) => { if (!o) setPaying(null); }} clientIds={paying ? [paying.clientId] : undefined} defaultAmount={paying?.amount} />;
  let control = null;
  if (running) control = <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{shared ? `${first(running.clientId)} · ` : ""}started {clock(running.startedAt)}</span><Button className="h-11" variant="destructive" onClick={end}><Square /> End{shared ? ` ${first(running.clientId)}` : ""}</Button></div>;
  else if (waiting && busyElsewhere) control = <span className="text-xs text-muted-foreground">Another session is running</span>;
  else if (waiting) control = <Button className="h-11" onClick={() => start(waiting.clientId)}><Play /> Start{shared ? ` ${first(waiting.clientId)}` : ""}</Button>;
  else if (item.startedAt && item.endedAt) control = <span className="text-xs text-muted-foreground">{clock(item.startedAt)} – {clock(item.endedAt)}</span>;
  return <>{control}{popup}{payment}</>;
}
