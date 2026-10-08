import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequiredMark } from "@/components/RequiredMark";
import { SECURITY_QUESTIONS } from "@/lib/privacy";

export type SecurityAnswers = { questions: [string, string]; answers: [string, string] };
export const emptySecurityAnswers = (): SecurityAnswers => ({ questions: ["", ""], answers: ["", ""] });

/** Two security-question pickers, each with its answer; the same question can't be picked twice. */
export function SecurityQuestionsFields({ value, onChange }: { value: SecurityAnswers; onChange: (next: SecurityAnswers) => void }) {
  const set = (index: 0 | 1, field: "questions" | "answers", text: string) => {
    const next: [string, string] = [...value[field]];
    next[index] = text;
    onChange({ ...value, [field]: next });
  };
  return <div className="grid gap-4">
    {([0, 1] as const).map((index) => <div key={index} className="grid gap-1.5">
      <label className="text-sm font-medium" htmlFor={`security-question-${index}`}>Security question {index + 1}<RequiredMark /></label>
      <Select value={value.questions[index]} onValueChange={(question) => set(index, "questions", question)}>
        <SelectTrigger id={`security-question-${index}`} className="h-12 text-left" aria-required="true"><SelectValue placeholder="Choose a question" /></SelectTrigger>
        <SelectContent>{SECURITY_QUESTIONS.filter((question) => question !== value.questions[index === 0 ? 1 : 0]).map((question) => <SelectItem className="h-11" key={question} value={question}>{question}</SelectItem>)}</SelectContent>
      </Select>
      <label className="sr-only" htmlFor={`security-answer-${index}`}>Answer {index + 1} (required)</label>
      <Input id={`security-answer-${index}`} className="h-12" autoComplete="off" maxLength={100} aria-required="true" placeholder="Your answer" value={value.answers[index]} onChange={(event) => set(index, "answers", event.target.value)} />
    </div>)}
    <p className="text-xs text-muted-foreground">Answers aren't case-sensitive. You'll need them if you forget your password.</p>
  </div>;
}
