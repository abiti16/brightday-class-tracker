import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { summarize, type Status } from "@/lib/data";
import { periodLabel } from "@/lib/attendance-period";

export function MyAttendance({ student }: { student: { id: string; name: string; code: string; class_id: string | null } }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-attendance", student.id],
    queryFn: async () => {
      const [att, sessions, cls] = await Promise.all([
        supabase.from("attendance").select("date,period,status,class_id").eq("student_id", student.id).order("date", { ascending: false }).order("period"),
        supabase.from("attendance_sessions").select("key,name,start_time,department_id"),
        student.class_id ? supabase.from("classes").select("name,department_id,grades(name)").eq("id", student.class_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (att.error || sessions.error || cls.error) throw att.error ?? sessions.error ?? cls.error;
      return { rows: (att.data ?? []) as { date: string; period: string; status: Status; class_id: string | null }[], sessions: sessions.data ?? [], cls: cls.data };
    },
  });
  const rows = data?.rows ?? [];
  const s = summarize(rows);
  const daysAttended = new Set(rows.filter((r) => r.status !== "absent").map((r) => r.date)).size;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My attendance" description={`${student.name} · ${student.code}${data?.cls ? ` · ${data.cls.grades?.name ?? ""} ${data.cls.name}` : ""}`} />
      {error && <p role="alert" className="mb-4 text-destructive">{error.message}</p>}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Attendance", `${s.rate}%`], ["Days attended", daysAttended], ["Present", s.present], ["Absent", s.absent]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-2xl font-extrabold">{v}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Day</TableHead><TableHead>Session</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`${r.date}:${r.period}`}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{format(new Date(r.date + "T00:00"), "EEEE")}</TableCell>
                <TableCell>{periodLabel(r.period, data?.sessions ?? [], data?.cls?.department_id)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{isLoading ? "Loading…" : "No attendance recorded yet."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
