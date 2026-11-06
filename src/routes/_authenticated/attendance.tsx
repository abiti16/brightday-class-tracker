import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QrCode, Search } from "lucide-react";
import { QrScanner } from "@/components/QrScanner";
import { supabase } from "@/integrations/supabase/client";
import { classesQuery, STATUSES, today, type Status } from "@/lib/data";
import { useMe } from "@/lib/session";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Take attendance – Attendly" }, { name: "description", content: "Mark students present, absent or late." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(classesQuery),
  component: AttendancePage,
});

const statusStyle: Record<Status, string> = {
  present: "data-[on=true]:bg-success data-[on=true]:text-success-foreground data-[on=true]:border-success",
  late: "data-[on=true]:bg-warning data-[on=true]:text-warning-foreground data-[on=true]:border-warning",
  absent: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground data-[on=true]:border-destructive",
};

function AttendancePage() {
  const me = useMe();
  const isAdmin = me?.role === "admin";
  const { data: classes } = useSuspenseQuery(classesQuery);
  const [date, setDate] = useState(today());
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["roll", classId, date],
    enabled: !!classId,
    queryFn: async () => {
      const [{ data: st, error: e1 }, { data: att, error: e2 }] = await Promise.all([
        supabase.from("students").select("id,student_code,full_name,gender").eq("class_id", classId).order("full_name"),
        supabase.from("attendance").select("student_id,status").eq("date", date).eq("class_id", classId),
      ]);
      if (e1 || e2) throw e1 ?? e2;
      return { students: st ?? [], existing: Object.fromEntries((att ?? []).map((a) => [a.student_id, a.status as Status])) };
    },
  });

  useEffect(() => {
    if (data) setMarks(data.existing);
  }, [data]);

  const locked = !isAdmin && date !== today();
  const alreadySaved = data && Object.keys(data.existing).length > 0;
  const visible = useMemo(
    () => (data?.students ?? []).filter((s) => (s.full_name + s.student_code).toLowerCase().includes(search.toLowerCase())),
    [data, search],
  );
  const counts = STATUSES.map((s) => [s, Object.values(marks).filter((m) => m === s).length] as const);

  function handleScan(code: string) {
    const s = data?.students.find((x) => x.student_code.toLowerCase() === code.trim().toLowerCase());
    if (!s) { toast.error(`ID ${code} is not in this class.`); return; }
    setMarks((m) => ({ ...m, [s.id]: "present" }));
    toast.success(`${s.full_name} marked present`);
  }

  async function save() {
    if (!data) return;
    const missing = data.students.filter((s) => !marks[s.id]);
    if (missing.length) { toast.error(`Mark all students first (${missing.length} remaining).`); return; }
    if (date > today()) { toast.error("You cannot record attendance for a future date."); return; }
    setSaving(true);
    const rows = data.students.map((s) => ({
      student_id: s.id, class_id: classId, date, status: marks[s.id]!, recorded_by: me?.id ?? null, updated_at: new Date().toISOString(),
    }));
    // unique (student_id, date) prevents duplicates; upsert updates existing records instead
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    setSaving(false);
    if (error) { toast.error(error.message.includes("row-level") ? "You are not allowed to change attendance for this date." : error.message); return; }
    toast.success(alreadySaved ? "Attendance corrected" : "Attendance saved");
    qc.invalidateQueries({ queryKey: ["roll"] });
    qc.invalidateQueries({ queryKey: ["attendance"] });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Take attendance" description={isAdmin ? "Admins can record or correct any past date." : "Teachers can record and correct today's attendance."} />
      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 shadow-card sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Date</label>
          <Input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Class</label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={locked || !data} onClick={() => setMarks(Object.fromEntries((data?.students ?? []).map((s) => [s.id, "present" as Status])))}>
          Mark all present
        </Button>
        <Button size="sm" variant={scanning ? "default" : "outline"} disabled={locked || !data} onClick={() => setScanning(!scanning)}>
          <QrCode /> {scanning ? "Stop scanning" : "Scan ID cards"}
        </Button>
        <div className="flex-1" />
        {counts.map(([s, n]) => (
          <span key={s} className="text-sm capitalize text-muted-foreground"><b className="text-foreground">{n}</b> {s}</span>
        ))}
      </div>

      {scanning && !locked && (
        <div className="mb-4 rounded-xl border bg-card p-4 shadow-card">
          <p className="mb-2 text-sm text-muted-foreground">Hold a student's ID card QR code up to the camera. Scanned students are marked present — remember to save.</p>
          <div className="mx-auto max-w-sm"><QrScanner onScan={handleScan} /></div>
        </div>
      )}
      {locked && <p className="mb-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">View only — corrections to past dates require an administrator.</p>}
      {alreadySaved && !locked && <p className="mb-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">Attendance already recorded for this date. Saving will update the existing records.</p>}

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading students…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No students in this class.</p>
        ) : (
          <ul className="divide-y">
            {visible.map((s, i) => (
              <li key={s.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3">
                  <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
                  <div>
                    <div className="font-semibold">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">{s.student_code} · {s.gender}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:w-72">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={locked}
                      data-on={marks[s.id] === st}
                      onClick={() => setMarks({ ...marks, [s.id]: st })}
                      className={cn("rounded-md border px-2 py-1.5 text-sm font-semibold capitalize transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60", statusStyle[st])}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sticky bottom-4 mt-4 flex justify-end">
        <Button size="lg" onClick={save} disabled={saving || locked || !data?.students.length} className="shadow-card">
          {saving ? "Saving…" : alreadySaved ? "Save corrections" : "Save attendance"}
        </Button>
      </div>
    </div>
  );
}
