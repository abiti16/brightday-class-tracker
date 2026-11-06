import type { TablesInsert } from "@/integrations/supabase/types";

export const ATTENDANCE_PERIODS = ["morning", "afternoon"] as const;
export type AttendancePeriod = (typeof ATTENDANCE_PERIODS)[number];
export const periodLabel = (period: AttendancePeriod) => period === "morning" ? "Morning" : "Afternoon";
export const ATTENDANCE_CONFLICT = "student_id,date,period";

export function attendanceRows(
  students: { id: string }[],
  marks: Record<string, "present" | "absent" | "late">,
  classId: string,
  date: string,
  period: AttendancePeriod,
  recordedBy: string | null,
): TablesInsert<"attendance">[] {
  return students.map((student) => {
    const status = marks[student.id];
    if (!status) throw new Error("Mark all students first.");
    return { student_id: student.id, class_id: classId, date, period, status, recorded_by: recordedBy, updated_at: new Date().toISOString() };
  });
}