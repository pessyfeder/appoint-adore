import { createContext, useContext, useState, type ReactNode } from "react";
import {
  SEED_APPOINTMENTS,
  SEED_CLIENTS,
  SERVICES,
  type Appointment,
  type Client,
} from "./data";

type Store = {
  clients: Client[];
  appointments: Appointment[];
  addClient: (c: Omit<Client, "id" | "createdAt">) => Client;
  addAppointment: (a: Omit<Appointment, "id" | "status">) => Appointment;
  setAppointmentStatus: (id: string, status: Appointment["status"]) => void;
};

const StoreContext = createContext<Store | null>(null);

let idCounter = 100;
function nextId(prefix: string) {
  return `${prefix}${++idCounter}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(SEED_CLIENTS);
  const [appointments, setAppointments] = useState<Appointment[]>(SEED_APPOINTMENTS);

  const addClient: Store["addClient"] = (c) => {
    const client: Client = { ...c, id: nextId("c"), createdAt: new Date().toISOString() };
    setClients((prev) => [...prev, client]);
    return client;
  };

  const addAppointment: Store["addAppointment"] = (a) => {
    const appt: Appointment = { ...a, id: nextId("a"), status: "confirmed" };
    setAppointments((prev) => [...prev, appt]);
    return appt;
  };

  const setAppointmentStatus: Store["setAppointmentStatus"] = (id, status) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  return (
    <StoreContext.Provider value={{ clients, appointments, addClient, addAppointment, setAppointmentStatus }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function serviceById(id: string) {
  return SERVICES.find((s) => s.id === id);
}
