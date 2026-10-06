import { Play, Square, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appointmentProgress, PROGRESS_LABEL, type Appointment, type AppointmentProgress } from "@/lib/data";
import { useLock } from "@/lib/lock";
import { useStore } from "@/lib/store";

export const STATUS_BADGE: Record<AppointmentProgress, string> = {
  scheduled: "border-status-scheduled/40 bg-status-scheduled/15 text-status-scheduled",
  in_progress: "border-status-progress bg-status-progress text-foreground",
  ended: "border-status-completed/40 bg-status-completed/15 text-status-completed",
  cancelled: "border-status-cancelled/40 bg-status-cancelled/15 text-status-cancelled line-through",
  no_show: "border-status-noshow/40 bg-status-noshow/15 text-status-noshow",
};

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
  const { startAppointment, endAppointment, setClientStatus } = useStore();
  const { confirmPassphrase } = useLock();
  const progress = appointmentProgress(item);
  async function start() { if (await confirmPassphrase("Starting an appointment")) startAppointment(item.id); }
  async function end() { if (await confirmPassphrase("Ending an appointment")) endAppointment(item.id); }
  function noShow() { item.clients.filter((c) => c.status === "scheduled").forEach((c) => setClientStatus(item.id, c.clientId, "no_show")); }
  if (progress === "scheduled") return <div className="flex gap-2"><Button className="h-11" onClick={start}><Play /> Start</Button><Button className="h-11" variant="outline" onClick={noShow}><UserX /> No-show</Button></div>;
  if (progress === "in_progress") return <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Started {clock(item.startedAt)}</span><Button className="h-11" variant="destructive" onClick={end}><Square /> End</Button></div>;
  if (item.startedAt && item.endedAt) return <span className="text-xs text-muted-foreground">{clock(item.startedAt)} – {clock(item.endedAt)}</span>;
  return null;
}
