create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  status text not null default 'started' check (status in ('started','completed')),
  progress integer not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  last_opened_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create table if not exists public.exercise_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  status text not null default 'started' check (status in ('started','solved')),
  runs integer not null default 0 check (runs >= 0), submissions integer not null default 0 check (submissions >= 0),
  failed_submits integer not null default 0 check (failed_submits >= 0), last_attempt timestamptz,
  hints_used integer not null default 0 check (hints_used >= 0), solution_viewed boolean not null default false,
  solved_at timestamptz, updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create table if not exists public.code_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null, language text not null,
  code text not null default '', updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id, language)
);
create table if not exists public.notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('lesson','exercise','project')),
  resource_id text not null, content text not null default '',
  updated_at timestamptz not null default now(), primary key (user_id, resource_type, resource_id)
);
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_type text not null check (resource_type in ('lesson','exercise','explanation','project')),
  resource_id text not null, created_at timestamptz not null default now(),
  primary key (user_id, resource_type, resource_id)
);
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb, last_lesson text, last_track text, language text,
  streak integer not null default 0, active_days text[] not null default '{}', last_activity timestamptz,
  time_minutes integer not null default 0, updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exercise_progress enable row level security;
alter table public.code_drafts enable row level security;
alter table public.notes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.user_settings enable row level security;

create policy "profiles owner access" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "lesson progress owner access" on public.lesson_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "exercise progress owner access" on public.exercise_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "draft owner access" on public.code_drafts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "note owner access" on public.notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "bookmark owner access" on public.bookmarks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "settings owner access" on public.user_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do update set display_name = excluded.display_name, updated_at = now();
  return new;
end;
$$;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

grant select, insert, update, delete on public.profiles, public.lesson_progress, public.exercise_progress, public.code_drafts, public.notes, public.bookmarks, public.user_settings to authenticated;
