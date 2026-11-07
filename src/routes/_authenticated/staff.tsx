import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { departmentsQuery, nameSchema } from "@/lib/data";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepartmentPermissions } from "@/components/DepartmentPermissions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff & roles – Attendly" }, { name: "description", content: "Manage staff access." }, { property: "og:title", content: "Staff & roles – Attendly" }, { property: "og:description", content: "Manage staff access." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(departmentsQuery),
  component: Staff,
});

function Staff() {
  const me = useMe();
  const admin = me?.role === "admin";
  const manager = me?.role === "manager";
  const qc = useQueryClient();
  const { data: departments } = useSuspenseQuery(departmentsQuery);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [departmentId, setDepartmentId] = useState(me?.membership?.department_id ?? "");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["staff", me?.id],
    enabled: admin || manager,
    queryFn: async () => {
      const [p, r, m] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,created_at").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("department_memberships").select("user_id,department_id,role"),
      ]);
      if (p.error || r.error || m.error) throw p.error ?? r.error ?? m.error;
      return (p.data ?? []).map((x) => ({ ...x,
        schoolRole: r.data?.some((y) => y.user_id === x.id && y.role === "admin") ? "admin" : r.data?.some((y) => y.user_id === x.id && y.role === "teacher") ? "teacher" : "none",
        membership: m.data?.find((y) => y.user_id === x.id),
      }));
    },
  });

  async function apply(action: () => PromiseLike<{ error: { message: string } | null }>) {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await action();
      if (error) { toast.error(error.message); return; }
      toast.success("Access updated");
      await qc.invalidateQueries();
    } finally { setBusy(false); }
  }

  if (!admin && !manager) return <p className="text-muted-foreground">Department manager or administrator access required.</p>;

  return <div className="mx-auto max-w-6xl">
    <PageHeader title="Staff & roles" description={admin ? "School administration" : me?.membership?.name ?? "Department staff"} />
    {admin && <DepartmentPermissions />}
    {admin && <section className="mb-8 border-b pb-6">
      <h2 className="mb-3 text-lg font-bold">Departments</h2>
      <div className="grid gap-4 sm:grid-cols-2">{departments.map((d) => <form key={d.id} className="flex gap-2" onSubmit={(e) => {
        e.preventDefault();
        const result = nameSchema.safeParse(names[d.id] ?? d.name);
        if (!result.success) { toast.error(result.error.issues[0]?.message ?? "Invalid name"); return; }
        void apply(() => supabase.from("departments").update({ name: result.data }).eq("id", d.id));
      }}>
        <Input aria-label={`Department name ${d.name}`} value={names[d.id] ?? d.name} onChange={(e) => setNames({ ...names, [d.id]: e.target.value })} />
        <Button type="submit" disabled={busy}>Save name</Button>
      </form>)}</div>
    </section>}
    <form className="mb-6 flex flex-wrap items-end gap-3" onSubmit={(e) => {
      e.preventDefault();
      if (!departmentId) { toast.error("Select a department"); return; }
      void apply(() => supabase.rpc("add_department_teacher", { _email: email, _department: departmentId }));
    }}>
      <div className="min-w-0 flex-1"><label className="mb-1 block text-sm font-medium" htmlFor="teacher-email">Registered teacher email</label><Input id="teacher-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {admin && <Select value={departmentId} onValueChange={setDepartmentId}><SelectTrigger className="w-48" aria-label="Teacher department"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>}
      <Button type="submit" disabled={busy}>Assign teacher</Button>
    </form>
    {error && <p role="alert" className="mb-3 text-destructive">{error.message}</p>}
    <div className="overflow-x-auto rounded-lg border bg-card shadow-card"><Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead>{admin && <TableHead>School role</TableHead>}<TableHead>Department</TableHead><TableHead>Department role</TableHead></TableRow></TableHeader>
      <TableBody>
        {isLoading && <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>}
        {data.map((u) => <TableRow key={u.id}>
          <TableCell className="font-semibold">{u.full_name || "—"}{u.id === me?.id && " (you)"}</TableCell>
          <TableCell>{u.email}</TableCell>
          {admin && <TableCell>{u.id === me?.id ? "Administrator" : <Select disabled={busy} value={u.schoolRole} onValueChange={(v) => { void apply(() => supabase.rpc("set_school_role", { _target: u.id, _role: v })); }}><SelectTrigger aria-label={`School role for ${u.full_name}`} className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No school role</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="admin">Administrator</SelectItem></SelectContent></Select>}</TableCell>}
          <TableCell>{admin ? <Select disabled={busy} value={u.membership?.department_id ?? "none"} onValueChange={(v) => {
            const d = v === "none" ? u.membership?.department_id : v;
            if (!d) return;
            void apply(() => supabase.rpc("set_department_access", { _target: u.id, _department: d, _role: v === "none" ? "none" : u.membership?.role ?? "teacher" }));
          }}><SelectTrigger className="w-44" aria-label={`Department for ${u.full_name}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select> : departments.find((d) => d.id === u.membership?.department_id)?.name ?? "—"}</TableCell>
          <TableCell>{u.membership ? (admin ? <Select disabled={busy} value={u.membership.role} onValueChange={(v) => {
            if (!u.membership) return;
            void apply(() => supabase.rpc("set_department_access", { _target: u.id, _department: u.membership.department_id, _role: v }));
          }}><SelectTrigger className="w-40" aria-label={`Department role for ${u.full_name}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent></Select> : u.id !== me?.id && u.membership.role === "teacher" ? <Button variant="outline" size="sm" disabled={busy} onClick={() => {
            if (!u.membership) return;
            void apply(() => supabase.rpc("set_department_access", { _target: u.id, _department: u.membership.department_id, _role: "none" }));
          }}>Remove access</Button> : <span className="capitalize">{u.membership.role}</span>) : "—"}</TableCell>
        </TableRow>)}
      </TableBody>
    </Table></div>
  </div>;
}
