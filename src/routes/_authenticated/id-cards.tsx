import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Search } from "lucide-react";
import { classesQuery, studentsQuery } from "@/lib/data";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/id-cards")({
  head: () => ({
    meta: [
      { title: "Student ID cards – Attendly" },
      { name: "description", content: "Printable student ID cards with QR codes for fast attendance scanning." },
      { property: "og:title", content: "Student ID cards – Attendly" },
      { property: "og:description", content: "Printable student ID cards with QR codes." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(classesQuery), context.queryClient.ensureQueryData(studentsQuery)]),
  component: IdCardsPage,
});

function IdCardsPage() {
  const { data: classes } = useSuspenseQuery(classesQuery);
  const { data: students } = useSuspenseQuery(studentsQuery);
  const [classId, setClassId] = useState("all");
  const [search, setSearch] = useState("");
  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.label])), [classes]);
  const visible = students.filter(
    (s) =>
      (classId === "all" || s.class_id === classId) &&
      (s.full_name + s.student_code).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="print:hidden">
        <PageHeader title="Student ID cards" description="Each card has a QR code. Scan it on the Attendance page to mark the student present." />
        <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 shadow-card sm:grid-cols-[1fr_1fr_auto]">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Name or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => window.print()} disabled={!visible.length}><Printer /> Print cards</Button>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No students found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
          {visible.map((s) => (
            <div key={s.id} className="break-inside-avoid overflow-hidden rounded-xl border bg-card shadow-card">
              <div className="bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Student ID card</div>
              <div className="flex items-center gap-4 p-4">
                <div className="rounded-md bg-background p-1.5">
                  <QRCodeSVG value={s.student_code} size={96} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-bold">{s.full_name}</div>
                  <div className="font-mono text-sm">{s.student_code}</div>
                  <div className="text-sm text-muted-foreground">{classMap[s.class_id ?? ""] ?? "No class"}</div>
                  <div className="text-xs text-muted-foreground">{s.gender}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
