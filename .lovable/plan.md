# Align the scheduler with the specification

## Outcome
Turn the current sample web scheduler into a focused, offline-first front-desk application for one electrolysis practitioner. The first screen will be the working calendar, not a dashboard, and all client, schedule, and billing data will remain on the device.

## What will change

### 1. Rebuild the application around the calendar
- Replace the separate Today dashboard and navigation with two top-level work areas: **Appointments** and password-gated **Admin**.
- Make **Week** the default calendar, with **Day / Week / Month**, Today, Go to Date, previous/next navigation, appointment search, available-slot search, and Schedule Appointment controls.
- Keep past appointments viewable while disabling new bookings in elapsed time.
- Show scheduled, in-progress, completed, cancelled, no-show, and blocked time with clear text and distinct status colors.

### 2. Implement the scheduling rules
- Replace treatment/service selection with a duration-first flow because billing is time-based, not service-based.
- Use 15-minute minimum sessions, 5-minute duration increments, generated start-time choices, the specified weekly hours, date-specific overrides, blocked periods, overlap checks, and the 1–14 minute unusable-gap rule.
- Support rescheduling and per-client cancellation/no-show status without deleting history.
- Support multiple clients in one shared slot and prevent edits to timing after the appointment starts or its scheduled start passes.
- Show the confirmation ticket with names, date/time, notes, phone reminder, and 24-hour cancellation policy.

### 3. Add client, timing, and billing workflows
- Use last name, optional first name, and validated/formatted phone as the client record; remove email, services, and treatment notes from routine client entry.
- Add searchable client selection and quick-add directly inside appointment booking rather than keeping a separate client-management tab.
- Add per-client Start Session / End Session, actual-minute billing at **$2.50/minute**, scheduled-duration no-show charges, payments, running debt/credit balances, payment history, a combined report, and CSV export.

### 4. Add the protected Admin workspace
- Create one Admin area with **Edit Business Hours**, **Block Time Off**, **Billing**, and **Backup & Restore** sections.
- Add local password setup/unlock and re-confirmation for sensitive actions; store only a local password hash.
- Allow per-date hour overrides, full-day or partial-day blocks with required reasons, and conflict checks.
- Add manual local export/import with validation and a destructive-restore warning.

### 5. Make it offline and tablet-ready
- Persist all data locally using IndexedDB and remove internet-dependent fonts/resources.
- Package the existing app as an Electron Windows desktop application with safe window isolation and relative asset paths.
- Use touch-friendly controls, minimum 44px primary targets, non-typed time selection, and scrollable panels suitable for a Windows tablet.
- Resolve the current date-based hydration mismatch by initializing device-local data after hydration.

## Technical notes
- The specification names PySide6/SQLite/PyInstaller, but this project’s supported stack is React/TanStack. The same product goals will be delivered as an offline Electron app using IndexedDB, avoiding cloud services and network dependencies.
- Data will be versioned and validated so backup files can be checked before replacement.
- Scheduling and billing rules will live in testable domain modules rather than being embedded in screen components.

## Validation
- Add focused tests for business hours, overlaps, dead-gap rejection, available starts, no-show billing, session billing, balances, and backup validation.
- Verify booking, rescheduling, shared-client timing, blocking, payment/reporting, password gates, persistence, and restore in the running app.
- Check desktop and tablet-sized layouts and confirm the packaged app loads without network access.