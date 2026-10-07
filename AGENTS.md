<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project architecture

- Keep this scheduler offline-only: persist operational records in device-local browser storage because the single practitioner must not depend on a network service.
- Keep scheduling constraints in `src/lib/scheduling.ts` and display/data helpers in `src/lib/data.ts` so every booking entry point applies the same rules.
- Book is the only public route; every other route renders through `AdminGate` in `src/lib/lock.tsx` (password hashing and device storage in `src/lib/privacy.ts`), and sensitive actions use its step-up gate instead of inline password checks, so client or billing records never appear on the public screen.

- Render a single shared ClientBalances table on Clients & Billing and initiate client payments from ClientBillingDialog, so the directory and payment entry points are not duplicated.
- Read working hours only through `effectiveHours` (backed by `src/lib/availability.ts`, device-local) so weekly hours and per-date changes apply to every booking path.
- Never change appointment status on a timer: no-shows are marked by the practitioner (`canMarkNoShow` / `noShowCharge` in `src/lib/scheduling.ts`), and a fresh install starts with `emptyData()`, never demo records.
- Any new device-storage key holding studio records must be added to `BACKUP_KEYS` in `src/lib/backup.ts` so backups stay complete.
