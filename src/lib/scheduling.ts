import { effectiveHours, minutesToTime, timeToMinutes, type Appointment, type BlockedTime } from "./data";

type Candidate = { date: string; time: string; durationMin: number; excludeId?: string };

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function validateAppointment(candidate: Candidate, appointments: Appointment[], blocks: BlockedTime[]): string | null {
  const start = timeToMinutes(candidate.time);
  const end = start + candidate.durationMin;
  const hours = effectiveHours(candidate.date);
  const containing = hours.find((block) => start >= timeToMinutes(block.start) && end <= timeToMinutes(block.end));
  if (!containing) return "This time falls outside business hours.";

  const existing = appointments.filter((item) => item.date === candidate.date && item.id !== candidate.excludeId && item.clients.some((client) => client.status !== "cancelled"));
  if (existing.some((item) => overlaps(start, end, timeToMinutes(item.time), timeToMinutes(item.time) + item.durationMin))) {
    return "This time overlaps another appointment.";
  }
  if (blocks.some((item) => item.date === candidate.date && overlaps(start, end, timeToMinutes(item.startTime), timeToMinutes(item.endTime)))) {
    return "This time is blocked off.";
  }

  const boundaries = [timeToMinutes(containing.start), timeToMinutes(containing.end)];
  for (const item of existing) boundaries.push(timeToMinutes(item.time), timeToMinutes(item.time) + item.durationMin);
  const before = Math.max(...boundaries.filter((value) => value <= start));
  const after = Math.min(...boundaries.filter((value) => value >= end));
  if (start - before > 0 && start - before < 15) return "This start leaves an unusable gap under 15 minutes.";
  if (after - end > 0 && after - end < 15) return "This appointment leaves an unusable gap under 15 minutes.";
  return null;
}

export function availableTimes(date: string, durationMin: number, appointments: Appointment[], blocks: BlockedTime[]): string[] {
  const results: string[] = [];
  for (const block of effectiveHours(date)) {
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);
    for (let minute = start; minute + durationMin <= end; minute += 15) {
      const time = minutesToTime(minute);
      if (!validateAppointment({ date, time, durationMin }, appointments, blocks)) results.push(time);
    }
  }
  return results;
}

export function clientBalance(clientId: string, appointments: Appointment[], payments: { clientId: string; amount: number }[]) {
  const charged = appointments.flatMap((item) => item.clients).filter((item) => item.clientId === clientId).reduce((sum, item) => sum + item.charge, 0);
  const paid = payments.filter((item) => item.clientId === clientId).reduce((sum, item) => sum + item.amount, 0);
  return charged - paid;
}
export const RATE_PER_MINUTE = 2.5;

/** Minutes actually worked between start and end (at least 1). */
export function sessionMinutes(startedAt: string, endedAt: string) {
  return Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));
}

/** Clients still "scheduled" on an appointment whose slot has ended without being started become no-shows, billed for the scheduled length. */
export function applyNoShows(appointments: Appointment[], now: Date = new Date()): Appointment[] | null {
  let changed = false;
  const next = appointments.map((item) => {
    if (item.startedAt) return item;
    const [y, m, d] = item.date.split("-").map(Number);
    const [hh, mm] = item.time.split(":").map(Number);
    const end = new Date(y!, m! - 1, d!, hh!, mm! + item.durationMin);
    if (end > now || !item.clients.some((c) => c.status === "scheduled")) return item;
    changed = true;
    return { ...item, clients: item.clients.map((c) => c.status === "scheduled" ? { ...c, status: "no_show" as const, charge: item.durationMin * RATE_PER_MINUTE } : c) };
  });
  return changed ? next : null;
}
