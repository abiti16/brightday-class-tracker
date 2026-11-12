import { describe, expect, it } from "vitest";
import { ATTENDANCE_CONFLICT, DEFAULT_SESSIONS, attendanceRows, matchesDays, sessionsForDepartment } from "@/lib/attendance-period";

describe("department attendance sessions", () => {
  it("unassigned classes keep morning and afternoon", () => {
    expect(sessionsForDepartment([], null).map((s) => s.key)).toEqual(["morning", "afternoon"]);
    expect(DEFAULT_SESSIONS).toHaveLength(2);
  });
  it("a department only offers its own active sessions", () => {
    const all = [
      { key: "a", name: "Evening", start_time: "18:00:00", department_id: "d1" },
      { key: "b", name: "Early", start_time: "07:00:00", department_id: "d1" },
      { key: "c", name: "Old", start_time: null, department_id: "d1", active: false },
      { key: "x", name: "Other", start_time: null, department_id: "d2" },
    ];
    expect(sessionsForDepartment(all, "d1").map((s) => s.key)).toEqual(["b", "a"]);
  });
  it("creates separate records for the same student and date", () => {
    const one = attendanceRows([{ id: "s1" }], { s1: "present" }, "c1", "2026-11-06", "morning", null)[0];
    const two = attendanceRows([{ id: "s1" }], { s1: "absent" }, "c1", "2026-11-06", "evening", null)[0];
    expect(one).toMatchObject({ period: "morning", status: "present" });
    expect(two).toMatchObject({ period: "evening", status: "absent" });
    expect(ATTENDANCE_CONFLICT).toBe("student_id,date,period");
  });
  it("students not scanned or marked are saved as absent", () => {
    const rows = attendanceRows([{ id: "s1" }, { id: "s2" }], { s1: "present" }, "c1", "2026-11-06", "morning", null);
    expect(rows.map((r) => r.status)).toEqual(["present", "absent"]);
  });
  it("filters by number of days attended", () => {
    expect(matchesDays(5, "atLeast", 5)).toBe(true);
    expect(matchesDays(4, "atLeast", 5)).toBe(false);
    expect(matchesDays(5, "exactly", 5)).toBe(true);
    expect(matchesDays(6, "atMost", 5)).toBe(false);
  });
});
