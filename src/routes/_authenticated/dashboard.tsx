import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock, GraduationCap, Percent, Users, XCircle } from "lucide-react";
import { attendanceRangeQuery, classesQuery, departmentsQuery, sessionsQuery, studentsQuery, summarize, today } from "@/lib/data";
import { PageHeader } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AttendancePeriodSelect } from "@/components/AttendancePeriodSelect";
import { sessionOptions, type AttendancePeriod } from "@/lib/attendance-period";

const from = () => format(subDays(new Date(), 13), "yyyy-MM-dd");

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – Attendly" }, { name: "description", content: "Department session attendance overview." }, { property: "og:title", content: "Dashboard – Attendly" }, { property: "og:description", content: "Department session attendance overview." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context: { queryClient: q } }) =>
    Promise.all([q.ensureQueryData(studentsQuery), q.ensureQueryData(classesQuery), q.ensureQueryData(attendanceRangeQuery(from(), today())), q.ensureQueryData(sessionsQuery), q.ensureQueryData(departmentsQuery)]),
  component: Dashboard,
});

const chartConfig = {
  present: { label: "Present", color: "var(--success)" },
  late: { label: "Late", color: "var(--warning)" },
  absent: { label: "Absent", color: "var(--destructive)" },
};

function Dashboard() {
  const { data: students } = useSuspenseQuery(studentsQuery);
  const { data: classes } = useSuspenseQuery(classesQuery);
  const { data: allRows } = useSuspenseQuery(attendanceRangeQuery(from(), today()));
  const { data: allSessions } = useSuspenseQuery(sessionsQuery);
  const { data: departments } = useSuspenseQuery(departmentsQuery);
  const options = sessionOptions(allSessions, departments);
  const [chosen, setSession] = useState<AttendancePeriod>("");
  const session = options.some((o) => o.value === chosen) ? chosen : options[0]?.value ?? "";
  const sessionName = options.find((o) => o.value === session)?.label ?? "session";
  const rows = allRows.filter((r) => r.period === session);
  const t = today();
  const todayRows = rows.filter((r) => r.date === t);
  const s = summarize(todayRows);
  const unmarked = students.length - todayRows.length;

  const dates = [...new Set(rows.map((r) => r.date))];
  const trend = dates.map((d) => {
    const x = summarize(rows.filter((r) => r.date === d));
    return { day: format(new Date(d + "T00:00"), "MMM d"), present: x.present, late: x.late, absent: x.absent };
  });
  const period = summarize(rows);
  const pie = [
    { name: "present", value: period.present, fill: "var(--color-present)" },
    { name: "late", value: period.late, fill: "var(--color-late)" },
    { name: "absent", value: period.absent, fill: "var(--color-absent)" },
  ];
  const byClass = classes.map((c) => {
    const x = summarize(rows.filter((r) => r.class_id === c.id));
    return { name: c.label.replace("Grade ", "G").replace("Section ", ""), rate: x.rate };
  });

  const stats = [
    { label: "Total students", value: students.length, icon: Users, tone: "text-primary bg-accent" },
    { label: "Total classes", value: classes.length, icon: GraduationCap, tone: "text-primary bg-accent" },
    { label: "Present today", value: s.present, icon: CheckCircle2, tone: "text-success bg-success/15" },
    { label: "Absent today", value: s.absent, icon: XCircle, tone: "text-destructive bg-destructive/15" },
    { label: "Late today", value: s.late, icon: Clock, tone: "text-warning-foreground bg-warning/20" },
    { label: "Attendance today", value: `${s.rate}%`, icon: Percent, tone: "text-primary bg-accent" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Dashboard" description={format(new Date(), "EEEE, MMMM d, yyyy")}>
        <Button asChild>
          <Link to="/attendance">Take attendance</Link>
        </Button>
      </PageHeader>
      <div className="mb-4 max-w-sm"><AttendancePeriodSelect value={session} onChange={setSession} options={options} /></div>
      {unmarked > 0 && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
          {todayRows.length === 0 ? `No ${sessionName} attendance recorded yet today.` : `${unmarked} students have not been marked for ${sessionName}.`}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((x) => (
          <Card key={x.label} className="shadow-card">
            <CardContent className="p-4">
              <div className={`mb-3 grid size-9 place-items-center rounded-lg ${x.tone}`}>
                <x.icon className="size-5" />
              </div>
              <div className="text-2xl font-extrabold">{x.value}</div>
              <div className="text-xs text-muted-foreground">{x.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Last 14 days</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={trend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="present" stackId="a" fill="var(--color-present)" />
                <Bar dataKey="late" stackId="a" fill="var(--color-late)" />
                <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">14-day breakdown · {period.rate}%</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto h-72 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                  {pie.map((p) => <Cell key={p.name} fill={p.fill} />)}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-card lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Attendance rate by class (14 days)</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={{ rate: { label: "Rate %", color: "var(--primary)" } }} className="h-64 w-full">
              <BarChart data={byClass}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="rate" fill="var(--color-rate)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
