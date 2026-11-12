import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { departmentsQuery, nameSchema, sessionsQuery } from "@/lib/data";
import { sessionsForDepartment, sessionTime } from "@/lib/attendance-period";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Draft = { name: string; time: string };

/** Super admin: each department names its own attendance sessions (classes at different times of the day). */
export function DepartmentSessions() {
  const { data: departments } = useSuspenseQuery(departmentsQuery);
  const { data: sessions } = useSuspenseQuery(sessionsQuery);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<string, Draft>>({});
  const [adding, setAdding] = useState<Record<string, Draft>>({});

  async function run(action: () => PromiseLike<{ error: { message: string } | null; data?: unknown[] | null }>, done: string) {
    if (busy) return false;
    setBusy(true);
    try {
      const result = await action();
      if (result.error) throw result.error;
      if (Array.isArray(result.data) && result.data.length === 0) throw new Error("Only the super admin can change sessions.");
      await qc.invalidateQueries({ queryKey: ["attendance_sessions"] });
      toast.success(done);
      return true;
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "Could not save.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function parse(d: Draft) {
    const name = nameSchema.safeParse(d.name);
    if (!name.success) { toast.error("Enter a session name (1–50 characters)."); return null; }
    if (d.time && !/^\d{2}:\d{2}$/.test(d.time)) { toast.error("Enter a valid start time."); return null; }
    return { name: name.data, start_time: d.time || null };
  }

  return (
    <section className="mb-6 border-b pb-6">
      <h2 className="mb-1 text-lg font-bold">Attendance sessions</h2>
      <p className="mb-4 text-sm text-muted-foreground">Each department names its own class times. Attendance is taken separately for every session of the day.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((d) => {
          const list = sessionsForDepartment(sessions, d.id);
          const add = adding[d.id] ?? { name: "", time: "" };
          return (
            <div key={d.id} className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-bold">{d.name}</h3>
              <ul className="space-y-2">
                {list.map((s) => {
                  const id = (s as { id?: string }).id ?? s.key;
                  const v = edits[id] ?? { name: s.name, time: sessionTime(s) };
                  return (
                    <li key={id}>
                      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const p = parse(v); if (p) void run(() => supabase.from("attendance_sessions").update(p).eq("id", id).select("id"), "Session saved").then((ok) => ok && setEdits((o) => { const n = { ...o }; delete n[id]; return n; })); }}>
                        <Input className="min-w-0 flex-1" aria-label={`${d.name} session name`} value={v.name} onChange={(e) => setEdits({ ...edits, [id]: { ...v, name: e.target.value } })} />
                        <Input className="w-28" type="time" aria-label={`${d.name} ${s.name} start time`} value={v.time} onChange={(e) => setEdits({ ...edits, [id]: { ...v, time: e.target.value } })} />
                        <Button size="icon" variant="outline" aria-label={`Save ${s.name}`} disabled={busy || !edits[id]}><Save /></Button>
                        <Button size="icon" type="button" variant="outline" aria-label={`Remove ${s.name}`} disabled={busy} onClick={() => { if (window.confirm(`Remove ${s.name} from ${d.name}? Saved attendance stays in reports.`)) void run(() => supabase.from("attendance_sessions").update({ active: false }).eq("id", id).select("id"), "Session removed"); }}><Trash2 /></Button>
                      </form>
                    </li>
                  );
                })}
                {!list.length && <li className="text-sm text-muted-foreground">No sessions yet.</li>}
              </ul>
              <form className="mt-3 flex flex-wrap gap-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); const p = parse(add); if (p) void run(() => supabase.from("attendance_sessions").insert({ ...p, department_id: d.id, sort_order: list.length + 1 }).select("id"), "Session added").then((ok) => ok && setAdding({ ...adding, [d.id]: { name: "", time: "" } })); }}>
                <Input className="min-w-0 flex-1" placeholder="New session, e.g. Evening class" aria-label={`New session for ${d.name}`} value={add.name} onChange={(e) => setAdding({ ...adding, [d.id]: { ...add, name: e.target.value } })} />
                <div className="relative"><Clock className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input className="w-32 pl-8" type="time" aria-label={`New session time for ${d.name}`} value={add.time} onChange={(e) => setAdding({ ...adding, [d.id]: { ...add, time: e.target.value } })} /></div>
                <Button disabled={busy}><Plus />Add session</Button>
              </form>
            </div>
          );
        })}
      </div>
    </section>
  );
}
