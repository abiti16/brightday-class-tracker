import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, type Role } from "@/lib/session";
import { PageHeader } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff & roles – Attendly" }, { name: "description", content: "Manage staff access." }, { property: "og:title", content: "Staff & roles – Attendly" }, { property: "og:description", content: "Manage staff access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Staff,
});

function Staff() {
  const me = useMe();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["staff"],
    enabled: me?.role === "admin",
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,created_at").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      return (p ?? []).map((x) => {
        const roles = (r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role);
        return { ...x, role: (roles.includes("admin") ? "admin" : roles.includes("teacher") ? "teacher" : "none") as Role | "none" };
      });
    },
  });

  if (me?.role !== "admin") return <p className="text-muted-foreground">Only administrators can manage staff.</p>;

  async function setRole(userId: string, role: Role | "none") {
    const { error: e1 } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (e1) { toast.error(e1.message); return; }
    if (role !== "none") {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Access updated");
    qc.invalidateQueries({ queryKey: ["staff"] });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Staff & roles" description="New sign-ups have no access until you assign a role." />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead className="w-44">Role</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3}>Loading…</TableCell></TableRow>}
            {data.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-semibold">{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {u.id === me.id ? <span className="text-sm capitalize">{u.role} (you)</span> : (
                    <Select value={u.role} onValueChange={(v) => setRole(u.id, v as Role | "none")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No access</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
