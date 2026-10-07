import { describe, expect, it } from "vitest";
import { buildReport } from "../lib/billing";
import type { Adjustment, Appointment, Payment } from "../lib/data";
import { clientBalance } from "../lib/scheduling";

const visit = (id: string, date: string, charge: number): Appointment => ({
  id, date, time: "10:30", durationMin: 30, notes: "", clients: [{ clientId: "c1", status: "completed", charge }],
});
const payment = (amount: number): Payment => ({ id: `p${amount}`, clientId: "c1", amount, method: "cash", paidAt: "2030-01-10T15:00:00.000Z", notes: "" });
const adjustment = (amount: number, createdAt = "2030-01-12T15:00:00.000Z"): Adjustment => ({ id: `adj${amount}`, clientId: "c1", amount, reason: "test", createdAt });

describe("balance adjustments", () => {
  const appointments = [visit("a1", "2030-01-07", 75), visit("a2", "2030-01-09", 50)];

  it("move the balance up or down", () => {
    expect(clientBalance("c1", appointments, [payment(100)])).toBe(25);
    expect(clientBalance("c1", appointments, [payment(100)], [adjustment(-25)])).toBe(0);
    expect(clientBalance("c1", appointments, [payment(100)], [adjustment(10)])).toBe(35);
    expect(clientBalance("c2", appointments, [payment(100)], [adjustment(10)])).toBe(0);
  });

  it("show in the report: a credit pays off charges, an increase is listed as unpaid", () => {
    const credited = buildReport("2030-01-01", "2030-01-31", appointments, [payment(100)], [], [adjustment(-25)]);
    expect(credited.owed).toBe(0);
    const increased = buildReport("2030-01-01", "2030-01-31", appointments, [payment(125)], [], [adjustment(10)]);
    expect(increased.rows.filter((row) => row.unpaid).map((row) => [row.label, row.amount])).toEqual([["Adjustment (unpaid)", -10]]);
    expect(increased.rows.find((row) => row.unpaid)?.adjustmentId).toBe("adj10");
  });
});
