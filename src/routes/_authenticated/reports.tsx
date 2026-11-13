import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { FileSpreadsheet, FileText } from "lucide-react";
import { attendanceRangeQuery, classesQuery, departmentsQuery, sessionsQuery, studentsQuery, summarize, today, type Status } from "@/lib/data";
import { exportExcel, exportPdf } from "@/lib/export";
import { PageHeader, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttendancePeriodSelect } from "@/components/AttendancePeriodSelect";
import { dayCounts, daysTargetValue, matchesDaysFilter, periodLabel as sessionName, sessionOptions, type AttendancePeriod, type DaysComparator, type DaysMeasure } from "@/lib/attendance-period";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports – Attendly" }, { name: "description", content: "Department session attendance reports and exports." }, { property: "og:title", content: "Reports – Attendly" }, { property: "og:description", content: "Department session attendance reports and exports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context: { queryClient: q } }) => Promise.all([q.ensureQueryData(classesQuery), q.ensureQueryData(studentsQuery), q.ensureQueryData(sessionsQuery), q.ensureQueryData(departmentsQuery)]),
  component: Reports,
});

type Kind = "daily" | "weekly" | "monthly" | "student";
const f = (d: Date) => format(d, "yyyy-MM-dd");
const DAYS_CMP_LABEL: Record<DaysComparator, string> = { any: "", atLeast: "at least", exactly: "exactly", atMost: "at most" };

function range(kind: Kind, ref: string): [string, string] {
  const d = new Date(ref + "T00:00");
  if (kind === "daily") return [ref, ref];
  if (kind === "weekly") return [f(startOfWeek(d, { weekStartsOn: 1 })), f(endOfWeek(d, { weekStartsOn: 1 }))];
  if (kind === "monthly") return [f(startOfMonth(d)), f(endOfMonth(d))];
  return ["2000-01-01", today()];
}

function Reports() {
  const { data: classes } = useSuspenseQuery(classesQuery);
  const { data: students } = useSuspenseQuery(studentsQuery);
  const [kind, setKind] = useState<Kind>("daily");
  const [ref, setRef] = useState(today());
  const [cls, setCls] = useState("all");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [daysMeasure, setDaysMeasure] = useState<DaysMeasure>("attended");
  const [daysCmp, setDaysCmp] = useState<DaysComparator>("any");
  const [daysTarget, setDaysTarget] = useState("");
  const daysActive = daysCmp !== "any";
  const { data: allSessions } = useSuspenseQuery(sessionsQuery);
  const { data: departments } = useSuspenseQuery(departmentsQuery);
  const options = sessionOptions(allSessions, departments);
  const [chosen, setSession] = useState<AttendancePeriod>("");
  const session = options.some((o) => o.value === chosen) ? chosen : options[0]?.value ?? "";
  const classDept = Object.fromEntries(classes.map((c) => [c.id, c.department_id]));
  const sessionLabel = (key: AttendancePeriod, classId?: string | null) => (classId ? sessionName(key, allSessions, classDept[classId]) : options.find((o) => o.value === key)?.label ?? sessionName(key, allSessions));
  const [from, to] = range(kind, ref);
  const { data: allRows = [], isLoading } = useQuery(attendanceRangeQuery(from, to));
  const rows = useMemo(() => allRows.filter((r) => r.period === session), [allRows, session]);
  const classMap = Object.fromEntries(classes.map((c) => [c.id, c.label]));

  const byStudent = useMemo(() => {
    const g = new Map<string, typeof rows>();
    rows.forEach((r) => { const list = g.get(r.student_id) ?? []; list.push(r); g.set(r.student_id, list); });
    return g;
  }, [rows]);
  const dayCount = (id: string) => dayCounts(byStudent.get(id) ?? []);

  const perStudent = useMemo(() => {
    return students
      .filter((s) => cls === "all" || s.class_id === cls)
      .filter((s) => matchesDaysFilter(dayCounts(byStudent.get(s.id) ?? []), daysMeasure, daysCmp, daysTargetValue(daysTarget)))
      .map((s) => {
        const sr = byStudent.get(s.id) ?? [];
        return { s, ...summarize(sr), days: dayCounts(sr), status: kind === "daily" ? (sr[0]?.status as Status | undefined) : undefined };
      });
  }, [students, byStudent, cls, kind, daysMeasure, daysCmp, daysTarget]);

  const studentChoices = useMemo(
    () => students.filter((s) => matchesDaysFilter(dayCounts(byStudent.get(s.id) ?? []), daysMeasure, daysCmp, daysTargetValue(daysTarget))),
    [students, byStudent, daysMeasure, daysCmp, daysTarget],
  );
  const activeStudent = studentChoices.some((s) => s.id === studentId) ? studentId : studentChoices[0]?.id ?? "";

  const history = rows.filter((r) => r.student_id === activeStudent).sort((a, b) => b.date.localeCompare(a.date));
  const hs = summarize(history);
  const student = students.find((s) => s.id === activeStudent);
  const visibleIds = new Set(perStudent.map((p) => p.s.id));
  const total = summarize(kind === "student" ? history : rows.filter((r) => (cls === "all" || r.class_id === cls) && visibleIds.has(r.student_id)));

  const periodLabel = kind === "daily" ? from : kind === "student" ? "All records" : `${from} to ${to}`;
  const scopeLabel = cls === "all" ? "All classes" : classMap[cls];

  function exportData(type: "pdf" | "xlsx") {
    let title: string, head: string[], body: (string | number)[][];
    if (kind === "student" && student) {
      title = `${sessionLabel(session)} attendance history - ${student.full_name}`;
      head = ["Date", "Period", "Status", "Class"];
      body = history.map((h) => [h.date, sessionLabel(h.period, h.class_id), h.status, h.class_id ? classMap[h.class_id] ?? "" : ""]);
      body.push(["Total", sessionLabel(session), `${hs.rate}% attendance`, `${hs.present}P / ${hs.late}L / ${hs.absent}A`]);
    } else {
      title = `${sessionLabel(session)} ${kind} attendance report ${periodLabel}`;
      head = kind === "daily"
        ? ["Student ID", "Name", "Class", "Days attended", "Days recorded", "Period", "Status"]
        : ["Student ID", "Name", "Class", "Days attended", "Days recorded", "Period", "Present", "Late", "Absent", "Sessions", "Attendance %"];
      body = perStudent.map((p) => {
        const base = [p.s.student_code, p.s.full_name, p.s.class_id ? classMap[p.s.class_id] ?? "" : "", p.days.attended, p.days.recorded, sessionLabel(session)];
        return kind === "daily" ? [...base, p.status ?? "Not marked"] : [...base, p.present, p.late, p.absent, p.total, `${p.rate}%`];
      });
    }
    const daysNote = daysActive ? ` · Days ${daysMeasure} ${DAYS_CMP_LABEL[daysCmp]} ${daysTarget}` : "";
    const sub = `${scopeLabel} · ${periodLabel} · ${sessionLabel(session)}${daysNote} · Overall ${total.rate}% (present ${total.present}, late ${total.late}, absent ${total.absent})`;
    if (type === "pdf") exportPdf(title, sub, head, body);
    else exportExcel(title, head, body);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Reports" description="Attendance % counts present and late as attended.">
        <Button variant="outline" onClick={() => exportData("pdf")}><FileText /> PDF</Button>
        <Button variant="outline" onClick={() => exportData("xlsx")}><FileSpreadsheet /> Excel</Button>
      </PageHeader>
      <div className="mb-4 max-w-sm"><AttendancePeriodSelect value={session} onChange={setSession} options={options} /></div>
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)} className="mb-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="student">Student history</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {kind === "student" ? (
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>{studentChoices.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.student_code}) · {dayCount(s.id).attended} days attended</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <>
            <Input type="date" value={ref} max={today()} onChange={(e) => e.target.value && setRef(e.target.value)} />
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
        <div className="flex items-center rounded-md border bg-card px-3 text-sm text-muted-foreground">{periodLabel}</div>
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
          {kind === "student"
            ? `${studentChoices.length} of ${students.length} students`
            : `${perStudent.length} of ${students.filter((s) => cls === "all" || s.class_id === cls).length} students`}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Attendance", `${total.rate}%`], ["Present", total.present], ["Late", total.late], ["Absent", total.absent]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-2xl font-extrabold">{v}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p> : kind === "student" ? (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Day</TableHead><TableHead>Period</TableHead><TableHead>Class</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={`${h.date}:${h.period}`}>
                  <TableCell>{h.date}</TableCell>
                  <TableCell>{format(new Date(h.date + "T00:00"), "EEEE")}</TableCell>
                  <TableCell>{sessionLabel(h.period, h.class_id)}</TableCell>
                  <TableCell>{h.class_id ? classMap[h.class_id] : "—"}</TableCell>
                  <TableCell><StatusBadge status={h.status} /></TableCell>
                </TableRow>
              ))}
              {!history.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No records.</TableCell></TableRow>}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead><TableHead>Name</TableHead><TableHead>Class</TableHead>
                <TableHead className="text-right">Days attended</TableHead><TableHead className="text-right">Days recorded</TableHead>
                {kind === "daily" ? <TableHead>Status</TableHead> : (
                  <><TableHead>Present</TableHead><TableHead>Late</TableHead><TableHead>Absent</TableHead><TableHead>Attendance %</TableHead></>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {perStudent.map((p) => (
                <TableRow key={p.s.id}>
                  <TableCell className="font-mono text-xs">{p.s.student_code}</TableCell>
                  <TableCell className="font-semibold">{p.s.full_name}</TableCell>
                  <TableCell>{p.s.class_id ? classMap[p.s.class_id] : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.days.attended}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.days.recorded}</TableCell>
                  {kind === "daily" ? (
                    <TableCell>{p.status ? <StatusBadge status={p.status} /> : <span className="text-xs text-muted-foreground">Not marked</span>}</TableCell>
                  ) : (
                    <>
                      <TableCell>{p.present}</TableCell><TableCell>{p.late}</TableCell><TableCell>{p.absent}</TableCell>
                      <TableCell className={p.total && p.rate < 75 ? "font-bold text-destructive" : "font-semibold"}>{p.total ? `${p.rate}%` : "—"}</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
