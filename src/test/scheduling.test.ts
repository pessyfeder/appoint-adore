import { describe, expect, it } from "vitest";
import { emptyData, paymentDateKey, toDateKey, type Appointment } from "../lib/data";
import { availableTimes, blockedTimeIssue, canMarkNoShow, noShowCharge, pastStartIssue } from "../lib/scheduling";

// 2030-01-07 is a Monday: default hours 10:30–1:30 and 7:30–10:30.
const MONDAY = "2030-01-07";
const at = (time: string) => new Date(`${MONDAY}T${time}:00`);
const booked = (time: string, status: Appointment["clients"][number]["status"] = "scheduled"): Appointment => ({
  id: `a-${time}`, date: MONDAY, time, durationMin: 30, notes: "", clients: [{ clientId: "c1", status, charge: 0 }],
});

describe("first run", () => {
  it("starts with no clients, appointments or payments", () => {
    expect(emptyData()).toEqual({ clients: [], appointments: [], payments: [], blockedTimes: [] });
  });
});

describe("times that have passed", () => {
  it("are not offered for booking", () => {
    const times = availableTimes(MONDAY, 30, [], [], at("11:12"));
    expect(times).not.toContain("11:00");
    expect(times[0]).toBe("11:15");
    expect(availableTimes(MONDAY, 30, [], [], at("09:00"))[0]).toBe("10:30");
  });

  it("are rejected when saving", () => {
    expect(pastStartIssue(MONDAY, "11:00", at("11:12"))).toMatch(/already passed/);
    expect(pastStartIssue(MONDAY, "11:30", at("11:12"))).toBeNull();
  });
});

describe("no-shows", () => {
  it("can only be marked once the start time has passed, and only for waiting clients", () => {
    const item = booked("10:30");
    const client = item.clients[0]!;
    expect(canMarkNoShow(item, client, at("10:29"))).toBe(false);
    expect(canMarkNoShow(item, client, at("10:30"))).toBe(true);
    expect(canMarkNoShow(item, { ...client, startedAt: at("10:31").toISOString() }, at("10:40"))).toBe(false);
    expect(canMarkNoShow(item, { ...client, status: "cancelled" }, at("10:40"))).toBe(false);
  });

  it("are billed for the full booked length", () => {
    expect(noShowCharge({ durationMin: 30 })).toBe(75);
    expect(noShowCharge({ durationMin: 90 })).toBe(225);
  });
});

describe("blocked time", () => {
  const block = { date: MONDAY, startTime: "10:30", endTime: "11:30", reason: "Doctor" };

  it("needs a reason and a real range", () => {
    expect(blockedTimeIssue({ ...block, reason: "  " }, [])).toMatch(/reason/);
    expect(blockedTimeIssue({ ...block, endTime: "10:00" }, [])).toMatch(/after the start/);
    expect(blockedTimeIssue(block, [])).toBeNull();
  });

  it("can't cover a booked appointment, but may cover cancelled ones", () => {
    expect(blockedTimeIssue(block, [booked("11:00")])).toMatch(/11:00 AM/);
    expect(blockedTimeIssue(block, [booked("11:00", "cancelled")])).toBeNull();
    expect(blockedTimeIssue(block, [booked("11:30")])).toBeNull();
  });
});

describe("payment dates", () => {
  it("use the local day the payment was recorded", () => {
    const evening = new Date(2030, 0, 7, 22, 15);
    expect(paymentDateKey(evening.toISOString())).toBe(toDateKey(evening));
    expect(paymentDateKey("2030-01-07")).toBe("2030-01-07");
  });
});
