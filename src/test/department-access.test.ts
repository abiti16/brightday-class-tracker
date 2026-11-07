import { describe, expect, it } from "vitest";
import { canRecordAttendance, DEFAULT_PERMISSIONS } from "@/lib/department-access";

describe("department attendance privileges", () => {
  const now = "2026-11-06";
  it("department settings can disable manager historical edits", () => {
    expect(canRecordAttendance("manager", { department_id: "course", role: "manager" }, "course", "2026-11-05", now, { ...DEFAULT_PERMISSIONS, manager_correct_past: false })).toBe(false);
  });
  it("department settings can grant teacher historical edits", () => {
    expect(canRecordAttendance("teacher", { department_id: "course", role: "teacher" }, "course", "2026-11-05", now, { ...DEFAULT_PERMISSIONS, teacher_correct_past: true })).toBe(true);
  });
  it("department settings can disable today's teacher recording", () => {
    expect(canRecordAttendance("teacher", { department_id: "course", role: "teacher" }, "course", now, now, { ...DEFAULT_PERMISSIONS, teacher_record_today: false })).toBe(false);
  });
  it("department settings can disable today's manager recording", () => {
    expect(canRecordAttendance("manager", { department_id: "course", role: "manager" }, "course", now, now, { ...DEFAULT_PERMISSIONS, manager_record_today: false })).toBe(false);
  });
  it("managers can correct their department's past attendance", () => {
    expect(canRecordAttendance("manager", { department_id: "course", role: "manager" }, "course", "2026-11-05", now)).toBe(true);
  });
  it("managers cannot record another department's attendance", () => {
    expect(canRecordAttendance("manager", { department_id: "course", role: "manager" }, "other", now, now)).toBe(false);
  });
  it("teachers can record today only in their department", () => {
    const membership = { department_id: "course", role: "teacher" as const };
    expect(canRecordAttendance("teacher", membership, "course", now, now)).toBe(true);
    expect(canRecordAttendance("teacher", membership, "course", "2026-11-05", now)).toBe(false);
    expect(canRecordAttendance("teacher", membership, "other", now, now)).toBe(false);
  });
  it("unassigned teachers cannot record attendance", () => {
    expect(canRecordAttendance("teacher", null, "course", now, now)).toBe(false);
  });
  it("school administrators retain both departments", () => {
    expect(canRecordAttendance("admin", null, "course", now, now)).toBe(true);
    expect(canRecordAttendance("admin", null, "other", "2026-11-05", now)).toBe(true);
  });
  it("future attendance remains blocked", () => {
    expect(canRecordAttendance("admin", null, "course", "2026-11-07", now)).toBe(false);
  });
});