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

create or replace function public.ensure_workspace_for_user(
    target_user_id uuid,
    target_email text default null,
    target_display_name text default null,
    target_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    existing_membership record;
    existing_workspace public.workspaces%rowtype;
    inferred_name text;
    inferred_slug text;
    created_workspace public.workspaces%rowtype;
begin
    inferred_name := coalesce(nullif(target_display_name, ''), split_part(coalesce(target_email, ''), '@', 1), 'Beyond Chat User');

    insert into public.user_profiles (id, email, display_name, metadata)
    values (
        target_user_id,
        target_email,
        inferred_name,
        coalesce(target_metadata, '{}'::jsonb)
    )
    on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        metadata = excluded.metadata,
        updated_at = timezone('utc', now());

    select wm.workspace_id, wm.role
    into existing_membership
    from public.workspace_members wm
    where wm.user_id = target_user_id
    order by
        case wm.role
            when 'admin' then 0
            when 'member' then 1
            else 2
        end,
        wm.created_at asc
    limit 1;

    if found then
        select *
        into existing_workspace
        from public.workspaces w
        where w.id = existing_membership.workspace_id
        limit 1;

        return jsonb_build_object(
            'workspace',
            coalesce(
                to_jsonb(existing_workspace),
                jsonb_build_object('id', existing_membership.workspace_id, 'name', 'Beyond Chat Workspace')
            ),
            'role',
            coalesce(existing_membership.role, 'admin'),
            'created',
            false
        );
    end if;

    inferred_slug := lower(regexp_replace(inferred_name || '-workspace', '[^a-zA-Z0-9]+', '-', 'g'));
    inferred_slug := trim(both '-' from inferred_slug);
    inferred_slug := inferred_slug || '-' || substring(target_user_id::text from 1 for 8);

    insert into public.workspaces (owner_id, name, slug, metadata)
    values (
        target_user_id,
        inferred_name || '''s Workspace',
        inferred_slug,
        jsonb_build_object('bootstrapped_by', 'public.ensure_workspace_for_user')
    )
    returning *
    into created_workspace;

    insert into public.workspace_members (workspace_id, user_id, role)
    values (created_workspace.id, target_user_id, 'admin')
    on conflict (workspace_id, user_id) do nothing;

    return jsonb_build_object(
        'workspace',
        to_jsonb(created_workspace),
        'role',
        'admin',
        'created',
        true
    );
end;
$$;

create or replace function public.handle_new_user_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.ensure_workspace_for_user(
        new.id,
        new.email,
        new.raw_user_meta_data->>'display_name',
        coalesce(new.raw_user_meta_data, '{}'::jsonb)
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_workspace();
