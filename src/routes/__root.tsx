import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  useRouterState,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AdminGate, LockProvider, useLock } from "../lib/lock";
import { StoreProvider } from "../lib/store";
import { Nav } from "../components/Nav";
import { DemoBanner } from "../components/DemoBanner";
import { APP_BASE_URL, DEMO_MODE } from "../lib/app-mode";
import { ActiveSessionBanner } from "../components/ActiveSessionBanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href={import.meta.env.BASE_URL}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Electrolysis Scheduler — Scheduling" },
      { name: "description", content: "Appointment scheduling for an electrolysis studio." },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/**
 * Saves the app on the device so it opens without internet (see public/sw.js). Production only, and not
 * inside an iframe, where a cached copy would hide new edits.
 */
function useOfflineSupport() {
  useEffect(() => {
    // The demo never registers the offline copy: it is only a showcase and shares nothing with the installed app.
    if (DEMO_MODE || !import.meta.env.PROD || !("serviceWorker" in navigator) || window.self !== window.top) return;
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => console.warn("Offline support unavailable", error));
  }, []);
}

/** The app always opens on the public Book Appointment screen; Admin is one tap (and the password) away. */
function useOpenOnBook() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!window.location.pathname.slice(APP_BASE_URL.length - 1).startsWith("/book")) void navigate({ to: "/book", search: { edit: undefined }, replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useOfflineSupport();
  useOpenOnBook();

  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <LockProvider>
        <StoreProvider>
          <DemoBanner />
          <Nav />
          <GatedContent />
          <Toaster position="top-center" richColors />
        </StoreProvider>
      </LockProvider>
    </QueryClientProvider>
  );
}

/** Book is public; every other page sits behind the Admin password. */
function GatedContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { status } = useLock();
  const isPublic = pathname.startsWith("/book") ? status !== "unlocked" : false;
  if (pathname.startsWith("/book")) {
    return <><ActiveSessionBanner isPublic={isPublic} /><Outlet /></>;
  }
  return <AdminGate><ActiveSessionBanner /><Outlet /></AdminGate>;
}
