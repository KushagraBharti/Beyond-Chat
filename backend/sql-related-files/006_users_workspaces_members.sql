create extension if not exists "pgcrypto";

do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'workspaces'
          and column_name = 'owner'
    ) and not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'workspaces'
          and column_name = 'owner_id'
    ) then
        alter table public.workspaces rename column owner to owner_id;
    end if;
end $$;

alter table if exists public.workspaces
    add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table if exists public.workspaces
    add column if not exists slug text;

create unique index if not exists workspaces_slug_idx
    on public.workspaces (slug)
    where slug is not null;

create index if not exists workspaces_owner_idx
    on public.workspaces (owner_id, created_at desc);

create index if not exists workspace_members_user_idx
    on public.workspace_members (user_id, workspace_id);

create or replace function public.handle_new_user_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    inferred_name text;
    inferred_slug text;
    new_workspace_id uuid;
begin
    inferred_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Beyond Chat User');

    insert into public.user_profiles (id, email, display_name, metadata)
    values (
        new.id,
        new.email,
        inferred_name,
        coalesce(new.raw_user_meta_data, '{}'::jsonb)
    )
    on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        metadata = excluded.metadata,
        updated_at = timezone('utc', now());

    inferred_slug := lower(regexp_replace(inferred_name || '-workspace', '[^a-zA-Z0-9]+', '-', 'g'));
    inferred_slug := trim(both '-' from inferred_slug);
    inferred_slug := inferred_slug || '-' || substring(new.id::text from 1 for 8);

    insert into public.workspaces (owner_id, name, slug, metadata)
    values (
        new.id,
        inferred_name || '''s Workspace',
        inferred_slug,
        jsonb_build_object('bootstrapped_by', 'auth.users trigger')
    )
    returning id into new_workspace_id;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (new_workspace_id, new.id, 'admin')
    on conflict do nothing;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_workspace();
