import { Sun, Sunrise } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type AttendancePeriod } from "@/lib/attendance-period";

export function AttendancePeriodSelect({ value, onChange }: { value: AttendancePeriod; onChange: (value: AttendancePeriod) => void }) {
  return (
    <Tabs value={value} onValueChange={(next) => { if (next === "morning" || next === "afternoon") onChange(next); }}>
      <TabsList aria-label="Attendance period" className="w-full">
        <TabsTrigger value="morning" className="flex-1 gap-2"><Sunrise className="size-4" />Morning</TabsTrigger>
        <TabsTrigger value="afternoon" className="flex-1 gap-2"><Sun className="size-4" />Afternoon</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}