# Project memory

## Product intent & audience

- School/educational management system for tracking attendance, students, classes, staff, and reports.
- Includes QR scanning for attendance, ID card generation, PDF/Excel export, and staff permission management.
- Supabase backend for database.
- Has a super-admin "AI permission review" feature that relied on server-side code.

## Brand personality & voice

- Utility-focused admin tool; tone is functional and direct.

## Visual design & UX direction

- SPA architecture with nested routes (e.g., `/dashboard`, `/students`, `/reports`).
- TanStack Start project configured in SPA mode; all rendering client-side.
- Prerendered entry page must be named `index.html` (not `_shell.html`) at `dist/` root.
- SPA redirect rule required in `public/_redirects` (`/* /index.html 200`) for deep-link refresh support.

## Decisions, constraints & rationale

- **Hosting**: Bolt static hosting publishes from `dist/` only; no server runtime available.
- **SPA mode**: Switched from TanStack Start server output to SPA build because Bolt hosting cannot run server bundles.
- **Output path**: Configured Vite to output to `dist/` with prerendered file as `index.html`; default TanStack SPA output produced `_shell.html` under a non-standard path.
- **Server-only features**: Super-admin AI permission review is disabled in published build since it requires server code that static hosting cannot run. All other features (sign-in, dashboard, attendance/QR, students, ID cards, classes, reports, exports, staff permissions) work client-side via Supabase.
- **No renaming**: `_shell.html` was not manually renamed; build config was corrected so the build genuinely emits `index.html`.
- 22 tests pass; build verified successful.

## Open questions & assumptions

- Whether the AI permission review feature needs a serverless/function-based reimplementation or can be fully retired.
- Whether Supabase RLS policies are sufficient for client-side-only access patterns now that server-side code is removed.
- Whether additional routes beyond `/dashboard`, `/students`, `/reports` need verification of deep-link refresh behavior.