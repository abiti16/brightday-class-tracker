export type DepartmentRole = "manager" | "teacher";

export type AttendancePermissions = { manager_record_today: boolean; manager_correct_past: boolean; teacher_record_today: boolean; teacher_correct_past: boolean };
export const DEFAULT_PERMISSIONS: AttendancePermissions = { manager_record_today: true, manager_correct_past: true, teacher_record_today: true, teacher_correct_past: false };

export function canRecordAttendance(schoolRole: string | null | undefined, membership: { department_id: string; role: DepartmentRole } | null | undefined, departmentId: string | null | undefined, date: string, currentDate: string, permissions: AttendancePermissions = DEFAULT_PERMISSIONS) {
  if (date > currentDate) return false;
  if (schoolRole === "admin") return true;
  if (!membership || !departmentId || membership.department_id !== departmentId) return false;
  return membership.role === "manager" ? (date === currentDate ? permissions.manager_record_today : permissions.manager_correct_past) : (date === currentDate ? permissions.teacher_record_today : permissions.teacher_correct_past);
}