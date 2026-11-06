
create type public.app_role as enum ('admin', 'teacher');
create type public.attendance_status as enum ('present', 'absent', 'late');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "own profile or admin read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "own roles or admin read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admin grant roles" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "admin revoke roles" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') and user_id <> auth.uid());

-- New user: profile; first user ever becomes admin, later users wait for an admin to grant a role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 50),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.grades to authenticated;
grant all on public.grades to service_role;
alter table public.grades enable row level security;
create policy "staff read grades" on public.grades for select to authenticated using (public.is_staff(auth.uid()));
create policy "admin write grades" on public.grades for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (grade_id, name)
);
grant select, insert, update, delete on public.classes to authenticated;
grant all on public.classes to service_role;
alter table public.classes enable row level security;
create policy "staff read classes" on public.classes for select to authenticated using (public.is_staff(auth.uid()));
create policy "admin write classes" on public.classes for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique check (char_length(student_code) between 1 and 30),
  full_name text not null check (char_length(full_name) between 2 and 100),
  gender text not null check (gender in ('Male', 'Female')),
  class_id uuid references public.classes(id) on delete set null,
  phone text check (phone is null or char_length(phone) <= 20),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.students to authenticated;
grant all on public.students to service_role;
alter table public.students enable row level security;
create policy "staff read students" on public.students for select to authenticated using (public.is_staff(auth.uid()));
create policy "admin write students" on public.students for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  date date not null,
  status attendance_status not null,
  recorded_by uuid,
  updated_at timestamptz not null default now(),
  unique (student_id, date)
);
create index attendance_date_idx on public.attendance(date);
grant select, insert, update, delete on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;
create policy "staff read attendance" on public.attendance for select to authenticated using (public.is_staff(auth.uid()));
-- Teachers record today's attendance; admins may record or correct any date
create policy "staff insert attendance" on public.attendance for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or (public.has_role(auth.uid(), 'teacher') and date = current_date));
create policy "staff update attendance" on public.attendance for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or (public.has_role(auth.uid(), 'teacher') and date = current_date))
  with check (public.has_role(auth.uid(), 'admin') or (public.has_role(auth.uid(), 'teacher') and date = current_date));
create policy "admin delete attendance" on public.attendance for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Demo data
insert into public.grades (name) values ('Grade 9'), ('Grade 10'), ('Grade 11');
insert into public.classes (grade_id, name)
select g.id, s.n from public.grades g cross join (values ('Section A'), ('Section B')) s(n);

insert into public.students (student_code, full_name, gender, class_id, phone)
select 'STU-' || lpad(x.i::text, 4, '0'), x.name, x.gender,
  (select c.id from public.classes c join public.grades g on g.id = c.grade_id order by g.name, c.name offset ((x.i - 1) % 6) limit 1),
  '+2519' || lpad((11000000 + x.i * 7919)::text, 8, '0')
from (values
  (1,'Abel Tesfaye','Male'),(2,'Hanna Girma','Female'),(3,'Dawit Bekele','Male'),(4,'Selam Haile','Female'),
  (5,'Yonas Alemu','Male'),(6,'Meron Tadesse','Female'),(7,'Samuel Mekonnen','Male'),(8,'Liya Assefa','Female'),
  (9,'Natnael Wolde','Male'),(10,'Bethlehem Kebede','Female'),(11,'Kaleb Desta','Male'),(12,'Ruth Mulugeta','Female'),
  (13,'Eyob Getachew','Male'),(14,'Tigist Abebe','Female'),(15,'Henok Fikre','Male'),(16,'Saron Yilma','Female'),
  (17,'Biniam Tekle','Male'),(18,'Mahlet Negash','Female'),(19,'Robel Asfaw','Male'),(20,'Feven Lemma','Female'),
  (21,'Nahom Berhanu','Male'),(22,'Eden Worku','Female'),(23,'Mikiyas Ayele','Male'),(24,'Helen Shiferaw','Female'),
  (25,'Elias Demissie','Male'),(26,'Rahel Kassa','Female'),(27,'Fitsum Hailu','Male'),(28,'Sara Belay','Female'),
  (29,'Leul Gebre','Male'),(30,'Kidist Tilahun','Female'),(31,'Amanuel Zewdu','Male'),(32,'Martha Alemayehu','Female'),
  (33,'Yared Mengistu','Male'),(34,'Hiwot Sisay','Female'),(35,'Ermias Taye','Male'),(36,'Lidya Fekadu','Female')
) as x(i, name, gender);

-- Last 30 days of weekday attendance (deterministic pattern)
insert into public.attendance (student_id, class_id, date, status)
select s.id, s.class_id, d::date,
  case
    when (abs(hashtext(s.student_code || d::text)) % 100) < 82 then 'present'::attendance_status
    when (abs(hashtext(s.student_code || d::text)) % 100) < 92 then 'late'::attendance_status
    else 'absent'::attendance_status
  end
from public.students s
cross join generate_series(current_date - 30, current_date - 1, interval '1 day') d
where extract(isodow from d) < 6;
