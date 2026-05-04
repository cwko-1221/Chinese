create extension if not exists "pgcrypto";

do $$
begin
  create type public.ncs_role as enum ('teacher', 'student');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ncs_assignment_status as enum ('draft', 'published');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ncs_attempt_status as enum ('in_progress', 'completed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ncs_users (
  id uuid primary key default gen_random_uuid(),
  login_id text not null unique,
  display_name text not null,
  password_hash text not null,
  role public.ncs_role not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ncs_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.ncs_users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, name)
);

create table if not exists public.ncs_class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.ncs_classes(id) on delete cascade,
  student_id uuid not null references public.ncs_users(id) on delete cascade,
  initial_password text,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.ncs_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.ncs_classes(id) on delete cascade,
  title text not null,
  status public.ncs_assignment_status not null default 'published',
  created_by uuid not null references public.ncs_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ncs_assignment_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.ncs_assignments(id) on delete cascade,
  traditional_text text not null,
  jyutping text not null,
  english_meaning text not null,
  order_index integer not null check (order_index between 1 and 5),
  unique (assignment_id, order_index)
);

create table if not exists public.ncs_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.ncs_assignments(id) on delete cascade,
  student_id uuid not null references public.ncs_users(id) on delete cascade,
  status public.ncs_attempt_status not null default 'in_progress',
  score integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (assignment_id, student_id)
);

create table if not exists public.ncs_attempt_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.ncs_attempts(id) on delete cascade,
  assignment_item_id uuid not null references public.ncs_assignment_items(id) on delete cascade,
  handwriting_correct boolean not null default false,
  speech_transcript text,
  speech_correct boolean not null default false,
  speech_recording_url text,
  assessment_transcript text,
  assessment_correct boolean not null default false,
  assessment_recording_url text,
  created_at timestamptz not null default now(),
  unique (attempt_id, assignment_item_id)
);

alter table public.ncs_users disable row level security;
alter table public.ncs_classes disable row level security;
alter table public.ncs_class_students disable row level security;
alter table public.ncs_assignments disable row level security;
alter table public.ncs_assignment_items disable row level security;
alter table public.ncs_attempts disable row level security;
alter table public.ncs_attempt_items disable row level security;

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', true)
on conflict (id) do nothing;
