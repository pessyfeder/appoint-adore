import { appointmentStart, clientInSession, effectiveHours, formatTime, minutesToTime, timeToMinutes, type Appointment, type AppointmentClient, type BlockedTime } from "./data";

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

/** New bookings and reschedules can't start at a time that has already passed. */
export function pastStartIssue(date: string, time: string, now: Date = new Date()): string | null {
  return appointmentStart({ date, time }) <= now ? "That time has already passed. Choose a later time." : null;
}

export function availableTimes(date: string, durationMin: number, appointments: Appointment[], blocks: BlockedTime[], now: Date = new Date()): string[] {
  const results: string[] = [];
  for (const block of effectiveHours(date)) {
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);
    for (let minute = start; minute + durationMin <= end; minute += 15) {
      const time = minutesToTime(minute);
      if (!pastStartIssue(date, time, now) && !validateAppointment({ date, time, durationMin }, appointments, blocks)) results.push(time);
    }
  }
  return results;
}

/** Blocked time may not sit on top of a booked appointment; returns the reason it can't be saved. */
export function blockedTimeIssue(block: Omit<BlockedTime, "id">, appointments: Appointment[]): string | null {
  if (!block.reason.trim()) return "Please add a short reason.";
  if (block.endTime <= block.startTime) return "The end time must be after the start time.";
  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);
  const clash = appointments.find((item) => item.date === block.date
    && item.clients.some((client) => client.status === "scheduled" || clientInSession(client))
    && overlaps(start, end, timeToMinutes(item.time), timeToMinutes(item.time) + item.durationMin));
  return clash ? `This overlaps a booked appointment at ${formatTime(clash.time)}. Reschedule or cancel it first.` : null;
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

/** No-shows are billed for the full booked length. */
export function noShowCharge(item: Pick<Appointment, "durationMin">) {
  return item.durationMin * RATE_PER_MINUTE;
}

/** The practitioner may mark a waiting client as a no-show once the booked start time has passed. */
export function canMarkNoShow(item: Appointment, client: AppointmentClient, now: Date = new Date()) {
  return client.status === "scheduled" && !client.startedAt && appointmentStart(item) <= now;
}
