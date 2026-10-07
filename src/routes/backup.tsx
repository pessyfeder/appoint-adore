import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, FileUp, ShieldAlert } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { applyBackup, backupFileName, createBackup, markBackedUp, parseBackup, readLastBackup, type Backup, type BackupSummary } from "@/lib/backup";
import { clearSessionUnlock } from "@/lib/privacy";

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [
    { title: "Backup | Lumière Electrolysis" },
    { name: "description", content: "Save a backup file of every appointment, client and payment, or restore one." },
    { property: "og:title", content: "Backup | Lumière Electrolysis" },
    { property: "og:description", content: "Save a backup file of every appointment, client and payment, or restore one." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BackupPage,
});

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function download(backup: Backup, name = backupFileName(backup)) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function BackupPage() {
  const { confirm, dialog } = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [picked, setPicked] = useState<{ name: string; backup: Backup; summary: BackupSummary } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setLastBackup(readLastBackup(window.localStorage)), []);

  function saveBackup() {
    const backup = createBackup(window.localStorage);
    download(backup);
    markBackedUp(window.localStorage, new Date(backup.exportedAt));
    setLastBackup(backup.exportedAt);
    setSaved(true);
  }

  async function pickFile(file: File | undefined) {
    setError("");
    setPicked(null);
    if (!file) return;
    const result = parseBackup(await file.text());
    if ("error" in result) setError(result.error);
    else setPicked({ name: file.name, ...result });
    if (fileInput.current) fileInput.current.value = "";
  }

  async function restore() {
    if (!picked) return;
    const ok = await confirm({
      title: "Are you sure?",
      description: `Replace everything on this device? Every appointment, client, payment and hours setting here will be replaced by the backup from ${when(picked.summary.exportedAt)}. A copy of what's here now is saved to your downloads first.${picked.summary.hasPassword ? " Afterwards, unlock with the password that was in use when the backup was made." : ""}`,
      confirmLabel: "Replace with backup",
      cancelLabel: "Keep what's here",
      destructive: true,
    });
    if (!ok) return;
    const current = createBackup(window.localStorage);
    download(current, backupFileName(current).replace("lumiere-backup-", "lumiere-before-restore-"));
    applyBackup(window.localStorage, picked.backup);
    clearSessionUnlock();
    // Give the safety download a moment to start before the page reloads with the restored records.
    window.setTimeout(() => window.location.assign("/"), 800);
  }

  return <main className="mx-auto max-w-3xl px-4 py-8">
    <p className="text-xs font-medium uppercase text-muted-foreground">Practitioner only</p>
    <h1 className="mt-1 font-serif text-3xl">Backup</h1>
    <p className="mt-2 text-sm text-muted-foreground">Everything is stored only in this browser on this tablet. Clearing browsing data, resetting the password, or a broken tablet would erase it — keep a recent backup file somewhere safe, like a USB stick or your email.</p>

    <section className="mt-7 rounded-xl border bg-card p-5">
      <h2 className="font-serif text-xl">Save a backup</h2>
      <p className="mt-1 text-sm text-muted-foreground">Downloads one file with every appointment, client, payment, blocked time and your working hours.</p>
      <p className="mt-3 text-sm">{lastBackup ? <>Last backup: <span className="font-medium">{when(lastBackup)}</span></> : <span className="font-medium text-destructive">No backup has been made on this tablet yet.</span>}</p>
      <Button className="mt-4 h-12" onClick={saveBackup}><Download /> Download backup</Button>
      {saved && <p className="mt-3 text-sm text-muted-foreground" role="status">Saved to your Downloads folder. Copy it somewhere off this tablet.</p>}
      <p className="mt-3 text-xs text-muted-foreground">The file contains client names, phone numbers and payments — keep it private.</p>
    </section>

    <section className="mt-6 rounded-xl border bg-card p-5">
      <h2 className="font-serif text-xl">Restore from a backup</h2>
      <p className="mt-1 text-sm text-muted-foreground">Use this on a new tablet, or to undo a mistake. It replaces everything currently on this device.</p>
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={(event) => void pickFile(event.target.files?.[0])} />
      <Button className="mt-4 h-12" variant="outline" onClick={() => fileInput.current?.click()}><FileUp /> Choose backup file</Button>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {picked && <div className="mt-4 rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">{picked.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">Made {when(picked.summary.exportedAt)} · {plural(picked.summary.clients, "client")} · {plural(picked.summary.appointments, "appointment")} · {plural(picked.summary.payments, "payment")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="h-11" variant="destructive" onClick={restore}><ShieldAlert /> Restore this backup</Button>
          <Button className="h-11" variant="ghost" onClick={() => setPicked(null)}>Cancel</Button>
        </div>
      </div>}
    </section>
    {dialog}
  </main>;
}
