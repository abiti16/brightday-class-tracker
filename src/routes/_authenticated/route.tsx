import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarCheck, CalendarDays, ClipboardCheck, GraduationCap, IdCard, LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isStaffRole, meQuery, useMe } from "@/lib/session";
import { MyAttendance } from "@/components/MyAttendance";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Layout,
});

const nav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Students", url: "/students", icon: Users },
  { title: "ID cards", url: "/id-cards", icon: IdCard },
  { title: "Classes", url: "/classes", icon: GraduationCap },
  { title: "Reports", url: "/reports", icon: BarChart3 },
] as const;

function AppSidebar() {
  const me = useMe();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const items = !isStaffRole(me?.role) ? [] : me?.role === "admin" || me?.role === "manager" ? [...nav, { title: "Staff & roles", url: "/staff", icon: ShieldCheck } as const] : nav;
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2 font-extrabold text-sidebar-foreground">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <CalendarCheck className="size-4" />
          </span>
          {!collapsed && "Attendly"}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {me?.role === "student" && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="My attendance"><CalendarDays /><span>My attendance</span></SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={path.startsWith(i.url)} tooltip={i.title}>
                    <Link to={i.url} onClick={() => setOpenMobile(false)}>
                      <i.icon />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && me && (
          <div className="px-2 pb-1 text-xs text-sidebar-foreground/80">
            <div className="truncate font-semibold text-sidebar-foreground">{me.name}</div>
            <div className="capitalize">{me.role ?? (me.declined ? "registration declined" : "pending approval")}</div>
            {me.membership && <div>{me.membership.name}</div>}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function Layout() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="hidden text-sm text-muted-foreground sm:inline">{me?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          </header>
          <main className="flex-1 p-4 md:p-8">
            {isStaffRole(me?.role) ? (
              <Outlet />
            ) : me?.student ? (
              <MyAttendance student={me.student} />
            ) : (
              <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
                <ShieldCheck className="mx-auto size-10 text-primary" />
                <h1 className="mt-4 text-xl font-bold">{me?.declined ? "Registration declined" : me?.teacherWithoutDepartment ? "Approved as teacher" : "Waiting for approval"}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {me?.declined
                    ? "The administrator did not approve this account. Contact the school if you think this is a mistake."
                    : me?.teacherWithoutDepartment
                      ? "The administrator still needs to place you in a department before you can see classes."
                      : "Your registration has been sent to the administrator. You will get access once they approve you as a student or teacher."}
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
