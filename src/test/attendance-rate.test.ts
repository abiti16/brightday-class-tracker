import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/data";

describe("attendance percentage", () => {
  it("counts present and late as attended, absent as missed", () => {
    const s = summarize([{ status: "present" }, { status: "late" }, { status: "absent" }, { status: "absent" }]);
    expect(s.rate).toBe(50);
  });
  it("is 0 when nothing is recorded", () => {
    expect(summarize([]).rate).toBe(0);
  });
});
