import type React from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearSessionUnlock,
  createLockRecord,
  isSessionUnlocked,
  markSessionUnlocked,
  readLockRecord,
  setupIssue,
  verifyPassphrase,
  wipeStudioData,
  writeLockRecord,
} from "./privacy";

type Status = "checking" | "setup" | "locked" | "unlocked";

type Lock = {
  status: Status;
  setup: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
  verify: (passphrase: string) => Promise<boolean>;
};

// Keep one context instance across live code reloads, so the provider and its users never point at different copies.
const contextHost = globalThis as unknown as { __lumiereLockContext?: React.Context<Lock | null> };
const LockContext = contextHost.__lumiereLockContext ??= createContext<Lock | null>(null);

export function useLock() {
  const lock = useContext(LockContext);
  if (!lock) throw new Error("useLock must be used within LockProvider");
  return lock;
}

export function LockProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    setStatus(readLockRecord() ? (isSessionUnlocked() ? "unlocked" : "locked") : "setup");
  }, []);

  const value = useMemo<Lock>(
    () => ({
      status,
      async setup(passphrase) {
        writeLockRecord(await createLockRecord(passphrase));
        markSessionUnlocked();
        setStatus("unlocked");
      },
      async unlock(passphrase) {
        const record = readLockRecord();
        if (!record || !(await verifyPassphrase(passphrase, record))) return false;
        markSessionUnlocked();
        setStatus("unlocked");
        return true;
      },
      lock() {
        clearSessionUnlock();
        setStatus("locked");
      },
      async verify(passphrase) {
        const record = readLockRecord();
        return record ? await verifyPassphrase(passphrase, record) : false;
      },
    }),
    [status],
  );

  return <LockContext.Provider value={value}>{status === "unlocked" ? children : <LockScreen status={status} />}</LockContext.Provider>;
}

function LockScreen({ status }: { status: Status }) {
  const { setup, unlock } = useLock();
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wiping, setWiping] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (status === "setup") {
      const issue = setupIssue(passphrase, confirmation);
      if (issue) {
        setError(issue);
        return;
      }
      setBusy(true);
      await setup(passphrase);
      return;
    }
    setBusy(true);
    const ok = await unlock(passphrase);
    setBusy(false);
    if (!ok) {
      setError("That password doesn’t match.");
      setPassphrase("");
    }
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="font-display text-lg font-semibold tracking-tight text-muted-foreground">Lumière Electrolysis</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <form className="w-full max-w-sm border bg-card p-6 sm:p-8" onSubmit={submit}>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Lumière Electrolysis</span>
        </div>

        {status === "setup" ? (
          <>
            <h1 className="mt-6 font-serif text-2xl">Choose your practitioner password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The calendar, clients, payments and balances on this tablet stay behind this password.
            </p>
            <label className="mt-5 block text-sm font-medium" htmlFor="new-password">
              Password
            </label>
            <Input
              id="new-password"
              className="mt-1 h-12"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
            <label className="mt-3 block text-sm font-medium" htmlFor="confirm-password">
              Confirm password
            </label>
            <Input
              id="confirm-password"
              className="mt-1 h-12"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Keep it somewhere safe. There is no recovery email — resetting means erasing the records on this tablet.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 font-serif text-2xl">Practitioner access</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your password to open the schedule, clients and payments.</p>
            <label className="mt-5 block text-sm font-medium" htmlFor="unlock-password">
              Password
            </label>
            <Input
              id="unlock-password"
              className="mt-1 h-12"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </>
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <Button className="mt-5 h-12 w-full" disabled={busy} type="submit">
          {busy ? "Please wait…" : status === "setup" ? "Start using the scheduler" : "Unlock"}
        </Button>

        {status === "locked" &&
          (wiping ? (
            <div className="mt-5 border border-dashed p-4">
              <p className="text-sm font-medium">Reset the password?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Resetting erases every appointment, client and payment stored on this tablet, then lets you choose a new password.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="h-11"
                  variant="destructive"
                  onClick={() => {
                    wipeStudioData();
                    window.location.reload();
                  }}
                >
                  Erase and reset
                </Button>
                <Button className="h-11" variant="ghost" onClick={() => setWiping(false)}>
                  Keep trying
                </Button>
              </div>
            </div>
          ) : (
            <button className="mt-4 text-sm text-muted-foreground underline underline-offset-4" type="button" onClick={() => setWiping(true)}>
              Forgot password?
            </button>
          ))}

        <p className="mt-6 text-xs text-muted-foreground">Everything stays on this tablet. Nothing is sent to the internet.</p>
      </form>
    </div>
  );
}

/**
 * Password prompt that renders inline, in the same surface the action came from,
 * instead of opening a separate popup. Call `request(action)` from a handler and
 * render `prompt` where the field should appear.
 */
export function usePassphraseGate() {
  const { verify } = useLock();
  const [action, setAction] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  function request(next: string) {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setError("");
      setPassphrase("");
      setAction(next);
    });
  }

  function settle(ok: boolean) {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setAction(null);
    setPassphrase("");
    setError("");
    resolve?.(ok);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = await verify(passphrase);
    setBusy(false);
    if (ok) settle(true);
    else {
      setError("That password doesn’t match.");
      setPassphrase("");
    }
  }

  const prompt = action ? (
    <form className="w-full rounded-lg border border-primary/40 bg-primary/5 p-3" onSubmit={submit}>
      <p className="text-sm font-medium">{action} needs your practitioner password.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          aria-label="Practitioner password"
          className="h-11 max-w-xs flex-1"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
        />
        <Button className="h-11" disabled={busy || !passphrase} type="submit">
          {busy ? "Checking…" : "Confirm"}
        </Button>
        <Button className="h-11" type="button" variant="ghost" onClick={() => settle(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  ) : null;

  return { request, prompt };
}
