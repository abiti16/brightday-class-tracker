export type DepartmentRole = "manager" | "teacher";

export function canRecordAttendance(schoolRole: string | null | undefined, membership: { department_id: string; role: DepartmentRole } | null | undefined, departmentId: string | null | undefined, date: string, currentDate: string) {
  if (date > currentDate) return false;
  if (schoolRole === "admin") return true;
  if (!membership || !departmentId || membership.department_id !== departmentId) return false;
  return membership.role === "manager" || date === currentDate;
}