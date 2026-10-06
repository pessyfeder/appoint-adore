import type { Appointment, Client, Payment } from "./data";
import { toDateKey } from "./data";

export type Priority = "high" | "medium" | "low";

export type CollectionItem = {
  client: Client;
  balance: number;
  oldestUnpaidDays: number;
  lastPaidDays: number | null;
  noShows: number;
  nextVisit: string | null;
  priority: Priority;
  score: number;
  reasons: string[];
  action: string;
};

const DAY = 86_400_000;

/** Offline ranking of clients who owe money. Payments are applied to the oldest charges first. */
export function collectionPriorities(clients: Client[], appointments: Appointment[], payments: Payment[], now = new Date()): CollectionItem[] {
  const todayKey = toDateKey(now);
  const items: CollectionItem[] = [];
  for (const client of clients.filter((c) => !c.archived)) {
    const charges = appointments
      .flatMap((a) => a.clients.filter((c) => c.clientId === client.id && c.charge > 0).map((c) => ({ date: a.date, amount: c.charge, noShow: c.status === "no_show" })))
      .sort((a, b) => a.date.localeCompare(b.date));
    const mine = payments.filter((p) => p.clientId === client.id);
    let paid = mine.reduce((s, p) => s + p.amount, 0);
    const charged = charges.reduce((s, c) => s + c.amount, 0);
    const balance = Math.round((charged - paid) * 100) / 100;
    if (balance <= 0.004) continue;

    let oldest: string | null = null;
    for (const c of charges) {
      if (paid >= c.amount) { paid -= c.amount; continue; }
      oldest = c.date; break;
    }
    const oldestUnpaidDays = oldest ? Math.max(0, Math.floor((now.getTime() - new Date(`${oldest}T12:00:00`).getTime()) / DAY)) : 0;
    const last = mine.map((p) => p.paidAt).sort().pop();
    const lastPaidDays = last ? Math.floor((now.getTime() - new Date(last).getTime()) / DAY) : null;
    const noShows = charges.filter((c) => c.noShow).length;
    const nextVisit = appointments
      .filter((a) => a.date >= todayKey && a.clients.some((c) => c.clientId === client.id && c.status === "scheduled"))
      .map((a) => a.date).sort()[0] ?? null;

    const reasons: string[] = [`Owes $${balance.toFixed(2)}`];
    if (oldestUnpaidDays >= 1) reasons.push(`oldest unpaid charge ${oldestUnpaidDays} day${oldestUnpaidDays === 1 ? "" : "s"} old`);
    reasons.push(lastPaidDays === null ? "has never paid" : `last paid ${lastPaidDays} day${lastPaidDays === 1 ? "" : "s"} ago`);
    if (noShows) reasons.push(`${noShows} no-show${noShows > 1 ? "s" : ""}`);

    const score = balance * (1 + oldestUnpaidDays / 30) + noShows * 25 + (lastPaidDays === null ? 15 : 0);
    const priority: Priority = balance >= 100 || oldestUnpaidDays >= 30 || noShows >= 2 ? "high" : balance >= 50 || oldestUnpaidDays >= 14 || noShows >= 1 ? "medium" : "low";

    const visitLabel = nextVisit ? new Date(`${nextVisit}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
    let action: string;
    if (nextVisit && nextVisit === todayKey) action = "Collect at today's visit.";
    else if (priority === "high" && visitLabel) action = `Call before the ${visitLabel} visit and ask for payment at check-in.`;
    else if (priority === "high") action = "Call now — no visit booked to collect in person.";
    else if (visitLabel) action = `Collect at the next visit (${visitLabel}).`;
    else action = "Mention the balance when they next book.";

    items.push({ client, balance, oldestUnpaidDays, lastPaidDays, noShows, nextVisit, priority, score, reasons, action });
  }
  return items.sort((a, b) => b.score - a.score);
}
