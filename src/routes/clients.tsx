import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CreditCard, Lock, Phone, ReceiptText, UserPlus } from "lucide-react";
import { BillingPanel } from "@/components/BillingPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordPaymentDialog } from "@/components/RecordPaymentDialog";
import { ClientCombobox } from "@/components/ClientCombobox";
import { ClientBillingDialog } from "@/components/ClientBillingDialog";
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
    { title: "Clients & Billing | Lumière Electrolysis" },
    { name: "description", content: "Type a name or phone number to pull up a client, review their balance, and record payments." },
    { property: "og:title", content: "Clients & Billing | Lumière Electrolysis" },
    { property: "og:description", content: "Type a name or phone number to pull up a client, review their balance, and record payments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  validateSearch: (s: Record<string, unknown>): { tab?: "billing" } => (s["tab"] === "billing" ? { tab: "billing" } : {}),
  component: ClientsPage,
});

function ClientsPage() {
  const store = useStore();
  const tab = Route.useSearch().tab === "billing" ? "billing" : "directory";
  const navigate = Route.useNavigate();
  const { verify } = useLock();
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState("");
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "" });
  const [payOpen, setPayOpen] = useState(false);
  const [billingInfoId, setBillingInfoId] = useState<string | null>(null);
  const [pageUnlocked, setPageUnlocked] = useState(false);

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

  /** Verify without waiting for a button press; a match opens the page on its own. */
  function check(value: string) {
    const attempt = ++attemptRef.current;
    setChecking(true);
    void verify(value).then((ok) => {
      if (attempt !== attemptRef.current) return;
      setChecking(false);
      if (ok) {
        setPageUnlocked(true);
        return;
      }
      setPassError("That password doesn’t match.");
    });
  }

  function typePass(value: string) {
    setPass(value);
    setPassError("");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!value) return;
    timerRef.current = window.setTimeout(() => check(value), 400);
  }

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  if (!pageUnlocked) {
    return <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-medium uppercase text-muted-foreground">Practitioner only</p>
      <h1 className="mt-1 font-serif text-3xl">Clients &amp; Billing</h1>
      <form
        className="mt-8 border border-dashed p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (checking || !pass) return;
          if (timerRef.current) window.clearTimeout(timerRef.current);
          check(pass);
        }}
      >
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Client records and billing are private. Enter your password to open this page.</p>
        </div>
        <label className="mt-5 block text-sm font-medium" htmlFor="clients-password">Password</label>
        <Input
          className="mt-1 h-12 max-w-sm"
          id="clients-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={pass}
          onChange={(event) => typePass(event.target.value)}
        />
        {passError && <p className="mt-2 text-sm text-destructive">{passError}</p>}
        {checking && <p className="mt-3 text-xs text-muted-foreground" role="status">Checking…</p>}
      </form>
    </main>;
  }

  return <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-medium uppercase text-muted-foreground">Practitioner only</p>
      <h1 className="mt-1 font-serif text-3xl">Clients &amp; Billing</h1>
    <Tabs value={tab} onValueChange={(v) => navigate({ search: v === "billing" ? { tab: "billing" } : {} })} className="mt-5">
      <TabsList className="h-12"><TabsTrigger className="h-10 px-5" value="directory">Client list</TabsTrigger><TabsTrigger className="h-10 px-5" value="billing">Billing</TabsTrigger></TabsList>
      <TabsContent value="billing"><BillingPanel /></TabsContent>
      <TabsContent value="directory" className="max-w-3xl">
    <div className="mt-2 flex justify-end">
      <Button className="h-11" variant="outline" onClick={() => startNew()}><UserPlus /> New client</Button>
    </div>

    <div className="mt-6">
      <ClientCombobox
        clients={store.clients}
        onNewClient={startNew}
        onSelect={(client) => { setSelectedId(client.id); setCreating(false); }}
      />
      <p className="mt-2 text-xs text-muted-foreground">{store.clients.length} client{store.clients.length === 1 ? "" : "s"} on file</p>
    </div>

    <ul className="mt-4 divide-y border bg-card">
      {store.clients.filter((c) => !c.archived).map((c) => {
        const owed = clientBalance(c.id, store.appointments, store.payments);
        return <li key={c.id} className={`flex items-center gap-2 px-4 py-3 ${selectedId === c.id ? "bg-primary/10" : ""}`}>
          <button
            type="button"
            onClick={() => { setSelectedId(c.id); setCreating(false); }}
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block font-medium">{c.name}</span>
              <span className="block text-xs text-muted-foreground">{c.phone}</span>
            </span>
            <span className="text-right">
              <span className={`block text-sm font-semibold ${owed > 0 ? "text-destructive" : ""}`}>${owed.toFixed(2)}</span>
              <span className="block text-xs text-muted-foreground">balance</span>
            </span>
          </button>
          <Button
            variant="outline"
            className="h-11 shrink-0"
            aria-label={`View billing info for ${c.name}`}
            onClick={() => setBillingInfoId(c.id)}
          ><ReceiptText /> <span className="hidden sm:inline">Billing info</span></Button>
        </li>;
      })}
    </ul>

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
        <div className="text-right">
          <p className={`text-xl font-semibold ${balance > 0 ? "text-destructive" : ""}`}>${balance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">balance</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="h-11" variant="outline" onClick={() => setBillingInfoId(selected.id)}><ReceiptText /> View billing info</Button>
        <Button className="h-11" variant="outline" onClick={() => setPayOpen(true)}><CreditCard /> Record payment</Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{visits} completed visit{visits === 1 ? "" : "s"}</p>
    </article> : <p className="mt-5 border border-dashed p-6 text-center text-sm text-muted-foreground">Start typing above to pull up a client, or create a new one.</p>}

    {selected && <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} clientIds={[selected.id]} />}
    <ClientBillingDialog client={store.clients.find((c) => c.id === billingInfoId) ?? null} onClose={() => setBillingInfoId(null)} />
      </TabsContent>
    </Tabs>
  </main>;
}
