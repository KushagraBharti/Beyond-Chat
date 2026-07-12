-- Make the service-only boundary explicit for advisor-visible RLS tables.

begin;

create policy product_idempotency_keys_client_deny
  on public.product_idempotency_keys
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy runtime_dispatch_queue_client_deny
  on public.runtime_dispatch_queue
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy runtime_leases_client_deny
  on public.runtime_leases
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy runtime_run_attempts_client_deny
  on public.runtime_run_attempts
  for all
  to anon, authenticated
  using (false)
  with check (false);

commit;
