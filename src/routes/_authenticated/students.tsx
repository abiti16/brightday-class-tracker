import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { attendanceDaysQuery, classesQuery, gradesQuery, studentSchema, studentsQuery, type StudentForm } from "@/lib/data";
import { daysTargetValue, matchesDaysFilter, NO_DAYS, type DaysComparator, type DaysMeasure } from "@/lib/attendance-period";
import { useMe } from "@/lib/session";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Search = { class?: string };

export const Route = createFileRoute("/_authenticated/students")({
  validateSearch: (s: Record<string, unknown>): Search => (typeof s["class"] === "string" ? { class: s["class"] } : {}),
  head: () => ({ meta: [{ title: "Students – Attendly" }, { name: "description", content: "Manage student records." }, { property: "og:title", content: "Students – Attendly" }, { property: "og:description", content: "Manage student records." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context: { queryClient: q } }) =>
    Promise.all([q.ensureQueryData(studentsQuery), q.ensureQueryData(classesQuery), q.ensureQueryData(gradesQuery), q.ensureQueryData(attendanceDaysQuery)]),
  component: StudentsPage,
});

const empty: StudentForm = { student_code: "", full_name: "", gender: "" as "Male", class_id: "", phone: "" };

function StudentsPage() {
  const me = useMe();
  const isAdmin = me?.role === "admin";
  const sp = Route.useSearch();
  const { data: students } = useSuspenseQuery(studentsQuery);
  const { data: classes } = useSuspenseQuery(classesQuery);
  const { data: grades } = useSuspenseQuery(gradesQuery);
  const { data: days } = useSuspenseQuery(attendanceDaysQuery);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [cls, setCls] = useState(sp.class ?? "all");
  const [gender, setGender] = useState("all");
  const [daysMeasure, setDaysMeasure] = useState<DaysMeasure>("attended");
  const [daysCmp, setDaysCmp] = useState<DaysComparator>("any");
  const [daysTarget, setDaysTarget] = useState("");
  const [editing, setEditing] = useState<{ id?: string; form: StudentForm } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c])), [classes]);

  const dayCount = (id: string) => days[id] ?? NO_DAYS;
  const daysActive = daysCmp !== "any";

  const filtered = students.filter((s) => {
    const c = s.class_id ? classMap[s.class_id] : undefined;
    return (
      (s.full_name + s.student_code + (s.phone ?? "")).toLowerCase().includes(q.toLowerCase()) &&
      (grade === "all" || c?.grade_id === grade) &&
      (cls === "all" || s.class_id === cls) &&
      (gender === "all" || s.gender === gender) &&
      matchesDaysFilter(dayCount(s.id), daysMeasure, daysCmp, daysTargetValue(daysTarget))
    );
  });

  async function save() {
    if (!editing) return;
    const parsed = studentSchema.safeParse(editing.form);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (e[String(i.path[0])] = i.message));
      { setErrors(e); return; }
    }
    const payload = { ...parsed.data, student_code: parsed.data.student_code.toUpperCase(), phone: parsed.data.phone || null };
    const { error } = editing.id
      ? await supabase.from("students").update(payload).eq("id", editing.id)
      : await supabase.from("students").insert(payload);
    if (error) {
      if (error.code === "23505") { setErrors({ student_code: "This Student ID already exists" }); return; }
      { toast.error(error.message); return; }
    }
    toast.success(editing.id ? "Student updated" : "Student added");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["students"] });
  }

  async function remove() {
    if (!deleting) return;
    const { error } = await supabase.from("students").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Student deleted");
    setDeleting(null);
    qc.invalidateQueries({ queryKey: ["students"] });
    qc.invalidateQueries({ queryKey: ["attendance"] });
  }

  const set = (k: keyof StudentForm, v: string) => editing && setEditing({ ...editing, form: { ...editing.form, [k]: v } });
  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Students" description={`${students.length} students enrolled`}>
        {isAdmin && (
          <Button onClick={() => { setErrors({}); setEditing({ form: { ...empty, class_id: cls !== "all" ? cls : "" } }); }}>
            <Plus /> Add student
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name, ID or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={grade} onValueChange={(v) => { setGrade(v); setCls("all"); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cls} onValueChange={setCls}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.filter((c) => grade === "all" || c.grade_id === grade).map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genders</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-card">
        <span className="text-sm font-semibold text-muted-foreground">Days</span>
        <Select value={daysMeasure} onValueChange={(v) => setDaysMeasure(v as DaysMeasure)}>
          <SelectTrigger className="w-[168px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="attended">Days attended</SelectItem>
            <SelectItem value="recorded">Days recorded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={daysCmp} onValueChange={(v) => setDaysCmp(v as DaysComparator)}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any number</SelectItem>
            <SelectItem value="atLeast">At least</SelectItem>
            <SelectItem value="exactly">Exactly</SelectItem>
            <SelectItem value="atMost">At most</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={0}
          className="w-24"
          placeholder="0"
          aria-label="Number of days"
          value={daysTarget}
          onChange={(e) => setDaysTarget(e.target.value)}
          disabled={!daysActive}
        />
        {daysActive && (
          <Button size="sm" variant="ghost" onClick={() => { setDaysCmp("any"); setDaysTarget(""); }}>Clear</Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {students.length} students
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Full name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Days attended</TableHead>
              <TableHead className="text-right">Days recorded</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const c = s.class_id ? classMap[s.class_id] : undefined;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.student_code}</TableCell>
                  <TableCell className="font-semibold">{s.full_name}</TableCell>
                  <TableCell>{s.gender}</TableCell>
                  <TableCell>{c?.grade ?? "—"}</TableCell>
                  <TableCell>{c?.name ?? "Unassigned"}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{dayCount(s.id).attended}</TableCell>
                  <TableCell className="text-right tabular-nums">{dayCount(s.id).recorded}</TableCell>
                  {isAdmin && (
                    <TableCell className="whitespace-nowrap text-right">
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => {
                        setErrors({});
                        setEditing({ id: s.id, form: { student_code: s.student_code, full_name: s.full_name, gender: s.gender as "Male", class_id: s.class_id ?? "", phone: s.phone ?? "" } });
                      }}><Pencil /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDeleting({ id: s.id, name: s.full_name })}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={isAdmin ? 9 : 8} className="py-10 text-center text-muted-foreground">No students match your filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit student" : "Add student"}</DialogTitle></DialogHeader>
          {editing && (
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="space-y-1.5"><Label>Student ID</Label><Input value={editing.form.student_code} onChange={(e) => set("student_code", e.target.value)} placeholder="STU-0100" />{err("student_code")}</div>
              <div className="space-y-1.5"><Label>Full name</Label><Input value={editing.form.full_name} onChange={(e) => set("full_name", e.target.value)} />{err("full_name")}</div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={editing.form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>{err("gender")}
              </div>
              <div className="space-y-1.5">
                <Label>Grade & class</Label>
                <Select value={editing.form.class_id} onValueChange={(v) => set("class_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>{err("class_id")}
              </div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Phone number</Label><Input value={editing.form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+251 911 000 000" />{err("phone")}</div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the student and all their attendance history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
