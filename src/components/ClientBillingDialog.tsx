import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fromDateKey, formatDurationLong, paymentDateKey, formatTime, statusLabel, type Client } from "@/lib/data";
import { clientBalance } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

const STATUS_STYLE: Record<string, string> = {
  scheduled: "border-status-scheduled/40 bg-status-scheduled/15 text-status-scheduled",
  completed: "border-status-completed/40 bg-status-completed/15 text-status-completed",
  no_show: "border-status-noshow/40 bg-status-noshow/15 text-status-noshow",
  cancelled: "border-status-cancelled/40 bg-status-cancelled/15 text-status-cancelled",
};

/** Full billing picture for one client: every appointment charge, every payment, and the running balance. */
export function ClientBillingDialog({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const store = useStore();
  const [payOpen, setPayOpen] = useState(false);

  const data = useMemo(() => {
    if (!client) return null;
    const entries = store.appointments
      .flatMap((a) => a.clients
        .filter((c) => c.clientId === client.id)
        .map((c) => ({
          id: `${a.id}-${c.clientId}`,
          date: a.date,
          time: a.time,
          durationMin: a.durationMin,
          status: c.status,
          charge: c.charge,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
        })))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const payments = store.payments
      .filter((p) => p.clientId === client.id)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
    const charged = entries.filter((e) => e.status === "completed" || e.status === "no_show").reduce((sum, e) => sum + e.charge, 0);
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    return { entries, payments, charged, paid, balance: clientBalance(client.id, store.appointments, store.payments) };
  }, [client, store.appointments, store.payments]);

  if (!client || !data) return null;

  return <>
  <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{client.name} — billing info</DialogTitle>
        <DialogDescription>{client.phone}</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Charged</p><p className="font-semibold">{money(data.charged)}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold">{money(data.paid)}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{data.balance < 0 ? "Credit" : "Balance"}</p><p className={`font-semibold ${data.balance > 0 ? "text-destructive" : data.balance < 0 ? "text-status-completed" : ""}`}>{money(data.balance)}</p></div>
      </div>

      <h3 className="mt-2 font-serif text-lg">Appointments</h3>
      <div className="max-h-[30vh] overflow-y-auto rounded-lg border">
        {data.entries.length === 0 ? <p className="p-5 text-center text-sm text-muted-foreground">No appointments yet.</p> : <ul className="divide-y">{data.entries.map((e) => <li key={e.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
          <span className="text-muted-foreground">{fromDateKey(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {formatTime(e.time)}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[e.status]}`}>{statusLabel(e.status)}</span>
          {e.startedAt && e.endedAt && <span className="text-xs text-muted-foreground">{formatDurationLong(Math.round((new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime()) / 60000))}</span>}
          <span className="ml-auto font-medium">{(e.status === "completed" || e.status === "no_show") ? money(e.charge) : e.status === "scheduled" ? `booked ${formatDurationLong(e.durationMin)}` : "—"}</span>
        </li>)}</ul>}
      </div>

      <h3 className="mt-2 font-serif text-lg">Payments</h3>
      <div className="max-h-[25vh] overflow-y-auto rounded-lg border">
        {data.payments.length === 0 ? <p className="p-5 text-center text-sm text-muted-foreground">No payments recorded.</p> : <ul className="divide-y">{data.payments.map((p) => <li key={p.id} className="flex items-center gap-3 p-3 text-sm">
          <span className="text-muted-foreground">{fromDateKey(paymentDateKey(p.paidAt)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          <span className="capitalize">{p.method}</span>
          {p.notes && <span className="truncate text-xs text-muted-foreground">{p.notes}</span>}
          <span className="ml-auto font-medium">{money(p.amount)}</span>
        </li>)}</ul>}
      </div>
      <DialogFooter>
        <Button className="h-11" onClick={() => setPayOpen(true)}><CreditCard /> Record payment</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} clientIds={[client.id]} />
  </>;
}
