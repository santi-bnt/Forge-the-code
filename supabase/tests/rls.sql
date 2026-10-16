-- Run against Supabase local development with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Seed one row for each identity as the local service role. These UUIDs are test fixtures only.
set local role service_role;
insert into public.lesson_progress (user_id, lesson_id, status, progress)
values ('00000000-0000-0000-0000-0000000000a1', 'rls-owner-check', 'completed', 100),
       ('00000000-0000-0000-0000-0000000000b2', 'rls-owner-check', 'completed', 100)
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select is((select count(*)::integer from public.lesson_progress where lesson_id = 'rls-owner-check'), 1, 'User A reads only their own progress');
select lives_ok($$insert into public.lesson_progress (user_id, lesson_id) values ('00000000-0000-0000-0000-0000000000a1', 'rls-own-insert')$$, 'User A inserts own progress');
select throws_ok($$insert into public.lesson_progress (user_id, lesson_id) values ('00000000-0000-0000-0000-0000000000b2', 'rls-forbidden-insert')$$, '42501', null, 'User A cannot insert User B progress');
update public.lesson_progress set progress = 42 where user_id = '00000000-0000-0000-0000-0000000000a1' and lesson_id = 'rls-owner-check';
select is((select progress from public.lesson_progress where lesson_id = 'rls-owner-check'), 42, 'User A updates own progress');
update public.lesson_progress set progress = 12 where user_id = '00000000-0000-0000-0000-0000000000b2' and lesson_id = 'rls-owner-check';
select is((select progress from public.lesson_progress where lesson_id = 'rls-owner-check'), 42, 'User A cannot update User B progress');
delete from public.lesson_progress where user_id = '00000000-0000-0000-0000-0000000000b2' and lesson_id = 'rls-owner-check';
select is((select count(*)::integer from public.lesson_progress where lesson_id = 'rls-owner-check'), 1, 'User A cannot delete User B progress');
delete from public.lesson_progress where user_id = '00000000-0000-0000-0000-0000000000a1' and lesson_id = 'rls-own-insert';
select is((select count(*)::integer from public.lesson_progress where lesson_id = 'rls-own-insert'), 0, 'User A deletes own progress');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
select is((select count(*)::integer from public.lesson_progress where user_id = '00000000-0000-0000-0000-0000000000a1' and lesson_id = 'rls-owner-check'), 0, 'User B cannot read User A progress');
select * from finish();
rollback;
