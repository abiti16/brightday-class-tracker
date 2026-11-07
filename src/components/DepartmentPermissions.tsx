import { useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ShieldCheck, Sparkles, Square, Save } from "lucide-react";
import { toast } from "sonner";
import { departmentsQuery } from "@/lib/data";
import type { AttendancePermissions } from "@/lib/department-access";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const fields = [
  ["manager_record_today", "Managers", "Record today"],
  ["manager_correct_past", "Managers", "Enter or correct past dates"],
  ["teacher_record_today", "Teachers", "Record today"],
  ["teacher_correct_past", "Teachers", "Enter or correct past dates"],
] as const;

export function DepartmentPermissions() {
  const { data: departments } = useSuspenseQuery(departmentsQuery);
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, AttendancePermissions>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [review, setReview] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const dirty = Object.keys(drafts).length > 0;

  async function save(id: string) {
    const values = drafts[id];
    if (!values || saving) return;
    setSaving(id);
    try {
      const result = await supabase.from("departments").update(values).eq("id", id).select("id");
      if (result.error) throw result.error;
      if (!result.data.length) throw new Error("Administrator access required.");
      setDrafts((prev) => { const next = { ...prev }; delete next[id]; return next; });
      setReview(""); setReasoning("");
      await qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department permissions saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save permissions."); }
    finally { setSaving(null); }
  }

  async function runReview(resume = false) {
    if (running || dirty || saving) return;
    setRunning(true); setError("");
    if (!resume) { setReview(""); setReasoning(""); }
    const controller = new AbortController(); abort.current = controller;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Sign in required.");
      const response = await fetch("/api/public/permission-review", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ resume }), signal: controller.signal });
      if (!response.ok) {
        const payload = await response.json();
        setPaused(response.status === 402 || response.status === 403);
        throw new Error(payload.message ?? "AI review unavailable.");
      }
      if (resume) { setPaused(false); toast.success("Reviews resumed; start a new review after access is restored."); return; }
      if (!response.body) throw new Error("AI review returned no response.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "text") setReview((old) => old + event.text);
          if (event.type === "reasoning") setReasoning((old) => old + event.text);
          if (event.type === "error") setError(event.message);
        }
        if (chunk.done) break;
      }
    } catch (e) { setError(controller.signal.aborted ? "Review stopped. Partial advice has been kept." : e instanceof Error ? e.message : "AI review failed."); }
    finally { abort.current = null; setRunning(false); }
  }

  return <section className="mb-8 border-b pb-6">
    <h2 className="mb-2 flex items-center gap-2 text-lg font-bold"><ShieldCheck className="size-5 text-primary" />Attendance permissions</h2>
    <p className="mb-4 text-sm text-muted-foreground">Both Morning and Afternoon · Assigned department only · Administrators retain school-wide access · Future dates remain blocked</p>
    <div className="grid gap-4 lg:grid-cols-2">{departments.map((d) => {
      const values = drafts[d.id] ?? d;
      return <div key={d.id} className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-bold">{d.name}</h3>
        {fields.map(([key, role, label], i) => <div key={key} className="flex items-center justify-between gap-4 border-t py-3">
          <label htmlFor={`${d.id}-${key}`} className="min-w-0 text-sm">{i % 2 === 0 && <span className="block font-semibold">{role}</span>}{label}</label>
          <Switch id={`${d.id}-${key}`} aria-label={`${d.name}: ${role} ${label}`} checked={values[key]} disabled={running || !!saving} onCheckedChange={(checked) => setDrafts((old) => ({ ...old, [d.id]: { manager_record_today: values.manager_record_today, manager_correct_past: values.manager_correct_past, teacher_record_today: values.teacher_record_today, teacher_correct_past: values.teacher_correct_past, [key]: checked } }))} />
        </div>)}
        {values.teacher_correct_past && <p className="mb-3 text-sm text-warning">Teachers can change historical attendance.</p>}
        {!values.manager_record_today && !values.teacher_record_today && <p className="mb-3 text-sm text-destructive">Only school administrators can record today.</p>}
        <Button onClick={() => void save(d.id)} disabled={!drafts[d.id] || !!saving || running}><Save />{saving === d.id ? "Saving…" : `Save permissions for ${d.name}`}</Button>
      </div>;
    })}</div>
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3"><h3 className="mr-auto font-bold">AI permission review</h3>
        {running ? <Button variant="outline" onClick={() => abort.current?.abort()}><Square />Stop review</Button> : <Button variant="outline" onClick={() => void runReview()} disabled={dirty || !!saving || paused}><Sparkles />Review saved permissions</Button>}
        {paused && <Button variant="outline" onClick={() => void runReview(true)} disabled={running}>Resume after access restored</Button>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Advice only; permissions change only when you save. Reviews use saved settings and staff counts, not personal records. Lovable AI usage may incur charges.</p>
      {dirty && <p className="mt-2 text-sm text-muted-foreground">Save department changes before reviewing.</p>}
      {running && <p role="status" className="mt-3 text-sm text-muted-foreground">Reviewing saved access…</p>}
      {reasoning && <details className="mt-3 text-sm text-muted-foreground"><summary>Review notes</summary><p className="mt-2 whitespace-pre-wrap">{reasoning}</p></details>}
      {review && <div className="mt-4 whitespace-pre-wrap border-l-2 border-primary pl-4 text-sm leading-relaxed">{review}</div>}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  </section>;
}