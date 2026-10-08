import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from "@/components/ConfirmDialog";
import { useStore } from "@/lib/store";

/** Shared payment form; saving asks "Are you sure?" first. `clientIds` limits the client choice (e.g. the clients of a just-ended session). */
export function RecordPaymentDialog({ open, onOpenChange, clientIds, defaultAmount, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; clientIds?: string[] | undefined; defaultAmount?: number | undefined; onSaved?: (() => void) | undefined }) {
  const store = useStore();
  const { confirm, dialog } = useConfirm();
  const options = store.clients.filter((c) => !c.archived && (!clientIds || clientIds.includes(c.id)));
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  // No method is preselected, so every payment's method is chosen on purpose.
  const [method, setMethod] = useState<"cash" | "card" | "check" | "other" | "">("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setClientId(options.length === 1 ? options[0]!.id : "");
    setAmount(defaultAmount ? defaultAmount.toFixed(2) : "");
    setMethod("");
    setNotes("");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!clientId || !method || !(Number(amount) > 0)) return;
    const name = store.clients.find((c) => c.id === clientId)?.name ?? "this client";
    const rounded = Math.round(Number(amount) * 100) / 100;
    if (!(await confirm({ title: "Are you sure?", description: `Record a $${rounded.toFixed(2)} ${method} payment from ${name}?`, confirmLabel: "Save payment", cancelLabel: "Go back" }))) return;
    store.addPayment({ clientId, amount: rounded, method, notes });
    onOpenChange(false);
    onSaved?.();
  }

  return <><Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>Paying ahead builds a credit toward future visits.</DialogDescription></DialogHeader>
    <div className="grid gap-3">
      <Select value={clientId} onValueChange={setClientId}><SelectTrigger className="h-11"><SelectValue placeholder="Choose client" /></SelectTrigger><SelectContent>{options.map((c) => <SelectItem className="h-10" key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      <Input className="h-11" type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}><SelectTrigger className="h-11 capitalize" aria-label="Payment method"><SelectValue placeholder="Choose payment method" /></SelectTrigger><SelectContent>{["cash", "card", "check", "other"].map((m) => <SelectItem className="h-10 capitalize" key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
      <Input className="h-11" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
    </div>
    <DialogFooter><Button className="h-11" disabled={!clientId || !method || !(Number(amount) > 0)} onClick={save}>Save payment</Button></DialogFooter>
  </DialogContent></Dialog>{dialog}</>;
}
