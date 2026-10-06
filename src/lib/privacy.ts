const LOCK_KEY = "lumiere-lock-v1";
const SESSION_KEY = "lumiere-unlocked-v1";
const ITERATIONS = 150_000;

export const MIN_PASSPHRASE = 4;

export type LockRecord = { salt: string; hash: string; createdAt: string };

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

export async function createLockRecord(passphrase: string): Promise<LockRecord> {
  const salt = randomSalt();
  return { salt, hash: await hashPassphrase(passphrase, salt), createdAt: new Date().toISOString() };
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
    return typeof record?.salt === "string" && typeof record?.hash === "string" ? (record as LockRecord) : null;
  } catch {
    return null;
  }
}

export function writeLockRecord(record: LockRecord) {
  window.localStorage.setItem(LOCK_KEY, JSON.stringify(record));
}

/** The gate stays open for the browser session only, so closing the browser locks it again. */
export function isSessionUnlocked() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function markSessionUnlocked() {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "true");
  } catch {
    /* storage unavailable: the gate simply stays closed */
  }
}

export function clearSessionUnlock() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
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
  clearSessionUnlock();
}
