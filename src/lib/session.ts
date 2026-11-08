import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "teacher" | "manager";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: roles, error: roleError }, { data: profile }, { data: membership, error: membershipError }, superAdmin] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("profiles").select("full_name,email").eq("id", u.user.id).maybeSingle(),
      supabase.from("department_memberships").select("department_id,role,can_take,can_edit,departments(name)").eq("user_id", u.user.id).maybeSingle(),
      supabase.rpc("is_super_admin", { _user: u.user.id }),
    ]);
    if (roleError || membershipError || superAdmin.error) throw roleError ?? membershipError ?? superAdmin.error;
    const list = (roles ?? []).map((r) => r.role as Role);
    const role: Role | null = list.includes("admin") ? "admin" : membership?.role === "manager" ? "manager" : membership ? "teacher" : null;
    return {
      id: u.user.id,
      isSuperAdmin: superAdmin.data === true,
      email: u.user.email ?? "",
      name: profile?.full_name || u.user.email || "User",
      role,
      membership: membership ? { department_id: membership.department_id, role: membership.role as "manager" | "teacher", can_take: membership.can_take, can_edit: membership.can_edit, name: membership.departments?.name ?? "" } : null,
    };
  },
});

export function useMe() {
  return useSuspenseQuery(meQuery).data;
}
