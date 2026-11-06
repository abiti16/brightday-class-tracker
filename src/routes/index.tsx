import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, BarChart3, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Attendly – Student Attendance Management" },
      { name: "description", content: "Track daily student attendance, manage classes and export reports for your school." },
      { property: "og:title", content: "Attendly – Student Attendance Management" },
      { property: "og:description", content: "Track daily student attendance, manage classes and export reports for your school." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: CalendarCheck, title: "Daily roll call", text: "Mark a whole class present, absent or late in seconds." },
  { icon: Users, title: "Students & classes", text: "Organize grades, sections and student records." },
  { icon: BarChart3, title: "Reports", text: "Daily, weekly, monthly and per-student reports with PDF/Excel export." },
  { icon: ShieldCheck, title: "Secure access", text: "Separate permissions for administrators and teachers." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-extrabold text-lg">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
            <CalendarCheck className="size-5" />
          </span>
          Attendly
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-12 md:pt-24">
        <div className="max-w-2xl">
          <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            For schools, administrators and teachers
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Attendance, <span className="text-primary">simplified.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            One place to record daily attendance, follow every student, and share accurate reports.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </div>
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-card">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
