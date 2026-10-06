import { useState } from "react";
import { Play, Square } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDuration, appointmentProgress, PROGRESS_LABEL, type Appointment, type AppointmentProgress } from "@/lib/data";
import { useLock } from "@/lib/lock";
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
  const { startAppointment, endAppointment, clients } = useStore();
  const { confirmPassphrase } = useLock();
  const [summary, setSummary] = useState<EndSummary | null>(null);
  const progress = appointmentProgress(item);
  async function start() { if (await confirmPassphrase("Starting an appointment")) startAppointment(item.id); }
  function end() { setSummary(endAppointment(item.id)); }
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? "Client";
  const popup = <Dialog open={Boolean(summary)} onOpenChange={(open) => !open && setSummary(null)}>
    <DialogContent>{summary && <>
      <DialogHeader><DialogTitle className="font-serif text-2xl">Session complete</DialogTitle><DialogDescription>Billed for actual time worked.</DialogDescription></DialogHeader>
      <div className="divide-y rounded-lg border">
        <div className="flex justify-between p-4"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{formatDuration(summary.minutes)}</span></div>
        {summary.lines.map((line) => <div key={line.clientId} className="flex justify-between p-4"><span>{name(line.clientId)}</span><span className="text-lg font-semibold">${line.amount.toFixed(2)} owed</span></div>)}
      </div>
      <DialogFooter><Button className="h-11" onClick={() => setSummary(null)}>Done</Button></DialogFooter>
    </>}</DialogContent>
  </Dialog>;
  let control = null;
  if (progress === "scheduled") control = <Button className="h-11" onClick={start}><Play /> Start</Button>;
  else if (progress === "in_progress") control = <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Started {clock(item.startedAt)}</span><Button className="h-11" variant="destructive" onClick={end}><Square /> End</Button></div>;
  else if (item.startedAt && item.endedAt) control = <span className="text-xs text-muted-foreground">{clock(item.startedAt)} – {clock(item.endedAt)}</span>;
  return <>{control}{popup}</>;
}
