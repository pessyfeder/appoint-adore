import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientBalance } from "@/lib/scheduling";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [
    { title: "Clients | Lumière Electrolysis" },
    { name: "description", content: "Search clients, review balances, and record payments." },
    { property: "og:title", content: "Clients | Lumière Electrolysis" },
    { property: "og:description", content: "Search clients, review balances, and record payments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ClientsPage,
});

function ClientsPage() {
  const store = useStore();
  const [query, setQuery] = useState("");
  const [paymentClient, setPaymentClient] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "card" | "check" | "other">("card");
  const filtered = store.clients.filter((client) => `${client.name} ${client.phone}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="mx-auto max-w-6xl px-4 py-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase text-muted-foreground">Directory</p><h1 className="mt-1 font-serif text-3xl">Clients</h1></div><div className="relative"><Search className="absolute left-3 top-3.5 text-muted-foreground" /><Input className="h-11 w-72 pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or phone" /></div></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((client) => { const balance = clientBalance(client.id, store.appointments, store.payments); const visits = store.appointments.flatMap((item) => item.clients).filter((entry) => entry.clientId === client.id && entry.status === "completed").length; return <article key={client.id} className="border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-xl">{client.name}</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone /> {client.phone}</p></div><div className="text-right"><p className={`font-semibold ${balance > 0 ? "text-destructive" : ""}`}>${balance.toFixed(2)}</p><p className="text-xs text-muted-foreground">balance</p></div></div><p className="mt-5 text-sm text-muted-foreground">{visits} completed visit{visits === 1 ? "" : "s"}</p><Button variant="outline" className="mt-4 h-11 w-full" onClick={() => setPaymentClient(client.id)}><CreditCard /> Record payment</Button></article>; })}</div>
    <Dialog open={Boolean(paymentClient)} onOpenChange={(open) => !open && setPaymentClient(null)}><DialogContent><DialogHeader><DialogTitle>Record payment</DialogTitle><DialogDescription>Apply a payment to this client’s balance.</DialogDescription></DialogHeader><div className="grid gap-3"><Input className="h-11" type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} /><Select value={method} onValueChange={(value) => setMethod(value as typeof method)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{["card", "cash", "check", "other"].map((item) => <SelectItem key={item} value={item} className="h-10 capitalize">{item}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button onClick={() => { if (paymentClient && Number(amount) > 0) { store.addPayment({ clientId: paymentClient, amount: Number(amount), method, notes: "" }); setPaymentClient(null); setAmount(""); } }}>Save payment</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}