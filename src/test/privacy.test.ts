import { describe, expect, it } from "vitest";
import { createLockRecord, createRecoveryRecord, securityQuestionsIssue, setupIssue, verifyPassphrase, verifyRecoveryAnswers } from "../lib/privacy";

const hasSubtle = typeof globalThis.crypto?.subtle !== "undefined";

describe("practitioner password", () => {
  it("checks the setup form before saving", () => {
    expect(setupIssue("abc", "abc")).toMatch(/at least/i);
    expect(setupIssue("callofh", "callof")).toMatch(/match/i);
    expect(setupIssue("callofh", "callofh")).toBeNull();
  });

  (hasSubtle ? it : it.skip)("accepts the right password and rejects a wrong one", async () => {
    const record = await createLockRecord("chin area 7");
    const other = await createLockRecord("chin area 7");

    expect(await verifyPassphrase("chin area 7", record)).toBe(true);
    expect(await verifyPassphrase("chin area 8", record)).toBe(false);
    expect(record.salt).not.toBe(other.salt);
    expect(record.hash).not.toContain("chin area 7");
  });
});

describe("security questions", () => {
  const questions: [string, string] = ["What city were you born in?", "What was the name of your first pet?"];

  it("checks the questions and answers before saving", () => {
    expect(securityQuestionsIssue(["", questions[1]], ["Boston", "Rex"])).toMatch(/choose two/i);
    expect(securityQuestionsIssue([questions[0], questions[0]], ["Boston", "Rex"])).toMatch(/different/i);
    expect(securityQuestionsIssue(questions, ["Boston", " "])).toMatch(/answer both/i);
    expect(securityQuestionsIssue(questions, ["Boston", "Rex"])).toBeNull();
  });

  (hasSubtle ? it : it.skip)("accepts the right answers, ignoring capitals and spaces, and keeps them hashed", async () => {
    const recovery = await createRecoveryRecord(questions, ["New York", "Rex"]);

    expect(await verifyRecoveryAnswers(["  new   york ", "REX"], recovery)).toBe(true);
    expect(await verifyRecoveryAnswers(["New York", "Max"], recovery)).toBe(false);
    expect(await verifyRecoveryAnswers(["Rex", "New York"], recovery)).toBe(false);
    expect(recovery.questions).toEqual(questions);
    expect(JSON.stringify(recovery).toLowerCase()).not.toContain("rex");
  });
});
