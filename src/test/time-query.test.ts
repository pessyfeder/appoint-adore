import { describe, expect, it } from "vitest";
import { parseTimeQuery, type TimeFilter } from "../lib/time-query";

// 2030-01-07 is a Monday: default hours 10:30–1:30 and 7:30–10:30.
const MONDAY = "2030-01-07";
const TIMES = ["10:30", "11:00", "12:30", "13:00", "14:30", "19:30", "20:00", "22:00"];
const run = (text: string) => (parseTimeQuery(text) as TimeFilter)(TIMES, MONDAY);

describe("Search start time", () => {
  it("is off when empty and rejects non-times", () => {
    expect(parseTimeQuery("  ")).toBeNull();
    expect(parseTimeQuery("lunch")).toBe(false);
    expect(parseTimeQuery("25")).toBe(false);
    expect(parseTimeQuery("2:75")).toBe(false);
    expect(parseTimeQuery("14 pm")).toBe(false);
  });

  it("matches hours loosely while typing", () => {
    expect(run("2")).toEqual(["14:30"]);
    expect(run("1")).toEqual(["13:00"]);
    expect(run("10")).toEqual(["10:30", "22:00"]);
    expect(run("12:3")).toEqual(["12:30"]);
  });

  it("understands AM/PM, 24-hour and colon-less times", () => {
    expect(run("10 pm")).toEqual(["22:00"]);
    expect(run("10:30 a.m.")).toEqual(["10:30"]);
    expect(run("20:00")).toEqual(["20:00"]);
    expect(run("1030")).toEqual(["10:30"]);
    expect(run("230")).toEqual(["14:30"]);
  });

  it("picks the earliest or latest opening, overall or by part of day", () => {
    expect(run("earliest")).toEqual(["10:30"]);
    expect(run("latest")).toEqual(["22:00"]);
    expect(run("earliest evening")).toEqual(["19:30"]);
    expect(run("latest day")).toEqual(["13:00"]);
    expect(run("latest morning")).toEqual(["13:00"]);
    expect(run("Earliest  E")).toEqual(["19:30"]);
  });
});
