import type { FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in – Attendly" },
      { name: "description", content: "Sign in to manage student attendance." },
      { property: "og:title", content: "Sign in – Attendly" },
      { property: "og:description", content: "Sign in to manage student attendance." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  name: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    if (mode === "forgot") {
      const r = z.string().trim().email().safeParse(form.email);
      if (!r.success) { setErrors({ email: "Enter a valid email" }); return; }
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(r.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Check your email for a reset link.");
      { setMode("signin"); return; }
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
      { setErrors(errs); return; }
    }
    if (mode === "signup" && !form.name.trim()) { setErrors({ name: "Full name is required" }); return; }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: form.name.trim() } },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (!data.session) {
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  }

  const field = (key: "email" | "password" | "name", label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <CalendarCheck /> Attendly
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Every student,<br />accounted for.</h2>
          <p className="mt-4 max-w-sm opacity-85">Secure attendance records for administrators and teachers.</p>
        </div>
        <p className="text-sm opacity-70">© {new Date().getFullYear()} Attendly</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create staff account" : "Reset password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "An administrator must approve your access." : "Sign in to continue to your dashboard."}
            </p>
          </div>
          {mode === "signup" && field("name", "Full name")}
          {field("email", "Email", "email")}
          {mode !== "forgot" && field("password", "Password", "password")}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
          {mode !== "forgot" && (
            <>
              <div className="relative text-center text-xs text-muted-foreground">
                <span className="bg-background px-2">or</span>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={google}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                Continue with Google
              </Button>
            </>
          )}
          <div className="flex justify-between text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signin" ? "Create an account" : "Back to sign in"}
            </button>
            {mode === "signin" && (
              <button type="button" className="text-muted-foreground hover:underline" onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
