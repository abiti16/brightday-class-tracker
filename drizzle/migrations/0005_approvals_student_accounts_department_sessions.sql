-- Department-defined attendance sessions
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  key text NOT NULL DEFAULT gen_random_uuid()::text,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
  start_time time,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in sessions read" ON public.attendance_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "super admin sessions write" ON public.attendance_sessions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.attendance_sessions (department_id, key, name, start_time, sort_order)
SELECT d.id, v.key, v.name, v.t::time, v.o FROM public.departments d
CROSS JOIN (VALUES ('morning','Morning','08:00',1),('afternoon','Afternoon','14:00',2)) AS v(key,name,t,o);

CREATE OR REPLACE FUNCTION public.add_default_attendance_sessions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.attendance_sessions (department_id, key, name, start_time, sort_order)
  VALUES (NEW.id,'morning','Morning','08:00',1),(NEW.id,'afternoon','Afternoon','14:00',2);
  RETURN NEW;
END $$;
CREATE TRIGGER add_default_attendance_sessions AFTER INSERT ON public.departments FOR EACH ROW EXECUTE FUNCTION public.add_default_attendance_sessions();

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_period_check;
COMMENT ON COLUMN public.attendance.period IS 'Attendance session key from attendance_sessions of the class department (morning/afternoon for classes without a department).';

CREATE OR REPLACE FUNCTION public.validate_attendance_session() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.period IS NOT DISTINCT FROM OLD.period AND NEW.class_id IS NOT DISTINCT FROM OLD.class_id THEN RETURN NEW; END IF;
  SELECT department_id INTO _dept FROM public.classes WHERE id = NEW.class_id;
  IF _dept IS NULL THEN
    IF NEW.period NOT IN ('morning','afternoon') THEN RAISE EXCEPTION 'Unknown attendance session'; END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.attendance_sessions WHERE department_id = _dept AND key = NEW.period AND active) THEN
    RAISE EXCEPTION 'This session is not available for the class department';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_attendance_session BEFORE INSERT OR UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.validate_attendance_session();

-- Student accounts linked to student records
CREATE TABLE public.student_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.student_accounts TO authenticated;
GRANT ALL ON public.student_accounts TO service_role;
ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin student account read" ON public.student_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_own_student(_user uuid, _student uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_accounts WHERE user_id = _user AND student_id = _student) $$;
CREATE OR REPLACE FUNCTION public.is_own_student_class(_user uuid, _class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_accounts sa JOIN public.students s ON s.id = sa.student_id WHERE sa.user_id = _user AND s.class_id = _class) $$;

CREATE POLICY "own student record read" ON public.students FOR SELECT TO authenticated USING (public.is_own_student(auth.uid(), id));
CREATE POLICY "own attendance read" ON public.attendance FOR SELECT TO authenticated USING (public.is_own_student(auth.uid(), student_id));
CREATE POLICY "own class read" ON public.classes FOR SELECT TO authenticated USING (public.is_own_student_class(auth.uid(), id));

-- Registration approval decisions
CREATE TABLE public.registration_reviews (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.registration_reviews TO authenticated;
GRANT ALL ON public.registration_reviews TO service_role;
ALTER TABLE public.registration_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or super admin review read" ON public.registration_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

INSERT INTO public.registration_reviews (user_id, status)
SELECT DISTINCT u.user_id, 'approved' FROM (
  SELECT user_id FROM public.user_roles UNION SELECT user_id FROM public.department_memberships
) u JOIN public.profiles p ON p.id = u.user_id
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_account_role(_target uuid, _role text, _student uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) OR _target = auth.uid() THEN RAISE EXCEPTION 'Super admin required; your own role cannot be changed'; END IF;
  IF _role NOT IN ('admin','teacher','student','none') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _target) THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF _role = 'student' THEN
    IF _student IS NULL OR NOT EXISTS (SELECT 1 FROM public.students WHERE id = _student) THEN RAISE EXCEPTION 'Choose the student record for this account'; END IF;
    IF EXISTS (SELECT 1 FROM public.student_accounts WHERE student_id = _student AND user_id <> _target) THEN RAISE EXCEPTION 'That student is already linked to another account'; END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target;
  DELETE FROM public.student_accounts WHERE user_id = _target;
  IF _role IN ('admin','teacher') THEN INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role::public.app_role); END IF;
  IF _role IN ('student','none') THEN DELETE FROM public.department_memberships WHERE user_id = _target; END IF;
  IF _role = 'student' THEN INSERT INTO public.student_accounts (user_id, student_id) VALUES (_target, _student); END IF;
  INSERT INTO public.registration_reviews (user_id, status, reviewed_by) VALUES (_target, 'approved', auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET status = 'approved', reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.decline_registration(_target uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) OR _target = auth.uid() THEN RAISE EXCEPTION 'Super admin required; your own account cannot be declined'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target;
  DELETE FROM public.department_memberships WHERE user_id = _target;
  DELETE FROM public.student_accounts WHERE user_id = _target;
  INSERT INTO public.registration_reviews (user_id, status, reviewed_by) VALUES (_target, 'rejected', auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET status = 'rejected', reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.set_department_access(_target uuid, _department uuid, _role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Only the super admin can grant permissions'; END IF;
IF _role NOT IN ('manager','teacher','none') THEN RAISE EXCEPTION 'Invalid department role'; END IF;
IF _role <> 'none' AND EXISTS (SELECT 1 FROM public.student_accounts WHERE user_id = _target) THEN RAISE EXCEPTION 'Change this student''s school role to Teacher before adding them to a department'; END IF;
IF _role='none' THEN DELETE FROM public.department_memberships WHERE user_id=_target AND department_id=_department;
ELSE INSERT INTO public.department_memberships(user_id,department_id,role) VALUES(_target,_department,_role)
  ON CONFLICT(user_id) DO UPDATE SET department_id=EXCLUDED.department_id, role=EXCLUDED.role,
    can_take=CASE WHEN public.department_memberships.department_id=EXCLUDED.department_id THEN public.department_memberships.can_take ELSE false END,
    can_edit=CASE WHEN public.department_memberships.department_id=EXCLUDED.department_id THEN public.department_memberships.can_edit ELSE false END;
  INSERT INTO public.registration_reviews (user_id, status, reviewed_by) VALUES (_target, 'approved', auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET status = 'approved', reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now();
END IF; END $$;

COMMENT ON FUNCTION public.set_school_role(uuid, text) IS 'DEPRECATED: replaced by assign_account_role';

-- Days attended per student (RLS of the caller applies)
CREATE OR REPLACE FUNCTION public.student_attendance_days() RETURNS TABLE (student_id uuid, days_attended bigint, days_recorded bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.student_id,
         count(DISTINCT a.date) FILTER (WHERE a.status IN ('present','late')),
         count(DISTINCT a.date)
  FROM public.attendance a GROUP BY a.student_id $$;
GRANT EXECUTE ON FUNCTION public.student_attendance_days() TO authenticated;