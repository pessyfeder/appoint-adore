import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLock } from "@/lib/lock";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/schedule", label: "Schedule" },
  { to: "/book", label: "Book" },
  { to: "/clients", label: "Clients & Billing" },
] as const;

export function Nav() {
  const { lock } = useLock();
  const [confirming, setConfirming] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Lumière Electrolysis
          </span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" }}
            >
              {l.label}
            </Link>
          ))}
          <Button className="h-11 shrink-0" variant="ghost" onClick={() => setConfirming(true)}>
            <Lock /> Lock
          </Button>
        </nav>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock the screen?</DialogTitle>
            <DialogDescription>
              Clients, payments and the calendar will be hidden until you re-enter your password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="h-11" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              className="h-11"
              onClick={() => {
                setConfirming(false);
                lock();
              }}
            >
              <Lock /> Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
