import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { applyNoShows, RATE_PER_MINUTE, sessionMinutes } from "./scheduling";
import { formatPhone, makeSeedData, type Appointment, type BlockedTime, type Client, type Payment } from "./data";

const STORAGE_KEY = "lumiere-scheduler-v2";
const clientSchema = z.object({ name: z.string().trim().min(1).max(100), phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/) });
const appointmentSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/), durationMin: z.number().int().min(15).max(180), clientIds: z.array(z.string()).min(1).max(6), notes: z.string().trim().max(500) });
const paymentSchema = z.object({ clientId: z.string().min(1), amount: z.number().positive().max(100000), method: z.enum(["cash", "card", "check", "other"]), notes: z.string().trim().max(300) });
const blockedSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), reason: z.string().trim().min(1).max(200) });

type StoreState = ReturnType<typeof makeSeedData>;
type Store = StoreState & {
  ready: boolean;
  addClient: (input: { name: string; phone: string }) => Client;
  addAppointment: (input: { date: string; time: string; durationMin: number; clientIds: string[]; notes: string }) => Appointment;
  updateAppointment: (id: string, input: { date: string; time: string; durationMin: number; clientIds: string[]; notes: string }) => void;
  setClientStatus: (appointmentId: string, clientId: string, status: Appointment["clients"][number]["status"]) => void;
  addPayment: (input: { clientId: string; amount: number; method: Payment["method"]; notes: string }) => void;
  addBlockedTime: (input: Omit<BlockedTime, "id">) => void;
  startClient: (appointmentId: string, clientId: string) => void;
  endClient: (appointmentId: string) => EndSummary | null;
  highlightId: string | null;
  setHighlightId: (id: string | null) => void;
};

export type EndSummary = { appointmentId: string; clientId: string; minutes: number; amount: number; nextClientId: string | null };

// Keep one context instance across live code reloads, so the provider and its users never point at different copies.
const contextHost = globalThis as unknown as { __lumiereStoreContext?: React.Context<Store | null> };
const StoreContext = contextHost.__lumiereStoreContext ??= createContext<Store | null>(null);

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => makeSeedData());
  const [ready, setReady] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setState(JSON.parse(saved) as StoreState); } catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const sweep = () => setState((current) => { const next = applyNoShows(current.appointments); return next ? { ...current, appointments: next } : current; });
    sweep();
    const timer = window.setInterval(sweep, 60000);
    return () => window.clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const value = useMemo<Store>(() => ({
    ...state,
    ready,
    highlightId,
    setHighlightId,
    startClient(appointmentId, clientId) {
      const now = new Date().toISOString();
      setState((current) => current.appointments.some((a) => a.clients.some((c) => c.startedAt && !c.endedAt)) ? current : ({ ...current, appointments: current.appointments.map((a) => a.id !== appointmentId ? a : { ...a, startedAt: a.startedAt ?? now, clients: a.clients.map((c) => c.clientId === clientId && c.status === "scheduled" && !c.startedAt ? { ...c, startedAt: now } : c) }) }));
    },
    endClient(appointmentId) {
      const item = state.appointments.find((a) => a.id === appointmentId);
      const running = item?.clients.find((c) => c.startedAt && !c.endedAt);
      if (!item || !running) return null;
      const endedAt = new Date().toISOString();
      const minutes = sessionMinutes(running.startedAt!, endedAt);
      const amount = minutes * RATE_PER_MINUTE;
      const next = item.clients.find((c) => c.status === "scheduled" && !c.startedAt && c.clientId !== running.clientId);
      setState((current) => ({ ...current, appointments: current.appointments.map((a) => a.id !== appointmentId ? a : { ...a, endedAt: next ? undefined : endedAt, clients: a.clients.map((c) => c.clientId === running.clientId ? { ...c, endedAt, status: "completed", charge: amount } : c) } as typeof a) }));
      return { appointmentId, clientId: running.clientId, minutes, amount, nextClientId: next?.clientId ?? null };
    },
    addClient(input) {
      const parsed = clientSchema.parse({ ...input, phone: formatPhone(input.phone) });
      const client: Client = { ...parsed, id: nextId("client"), createdAt: new Date().toISOString(), archived: false };
      setState((current) => ({ ...current, clients: [...current.clients, client] }));
      return client;
    },
    addAppointment(input) {
      const parsed = appointmentSchema.parse(input);
      const appointment: Appointment = { id: nextId("appointment"), date: parsed.date, time: parsed.time, durationMin: parsed.durationMin, notes: parsed.notes, clients: parsed.clientIds.map((clientId) => ({ clientId, status: "scheduled", charge: 0 })) };
      setState((current) => ({ ...current, appointments: [...current.appointments, appointment] }));
      return appointment;
    },
    updateAppointment(id, input) {
      const parsed = appointmentSchema.parse(input);
      setState((current) => ({ ...current, appointments: current.appointments.map((item) => item.id === id ? { ...item, date: parsed.date, time: parsed.time, durationMin: parsed.durationMin, notes: parsed.notes, clients: parsed.clientIds.map((clientId) => item.clients.find((client) => client.clientId === clientId) ?? { clientId, status: "scheduled", charge: 0 }) } : item) }));
    },
    setClientStatus(appointmentId, clientId, status) {
      setState((current) => ({ ...current, appointments: current.appointments.map((item) => item.id === appointmentId ? { ...item, clients: item.clients.map((client) => client.clientId === clientId ? { ...client, status, charge: status === "completed" || status === "no_show" ? item.durationMin * 2.5 : 0 } : client) } : item) }));
    },
    addPayment(input) {
      const parsed = paymentSchema.parse(input);
      const payment: Payment = { ...parsed, id: nextId("payment"), paidAt: new Date().toISOString() };
      setState((current) => ({ ...current, payments: [...current.payments, payment] }));
    },
    addBlockedTime(input) {
      const parsed = blockedSchema.parse(input);
      setState((current) => ({ ...current, blockedTimes: [...current.blockedTimes, { ...parsed, id: nextId("blocked") }] }));
    },
  }), [ready, state, highlightId]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}