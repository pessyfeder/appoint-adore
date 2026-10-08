const LOCK_KEY = "lumiere-lock-v1";
const ITERATIONS = 150_000;

export const MIN_PASSPHRASE = 4;

/** Two security questions; the answers are kept only as a salted hash, like the password. */
export type RecoveryRecord = { questions: [string, string]; salt: string; hash: string };
export type LockRecord = { salt: string; hash: string; createdAt: string; recovery?: RecoveryRecord | undefined };

// Personal, unchanging details that aren't easy to look up online (no birthplace, maiden name or school).
export const SECURITY_QUESTIONS = [
  "What was the name of your first stuffed animal or doll?",
  "What was the first name of your childhood best friend?",
  "What was the first concert or show you went to?",
  "What was your favorite food as a child?",
  "What was the name of your first boss?",
  "In what city did your parents meet?",
  "What was the name of the school where you trained in electrolysis?",
  "What was the first name of your first client?",
  "What was the name of the street your grandparents lived on?",
  "What was your dream job as a child?",
];

export const MIN_ANSWER = 2;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function subtle() {
  const api = globalThis.crypto?.subtle;
  if (!api) throw new Error("This browser can't protect the studio records.");
  return api;
}

export function randomSalt() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function hashPassphrase(passphrase: string, salt: string) {
  const key = await subtle().importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits({ name: "PBKDF2", salt: fromHex(salt), iterations: ITERATIONS, hash: "SHA-256" }, key, 256);
  return toHex(new Uint8Array(bits));
}

/** Compares two digests without short-circuiting on the first differing character. */
function digestsMatch(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export async function createLockRecord(passphrase: string, recovery?: RecoveryRecord): Promise<LockRecord> {
  const salt = randomSalt();
  return { salt, hash: await hashPassphrase(passphrase, salt), createdAt: new Date().toISOString(), recovery };
}

/** Answers match regardless of capitals and extra spaces ("  New  York" = "new york"). */
const normalizeAnswer = (answer: string) => answer.trim().replace(/\s+/g, " ").toLowerCase();
const answersKey = (answers: [string, string]) => answers.map(normalizeAnswer).join("\u0000");

export async function createRecoveryRecord(questions: [string, string], answers: [string, string]): Promise<RecoveryRecord> {
  const salt = randomSalt();
  return { questions, salt, hash: await hashPassphrase(answersKey(answers), salt) };
}

export async function verifyRecoveryAnswers(answers: [string, string], recovery: RecoveryRecord) {
  return digestsMatch(await hashPassphrase(answersKey(answers), recovery.salt), recovery.hash);
}

export function securityQuestionsIssue(questions: [string, string], answers: [string, string]): string | null {
  if (!questions[0] || !questions[1]) return "Choose two security questions.";
  if (questions[0] === questions[1]) return "Choose two different security questions.";
  if (answers.some((answer) => normalizeAnswer(answer).length < MIN_ANSWER)) return `Answer both security questions (at least ${MIN_ANSWER} characters each).`;
  return null;
}

export async function verifyPassphrase(passphrase: string, record: LockRecord) {
  return digestsMatch(await hashPassphrase(passphrase, record.salt), record.hash);
}

export function setupIssue(passphrase: string, confirmation: string): string | null {
  if (passphrase.length < MIN_PASSPHRASE) return `Use at least ${MIN_PASSPHRASE} characters.`;
  if (passphrase !== confirmation) return "The two passwords don't match.";
  return null;
}

export function readLockRecord(): LockRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<LockRecord>;
    if (typeof record?.salt !== "string" || typeof record?.hash !== "string") return null;
    const recovery = record.recovery;
    const validRecovery = recovery && Array.isArray(recovery.questions) && recovery.questions.length === 2 && typeof recovery.salt === "string" && typeof recovery.hash === "string";
    return { ...(record as LockRecord), recovery: validRecovery ? recovery : undefined };
  } catch {
    return null;
  }
}

export function writeLockRecord(record: LockRecord) {
  window.localStorage.setItem(LOCK_KEY, JSON.stringify(record));
}

/** Last-resort reset: removes every studio record held on this device. */
export function wipeStudioData() {
  if (typeof window === "undefined") return;
  const doomed: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("lumiere-")) doomed.push(key);
  }
  doomed.forEach((key) => window.localStorage.removeItem(key));
}
