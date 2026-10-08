import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequiredMark } from "@/components/RequiredMark";
import { emptySecurityAnswers, SecurityQuestionsFields } from "@/components/SecurityQuestionsFields";
import { useLock } from "@/lib/lock";
import { createRecoveryRecord, readLockRecord, securityQuestionsIssue } from "@/lib/privacy";

/** Admin → Backup: add or change the security questions that let a forgotten password be reset. */
export function SecurityQuestionsSection() {
  const { verify, setRecovery } = useLock();
  const [questions, setQuestions] = useState<[string, string] | null>(null);
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [security, setSecurity] = useState(emptySecurityAnswers);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setQuestions(readLockRecord()?.recovery?.questions ?? null), []);

  function open() {
    setEditing(true);
    setSaved(false);
    setError("");
    setCurrent("");
    setSecurity(emptySecurityAnswers());
  }

  async function save() {
    if (busy) return;
    const issue = securityQuestionsIssue(security.questions, security.answers);
    if (!current) return setError("Enter your current password.");
    if (issue) return setError(issue);
    setBusy(true);
    const ok = await verify(current);
    if (!ok) {
      setBusy(false);
      setCurrent("");
      return setError("That password doesn’t match.");
    }
    setRecovery(await createRecoveryRecord(security.questions, security.answers));
    setBusy(false);
    setQuestions(security.questions);
    setEditing(false);
    setSaved(true);
  }

  return <section className="mt-6 rounded-xl border bg-card p-5">
    <h2 className="font-serif text-xl">Security questions</h2>
    <p className="mt-1 text-sm text-muted-foreground">If you forget your password, answering these on the Admin screen lets you choose a new one without erasing anything.</p>
    {questions
      ? <ul className="mt-3 list-disc pl-5 text-sm">{questions.map((question) => <li key={question}>{question}</li>)}</ul>
      : <p className="mt-3 text-sm font-medium text-destructive">Not set up yet. Without them, a forgotten password means erasing everything on this tablet.</p>}
    {saved && <p className="mt-3 text-sm text-muted-foreground" role="status">Security questions saved.</p>}
    {!editing && <Button className="mt-4 h-12" variant="outline" onClick={open}><KeyRound /> {questions ? "Change security questions" : "Set up security questions"}</Button>}
    {editing && <div className="mt-4 grid max-w-md gap-4 rounded-lg border border-dashed p-4">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium" htmlFor="security-current-password">Current password<RequiredMark /></label>
        <Input id="security-current-password" className="h-12" type="password" autoComplete="current-password" aria-required="true" value={current} onChange={(event) => { setCurrent(event.target.value); setError(""); }} />
      </div>
      <SecurityQuestionsFields value={security} onChange={(next) => { setSecurity(next); setError(""); }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" disabled={busy} onClick={save}>{busy ? "Please wait…" : "Save security questions"}</Button>
        <Button className="h-11" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>}
  </section>;
}
