import { describe, expect, it } from "vitest";
import { ATTENDANCE_CONFLICT, ATTENDANCE_PERIODS, attendanceRows } from "@/lib/attendance-period";

describe("two attendance opportunities per day", () => {
  it("offers exactly morning and afternoon", () => {
    expect(ATTENDANCE_PERIODS).toEqual(["morning", "afternoon"]);
  });
  it("creates separate sessions for the same student and date", () => {
    const morning = attendanceRows([{ id: "student-1" }], { "student-1": "present" }, "class-1", "2026-11-06", "morning", null)[0];
    const afternoon = attendanceRows([{ id: "student-1" }], { "student-1": "absent" }, "class-1", "2026-11-06", "afternoon", null)[0];
    expect(morning).toMatchObject({ student_id: "student-1", date: "2026-11-06", period: "morning", status: "present" });
    expect(afternoon).toMatchObject({ student_id: "student-1", date: "2026-11-06", period: "afternoon", status: "absent" });
    expect(ATTENDANCE_CONFLICT).toBe("student_id,date,period");
  });
});