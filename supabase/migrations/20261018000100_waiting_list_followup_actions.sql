-- Follow-up UX for the master waiting list: create a real customer together
-- with their first waiting-list entry, bulk removal, and request transfer.

alter table public.waiting_list_entries
  add column source_appointment_id uuid references public.appointments(id) on delete set null;

create unique index waiting_list_source_appointment_unique
  on public.waiting_list_entries (source_appointment_id)
  where source_appointment_id is not null;

create or replace function public.create_master_waiting_list_customer(
  p_workspace_id uuid,
  p_service_id uuid,
  p_desired_date date,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_desired_time_from time default null,
  p_desired_time_to time default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_entry_id uuid;
  v_email text := nullif(lower(trim(p_customer_email)), '');
  v_phone text := nullif(trim(p_customer_phone), '');
  v_normalized_phone text := nullif(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'), '');
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if nullif(trim(p_customer_name), '') is null or p_desired_date is null then
    raise exception 'Customer name and desired date are required';
  end if;
  if v_email is null and v_phone is null then
    raise exception 'Email or phone is required for a new customer';
  end if;
  if v_email is not null and (length(v_email) > 320 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Valid customer email is required';
  end if;
  if p_desired_time_from is not null and p_desired_time_to is not null and p_desired_time_to <= p_desired_time_from then
    raise exception 'Invalid desired time range';
  end if;
  if not exists (
    select 1 from public.services s
     where s.id = p_service_id and s.workspace_id = p_workspace_id
       and s.is_active and s.archived_at is null
  ) then
    raise exception 'Active service not found';
  end if;
  if exists (
    select 1 from public.customers c
     where c.workspace_id = p_workspace_id and c.anonymized_at is null
       and (
         (v_email is not null and coalesce(c.normalized_email, lower(trim(c.email))) = v_email)
         or (
           v_normalized_phone is not null
           and coalesce(c.normalized_phone, nullif(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), '')) = v_normalized_phone
         )
       )
  ) then
    raise exception 'Customer contact already exists; select the existing customer';
  end if;

  insert into public.customers (
    workspace_id, name, email, phone, normalized_email, normalized_phone
  ) values (
    p_workspace_id, trim(p_customer_name), v_email, v_phone, v_email, v_normalized_phone
  ) returning id into v_customer_id;

  insert into public.waiting_list_entries (
    workspace_id, customer_id, customer_name, customer_email, customer_phone,
    service_id, desired_date, desired_time_from, desired_time_to, note
  ) values (
    p_workspace_id, v_customer_id, trim(p_customer_name), v_email, v_phone,
    p_service_id, p_desired_date, p_desired_time_from, p_desired_time_to,
    nullif(trim(p_note), '')
  ) returning id into v_entry_id;
  return v_entry_id;
end;
$$;

create or replace function public.remove_all_master_waiting_list_entries(
  p_workspace_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removed integer;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  update public.waiting_list_entries
     set status = 'removed', updated_at = now()
   where workspace_id = p_workspace_id and status = 'active';
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$$;

create or replace function public.move_booking_request_to_waiting_list(
  p_workspace_id uuid,
  p_appointment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_customer public.customers%rowtype;
  v_entry_id uuid;
  v_timezone text;
begin
  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select e.id into v_entry_id
    from public.waiting_list_entries e
   where e.source_appointment_id = p_appointment_id
     and e.workspace_id = p_workspace_id;
  if v_entry_id is not null then
    return v_entry_id;
  end if;

  select * into v_appointment
    from public.appointments a
   where a.id = p_appointment_id
     and a.workspace_id = p_workspace_id
   for update;
  if not found or v_appointment.source <> 'public_booking' then
    raise exception 'Pending public booking request not found';
  end if;
  if v_appointment.status <> 'pending' then
    select e.id into v_entry_id
      from public.waiting_list_entries e
     where e.source_appointment_id = p_appointment_id
       and e.workspace_id = p_workspace_id;
    if v_entry_id is not null then
      return v_entry_id;
    end if;
    raise exception 'Pending public booking request not found';
  end if;

  select * into v_customer
    from public.customers c
   where c.id = v_appointment.customer_id
     and c.workspace_id = p_workspace_id
     and c.anonymized_at is null;
  if not found then
    raise exception 'Booking customer not found';
  end if;

  select w.timezone into v_timezone
    from public.workspaces w
   where w.id = p_workspace_id;

  insert into public.waiting_list_entries (
    workspace_id, customer_id, customer_name, customer_email, customer_phone,
    service_id, desired_date, desired_time_from, desired_time_to, source_appointment_id
  ) values (
    p_workspace_id, v_customer.id, v_customer.name, v_customer.email, v_customer.phone,
    v_appointment.service_id,
    (v_appointment.starts_at at time zone v_timezone)::date,
    (v_appointment.starts_at at time zone v_timezone)::time,
    case
      when (v_appointment.ends_at at time zone v_timezone)::time
        > (v_appointment.starts_at at time zone v_timezone)::time
      then (v_appointment.ends_at at time zone v_timezone)::time
      else null
    end,
    v_appointment.id
  ) returning id into v_entry_id;

  perform public.set_appointment_status(
    p_appointment_id,
    'cancelled_by_master'::public.appointment_status,
    null
  );
  return v_entry_id;
end;
$$;

revoke all on function public.create_master_waiting_list_customer(uuid, uuid, date, text, text, text, time, time, text) from public, anon;
revoke all on function public.remove_all_master_waiting_list_entries(uuid) from public, anon;
revoke all on function public.move_booking_request_to_waiting_list(uuid, uuid) from public, anon;
grant execute on function public.create_master_waiting_list_customer(uuid, uuid, date, text, text, text, time, time, text) to authenticated;
grant execute on function public.remove_all_master_waiting_list_entries(uuid) to authenticated;
grant execute on function public.move_booking_request_to_waiting_list(uuid, uuid) to authenticated;
