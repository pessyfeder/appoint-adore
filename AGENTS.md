## Project architecture

- Keep this scheduler offline-only: persist operational records in device-local browser storage because the single practitioner must not depend on a network service.
- Keep scheduling constraints in `src/lib/scheduling.ts` and display/data helpers in `src/lib/data.ts` so every booking entry point applies the same rules.
- Book is the only public route; every other route renders through `AdminGate` in `src/lib/lock.tsx` (password hashing and device storage in `src/lib/privacy.ts`), so client or billing records never appear on the public screen. Entering Admin is the only password prompt: every other important action (start a session, record/edit/delete a payment, change hours, block time, correct times, restore a backup) asks "Are you sure?" via `useConfirm`.

- Render a single shared ClientBalances table on Clients & Billing and initiate client payments from ClientBillingDialog, so the directory and payment entry points are not duplicated.
- Read working hours only through `effectiveHours` (backed by `src/lib/availability.ts`, device-local) so weekly hours and per-date changes apply to every booking path.
- Never change appointment status on a timer: no-shows are marked by the practitioner (`canMarkNoShow` / `noShowCharge` in `src/lib/scheduling.ts`), and a fresh install starts with `emptyData()`, never demo records.
- Any new device-storage key holding studio records must be added to `BACKUP_KEYS` in `src/lib/backup.ts` so backups stay complete.
- Offline support lives in `public/sw.js` (registered from `__root.tsx`, production only). It saves one copy of the single-page shell, so new pages need no change there.
- Never overwrite a client's balance: corrections are `adjustments` (store) with a reason. Pass `store.adjustments` to `clientBalance` and `buildReport` wherever balances are shown.

## Public demo at /demo

- `/demo/*` runs this same app on sample data for showing people. `src/lib/app-mode.ts` decides this from the URL: in the demo the router basepath is `/demo`, every record read/write goes through `appStorage` (localStorage keys prefixed `demo:`, its own IndexedDB), and the offline worker is not registered.
- Never read or write `window.localStorage` directly in app code: use `appStorage`, or the demo would see (or wipe) the real records and password. A new storage key still needs adding to `BACKUP_KEYS`.
- Sample records and the password ("demo") live in `src/lib/demo.ts` and are only ever loaded when `DEMO_MODE` is true. A fresh real install still starts with `emptyData()`.
