-- Public booking anti-abuse for the external pilot (audit F-003, F-004, F-010, F-016).
-- * The per-IP budget trusts the proxy-set CF-Connecting-IP before the
--   client-controlled X-Forwarded-For; a malformed header shares one bucket
--   instead of skipping the limit.
-- * A customer email may hold at most 3 future pending requests per workspace.
-- * request_received receipts are capped at 3 per recipient per 24 hours, so
--   the booking form cannot be used to mail arbitrary addresses.
-- * A changed booking slug stays reserved for its workspace for 90 days, so old
--   links and QR codes cannot be taken over by another master.

create or replace function public.check_public_booking_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_method text := current_setting('request.method', true);
  v_path text := current_setting('request.path', true);
  v_headers json;
  v_client_ip text;
  v_ip inet;
  v_recent_requests integer;
  v_window interval := interval '5 minutes';
  v_max_requests integer := 30;
begin
  if coalesce(v_method, '') not in ('POST', 'PUT', 'PATCH', 'DELETE')
    or coalesce(v_path, '') !~ '/rpc/create_public_booking(_with_services)?/?$' then
    return;
  end if;

  begin
    v_headers := current_setting('request.headers', true)::json;
  exception
    when others then
      v_headers := null;
  end;

  -- The edge proxy overwrites CF-Connecting-IP; the first X-Forwarded-For entry
  -- is client-controlled and only a fallback where no such proxy exists.
  v_client_ip := coalesce(
    nullif(trim(v_headers->>'cf-connecting-ip'), ''),
    nullif(trim(split_part(v_headers->>'x-forwarded-for', ',', 1)), '')
  );
  if v_client_ip is not null then
    begin
      v_ip := v_client_ip::inet;
    exception
      when others then
        -- Malformed values share one bucket instead of skipping the limit.
        v_ip := '0.0.0.0'::inet;
    end;
  end if;

  if v_ip is null then
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('public-booking-ip:' || v_ip::text, 0)
  );

  select count(*)::integer
  into v_recent_requests
  from private.public_booking_rate_limits
  where ip = v_ip
    and request_at >= now() - v_window;

  if v_recent_requests >= v_max_requests then
    raise sqlstate 'PGRST'
      using message = json_build_object(
              'code', 'PUBLIC_BOOKING_RATE_LIMIT',
              'message', 'Too many booking requests',
              'details', 'Rate limit exceeded')::text,
            detail = json_build_object(
              'status', 429,
              'headers', json_build_object(),
              'status_text', 'Too Many Requests')::text;
  end if;

  insert into private.public_booking_rate_limits (ip)
  values (v_ip);
end;
$$;

notify pgrst, 'reload config';

create or replace function public.create_public_booking(
  p_slug text,
  p_service_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_starts_at timestamptz,
  p_customer_note text default null,
  p_idempotency_key text default null,
  p_locale text default 'cz'
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

  if p_locale is null or p_locale not in ('en', 'cz', 'sk', 'ru', 'uk') then
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

  -- Serialized by the workspace quota lock above.
  if (
    select count(*)
      from public.appointments a
      join public.customers c on c.id = a.customer_id
     where a.workspace_id = v_workspace_id
       and a.source = 'public_booking'
       and a.status = 'pending'
       and a.starts_at > now()
       and c.workspace_id = v_workspace_id
       and c.normalized_email = v_email
  ) >= 3 then
    raise exception 'Too many pending requests for this email';
  end if;

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

create or replace function private.queue_appointment_event_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_appointment public.appointments%rowtype;
  v_recipient text;
begin
  select * into v_appointment from public.appointments where id = new.appointment_id;
  if new.event_type = 'created' and v_appointment.source = 'public_booking' and v_appointment.status = 'pending' then
    select lower(trim(c.email)) into v_recipient from public.customers c
     where c.id = v_appointment.customer_id and c.workspace_id = v_appointment.workspace_id;
    perform pg_advisory_xact_lock(hashtextextended('request-receipt:' || coalesce(v_recipient, ''), 0));
    if (
      select count(*) from public.booking_decision_email_outbox e
       where e.decision = 'request_received'
         and e.recipient = v_recipient
         and e.created_at > now() - interval '24 hours'
    ) < 3 then
      perform private.enqueue_appointment_email(v_appointment, 'request_received');
    end if;
    perform private.enqueue_appointment_email(v_appointment, 'master_request_received');
  elsif new.event_type = 'created' and v_appointment.status = 'confirmed' then
    perform private.enqueue_appointment_email(v_appointment, 'accepted');
  elsif new.event_type = 'confirmed' and new.from_status is distinct from new.to_status then
    if new.created_by is null then
      perform private.enqueue_appointment_email(v_appointment, 'customer_confirmed');
      perform private.enqueue_appointment_email(v_appointment, 'master_customer_confirmed');
    else perform private.enqueue_appointment_email(v_appointment, 'accepted'); end if;
  elsif new.event_type = 'cancelled' and new.from_status is distinct from new.to_status then
    if new.to_status = 'cancelled_by_customer' then
      perform private.enqueue_appointment_email(v_appointment, 'cancelled_by_customer');
      perform private.enqueue_appointment_email(v_appointment, 'master_customer_cancelled');
    elsif new.from_status = 'pending' and v_appointment.source = 'public_booking' then
      perform private.enqueue_appointment_email(v_appointment, 'declined');
    else perform private.enqueue_appointment_email(v_appointment, 'cancelled_by_master'); end if;
  end if;
  return new;
end;
$$;

create table private.retired_booking_slugs (
  slug text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  retired_at timestamptz not null default now()
);

revoke all on private.retired_booking_slugs from public, anon, authenticated;

create function private.guard_workspace_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then
    return new;
  end if;

  if exists (
    select 1 from private.retired_booking_slugs r
     where r.slug = new.slug
       and r.workspace_id <> new.id
       and r.retired_at > now() - interval '90 days'
  ) then
    raise exception using message = 'Booking slug is already taken';
  end if;

  -- Reclaiming an own or expired reservation releases it.
  delete from private.retired_booking_slugs where slug = new.slug;

  if tg_op = 'UPDATE' then
    insert into private.retired_booking_slugs (slug, workspace_id)
    values (old.slug, old.id)
    on conflict (slug) do update
      set workspace_id = excluded.workspace_id, retired_at = now();
  end if;
  return new;
end;
$$;

revoke all on function private.guard_workspace_slug() from public, anon, authenticated;

create trigger workspaces_guard_slug
  before insert or update of slug on public.workspaces
  for each row execute function private.guard_workspace_slug();
