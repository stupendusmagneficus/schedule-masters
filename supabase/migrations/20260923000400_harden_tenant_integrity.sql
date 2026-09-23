-- SCH-61: enforce workspace ownership across appointment-related references.

alter table public.customers
  add constraint customers_workspace_id_id_key unique (workspace_id, id);

alter table public.services
  add constraint services_workspace_id_id_key unique (workspace_id, id);

alter table public.appointments
  add constraint appointments_workspace_id_id_key unique (workspace_id, id),
  add constraint appointments_customer_same_workspace_fkey
    foreign key (workspace_id, customer_id)
    references public.customers (workspace_id, id)
    on delete restrict,
  add constraint appointments_service_same_workspace_fkey
    foreign key (workspace_id, service_id)
    references public.services (workspace_id, id);

alter table public.notification_jobs
  add constraint notification_jobs_appointment_same_workspace_fkey
    foreign key (workspace_id, appointment_id)
    references public.appointments (workspace_id, id)
    on delete cascade;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = (select auth.uid())
  );
$$;

drop policy appointments_member_insert on public.appointments;

create policy appointments_member_insert on public.appointments
  for insert to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1
      from public.customers c
      where c.id = appointments.customer_id
        and c.workspace_id = appointments.workspace_id
    )
    and (
      appointments.service_id is null
      or exists (
        select 1
        from public.services s
        where s.id = appointments.service_id
          and s.workspace_id = appointments.workspace_id
      )
    )
  );

drop policy notification_jobs_member_access on public.notification_jobs;

create policy notification_jobs_member_access on public.notification_jobs
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and exists (
      select 1
      from public.appointments a
      where a.id = notification_jobs.appointment_id
        and a.workspace_id = notification_jobs.workspace_id
    )
  );
