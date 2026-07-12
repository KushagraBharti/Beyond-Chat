-- Make the runtime usage reservation service-only boundary explicit to advisors.

begin;

drop policy if exists runtime_usage_reservations_client_deny
  on public.runtime_usage_reservations;

create policy runtime_usage_reservations_client_deny
  on public.runtime_usage_reservations
  for all
  to anon, authenticated
  using (false)
  with check (false);

commit;
