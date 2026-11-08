export type DepartmentRole = "manager" | "teacher";

export type AttendancePermissions = { manager_record_today: boolean; manager_correct_past: boolean; teacher_record_today: boolean; teacher_correct_past: boolean; manager_edit_today: boolean; teacher_edit_today: boolean };
export const DEFAULT_PERMISSIONS: AttendancePermissions = { manager_record_today: true, manager_correct_past: true, teacher_record_today: true, teacher_correct_past: false, manager_edit_today: false, teacher_edit_today: false };
export function hasAttendancePermission(superAdmin: boolean, membership: { department_id: string; role: DepartmentRole; can_take: boolean; can_edit: boolean } | null | undefined, departmentId: string | null | undefined, date: string, currentDate: string, editing: boolean, permissions: AttendancePermissions = DEFAULT_PERMISSIONS) {
  if (date > currentDate) return false;
  if (superAdmin) return true;
  if (!membership || membership.department_id !== departmentId || !(editing ? membership.can_edit : membership.can_take)) return false;
  if (date < currentDate) return membership.role === "manager" ? permissions.manager_correct_past : permissions.teacher_correct_past;
  return membership.role === "manager" ? (editing ? permissions.manager_edit_today : permissions.manager_record_today) : (editing ? permissions.teacher_edit_today : permissions.teacher_record_today);
}

export function canRecordAttendance(schoolRole: string | null | undefined, membership: { department_id: string; role: DepartmentRole } | null | undefined, departmentId: string | null | undefined, date: string, currentDate: string) {
  if (date > currentDate) return false;
  if (schoolRole === "admin") return true;
  if (!membership || !departmentId || membership.department_id !== departmentId) return false;
  return membership.role === "manager" || date === currentDate;
}