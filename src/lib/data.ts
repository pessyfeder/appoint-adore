import { DEFAULT_WEEKLY, getAvailability } from "./availability";

export type Client = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  archived: boolean;
};

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export type AppointmentClient = {
  clientId: string;
  status: AppointmentStatus;
  charge: number;
  startedAt?: string;
  endedAt?: string;
};

export const clientInSession = (c: AppointmentClient) => Boolean(c.startedAt && !c.endedAt);

export type Appointment = {
  id: string;
  startedAt?: string;
  endedAt?: string;
  date: string;
  time: string;
  durationMin: number;
  clients: AppointmentClient[];
  notes: string;
};

export type Payment = {
  id: string;
  clientId: string;
  amount: number;
  method: "cash" | "card" | "check" | "other";
  paidAt: string;
  notes: string;
};

export type BlockedTime = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export type BusinessBlock = { start: string; end: string };

export const BUSINESS_HOURS = DEFAULT_WEEKLY;

export const DURATION_OPTIONS = Array.from({ length: 34 }, (_, i) => 15 + i * 5);

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Local "HH:MM" for a stored ISO timestamp, ready for a time input. */
export function isoToTime(iso: string): string {
  const date = new Date(iso);
  return minutesToTime(date.getHours() * 60 + date.getMinutes());
}

/** ISO timestamp for a time typed against an appointment date (local time). */
export function timeToISO(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00`).toISOString();
}

export function formatTime(time: string): string {
  const total = timeToMinutes(time);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} hr${hours === 1 ? "" : "s"}${remainder ? ` ${remainder} min` : ""}`;
}

/** Spelled-out duration for the "Actual duration" readout, e.g. "1 minute", "1 hour 10 minutes". */
export function formatDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const h = `${hours} hour${hours === 1 ? "" : "s"}`;
  return remainder ? `${h} ${formatDurationLong(remainder)}` : h;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function effectiveHours(dateKey: string): BusinessBlock[] {
  const { weekly, overrides } = getAvailability();
  if (overrides[dateKey]) return overrides[dateKey]!;
  return weekly[fromDateKey(dateKey).getDay()] ?? [];
}

export function statusLabel(status: AppointmentStatus): string {
  return status === "no_show" ? "No-show" : status.charAt(0).toUpperCase() + status.slice(1);
}

/** A brand-new install starts with no records: the practitioner adds their own clients and appointments. */
export function emptyData() {
  return { clients: [] as Client[], appointments: [] as Appointment[], payments: [] as Payment[], blockedTimes: [] as BlockedTime[] };
}

/** Local calendar day a payment was recorded on. Older records stored a bare "YYYY-MM-DD". */
export function paymentDateKey(paidAt: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(paidAt) ? paidAt : toDateKey(new Date(paidAt));
}

/** Moves a payment to another local day, keeping the time of day it was recorded (midday for old date-only records). */
export function movePaidAt(paidAt: string, dateKey: string): string {
  if (paymentDateKey(paidAt) === dateKey) return paidAt;
  const time = /^\d{4}-\d{2}-\d{2}$/.test(paidAt) ? "12:00" : isoToTime(paidAt);
  return timeToISO(dateKey, time);
}

/** Local start of an appointment's booked slot. */
export function appointmentStart(item: Pick<Appointment, "date" | "time">): Date {
  return new Date(`${item.date}T${item.time}:00`);
}
/** Returns an error message when free-text notes look like gibberish; blank notes are allowed. */
export function notesIssue(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const message = "Please enter clear notes or leave the field blank.";
  const visible = text.replace(/\s/g, "");
  const letters = visible.match(/[a-z]/gi)?.length ?? 0;
  if (letters < 2 || letters / visible.length < 0.5) return message;
  if (/(.)\1{3,}/i.test(visible)) return message;
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  for (const word of words) {
    if (word.length > 20) return message;
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(word)) return message;
    if (word.length >= 4 && !/[aeiouy]/.test(word)) return message;
  }
  return null;
}

export type AppointmentProgress = "scheduled" | "in_progress" | "ended" | "cancelled" | "no_show";

export function appointmentProgress(item: Appointment): AppointmentProgress {
  if (item.clients.some(clientInSession)) return "in_progress";
  const waiting = item.clients.some((c) => c.status === "scheduled");
  if (waiting) return item.startedAt ? "in_progress" : "scheduled";
  if (item.clients.every((client) => client.status === "cancelled")) return "cancelled";
  const active = item.clients.filter((client) => client.status !== "cancelled");
  if (active.every((client) => client.status === "no_show")) return "no_show";
  return "ended";
}

export const PROGRESS_LABEL: Record<AppointmentProgress, string> = { scheduled: "Scheduled", in_progress: "In progress", ended: "Completed", cancelled: "Cancelled", no_show: "No-show" };
