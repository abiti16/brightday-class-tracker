import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AttendancePeriod, SessionOption } from "@/lib/attendance-period";

export function AttendancePeriodSelect({ value, onChange, options }: { value: AttendancePeriod; onChange: (value: AttendancePeriod) => void; options: SessionOption[] }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock className="size-3.5" />Session</label>
      <Select value={options.some((o) => o.value === value) ? value : ""} onValueChange={onChange}>
        <SelectTrigger aria-label="Attendance session"><SelectValue placeholder="Select session" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
