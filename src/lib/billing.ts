import { paymentDateKey, type Appointment, type Client, type Payment } from "./data";

export type Charge = { appointmentId: string; clientId: string; date: string; amount: number; kind: "completed" | "no_show"; unpaid: number };

/** Every charge per client, with payments applied oldest-first to work out what is still unpaid. */
export function chargesWithUnpaid(appointments: Appointment[], payments: Payment[]): Charge[] {
  const charges: Charge[] = appointments.flatMap((item) => item.clients
    .filter((c) => (c.status === "completed" || c.status === "no_show") && c.charge > 0)
    .map((c) => ({ appointmentId: item.id, clientId: c.clientId, date: item.date, amount: c.charge, kind: c.status as Charge["kind"], unpaid: c.charge })))
    .sort((a, b) => a.date.localeCompare(b.date));
  const paid = new Map<string, number>();
  for (const p of payments) paid.set(p.clientId, (paid.get(p.clientId) ?? 0) + p.amount);
  for (const charge of charges) {
    const left = paid.get(charge.clientId) ?? 0;
    const applied = Math.min(left, charge.amount);
    charge.unpaid = charge.amount - applied;
    paid.set(charge.clientId, left - applied);
  }
  return charges;
}

export type LedgerRow = { date: string; clientName: string; label: string; amount: number; unpaid: boolean; paymentId?: string; appointmentId?: string; clientId: string };

export function buildReport(from: string, to: string, appointments: Appointment[], payments: Payment[], clients: Client[]) {
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? "Unknown";
  const rows: LedgerRow[] = [];
  for (const p of payments) {
    const date = paymentDateKey(p.paidAt);
    if (date >= from && date <= to) rows.push({ date, clientName: name(p.clientId), label: `Payment (${p.method})`, amount: p.amount, unpaid: false, paymentId: p.id, clientId: p.clientId });
  }
  for (const c of chargesWithUnpaid(appointments, payments)) {
    if (c.unpaid > 0.004 && c.date <= to) rows.push({ date: c.date, clientName: name(c.clientId), label: c.kind === "no_show" ? "No Show" : "Unpaid", amount: -c.unpaid, unpaid: true, appointmentId: c.appointmentId, clientId: c.clientId });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const collected = rows.filter((r) => !r.unpaid).reduce((s, r) => s + r.amount, 0);
  const owed = rows.filter((r) => r.unpaid).reduce((s, r) => s - r.amount, 0);
  return { rows, collected, owed, net: collected - owed };
}

export function paymentsCsv(from: string, to: string, payments: Payment[], clients: Client[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = ["Date,Client,Amount,Method,Notes"];
  for (const p of [...payments].sort((a, b) => a.paidAt.localeCompare(b.paidAt))) {
    const date = paymentDateKey(p.paidAt);
    if (date < from || date > to) continue;
    lines.push([date, esc(clients.find((c) => c.id === p.clientId)?.name ?? ""), p.amount.toFixed(2), p.method, esc(p.notes)].join(","));
  }
  return lines.join("\n");
}
