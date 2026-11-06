import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarCheck, ClipboardCheck, GraduationCap, IdCard, LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, useMe } from "@/lib/session";
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
  const items = me?.role === "admin" || me?.role === "manager" ? [...nav, { title: "Staff & roles", url: "/staff", icon: ShieldCheck } as const] : nav;
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
            <div className="capitalize">{me.role ?? "pending approval"}</div>
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
            {me?.role ? (
              <Outlet />
            ) : (
              <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
                <ShieldCheck className="mx-auto size-10 text-primary" />
                <h1 className="mt-4 text-xl font-bold">Waiting for approval</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your account is created. An administrator needs to assign you a teacher or admin role before you can see student records.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
