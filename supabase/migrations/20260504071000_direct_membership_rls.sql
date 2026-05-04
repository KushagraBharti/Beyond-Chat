-- Replace SECURITY DEFINER helper-based policies with direct membership
-- predicates. This lets helper RPC EXECUTE stay revoked for authenticated
-- callers while ordinary authenticated table/storage access still works.

-- Workspace tables
drop policy if exists workspaces_workspace_select on public.workspaces;
create policy workspaces_workspace_select on public.workspaces
for select
using (
    owner_id = (select auth.uid())
    or exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = workspaces.id
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists workspaces_workspace_update on public.workspaces;
create policy workspaces_workspace_update on public.workspaces
for update
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists workspace_members_workspace_select on public.workspace_members;
create policy workspace_members_workspace_select on public.workspace_members
for select
using (user_id = (select auth.uid()));

drop policy if exists workspace_members_workspace_insert on public.workspace_members;
create policy workspace_members_workspace_insert on public.workspace_members
for insert
with check (false);

drop policy if exists workspace_members_workspace_update on public.workspace_members;
create policy workspace_members_workspace_update on public.workspace_members
for update
using (false)
with check (false);

drop policy if exists workspace_members_workspace_delete on public.workspace_members;
create policy workspace_members_workspace_delete on public.workspace_members
for delete
using (false);

-- Workspace-scoped app tables. The app is profile-first now, but these
-- legacy workspace paths still need to work without helper EXECUTE grants.
drop policy if exists chat_collections_workspace_access on public.chat_collections;
create policy chat_collections_workspace_access on public.chat_collections
for all
using (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = chat_collections.workspace_id
          and wm.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = chat_collections.workspace_id
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists chat_threads_workspace_access on public.chat_threads;
create policy chat_threads_workspace_access on public.chat_threads
for all
using (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = chat_threads.workspace_id
          and wm.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = chat_threads.workspace_id
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists chat_messages_workspace_access on public.chat_messages;
create policy chat_messages_workspace_access on public.chat_messages
for all
using (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = chat_messages.workspace_id
          and wm.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = chat_messages.workspace_id
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists integration_connections_workspace_access on public.integration_connections;
drop policy if exists integration_connections_workspace_read on public.integration_connections;
drop policy if exists integration_connections_owner_insert on public.integration_connections;
drop policy if exists integration_connections_owner_update on public.integration_connections;
drop policy if exists integration_connections_owner_delete on public.integration_connections;
create policy integration_connections_workspace_read on public.integration_connections
for select
using (
    user_id = (select auth.uid())
    or exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = integration_connections.workspace_id
          and wm.user_id = (select auth.uid())
    )
);

create policy integration_connections_owner_insert on public.integration_connections
for insert
with check (
    user_id = (select auth.uid())
);

create policy integration_connections_owner_update on public.integration_connections
for update
using (
    user_id = (select auth.uid())
)
with check (
    user_id = (select auth.uid())
);

create policy integration_connections_owner_delete on public.integration_connections
for delete
using (
    user_id = (select auth.uid())
);

drop policy if exists integration_sync_logs_workspace_access on public.integration_sync_logs;
create policy integration_sync_logs_workspace_access on public.integration_sync_logs
for all
using (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = integration_sync_logs.workspace_id
          and wm.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = integration_sync_logs.workspace_id
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists reminders_workspace_access on public.reminders;
create policy reminders_workspace_access on public.reminders
for all
using (
    created_by = (select auth.uid())
    or exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = reminders.workspace_id
          and wm.user_id = (select auth.uid())
    )
)
with check (
    created_by = (select auth.uid())
    or exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = reminders.workspace_id
          and wm.user_id = (select auth.uid())
    )
);

-- Profile-scoped artifacts/runs.
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

drop policy if exists usage_events_self_select on public.usage_events;
drop policy if exists usage_events_workspace_select on public.usage_events;
drop policy if exists usage_events_select_access on public.usage_events;
create policy usage_events_select_access on public.usage_events
for select
using (
    user_id = (select auth.uid())
    or exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id = usage_events.workspace_id
          and wm.user_id = (select auth.uid())
    )
);

-- Storage bucket policies.
drop policy if exists artifact_bucket_workspace_read on storage.objects;
create policy artifact_bucket_workspace_read on storage.objects
for select
using (
    bucket_id = 'artifacts'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
    and (
        exists (
            select 1
            from public.artifacts a
            where a.workspace_id::text = (storage.foldername(name))[1]
              and a.id::text = (storage.foldername(name))[2]
              and (
                a.owner_profile_id = (select auth.uid())
                or (a.owner_profile_id is null and a.created_by = (select auth.uid()))
              )
        )
        or (
            (storage.foldername(name))[2] = 'images'
            and exists (
                select 1
                from public.runs r
                where r.workspace_id::text = (storage.foldername(name))[1]
                  and r.id::text = (storage.foldername(name))[3]
                  and (
                    r.owner_profile_id = (select auth.uid())
                    or (r.owner_profile_id is null and r.created_by = (select auth.uid()))
                  )
            )
        )
    ));

drop policy if exists artifact_bucket_workspace_write on storage.objects;
create policy artifact_bucket_workspace_write on storage.objects
for insert
with check (
    bucket_id = 'artifacts'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
    and (
        exists (
            select 1
            from public.artifacts a
            where a.workspace_id::text = (storage.foldername(name))[1]
              and a.id::text = (storage.foldername(name))[2]
              and (
                a.owner_profile_id = (select auth.uid())
                or (a.owner_profile_id is null and a.created_by = (select auth.uid()))
              )
        )
        or (
            (storage.foldername(name))[2] = 'images'
            and exists (
                select 1
                from public.runs r
                where r.workspace_id::text = (storage.foldername(name))[1]
                  and r.id::text = (storage.foldername(name))[3]
                  and (
                    r.owner_profile_id = (select auth.uid())
                    or (r.owner_profile_id is null and r.created_by = (select auth.uid()))
                  )
            )
        )
    ));

drop policy if exists artifact_bucket_workspace_update on storage.objects;
create policy artifact_bucket_workspace_update on storage.objects
for update
using (
    bucket_id = 'artifacts'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
    and (
        exists (
            select 1
            from public.artifacts a
            where a.workspace_id::text = (storage.foldername(name))[1]
              and a.id::text = (storage.foldername(name))[2]
              and (
                a.owner_profile_id = (select auth.uid())
                or (a.owner_profile_id is null and a.created_by = (select auth.uid()))
              )
        )
        or (
            (storage.foldername(name))[2] = 'images'
            and exists (
                select 1
                from public.runs r
                where r.workspace_id::text = (storage.foldername(name))[1]
                  and r.id::text = (storage.foldername(name))[3]
                  and (
                    r.owner_profile_id = (select auth.uid())
                    or (r.owner_profile_id is null and r.created_by = (select auth.uid()))
                  )
            )
        )
    ))
with check (
    bucket_id = 'artifacts'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
    and (
        exists (
            select 1
            from public.artifacts a
            where a.workspace_id::text = (storage.foldername(name))[1]
              and a.id::text = (storage.foldername(name))[2]
              and (
                a.owner_profile_id = (select auth.uid())
                or (a.owner_profile_id is null and a.created_by = (select auth.uid()))
              )
        )
        or (
            (storage.foldername(name))[2] = 'images'
            and exists (
                select 1
                from public.runs r
                where r.workspace_id::text = (storage.foldername(name))[1]
                  and r.id::text = (storage.foldername(name))[3]
                  and (
                    r.owner_profile_id = (select auth.uid())
                    or (r.owner_profile_id is null and r.created_by = (select auth.uid()))
                  )
            )
        )
    ));

drop policy if exists artifact_bucket_workspace_delete on storage.objects;
create policy artifact_bucket_workspace_delete on storage.objects
for delete
using (
    bucket_id = 'artifacts'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
    and (
        exists (
            select 1
            from public.artifacts a
            where a.workspace_id::text = (storage.foldername(name))[1]
              and a.id::text = (storage.foldername(name))[2]
              and (
                a.owner_profile_id = (select auth.uid())
                or (a.owner_profile_id is null and a.created_by = (select auth.uid()))
              )
        )
        or (
            (storage.foldername(name))[2] = 'images'
            and exists (
                select 1
                from public.runs r
                where r.workspace_id::text = (storage.foldername(name))[1]
                  and r.id::text = (storage.foldername(name))[3]
                  and (
                    r.owner_profile_id = (select auth.uid())
                    or (r.owner_profile_id is null and r.created_by = (select auth.uid()))
                  )
            )
        )
    ));

drop policy if exists user_uploads_bucket_workspace_read on storage.objects;
create policy user_uploads_bucket_workspace_read on storage.objects
for select
using (
    bucket_id = 'user-uploads'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists user_uploads_bucket_workspace_write on storage.objects;
create policy user_uploads_bucket_workspace_write on storage.objects
for insert
with check (
    bucket_id = 'user-uploads'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists user_uploads_bucket_workspace_update on storage.objects;
create policy user_uploads_bucket_workspace_update on storage.objects
for update
using (
    bucket_id = 'user-uploads'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
)
with check (
    bucket_id = 'user-uploads'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
);

drop policy if exists user_uploads_bucket_workspace_delete on storage.objects;
create policy user_uploads_bucket_workspace_delete on storage.objects
for delete
using (
    bucket_id = 'user-uploads'
    and exists (
        select 1
        from public.workspace_members wm
        where wm.workspace_id::text = (storage.foldername(name))[1]
          and wm.user_id = (select auth.uid())
    )
);
