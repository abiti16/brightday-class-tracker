import type { FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { classesQuery, gradesQuery, nameSchema, studentsQuery } from "@/lib/data";
import { useMe } from "@/lib/session";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes – Attendly" }, { name: "description", content: "Manage grades and classes." }, { property: "og:title", content: "Classes – Attendly" }, { property: "og:description", content: "Manage grades and classes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context: { queryClient: q } }) =>
    Promise.all([q.ensureQueryData(classesQuery), q.ensureQueryData(gradesQuery), q.ensureQueryData(studentsQuery)]),
  component: ClassesPage,
});

function ClassesPage() {
  const isAdmin = useMe()?.role === "admin";
  const { data: grades } = useSuspenseQuery(gradesQuery);
  const { data: classes } = useSuspenseQuery(classesQuery);
  const { data: students } = useSuspenseQuery(studentsQuery);
  const qc = useQueryClient();
  const [gradeName, setGradeName] = useState("");
  const [className, setClassName] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  const refresh = () => ["grades", "classes", "students"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  async function addGrade(e: FormEvent) {
    e.preventDefault();
    const r = nameSchema.safeParse(gradeName);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Invalid"); return; }
    const { error } = await supabase.from("grades").insert({ name: r.data });
    if (error) { toast.error(error.code === "23505" ? "That grade already exists" : error.message); return; }
    toast.success("Grade created");
    setGradeName("");
    refresh();
  }
  async function addClass(e: FormEvent) {
    e.preventDefault();
    if (!classGrade) { toast.error("Select a grade"); return; }
    const r = nameSchema.safeParse(className);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Invalid"); return; }
    const { error } = await supabase.from("classes").insert({ name: r.data, grade_id: classGrade });
    if (error) { toast.error(error.code === "23505" ? "That class already exists in this grade" : error.message); return; }
    toast.success("Class created");
    setClassName("");
    refresh();
  }
  async function del(table: "grades" | "classes", id: string, label: string) {
    if (!confirm(`Delete ${label}? Students in it become unassigned.`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    refresh();
  }
  async function assign() {
    if (!assignTo || !picked.length) { toast.error("Select at least one student"); return; }
    const { error } = await supabase.from("students").update({ class_id: assignTo }).in("id", picked);
    if (error) { toast.error(error.message); return; }
    toast.success(`${picked.length} student(s) assigned`);
    setAssignTo(null);
    setPicked([]);
    refresh();
  }

  const target = classes.find((c) => c.id === assignTo);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Classes" description={`${grades.length} grades · ${classes.length} classes`} />
      {isAdmin && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <form onSubmit={addGrade} className="flex gap-2 rounded-xl border bg-card p-4 shadow-card">
            <Input placeholder="New grade, e.g. Grade 12" value={gradeName} onChange={(e) => setGradeName(e.target.value)} />
            <Button type="submit"><Plus /> Grade</Button>
          </form>
          <form onSubmit={addClass} className="flex flex-wrap gap-2 rounded-xl border bg-card p-4 shadow-card sm:flex-nowrap">
            <Select value={classGrade} onValueChange={setClassGrade}>
              <SelectTrigger className="sm:w-40"><SelectValue placeholder="Grade" /></SelectTrigger>
              <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Class name, e.g. Section C" value={className} onChange={(e) => setClassName(e.target.value)} />
            <Button type="submit"><Plus /> Class</Button>
          </form>
        </div>
      )}
      <div className="space-y-6">
        {grades.map((g) => (
          <section key={g.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{g.name}</h2>
              {isAdmin && <Button size="sm" variant="ghost" onClick={() => del("grades", g.id, g.name)}><Trash2 className="text-destructive" /> Delete grade</Button>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.filter((c) => c.grade_id === g.id).map((c) => {
                const members = students.filter((s) => s.class_id === c.id);
                return (
                  <Card key={c.id} className="shadow-card">
                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="size-4" />{members.length}</span>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {members.slice(0, 4).map((m) => m.full_name).join(", ") || "No students yet"}
                        {members.length > 4 && ` +${members.length - 4} more`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline"><Link to="/students" search={{ class: c.id }}>View students</Link></Button>
                        {isAdmin && <Button size="sm" variant="secondary" onClick={() => { setPicked([]); setAssignTo(c.id); }}><UserPlus /> Assign</Button>}
                        {isAdmin && <Button size="icon" variant="ghost" aria-label="Delete class" onClick={() => del("classes", c.id, c.label)}><Trash2 className="text-destructive" /></Button>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {classes.every((c) => c.grade_id !== g.id) && <p className="text-sm text-muted-foreground">No classes in this grade.</p>}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!assignTo} onOpenChange={(o) => !o && setAssignTo(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign students to {target?.label}</DialogTitle></DialogHeader>
          <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-md border">
            {students.filter((s) => s.class_id !== assignTo).map((s) => {
              const cur = classes.find((c) => c.id === s.class_id);
              return (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
                    <Checkbox checked={picked.includes(s.id)} onCheckedChange={(v) => setPicked(v ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
                    <span className="flex-1 text-sm font-medium">{s.full_name}</span>
                    <span className="text-xs text-muted-foreground">{cur?.label ?? "Unassigned"}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTo(null)}>Cancel</Button>
            <Button onClick={assign}>Assign {picked.length || ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
