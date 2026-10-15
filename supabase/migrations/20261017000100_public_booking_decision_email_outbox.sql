-- SCH-97: require an email for public booking requests and queue a transactional
-- email whenever a master accepts or declines one. Delivery stays disabled
-- until the infrastructure task configures a verified sender domain/provider.

create table public.booking_decision_email_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'declined')),
  recipient text not null,
  locale text not null check (locale in ('ru', 'cz', 'en')),
  workspace_name text not null,
  service_name text not null,
  starts_at timestamptz not null,
  timezone text not null,
  status text not null default 'not_configured'
    check (status in ('pending', 'processing', 'accepted_by_provider', 'failed', 'not_configured')),
  attempts integer not null default 0 check (attempts >= 0),
  processing_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  last_error text check (last_error is null or last_error in (
    'provider_unavailable', 'provider_rejected', 'invalid_response'
  )),
  created_at timestamptz not null default now(),
  provider_accepted_at timestamptz,
  unique (appointment_id, decision),
  foreign key (appointment_id, workspace_id)
    references public.appointments(id, workspace_id) on delete cascade
);

create index booking_decision_email_outbox_status_created_idx
  on public.booking_decision_email_outbox (status, next_attempt_at, created_at)
  where status in ('pending', 'not_configured', 'processing');

alter table public.appointments
  add column customer_locale text not null default 'cs'
    check (customer_locale in ('ru', 'cz', 'en'));

alter table public.booking_decision_email_outbox enable row level security;
revoke all on public.booking_decision_email_outbox from public, anon, authenticated;
grant all on public.booking_decision_email_outbox to service_role;

drop function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text, text
);

create function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_starts_at timestamptz,
  p_customer_note text default null,
  p_idempotency_key text default null,
  p_locale text default 'cs'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_timezone text;
  v_service public.services%rowtype;
  v_customer_id uuid;
  v_appointment public.appointments%rowtype;
  v_request_key text := nullif(trim(p_idempotency_key), '');
  v_existing_response jsonb;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := nullif(trim(p_phone), '');
begin
  if nullif(trim(p_name), '') is null then
    raise exception 'Customer name is required';
  end if;

  if v_email is null
    or length(v_email) > 320
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Valid customer email is required';
  end if;

  if p_locale is null or p_locale not in ('ru', 'cz', 'en') then
    raise exception 'Unsupported booking locale';
  end if;

  if length(trim(p_name)) > 200
    or length(coalesce(p_phone, '')) > 50
    or length(coalesce(p_customer_note, '')) > 1000
    or length(coalesce(p_idempotency_key, '')) > 100 then
    raise exception 'Booking input is too long';
  end if;

  if v_request_key is null then
    raise exception 'Idempotency key is required';
  end if;

  select bl.workspace_id, w.timezone
  into v_workspace_id, v_timezone
  from public.booking_links bl
  join public.workspaces w on w.id = bl.workspace_id
  where bl.slug = lower(trim(p_slug))
    and bl.is_active = true
    and w.status = 'active';

  select * into v_service
  from public.services s
  where s.id = p_service_id
    and s.workspace_id = v_workspace_id
    and s.is_active = true
    and s.archived_at is null;

  if v_workspace_id is null or v_service.id is null then
    raise exception 'Booking link or service is not available';
  end if;

  insert into public.public_booking_requests (workspace_id, idempotency_key)
  values (v_workspace_id, v_request_key)
  on conflict (workspace_id, idempotency_key) do nothing;

  select response into v_existing_response
  from public.public_booking_requests
  where workspace_id = v_workspace_id
    and idempotency_key = v_request_key
  for update;

  if v_existing_response is not null then
    return v_existing_response;
  end if;

  perform public.enforce_public_booking_quota(v_workspace_id);

  if not exists (
    select 1
    from public.get_public_available_slots(
      p_slug,
      p_service_id,
      (p_starts_at at time zone v_timezone)::date
    ) slot
    where slot.starts_at = p_starts_at
  ) then
    raise exception 'Selected time is no longer available';
  end if;

  -- Anonymous contact data is never sufficient proof of ownership of an
  -- existing customer profile. Public requests always get a guest identity.
  insert into public.customers (
    workspace_id, name, email, phone, normalized_email, normalized_phone
  )
  values (
    v_workspace_id, trim(p_name), v_email, v_phone, v_email, v_phone
  )
  returning id into v_customer_id;

  insert into public.appointments (
    workspace_id, customer_id, service_id, service_name_snapshot,
    duration_minutes_snapshot, price_amount_snapshot, currency_snapshot,
    buffer_before_minutes_snapshot, buffer_after_minutes_snapshot,
    starts_at, ends_at, status, source, customer_note, customer_locale
  )
  values (
    v_workspace_id, v_customer_id, v_service.id, v_service.name,
    v_service.duration_minutes, v_service.price_amount, v_service.currency,
    v_service.buffer_before_minutes, v_service.buffer_after_minutes,
    p_starts_at,
    p_starts_at + make_interval(mins => v_service.duration_minutes),
    'pending', 'public_booking', nullif(trim(p_customer_note), ''), p_locale
  )
  returning * into v_appointment;

  insert into public.appointment_events (
    appointment_id, to_status, event_type
  )
  values (v_appointment.id, 'pending', 'created');

  v_existing_response := jsonb_build_object(
    'id', v_appointment.id,
    'startsAt', v_appointment.starts_at,
    'endsAt', v_appointment.ends_at,
    'serviceName', v_appointment.service_name_snapshot,
    'status', v_appointment.status
  );

  update public.public_booking_requests
  set response = v_existing_response
  where workspace_id = v_workspace_id
    and idempotency_key = v_request_key;

  return v_existing_response;
exception
  when exclusion_violation then
    raise exception 'Selected time is no longer available';
end;
$$;

revoke all on function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text, text, text
) from public;
grant execute on function public.create_public_booking(
  text, uuid, text, text, text, timestamptz, text, text, text
) to anon, authenticated;

create or replace function public.set_appointment_status(
  p_appointment_id uuid,
  p_status public.appointment_status,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appointment public.appointments%rowtype;
  v_event_type public.appointment_event_type;
  v_notification_status text;
begin
  select * into v_appointment
  from public.appointments
  where id = p_appointment_id
    and public.is_workspace_member(workspace_id)
  for update;

  if v_appointment.id is null then
    raise exception 'Appointment not found';
  end if;

  if v_appointment.status <> p_status then
    if not (
      (v_appointment.status = 'pending' and p_status in ('confirmed', 'cancelled_by_master'))
      or (v_appointment.status = 'confirmed' and p_status in (
        'cancelled_by_master', 'completed', 'no_show'
      ))
    ) then
      raise exception 'Invalid appointment status transition';
    end if;

    v_event_type := (case
      when p_status in ('cancelled_by_customer', 'cancelled_by_master') then 'cancelled'
      when p_status = 'completed' then 'completed'
      when p_status = 'no_show' then 'no_show'
      when p_status = 'confirmed' then 'confirmed'
      else 'created'
    end)::public.appointment_event_type;

    update public.appointments
    set status = p_status,
        cancellation_reason = case
          when p_status in ('cancelled_by_customer', 'cancelled_by_master')
            then nullif(trim(p_reason), '')
          else cancellation_reason
        end,
        confirmed_at = case when p_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
        cancelled_at = case when p_status in ('cancelled_by_customer', 'cancelled_by_master') then now() else cancelled_at end,
        completed_at = case when p_status = 'completed' then now() else completed_at end
    where id = v_appointment.id;

    if v_appointment.status = 'pending'
      and v_appointment.source = 'public_booking'
      and p_status in ('confirmed', 'cancelled_by_master') then
      insert into public.booking_decision_email_outbox (
        workspace_id, appointment_id, decision, recipient, locale,
        workspace_name, service_name, starts_at, timezone
      )
      select
        v_appointment.workspace_id,
        v_appointment.id,
        case when p_status = 'confirmed' then 'accepted' else 'declined' end,
        lower(trim(c.email)),
        v_appointment.customer_locale,
        w.name,
        v_appointment.service_name_snapshot,
        v_appointment.starts_at,
        w.timezone
      from public.customers c
      join public.workspaces w on w.id = v_appointment.workspace_id
      where c.id = v_appointment.customer_id
        and c.workspace_id = v_appointment.workspace_id
        and nullif(trim(c.email), '') is not null
      on conflict (appointment_id, decision) do nothing;
    end if;

    insert into public.appointment_events (
      appointment_id, from_status, to_status, event_type, reason, created_by
    )
    values (
      v_appointment.id,
      v_appointment.status,
      p_status,
      v_event_type,
      nullif(trim(p_reason), ''),
      auth.uid()
    );
  end if;

  if v_appointment.source = 'public_booking'
    and p_status in ('confirmed', 'cancelled_by_master') then
    select e.status into v_notification_status
    from public.booking_decision_email_outbox e
    where e.appointment_id = v_appointment.id
      and e.decision = case when p_status = 'confirmed' then 'accepted' else 'declined' end;
  end if;

  return jsonb_build_object(
    'id', v_appointment.id,
    'status', p_status,
    'notificationStatus', v_notification_status
  );
end;
$$;

create or replace function public.mark_pending_booking_emails_not_configured()
returns integer
language sql
security definer
set search_path = ''
as $$
  with changed as (
    update public.booking_decision_email_outbox
       set status = 'not_configured', last_error = null
     where status = 'pending'
     returning 1
  )
  select count(*)::integer from changed;
$$;

create or replace function public.claim_booking_decision_emails(p_batch_size integer default 20)
returns table (
  id uuid,
  decision text,
  recipient text,
  locale text,
  workspace_name text,
  service_name text,
  starts_at timestamptz,
  timezone text,
  attempts integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_batch_size < 1 or p_batch_size > 100 then
    raise exception 'Invalid booking notification batch size';
  end if;

  update public.booking_decision_email_outbox
     set status = 'failed', processing_at = null, last_error = 'provider_unavailable'
   where status = 'processing'
     and processing_at < now() - interval '10 minutes'
     and attempts >= 5;

  return query
  with next_emails as (
    select e.id
      from public.booking_decision_email_outbox e
     where (
       e.status in ('pending', 'not_configured')
       or (e.status = 'processing' and e.processing_at < now() - interval '10 minutes')
     )
       and e.attempts < 5
       and e.next_attempt_at <= now()
     order by e.created_at
     for update skip locked
     limit p_batch_size
  ), claimed as (
    update public.booking_decision_email_outbox e
       set status = 'processing',
           attempts = e.attempts + 1,
           processing_at = now(),
           last_error = null
      from next_emails n
     where e.id = n.id
     returning e.*
  )
  select c.id, c.decision, c.recipient, c.locale, c.workspace_name,
         c.service_name, c.starts_at, c.timezone, c.attempts
    from claimed c;
end;
$$;

create or replace function public.finish_booking_decision_email(
  p_id uuid,
  p_success boolean,
  p_retryable boolean default false,
  p_error text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_safe_error text;
begin
  if p_error not in ('provider_unavailable', 'provider_rejected', 'invalid_response') then
    v_safe_error := null;
  else
    v_safe_error := p_error;
  end if;

  v_status := case
    when p_success then 'accepted_by_provider'
    when p_retryable and (select e.attempts < 5 from public.booking_decision_email_outbox e where e.id = p_id) then 'pending'
    else 'failed'
  end;

  update public.booking_decision_email_outbox
     set status = v_status,
         provider_accepted_at = case when v_status = 'accepted_by_provider' then now() else provider_accepted_at end,
         processing_at = null,
         next_attempt_at = case
           when v_status = 'pending' then now() + make_interval(mins => least(60, attempts * attempts))
           else next_attempt_at
         end,
         last_error = case when v_status = 'accepted_by_provider' then null else v_safe_error end
   where id = p_id and status = 'processing';

  if not found then
    raise exception 'Booking notification is not processing';
  end if;

  return v_status;
end;
$$;

revoke all on function public.mark_pending_booking_emails_not_configured() from public, anon, authenticated;
revoke all on function public.claim_booking_decision_emails(integer) from public, anon, authenticated;
revoke all on function public.finish_booking_decision_email(uuid, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.mark_pending_booking_emails_not_configured() to service_role;
grant execute on function public.claim_booking_decision_emails(integer) to service_role;
grant execute on function public.finish_booking_decision_email(uuid, boolean, boolean, text) to service_role;
