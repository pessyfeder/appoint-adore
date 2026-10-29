/**
 * The public demo lives at /demo inside this app. It runs the whole app against its own storage (keys prefixed
 * "demo:" and its own IndexedDB), so the real studio records, password and backups on this device are never read or changed.
 */
const SITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const DEMO_SEGMENT = "/demo";

function isDemoPath(pathname: string) {
  const rest = pathname.startsWith(SITE_BASE) ? pathname.slice(SITE_BASE.length) : pathname;
  return rest === DEMO_SEGMENT || rest.startsWith(`${DEMO_SEGMENT}/`);
}

export const DEMO_MODE = typeof window !== "undefined" && isDemoPath(window.location.pathname);

/** Router basepath: the site's own base, plus /demo inside the demo. */
export const APP_BASEPATH = `${SITE_BASE}${DEMO_MODE ? DEMO_SEGMENT : ""}` || "/";
/** Same, with a trailing slash, for full-page navigations. */
export const APP_BASE_URL = `${APP_BASEPATH.replace(/\/$/, "")}/`;

const DEMO_PREFIX = "demo:";

/** A view of localStorage limited to this mode's keys, so the demo and the real app can't see each other. */
function prefixedStorage(raw: Storage, prefix: string): Storage {
  const own = () => {
    const keys: string[] = [];
    for (let index = 0; index < raw.length; index += 1) {
      const key = raw.key(index);
      if (key?.startsWith(prefix)) keys.push(key.slice(prefix.length));
    }
    return keys;
  };
  return {
    get length() { return own().length; },
    key: (index) => own()[index] ?? null,
    getItem: (key) => raw.getItem(prefix + key),
    setItem: (key, value) => raw.setItem(prefix + key, value),
    removeItem: (key) => raw.removeItem(prefix + key),
    clear: () => own().forEach((key) => raw.removeItem(prefix + key)),
  };
}

/** Where this mode keeps its records: the real localStorage in the app, a separate namespace in the demo. */
export const appStorage: Storage = typeof window === "undefined" ? (undefined as unknown as Storage) : DEMO_MODE ? prefixedStorage(window.localStorage, DEMO_PREFIX) : window.localStorage;

/** Prefix to expect in `storage` events (fired for the raw localStorage keys). */
export const STORAGE_EVENT_PREFIX = DEMO_MODE ? DEMO_PREFIX : "";
export const AUTO_BACKUP_DB = DEMO_MODE ? "lumiere-demo-auto-backup" : "lumiere-auto-backup";
