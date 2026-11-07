<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Staff pages live under `src/routes/_authenticated/` and query the database from the browser client; access control is enforced by RLS (`has_role`/`is_staff`), so every new table needs matching role-based policies.
- Attendance uniqueness is enforced by `(student_id, date, period)` and saves use upsert, so corrections never overwrite a different session.
- Shared attendance-period definitions and row construction live in a browser-safe library; attendance views select a period and aggregate recorded sessions consistently.
- Departments are assigned at class level; separate department memberships grant manager or teacher access, while school administrators remain global. RLS scopes every student, class, attendance and report read; guarded database functions manage staff atomically and prevent managers escalating privileges.
- Department attendance settings are enforced by the shared date/role helper and database permission function for both periods; only school administrators may save settings.
- AI permission reviews authenticate administrators server-side, stream through AI Gateway, send only saved settings and aggregate counts, and never execute permission changes; terminal access blocks persist until explicit administrator recovery.
