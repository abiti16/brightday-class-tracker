import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "teacher" | "manager" | "student";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: roles, error: roleError }, { data: profile }, { data: membership, error: membershipError }, superAdmin, link, review] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("profiles").select("full_name,email").eq("id", u.user.id).maybeSingle(),
      supabase.from("department_memberships").select("department_id,role,can_take,can_edit,departments(name)").eq("user_id", u.user.id).maybeSingle(),
      supabase.rpc("is_super_admin", { _user: u.user.id }),
      supabase.from("student_accounts").select("student_id,students(full_name,student_code,class_id)").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("registration_reviews").select("status").eq("user_id", u.user.id).maybeSingle(),
    ]);
    if (roleError || membershipError || superAdmin.error || link.error || review.error) throw roleError ?? membershipError ?? superAdmin.error ?? link.error ?? review.error;
    const list = (roles ?? []).map((r) => r.role as string);
    const student = link.data?.students ? { id: link.data.student_id, name: link.data.students.full_name, code: link.data.students.student_code, class_id: link.data.students.class_id } : null;
    const role: Role | null = list.includes("admin") ? "admin" : membership?.role === "manager" ? "manager" : membership ? "teacher" : student ? "student" : null;
    return {
      id: u.user.id,
      isSuperAdmin: superAdmin.data === true,
      email: u.user.email ?? "",
      name: profile?.full_name || u.user.email || "User",
      role,
      /** Approved as teacher but not yet placed in a department. */
      teacherWithoutDepartment: !membership && list.includes("teacher"),
      declined: review.data?.status === "rejected",
      student,
      membership: membership ? { department_id: membership.department_id, role: membership.role as "manager" | "teacher", can_take: membership.can_take, can_edit: membership.can_edit, name: membership.departments?.name ?? "" } : null,
    };
  },
});

export function useMe() {
  return useSuspenseQuery(meQuery).data;
}

export const isStaffRole = (role: Role | null | undefined) => role === "admin" || role === "manager" || role === "teacher";
