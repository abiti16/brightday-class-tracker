import type { TablesInsert } from "@/integrations/supabase/types";

/** Session key stored in attendance.period. Each department names its own sessions. */
export type AttendancePeriod = string;
export type AttendanceSession = { key: string; name: string; start_time: string | null; department_id: string | null; active?: boolean; sort_order?: number };
export type SessionOption = { value: AttendancePeriod; label: string };

/** Sessions used by classes that are not assigned to a department. */
export const DEFAULT_SESSIONS: AttendanceSession[] = [
  { key: "morning", name: "Morning", start_time: "08:00:00", department_id: null },
  { key: "afternoon", name: "Afternoon", start_time: "14:00:00", department_id: null },
];
export const ATTENDANCE_CONFLICT = "student_id,date,period";

export const sessionTime = (s: Pick<AttendanceSession, "start_time">) => (s.start_time ? s.start_time.slice(0, 5) : "");
export const sessionText = (s: AttendanceSession) => (s.start_time ? `${s.name} · ${sessionTime(s)}` : s.name);

/** Active sessions of one department in display order; unassigned classes use the defaults. */
export function sessionsForDepartment(all: AttendanceSession[], departmentId: string | null | undefined): AttendanceSession[] {
  if (!departmentId) return DEFAULT_SESSIONS;
  return all
    .filter((s) => s.department_id === departmentId && s.active !== false)
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? "") || (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

/** One option per session key across departments, for school-wide views. */
export function sessionOptions(all: AttendanceSession[], departments: { id: string; name: string }[]): SessionOption[] {
  const byKey = new Map<string, AttendanceSession[]>();
  for (const s of [...DEFAULT_SESSIONS, ...all.filter((x) => x.active !== false)]) byKey.set(s.key, [...(byKey.get(s.key) ?? []), s]);
  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name;
  return [...byKey.entries()]
    .map(([key, list]) => {
      const named = list.filter((s) => s.department_id);
      const first: AttendanceSession = named[0] ?? list[0] ?? { key, name: key, start_time: null, department_id: null };
      const label = named.length === 1 && deptName(first.department_id) ? `${sessionText(first)} (${deptName(first.department_id)})` : sessionText(first);
      return { value: key, label, time: first.start_time ?? "" };
    })
    .sort((a, b) => a.time.localeCompare(b.time) || a.label.localeCompare(b.label))
    .map(({ value, label }) => ({ value, label }));
}

export function periodLabel(key: AttendancePeriod, all: AttendanceSession[] = [], departmentId?: string | null) {
  const s = all.find((x) => x.key === key && (!departmentId || x.department_id === departmentId)) ?? all.find((x) => x.key === key) ?? DEFAULT_SESSIONS.find((x) => x.key === key);
  return s?.name ?? "Session";
}

/** Students left unmarked (not scanned or tapped) are saved as absent. */
export function attendanceRows(
  students: { id: string }[],
  marks: Record<string, "present" | "absent" | "late">,
  classId: string,
  date: string,
  period: AttendancePeriod,
  recordedBy: string | null,
): TablesInsert<"attendance">[] {
  return students.map((student) => ({ student_id: student.id, class_id: classId, date, period, status: marks[student.id] ?? "absent", recorded_by: recordedBy, updated_at: new Date().toISOString() }));
}

export const unmarkedStudents = <T extends { id: string }>(students: T[], marks: Record<string, unknown>) => students.filter((s) => !marks[s.id]);

export type DaysComparator = "any" | "atLeast" | "exactly" | "atMost";
export function matchesDays(days: number, comparator: DaysComparator, target: number | null) {
  if (comparator === "any" || target === null || Number.isNaN(target)) return true;
  if (comparator === "atLeast") return days >= target;
  if (comparator === "atMost") return days <= target;
  return days === target;
}
