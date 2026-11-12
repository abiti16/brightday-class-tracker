import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { departmentsQuery, nameSchema, sessionsQuery } from "@/lib/data";
import { PageHeader } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DepartmentPermissions } from "@/components/DepartmentPermissions";
import { DepartmentSessions } from "@/components/DepartmentSessions";
import { Trash2, Plus, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff permissions – Attendly" }, { name: "description", content: "Super-admin department settings, staff grants and AI access review." }, { property: "og:title", content: "Staff permissions – Attendly" }, { property: "og:description", content: "Manage department attendance access safely." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(departmentsQuery), context.queryClient.ensureQueryData(sessionsQuery)]), component: Staff,
});
function Staff() {
  const me = useMe(); const owner = me?.isSuperAdmin === true;
  const qc = useQueryClient(); const { data: departments } = useSuspenseQuery(departmentsQuery);
  const [busy, setBusy] = useState(false); const [name, setName] = useState(""); const [names, setNames] = useState<Record<string,string>>({});
  const [email, setEmail] = useState(""); const [department, setDepartment] = useState("");
  const { data: staff = [], error } = useQuery({ queryKey: ["staff", me?.id], enabled: owner, queryFn: async () => {
    const [p,m,r] = await Promise.all([supabase.from("profiles").select("id,full_name,email"),supabase.from("department_memberships").select("user_id,department_id,role,can_take,can_edit"),supabase.from("user_roles").select("user_id,role")]);
    if(p.error || m.error || r.error) throw p.error ?? m.error ?? r.error;
    return (p.data ?? []).map((u) => ({ ...u, membership: m.data?.find((x) => x.user_id === u.id), role: r.data?.some((x) => x.user_id === u.id && x.role === "admin") ? "admin" : r.data?.some((x) => x.user_id === u.id && x.role === "teacher") ? "teacher" : "none" }));
  } });
  async function apply(action: () => PromiseLike<{error:{message:string}|null}>) {
    if(busy) return; setBusy(true);
    try { const result = await action(); if(result.error) throw result.error; await qc.invalidateQueries(); toast.success("Saved"); }
    catch(e) { toast.error((e as {message?:string}).message ?? "Could not save."); } finally {setBusy(false);}
  }
  if(!owner) return <p className="text-muted-foreground">Only the super admin can manage departments and grant permissions.</p>;
  return <div className="mx-auto max-w-6xl"><PageHeader title="Staff & permissions" description="Super admin" />
    <section className="mb-6 border-b pb-6"><h2 className="mb-3 text-lg font-bold">Departments</h2>
      <form className="mb-4 flex gap-2" onSubmit={(e) => {e.preventDefault(); const parsed=nameSchema.safeParse(name); if(!parsed.success) {toast.error("Enter a department name (1–50 characters)."); return;} void apply(() => supabase.from("departments").insert({name:parsed.data}));}}><Input aria-label="New department name" value={name} onChange={(e)=>setName(e.target.value)} /><Button disabled={busy}><Plus/>Add department</Button></form>
      {departments.map((d)=><form key={d.id} className="mb-3 flex flex-wrap gap-2" onSubmit={(e)=>{e.preventDefault(); const parsed=nameSchema.safeParse(names[d.id]??d.name); if(!parsed.success){toast.error("Invalid department name.");return;} void apply(()=>supabase.from("departments").update({name:parsed.data}).eq("id",d.id));}}><Input className="min-w-0 flex-1" aria-label={`Department name ${d.name}`} value={names[d.id]??d.name} onChange={(e)=>setNames({...names,[d.id]:e.target.value})}/><Button disabled={busy}><Save/>Save name</Button><Button type="button" variant="outline" aria-label={`Delete ${d.name}`} disabled={busy} onClick={()=>{if(window.confirm(`Delete ${d.name}? Move its classes and remove staff assignments first.`)) void apply(()=>supabase.from("departments").delete().eq("id",d.id));}}><Trash2/></Button></form>)}
    </section><DepartmentSessions/><DepartmentPermissions/>
    <form className="mb-6 flex flex-wrap gap-3" onSubmit={(e)=>{e.preventDefault(); if(!department){toast.error("Select a department.");return;} void apply(()=>supabase.rpc("add_department_teacher",{_email:email,_department:department}));}}><Input className="min-w-0 flex-1" aria-label="Registered staff email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/><Select value={department} onValueChange={setDepartment}><SelectTrigger className="w-48"><SelectValue placeholder="Department"/></SelectTrigger><SelectContent>{departments.map((d)=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select><Button disabled={busy}>Assign staff</Button></form>
    {error && <p role="alert" className="text-destructive">{error.message}</p>}
    <div className="space-y-4">{staff.map((u)=>{const m=u.membership; return <div key={u.id} className="rounded-lg border bg-card p-4"><div className="mb-3 font-semibold">{u.full_name || u.email}{u.id===me?.id && " (you)"}</div><div className="flex flex-wrap items-center gap-4">
      {u.id!==me?.id && <Select disabled={busy} value={u.role} onValueChange={(v)=>void apply(()=>supabase.rpc("set_school_role",{_target:u.id,_role:v}))}><SelectTrigger className="w-40" aria-label={`School role for ${u.full_name}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No school role</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="admin">Administrator</SelectItem></SelectContent></Select>}
      <Select disabled={busy} value={m?.department_id??"none"} onValueChange={(v)=>{const d=v==="none"?m?.department_id:v;if(d)void apply(()=>supabase.rpc("set_department_access",{_target:u.id,_department:d,_role:v==="none"?"none":m?.role??"teacher"}));}}><SelectTrigger className="w-48" aria-label={`Department for ${u.full_name}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{departments.map((d)=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
      {m && <><Select disabled={busy} value={m.role} onValueChange={(v)=>void apply(()=>supabase.rpc("set_department_access",{_target:u.id,_department:m.department_id,_role:v}))}><SelectTrigger className="w-40" aria-label={`Department role for ${u.full_name}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent></Select><label className="flex items-center gap-2"><Switch aria-label={`Take attendance for ${u.full_name}`} disabled={busy} checked={m.can_take} onCheckedChange={(v)=>void apply(()=>supabase.rpc("set_attendance_grants",{_target:u.id,_take:v,_edit:m.can_edit}))}/>Take attendance</label><label className="flex items-center gap-2"><Switch aria-label={`Edit attendance for ${u.full_name}`} disabled={busy} checked={m.can_edit} onCheckedChange={(v)=>void apply(()=>supabase.rpc("set_attendance_grants",{_target:u.id,_take:m.can_take,_edit:v}))}/>Edit saved attendance</label><Button variant="outline" disabled={busy} onClick={()=>void apply(()=>supabase.rpc("set_department_access",{_target:u.id,_department:m.department_id,_role:"none"}))}><Trash2/>Remove access</Button></>}
    </div></div>;})}</div>
  </div>;
}