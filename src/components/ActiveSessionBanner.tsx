import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { StartEndControls } from "@/components/AppointmentControls";
import { clientInSession } from "@/lib/data";
import { useStore } from "@/lib/store";

/**
 * Persistent strip shown on every page while a session is running.
 * `isPublic` hides every client detail and control (public Book screen).
 */
export function ActiveSessionBanner({ isPublic = false }: { isPublic?: boolean }) {
  const { appointments, clients } = useStore();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  const item = appointments.find((a) => a.clients.some(clientInSession));
  const running = item?.clients.find(clientInSession);
  if (!item || !running?.startedAt) return null;
  const secs = Math.max(0, Math.floor((now - new Date(running.startedAt).getTime()) / 1000));
  const elapsed = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return <div role="status" className="sticky top-16 z-10 border-b border-status-progress bg-status-progress/20 backdrop-blur">
    <div className="mx-auto flex min-h-11 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2">
      {isPublic
        ? <p className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4 animate-pulse" /><span className="font-semibold">Active session in progress</span></p>
        : <>
          <p className="flex items-center gap-2 text-sm"><Timer className="h-4 w-4 animate-pulse" /><span className="font-semibold">Session in progress</span> · {clients.find((c) => c.id === running.clientId)?.name} · <span className="font-mono tabular-nums">{elapsed}</span></p>
          <StartEndControls item={item} />
        </>}
    </div>
  </div>;
}
