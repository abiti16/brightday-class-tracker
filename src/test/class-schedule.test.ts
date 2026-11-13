import { describe, expect, it } from "vitest";
import { SCHEDULE_HEAD, classScheduleRows, scheduleBody, scheduleSummary } from "@/lib/class-schedule";

const sectionA = { id: "c1", name: "Section A", grade: "Grade 9", department: "ትምህርት", department_id: "d1" };
const sectionB = { id: "c2", name: "Section B", grade: "Grade 9", department: "Unassigned", department_id: null as string | null };
const classes = [sectionA, sectionB];
const sessions = [
  { key: "evening", name: "Evening class", start_time: "18:00:00", department_id: "d1" },
  { key: "morning", name: "Morning", start_time: "08:00:00", department_id: "d1" },
  { key: "old", name: "Retired", start_time: "06:00:00", department_id: "d1", active: false },
];
const students = [
  { class_id: "c1" },
  { class_id: "c1" },
  { class_id: "c2" },
  { class_id: null },
];

describe("class schedule export rows", () => {
  it("lists every active session of each class's department", () => {
    const rows = classScheduleRows(classes, sessions, students);
    expect(rows.map((r) => [r.class, r.session, r.start_time])).toEqual([
      ["Section A", "Morning", "08:00"],
      ["Section A", "Evening class", "18:00"],
      ["Section B", "Morning", "08:00"],
      ["Section B", "Afternoon", "14:00"],
    ]);
  });
  it("counts only the students of that class", () => {
    const rows = classScheduleRows(classes, sessions, students);
    expect(rows.filter((r) => r.class === "Section A").every((r) => r.students === 2)).toBe(true);
    expect(rows.filter((r) => r.class === "Section B").every((r) => r.students === 1)).toBe(true);
  });
  it("keeps a class with no sessions in the export", () => {
    const rows = classScheduleRows([sectionA], [], students);
    expect(rows).toEqual([{ grade: "Grade 9", class: "Section A", department: "ትምህርት", session: "No sessions yet", start_time: "", students: 2 }]);
  });
  it("builds a spreadsheet body under the export heading", () => {
    const rows = classScheduleRows(classes, sessions, students);
    expect(SCHEDULE_HEAD).toEqual(["Grade", "Class", "Department", "Session", "Start time", "Students"]);
    expect(scheduleBody(rows)[0]).toEqual(["Grade 9", "Section A", "ትምህርት", "Morning", "08:00", 2]);
    expect(scheduleSummary(rows)).toBe("2 classes · 4 class sessions · 3 session types");
  });
});
