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
};

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

export const BUSINESS_HOURS: Record<number, BusinessBlock[]> = {
  0: [{ start: "11:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  1: [{ start: "10:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  2: [{ start: "19:30", end: "22:30" }],
  3: [{ start: "10:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  4: [{ start: "10:30", end: "13:30" }, { start: "19:30", end: "22:30" }],
  5: [],
  6: [],
};

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

export function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function effectiveHours(dateKey: string): BusinessBlock[] {
  return BUSINESS_HOURS[fromDateKey(dateKey).getDay()] ?? [];
}

export function statusLabel(status: AppointmentStatus): string {
  return status === "no_show" ? "No-show" : status.charAt(0).toUpperCase() + status.slice(1);
}

export function makeSeedData() {
  const clients: Client[] = [
    { id: "c1", name: "Maya Thompson", phone: "(555) 214-8830", createdAt: offsetDate(-90), archived: false },
    { id: "c2", name: "Jordan Lee", phone: "(555) 872-1190", createdAt: offsetDate(-60), archived: false },
    { id: "c3", name: "Sofia Ramirez", phone: "(555) 340-2271", createdAt: offsetDate(-45), archived: false },
    { id: "c4", name: "Ava Chen", phone: "(555) 903-4472", createdAt: offsetDate(-20), archived: false },
  ];
  const todayBlocks = effectiveHours(offsetDate(0));
  const tomorrowBlocks = effectiveHours(offsetDate(1));
  const todayStart = todayBlocks[0]?.start ?? "19:30";
  const todayStartMinutes = timeToMinutes(todayStart);
  const secondTodayStart = minutesToTime(todayStartMinutes + 60);
  const tomorrowStart = tomorrowBlocks[0]?.start ?? "19:30";
  const appointments: Appointment[] = [
    { id: "a1", date: offsetDate(0), time: todayStart, durationMin: 30, clients: [{ clientId: "c1", status: "scheduled", charge: 0 }], notes: "Chin area" },
    { id: "a2", date: offsetDate(0), time: secondTodayStart, durationMin: 60, clients: [{ clientId: "c3", status: "scheduled", charge: 0 }], notes: "Jawline" },
    { id: "a3", date: offsetDate(1), time: tomorrowStart, durationMin: 45, clients: [{ clientId: "c2", status: "scheduled", charge: 0 }, { clientId: "c4", status: "scheduled", charge: 0 }], notes: "Shared family appointment" },
    { id: "a4", date: offsetDate(-7), time: "10:30", durationMin: 30, clients: [{ clientId: "c1", status: "completed", charge: 75 }], notes: "" },
  ];
  const payments: Payment[] = [
    { id: "p1", clientId: "c1", amount: 50, method: "card", paidAt: offsetDate(-7), notes: "Partial payment" },
  ];
  return { clients, appointments, payments, blockedTimes: [] as BlockedTime[] };
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
  if (item.endedAt) return "ended";
  if (item.startedAt) return "in_progress";
  if (item.clients.every((client) => client.status === "cancelled")) return "cancelled";
  const active = item.clients.filter((client) => client.status !== "cancelled");
  if (active.every((client) => client.status === "no_show")) return "no_show";
  if (item.clients.every((client) => client.status !== "scheduled")) return "ended";
  return "scheduled";
}

export const PROGRESS_LABEL: Record<AppointmentProgress, string> = { scheduled: "Scheduled", in_progress: "In progress", ended: "Completed", cancelled: "Cancelled", no_show: "No-show" };
