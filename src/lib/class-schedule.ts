import { sessionsForDepartment, sessionTime, type AttendanceSession } from "@/lib/attendance-period";

/** One row per class session: the school-wide class schedule. */
export type ScheduleRow = { grade: string; class: string; department: string; session: string; start_time: string; students: number };

export const SCHEDULE_HEAD = ["Grade", "Class", "Department", "Session", "Start time", "Students"];

export function classScheduleRows(
  classes: { id: string; name: string; grade: string; department: string; department_id: string | null }[],
  sessions: AttendanceSession[],
  students: { class_id: string | null }[],
): ScheduleRow[] {
  return classes.flatMap((c) => {
    const count = students.filter((s) => s.class_id === c.id).length;
    const list = sessionsForDepartment(sessions, c.department_id);
    if (!list.length) return [{ grade: c.grade, class: c.name, department: c.department, session: "No sessions yet", start_time: "", students: count }];
    return list.map((s) => ({ grade: c.grade, class: c.name, department: c.department, session: s.name, start_time: sessionTime(s), students: count }));
  });
}

export const scheduleBody = (rows: ScheduleRow[]) => rows.map((r) => [r.grade, r.class, r.department, r.session, r.start_time, r.students]);

/** "Grade 9 – Section A · Morning · 08:00, Afternoon · 14:00" style summary for the export subtitle. */
export function scheduleSummary(rows: ScheduleRow[]) {
  const classes = new Set(rows.map((r) => `${r.grade} – ${r.class}`)).size;
  const sessions = new Set(rows.map((r) => r.session)).size;
  return `${classes} classes · ${rows.length} class sessions · ${sessions} session types`;
}
