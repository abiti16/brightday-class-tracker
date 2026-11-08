import { queryOptions } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { AttendancePeriod } from "@/lib/attendance-period";

export type Status = "present" | "absent" | "late";
export const STATUSES: Status[] = ["present", "absent", "late"];

export const today = () => format(new Date(), "yyyy-MM-dd");

export const classesQuery = queryOptions({
  queryKey: ["classes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id,name,grade_id,department_id,grades(name),departments(name)")
      .order("name");
    if (error) throw error;
    return (data ?? [])
      .map((c) => ({ id: c.id, name: c.name, grade_id: c.grade_id, department_id: c.department_id, department: c.departments?.name ?? "Unassigned", grade: c.grades?.name ?? "", label: `${c.grades?.name ?? ""} – ${c.name}${c.departments?.name ? ` · ${c.departments.name}` : ""}` }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  },
});

export const gradesQuery = queryOptions({
  queryKey: ["grades"],
  queryFn: async () => {
    const { data, error } = await supabase.from("grades").select("id,name").order("name");
    if (error) throw error;
    return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  },
});

export const departmentsQuery = queryOptions({
  queryKey: ["departments"],
  queryFn: async () => {
    const { data, error } = await supabase.from("departments").select("id,name").order("created_at");
    if (error) throw error;
    return data ?? [];
  },
});

export const studentsQuery = queryOptions({
  queryKey: ["students"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id,student_code,full_name,gender,phone,class_id")
      .order("student_code");
    if (error) throw error;
    return data ?? [];
  },
});

export const attendanceRangeQuery = (from: string, to: string) =>
  queryOptions({
    queryKey: ["attendance", from, to],
    queryFn: async () => {
      const rows: { student_id: string; class_id: string | null; date: string; period: AttendancePeriod; status: Status }[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from("attendance")
          .select("student_id,class_id,date,period,status")
          .gte("date", from)
          .lte("date", to)
          .order("date")
          .order("student_id")
          .order("period")
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        rows.push(...((data ?? []) as typeof rows));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });

export function pct(present: number, late: number, total: number) {
  if (!total) return 0;
  return Math.round(((present + late) / total) * 1000) / 10;
}

export function summarize(rows: { status: Status }[]) {
  const s = { present: 0, absent: 0, late: 0, total: rows.length };
  rows.forEach((r) => s[r.status]++);
  return { ...s, rate: pct(s.present, s.late, s.total) };
}

export const studentSchema = z.object({
  student_code: z.string().trim().min(1, "Student ID is required").max(30).regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only"),
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  gender: z.enum(["Male", "Female"], { message: "Select a gender" }),
  class_id: z.string().uuid("Select a class"),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number")
    .or(z.literal("")),
});
export type StudentForm = z.infer<typeof studentSchema>;

export const nameSchema = z.string().trim().min(1, "Name is required").max(50, "Max 50 characters");
