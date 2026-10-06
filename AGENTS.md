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
- Render protected surfaces only through the practitioner lock in `src/lib/lock.tsx` (password hashing and device storage in `src/lib/privacy.ts`), and extend its step-up list for sensitive actions instead of checking the password inline, so a locked session never puts client or billing records on screen.

- Keep collection-priority ranking in `src/lib/collections.ts` as offline rules (no AI or network calls), so billing data never leaves the device.
