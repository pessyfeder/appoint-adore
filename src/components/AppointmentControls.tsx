import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appointmentProgress, PROGRESS_LABEL, type Appointment } from "@/lib/data";
import { useStore } from "@/lib/store";

const STYLES = {
  scheduled: "border-border bg-muted text-muted-foreground",
  in_progress: "border-primary bg-primary text-primary-foreground animate-pulse",
  ended: "border-border bg-secondary text-secondary-foreground",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;

export function StatusBadge({ item }: { item: Appointment }) {
  const progress = appointmentProgress(item);
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[progress]}`}>{PROGRESS_LABEL[progress]}</span>;
}

function clock(iso?: string) {
  return iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

export function StartEndControls({ item }: { item: Appointment }) {
  const { startAppointment, endAppointment } = useStore();
  const progress = appointmentProgress(item);
  if (progress === "scheduled") return <Button className="h-11" onClick={() => startAppointment(item.id)}><Play /> Start</Button>;
  if (progress === "in_progress") return <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Started {clock(item.startedAt)}</span><Button className="h-11" variant="destructive" onClick={() => endAppointment(item.id)}><Square /> End</Button></div>;
  if (item.startedAt && item.endedAt) return <span className="text-xs text-muted-foreground">{clock(item.startedAt)} – {clock(item.endedAt)}</span>;
  return null;
}
