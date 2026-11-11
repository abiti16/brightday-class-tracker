CREATE OR REPLACE FUNCTION public.set_department_access(_target uuid, _department uuid, _role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ BEGIN
IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Only the super admin can grant permissions'; END IF;
IF _role NOT IN ('manager','teacher','none') THEN RAISE EXCEPTION 'Invalid department role'; END IF;
IF _role='none' THEN DELETE FROM public.department_memberships WHERE user_id=_target AND department_id=_department;
ELSE INSERT INTO public.department_memberships(user_id,department_id,role) VALUES(_target,_department,_role)
  ON CONFLICT(user_id) DO UPDATE SET department_id=EXCLUDED.department_id, role=EXCLUDED.role,
    can_take=CASE WHEN public.department_memberships.department_id=EXCLUDED.department_id THEN public.department_memberships.can_take ELSE false END,
    can_edit=CASE WHEN public.department_memberships.department_id=EXCLUDED.department_id THEN public.department_memberships.can_edit ELSE false END;
END IF; END $function$;