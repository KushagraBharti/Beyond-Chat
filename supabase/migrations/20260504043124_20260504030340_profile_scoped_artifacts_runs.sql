alter table if exists public.artifacts
    add column if not exists owner_profile_id uuid references public.user_profiles(id) on delete cascade;

alter table if exists public.runs
    add column if not exists owner_profile_id uuid references public.user_profiles(id) on delete cascade;

update public.artifacts
set owner_profile_id = created_by
where owner_profile_id is null
  and created_by is not null;

update public.runs
set owner_profile_id = created_by
where owner_profile_id is null
  and created_by is not null;

create index if not exists artifacts_owner_profile_updated_idx
    on public.artifacts (owner_profile_id, updated_at desc)
    where owner_profile_id is not null;

create index if not exists runs_owner_profile_created_idx
    on public.runs (owner_profile_id, created_at desc)
    where owner_profile_id is not null;

drop policy if exists artifacts_workspace_access on public.artifacts;
drop policy if exists artifacts_profile_access on public.artifacts;
create policy artifacts_profile_access on public.artifacts
for all
using (
    owner_profile_id = (select auth.uid())
    or (owner_profile_id is null and created_by = (select auth.uid()))
)
with check (
    owner_profile_id = (select auth.uid())
    or (owner_profile_id is null and created_by = (select auth.uid()))
);

drop policy if exists runs_workspace_access on public.runs;
drop policy if exists runs_profile_access on public.runs;
create policy runs_profile_access on public.runs
for all
using (
    owner_profile_id = (select auth.uid())
    or (owner_profile_id is null and created_by = (select auth.uid()))
)
with check (
    owner_profile_id = (select auth.uid())
    or (owner_profile_id is null and created_by = (select auth.uid()))
);

drop policy if exists run_steps_workspace_access on public.run_steps;
drop policy if exists run_steps_profile_access on public.run_steps;
create policy run_steps_profile_access on public.run_steps
for all
using (
    exists (
        select 1
        from public.runs r
        where r.id = run_steps.run_id
          and (
            r.owner_profile_id = (select auth.uid())
            or (r.owner_profile_id is null and r.created_by = (select auth.uid()))
          )
    )
)
with check (
    exists (
        select 1
        from public.runs r
        where r.id = run_steps.run_id
          and (
            r.owner_profile_id = (select auth.uid())
            or (r.owner_profile_id is null and r.created_by = (select auth.uid()))
          )
    )
);
