import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CreditCard, Download, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildReport, paymentsCsv } from "@/lib/billing";
import { fromDateKey, toDateKey } from "@/lib/data";
import { useLock } from "@/lib/lock";
import { clientBalance } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [
    { title: "Billing | Lumière Electrolysis" },
    { name: "description", content: "Client balances, payments, and payment reports for the practitioner." },
    { property: "og:title", content: "Billing | Lumière Electrolysis" },
    { property: "og:description", content: "Client balances, payments, and payment reports for the practitioner." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BillingPage,
});

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toFixed(2)}`;

function BillingPage() {
  const { confirmPassphrase } = useLock();
  const [open, setOpen] = useState(false);
  if (!open) return <main className="mx-auto max-w-3xl px-4 py-8">
    <p className="text-xs font-medium uppercase text-muted-foreground">Practitioner only</p>
    <h1 className="mt-1 font-serif text-3xl">Billing</h1>
    <div className="mt-6 flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" />
      <p className="text-muted-foreground">Balances and payments are hidden. Re-enter your password to view them.</p>
      <Button className="h-11" onClick={async () => { if (await confirmPassphrase("Viewing billing and payments")) setOpen(true); }}>Show billing info</Button>
    </div>
  </main>;
  return <BillingContent />;
}

function BillingContent() {
  const store = useStore();
  const { confirmPassphrase } = useLock();
  const [payFor, setPayFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "check" | "other">("cash");
  const [notes, setNotes] = useState("");
  const today = toDateKey(new Date());
  const monthStart = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [reportOpen, setReportOpen] = useState(false);

  const rows = useMemo(() => store.clients.filter((c) => !c.archived).map((client) => ({
    client,
    balance: clientBalance(client.id, store.appointments, store.payments),
    noShows: store.appointments.filter((a) => a.clients.some((c) => c.clientId === client.id && c.status === "no_show")).length,
  })).sort((a, b) => b.balance - a.balance), [store.clients, store.appointments, store.payments]);
  const totalOwed = rows.reduce((s, r) => s + Math.max(0, r.balance), 0);
  const report = useMemo(() => buildReport(from, to, store.appointments, store.payments, store.clients), [from, to, store.appointments, store.payments, store.clients]);
  const recent = [...store.payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt)).slice(0, 8);
  const payClient = store.clients.find((c) => c.id === payFor);

  async function savePayment() {
    if (!payFor || !(Number(amount) > 0)) return;
    if (!(await confirmPassphrase("Recording a payment"))) return;
    store.addPayment({ clientId: payFor, amount: Number(amount), method, notes });
    setPayFor(null); setAmount(""); setNotes("");
  }

  function exportCsv() {
    const blob = new Blob([paymentsCsv(from, to, store.payments, store.clients)], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `payments-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <main className="mx-auto max-w-5xl px-4 py-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-medium uppercase text-muted-foreground">Practitioner only</p><h1 className="mt-1 font-serif text-3xl">Billing</h1></div>
      <div className="rounded-xl border bg-card px-5 py-3 text-right"><p className="text-xs text-muted-foreground">Total owed by clients</p><p className="text-2xl font-semibold text-destructive">{money(totalOwed)}</p></div>
    </div>

    <section className="mt-7 rounded-xl border bg-card p-5">
      <h2 className="font-serif text-xl">Payment report</h2>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">From<Input type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">To<Input type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <Button className="h-11" onClick={() => setReportOpen(true)}><FileText /> View report</Button>
        <Button className="h-11" variant="outline" onClick={exportCsv}><Download /> Export CSV</Button>
      </div>
    </section>

    <section className="mt-7 overflow-hidden rounded-xl border bg-card">
      <h2 className="border-b p-5 font-serif text-xl">Client balances</h2>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Client</th><th className="p-3">Phone</th><th className="p-3 text-right">Balance</th><th className="p-3">Notes</th><th className="p-3" /></tr></thead>
        <tbody className="divide-y">{rows.map(({ client, balance, noShows }) => <tr key={client.id}>
          <td className="p-3 font-medium">{client.name}</td>
          <td className="p-3 text-muted-foreground">{client.phone}</td>
          <td className={`p-3 text-right font-semibold ${balance > 0 ? "text-destructive" : balance < 0 ? "text-status-completed" : ""}`}>{balance < 0 ? `${money(-balance)} credit` : money(balance)}</td>
          <td className="p-3">{noShows > 0 && <span className="rounded-full border border-status-noshow/40 bg-status-noshow/15 px-2 py-0.5 text-[11px] font-medium text-status-noshow">{noShows} no-show{noShows > 1 ? "s" : ""}</span>}</td>
          <td className="p-3 text-right"><Button variant="outline" className="h-10" onClick={() => setPayFor(client.id)}><CreditCard /> Record payment</Button></td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section className="mt-7 overflow-hidden rounded-xl border bg-card">
      <h2 className="border-b p-5 font-serif text-xl">Recent payments</h2>
      {recent.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p> : <ul className="divide-y">{recent.map((p) => <li key={p.id} className="flex justify-between gap-4 p-4 text-sm"><span>{store.clients.find((c) => c.id === p.clientId)?.name} <span className="text-muted-foreground">· {new Date(p.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {p.method}</span></span><span className="font-semibold">{money(p.amount)}</span></li>)}</ul>}
    </section>

    <Dialog open={Boolean(payFor)} onOpenChange={(o) => !o && setPayFor(null)}><DialogContent>
      <DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>Apply a payment to {payClient?.name}’s balance. Paying ahead builds a credit.</DialogDescription></DialogHeader>
      <div className="grid gap-3">
        <Input className="h-11" type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{["cash", "card", "check", "other"].map((m) => <SelectItem className="h-10 capitalize" key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Input className="h-11" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <DialogFooter><Button className="h-11" onClick={savePayment}>Save payment</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Payment report</DialogTitle><DialogDescription>{fromDateKey(from).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – {fromDateKey(to).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</DialogDescription></DialogHeader>
      <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
        {report.rows.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Nothing in this range.</p> : <table className="w-full text-sm"><tbody className="divide-y">{report.rows.map((r, i) => <tr key={i}>
          <td className="p-3 text-muted-foreground">{fromDateKey(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
          <td className="p-3">{r.clientName}</td>
          <td className={`p-3 ${r.unpaid ? "font-bold text-destructive" : "text-muted-foreground"}`}>{r.label}</td>
          <td className={`p-3 text-right ${r.unpaid ? "font-bold text-destructive" : "font-medium"}`}>{money(r.amount)}</td>
        </tr>)}</tbody></table>}
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Collected</p><p className="font-semibold">{money(report.collected)}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Owed (unpaid)</p><p className="font-semibold text-destructive">{money(report.owed)}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Net</p><p className="font-semibold">{money(report.net)}</p></div>
      </div>
    </DialogContent></Dialog>
  </main>;
}
