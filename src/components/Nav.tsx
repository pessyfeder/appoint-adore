import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarPlus, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLock } from "@/lib/lock";
import { useConfirm } from "@/components/ConfirmDialog";

const adminLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/schedule", label: "Schedule" },
  { to: "/availability", label: "Hours" },
  { to: "/clients", label: "Clients & Billing" },
  { to: "/backup", label: "Backup" },
] as const;

const tab = "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-muted-foreground transition-colors";
const activeTab = "bg-primary text-primary-foreground";

export function Nav() {
  const { status, lock } = useLock();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onBook = pathname.startsWith("/book");
  const unlocked = status === "unlocked";
  const { confirm, dialog } = useConfirm();

  async function exitAdmin() {
    if (!(await confirm({ title: "Are you sure?", description: "Leave Admin? You'll need your password to come back in.", confirmLabel: "Exit Admin", cancelLabel: "Stay in Admin" }))) return;
    lock();
    void navigate({ to: "/book", search: { edit: undefined } });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/book" search={{ edit: undefined }} className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Lumière Electrolysis</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/book" search={{ edit: undefined }} className={`${tab} ${onBook ? activeTab : ""}`}>
            <CalendarPlus className="h-4 w-4" /> Book Appointment
          </Link>
          <Link to="/" className={`${tab} ${!onBook ? activeTab : ""}`}>
            <ShieldCheck className="h-4 w-4" /> Admin
          </Link>
        </nav>
      </div>
      {!onBook && unlocked && (
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
            <nav className="flex flex-wrap gap-1">
              {adminLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  activeOptions={{ exact: l.to === "/" }}
                  className={tab}
                  activeProps={{ className: "bg-secondary text-foreground" }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <Button
              className="h-11"
              variant="ghost"
              onClick={exitAdmin}
            >
              <LogOut /> Exit Admin
            </Button>
          </div>
        </div>
      )}
      {dialog}
    </header>
  );
}
