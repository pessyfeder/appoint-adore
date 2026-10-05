export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  description: string;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
};

export type AppointmentStatus = "confirmed" | "completed" | "cancelled";

export type Appointment = {
  id: string;
  clientId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  status: AppointmentStatus;
  notes: string;
};

export const SERVICES: Service[] = [
  {
    id: "consult",
    name: "Consultation & Patch Test",
    durationMin: 30,
    price: 25,
    description: "First visit: skin assessment, treatment plan, and a small patch test.",
  },
  {
    id: "face-15",
    name: "Facial Electrolysis — 15 min",
    durationMin: 15,
    price: 35,
    description: "Upper lip, chin, or sideburns touch-up session.",
  },
  {
    id: "face-30",
    name: "Facial Electrolysis — 30 min",
    durationMin: 30,
    price: 60,
    description: "Full chin, jawline, or combined facial areas.",
  },
  {
    id: "face-60",
    name: "Facial Electrolysis — 60 min",
    durationMin: 60,
    price: 110,
    description: "Extended session for larger or multiple facial areas.",
  },
  {
    id: "body-30",
    name: "Body Electrolysis — 30 min",
    durationMin: 30,
    price: 65,
    description: "Underarms, abdomen line, or small body areas.",
  },
  {
    id: "body-60",
    name: "Body Electrolysis — 60 min",
    durationMin: 60,
    price: 120,
    description: "Bikini line, chest, or larger body areas.",
  },
];

export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
];

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTime(t: string): string {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export const SEED_CLIENTS: Client[] = [
  { id: "c1", name: "Maya Thompson", email: "maya.t@example.com", phone: "(555) 214-8830", notes: "Sensitive skin — use lower intensity on chin area.", createdAt: offsetDate(-90) },
  { id: "c2", name: "Jordan Lee", email: "jordan.lee@example.com", phone: "(555) 872-1190", notes: "Prefers morning appointments.", createdAt: offsetDate(-60) },
  { id: "c3", name: "Sofia Ramirez", email: "sofia.r@example.com", phone: "(555) 340-2271", notes: "Hormonal regrowth — biweekly sessions recommended.", createdAt: offsetDate(-45) },
  { id: "c4", name: "Ava Chen", email: "ava.chen@example.com", phone: "(555) 903-4472", notes: "", createdAt: offsetDate(-20) },
  { id: "c5", name: "Priya Nair", email: "priya.n@example.com", phone: "(555) 667-0913", notes: "Allergic to lidocaine cream — do not apply numbing.", createdAt: offsetDate(-10) },
];

export const SEED_APPOINTMENTS: Appointment[] = [
  { id: "a1", clientId: "c1", serviceId: "face-30", date: offsetDate(0), time: "09:30", status: "confirmed", notes: "" },
  { id: "a2", clientId: "c3", serviceId: "face-60", date: offsetDate(0), time: "11:00", status: "confirmed", notes: "Focus on jawline." },
  { id: "a3", clientId: "c2", serviceId: "body-30", date: offsetDate(0), time: "14:00", status: "confirmed", notes: "" },
  { id: "a4", clientId: "c5", serviceId: "consult", date: offsetDate(1), time: "10:00", status: "confirmed", notes: "New client consultation." },
  { id: "a5", clientId: "c4", serviceId: "face-15", date: offsetDate(1), time: "13:30", status: "confirmed", notes: "" },
  { id: "a6", clientId: "c1", serviceId: "face-30", date: offsetDate(-7), time: "09:30", status: "completed", notes: "" },
  { id: "a7", clientId: "c2", serviceId: "face-15", date: offsetDate(-3), time: "16:00", status: "completed", notes: "" },
  { id: "a8", clientId: "c3", serviceId: "face-60", date: offsetDate(3), time: "10:30", status: "confirmed", notes: "" },
  { id: "a9", clientId: "c4", serviceId: "body-60", date: offsetDate(5), time: "15:00", status: "confirmed", notes: "" },
];
