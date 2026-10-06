import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Lock, Phone, UserPlus } from "lucide-react";
import { ClientCombobox } from "@/components/ClientCombobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPhone } from "@/lib/data";
import { useLock } from "@/lib/lock";
import { clientBalance } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

const PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}$/;

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [
    { title: "Clients | Lumière Electrolysis" },
    { name: "description", content: "Type a name or phone number to pull up a client, review their balance, and record payments." },
    { property: "og:title", content: "Clients | Lumière Electrolysis" },
    { property: "og:description", content: "Type a name or phone number to pull up a client, review their balance, and record payments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ClientsPage,
});

function ClientsPage() {
  const store = useStore();
  const { confirmPassphrase } = useLock();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [billingFor, setBillingFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "check" | "other">("card");

  const selected = store.clients.find((client) => client.id === selectedId) ?? null;
  const balance = selected ? clientBalance(selected.id, store.appointments, store.payments) : 0;
  const visits = selected
    ? store.appointments.flatMap((item) => item.clients).filter((entry) => entry.clientId === selected.id && entry.status === "completed").length
    : 0;
  const canSave = draft.name.trim().length > 0 && PHONE_PATTERN.test(draft.phone);

  function startNew(name = "") {
    setDraft({ name, phone: "" });
    setCreating(true);
  }

  function saveClient() {
    if (!canSave) return;
    const client = store.addClient({ name: draft.name.trim(), phone: draft.phone });
    setSelectedId(client.id);
    setCreating(false);
    setDraft({ name: "", phone: "" });
  }

  async function showBilling() {
    if (!selected) return;
    if (await confirmPassphrase("Viewing billing and payments")) setBillingFor(selected.id);
  }

  async function savePayment() {
    if (!selected || Number(amount) <= 0) return;
    if (!(await confirmPassphrase("Recording a payment"))) return;
    store.addPayment({ clientId: selected.id, amount: Number(amount), method, notes: "" });
    setPaymentOpen(false);
    setAmount("");
  }

  return <main className="mx-auto max-w-3xl px-4 py-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Directory</p>
        <h1 className="mt-1 font-serif text-3xl">Clients</h1>
      </div>
      <Button className="h-11" variant="outline" onClick={() => startNew()}><UserPlus /> New client</Button>
    </div>

    <div className="mt-6">
      <ClientCombobox
        clients={store.clients}
        onNewClient={startNew}
        onSelect={(client) => { setSelectedId(client.id); setCreating(false); setBillingFor(null); }}
      />
      <p className="mt-2 text-xs text-muted-foreground">{store.clients.length} client{store.clients.length === 1 ? "" : "s"} on file</p>
    </div>

    {creating && <div className="mt-4 grid gap-2 border bg-card p-4 sm:grid-cols-[1fr_1fr_auto]">
      <Input className="h-11" placeholder="Full name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
      <Input className="h-11" inputMode="tel" placeholder="Phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: formatPhone(event.target.value) }))} />
      <div className="flex gap-2">
        <Button className="h-11" disabled={!canSave} onClick={saveClient}>Save</Button>
        <Button className="h-11" variant="ghost" onClick={() => { setCreating(false); setDraft({ name: "", phone: "" }); }}>Cancel</Button>
      </div>
    </div>}

    {selected ? <article className="mt-5 border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">{selected.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" /> {selected.phone}</p>
        </div>
        {billingFor === selected.id ? <div className="text-right">
          <p className={`text-xl font-semibold ${balance > 0 ? "text-destructive" : ""}`}>${balance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">balance</p>
        </div> : <Button variant="outline" className="h-11" onClick={showBilling}><Lock /> Show billing</Button>}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{visits} completed visit{visits === 1 ? "" : "s"}</p>
      {billingFor === selected.id && <Button className="mt-5 h-11 w-full sm:w-auto" onClick={() => setPaymentOpen(true)}><CreditCard /> Record payment</Button>}
    </article> : <p className="mt-5 border border-dashed p-6 text-center text-sm text-muted-foreground">Start typing above to pull up a client, or create a new one.</p>}

    <Dialog open={paymentOpen && Boolean(selected)} onOpenChange={(open) => !open && setPaymentOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>Apply a payment to {selected?.name}’s balance.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input className="h-11" type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <Select value={method} onValueChange={(value) => setMethod(value as typeof method)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{["card", "cash", "check", "other"].map((item) => <SelectItem className="h-10 capitalize" key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={savePayment}>Save payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
