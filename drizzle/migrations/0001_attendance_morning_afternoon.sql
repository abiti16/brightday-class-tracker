ALTER TABLE public.attendance ADD COLUMN period text NOT NULL DEFAULT 'morning' CONSTRAINT attendance_period_check CHECK (period IN ('morning', 'afternoon'));
COMMENT ON COLUMN public.attendance.period IS 'School attendance session. Legacy daily records are assigned to morning.';
ALTER TABLE public.attendance DROP CONSTRAINT attendance_student_id_date_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_date_period_key UNIQUE (student_id, date, period);