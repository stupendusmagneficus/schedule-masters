-- SCH-145. Additive, forward-only: no historical appointments are enqueued.
-- Roll out with delivery disabled, then deploy the lifecycle-aware worker.
alter table public.appointments add column email_revision bigint not null default 0;
alter table public.booking_decision_email_outbox
  drop constraint booking_decision_email_outbox_decision_check,
  add constraint booking_decision_email_outbox_decision_check check (decision in (
    'accepted', 'declined', 'request_received', 'master_request_received',
    'customer_confirmed', 'master_customer_confirmed', 'cancelled_by_master',
    'cancelled_by_customer', 'master_customer_cancelled'
  )),
  drop constraint booking_decision_email_outbox_status_check,
  add constraint booking_decision_email_outbox_status_check check (status in (
    'not_configured', 'pending', 'processing', 'accepted_by_provider', 'failed', 'superseded'
  )),
  add column customer_name text,
  add column first_prepared_at timestamptz,
  add column event_revision bigint not null default 0,
  add column event_key text unique,
  add column occurrences jsonb not null default '[]'::jsonb check (jsonb_typeof(occurrences) = 'array');

-- Only hashes are stored in the existing public token table. Retry-stable raw
-- material lives in a non-exposed schema, with no client/service direct grants.
create table private.booking_email_links (
  outbox_id uuid primary key references public.booking_decision_email_outbox(id) on delete cascade,
  token_id uuid not null references public.appointment_access_tokens(id) on delete cascade,
  token text not null check (token ~ '^[0-9a-f]{128}$')
);
revoke all on private.booking_email_links from public, anon, authenticated, service_role;

create function private.advance_appointment_email_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.starts_at is distinct from old.starts_at
     or (old.created_at <> now() and (new.ends_at is distinct from old.ends_at or new.service_name_snapshot is distinct from old.service_name_snapshot or new.price_amount_snapshot is distinct from old.price_amount_snapshot or new.duration_minutes_snapshot is distinct from old.duration_minutes_snapshot or new.currency_snapshot is distinct from old.currency_snapshot)) then
    new.email_revision := old.email_revision + 1;
  else
    new.email_revision := old.email_revision;
  end if;
  return new;
end;
$$;
create trigger appointments_email_revision before update on public.appointments
for each row execute function private.advance_appointment_email_revision();

create function private.enqueue_appointment_email(p_appointment public.appointments, p_decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_recipient text;
  v_locale text;
  v_name text;
  v_key text;
  v_occurrence jsonb;
begin
  if p_decision like 'master_%' then
    select lower(trim(u.email)), case when u.raw_user_meta_data->>'locale' in ('en','cz','sk','ru','uk')
      then u.raw_user_meta_data->>'locale' else 'en' end
      into v_recipient, v_locale
      from public.workspace_members m join auth.users u on u.id = m.user_id
     where m.workspace_id = p_appointment.workspace_id and m.role = 'owner'
       and u.email_confirmed_at is not null
     order by m.created_at, m.user_id limit 1;
  else
    if p_appointment.source <> 'public_booking' and p_appointment.customer_notification_consent_at is null then return; end if;
    select lower(trim(c.email)) into v_recipient from public.customers c
     where c.id = p_appointment.customer_id and c.workspace_id = p_appointment.workspace_id;
    v_locale := p_appointment.customer_locale;
  end if;
  if v_recipient is null or length(v_recipient) > 320 or v_recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then return; end if;
  select name into v_name from public.customers where id = p_appointment.customer_id and workspace_id = p_appointment.workspace_id;
  v_key := 'appointment:' || p_appointment.id::text || ':' || p_decision;
  if p_decision = 'cancelled_by_master' and p_appointment.appointment_series_id is not null then
    -- All cancellations of this customer's series in one transaction form a
    -- single immutable event. Later independent cancellations use a new key.
    v_key := 'series:' || p_appointment.appointment_series_id::text || ':' || p_appointment.customer_id::text || ':' || txid_current()::text || ':' || p_decision;
  end if;
  v_occurrence := jsonb_build_array(jsonb_build_object('id', p_appointment.id, 'startsAt', p_appointment.starts_at, 'revision', p_appointment.email_revision));
  -- The legacy status RPC still inserts accepted/declined before its audit
  -- event. Adopt that row, keeping its ID and synchronous notificationStatus.
  update public.booking_decision_email_outbox e
     set customer_name = v_name, event_key = v_key, event_revision = p_appointment.email_revision, occurrences = v_occurrence
   where e.appointment_id = p_appointment.id and e.decision = p_decision and e.event_key is null;
  if found or exists (select 1 from public.booking_decision_email_outbox e where e.appointment_id = p_appointment.id and e.decision = p_decision) then return; end if;
  insert into public.booking_decision_email_outbox as email (
    workspace_id, appointment_id, decision, recipient, locale, workspace_name, customer_name,
    service_name, starts_at, timezone, event_revision, event_key, occurrences
  ) select p_appointment.workspace_id, p_appointment.id, p_decision, v_recipient, v_locale,
    w.name, v_name, p_appointment.service_name_snapshot, p_appointment.starts_at, w.timezone,
    p_appointment.email_revision, v_key, v_occurrence
    from public.workspaces w where w.id = p_appointment.workspace_id
  on conflict (event_key) do update set occurrences = email.occurrences || excluded.occurrences;
end;
$$;

create function private.queue_appointment_event_emails()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_appointment public.appointments%rowtype;
begin
  select * into v_appointment from public.appointments where id = new.appointment_id;
  if new.event_type = 'created' and v_appointment.source = 'public_booking' and v_appointment.status = 'pending' then
    perform private.enqueue_appointment_email(v_appointment, 'request_received');
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
create trigger appointment_events_queue_emails after insert on public.appointment_events
for each row execute function private.queue_appointment_event_emails();

create function private.queue_consented_appointment_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.customer_notification_consent_at is null and new.customer_notification_consent_at is not null
     and new.source = 'master_created' and new.status = 'confirmed' then
    perform private.enqueue_appointment_email(new, 'accepted');
  end if;
  return new;
end;
$$;
create trigger appointment_email_consent after update of customer_notification_consent_at on public.appointments
for each row execute function private.queue_consented_appointment_email();

create function public.prepare_booking_email_delivery(p_id uuid, p_attempt integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_job public.booking_decision_email_outbox%rowtype;
  v_appointment public.appointments%rowtype;
  v_status public.appointment_status;
  v_contact text;
  v_token text;
  v_token_id uuid;
  v_expires timestamptz;
  v_link_exists boolean;
  v_dates jsonb;
begin
  select * into v_job from public.booking_decision_email_outbox where id = p_id for update;
  if v_job.id is null or v_job.status <> 'processing' or (p_attempt is not null and v_job.attempts <> p_attempt) then return jsonb_build_object('deliver', false); end if;
  -- Resend retains idempotency keys for 24h. Never retry an uncertain send
  -- beyond that boundary; use a conservative 23h window from first prepare.
  if v_job.first_prepared_at < now() - interval '23 hours' then
    update public.booking_decision_email_outbox set status = 'failed', last_error = 'provider_unavailable', finalized_at = now(), processing_at = null where id = p_id;
    return jsonb_build_object('deliver', false);
  end if;
  update public.booking_decision_email_outbox set first_prepared_at = coalesce(first_prepared_at, now()) where id = p_id;
  select * into v_appointment from public.appointments where id = v_job.appointment_id for share;
  v_status := (case
    when v_job.decision in ('accepted','customer_confirmed','master_customer_confirmed') then 'confirmed'
    when v_job.decision in ('request_received','master_request_received') then 'pending'
    when v_job.decision in ('declined','cancelled_by_master') then 'cancelled_by_master'
    else 'cancelled_by_customer' end)::public.appointment_status;
  if v_job.decision like 'master_%' then
    select lower(trim(u.email)) into v_contact from public.workspace_members m join auth.users u on u.id = m.user_id
     where m.workspace_id = v_job.workspace_id and m.role = 'owner' and u.email_confirmed_at is not null
     order by m.created_at, m.user_id limit 1;
  else
    select lower(trim(c.email)) into v_contact from public.customers c
     where c.id = v_appointment.customer_id and c.workspace_id = v_job.workspace_id;
  end if;
  if v_appointment.id is null or v_appointment.status <> v_status
     or (v_status in ('pending','confirmed') and v_appointment.starts_at <= now())
     or v_appointment.email_revision <> v_job.event_revision or v_appointment.starts_at <> v_job.starts_at
     or v_contact is distinct from v_job.recipient
     or (v_job.decision not like 'master_%' and v_appointment.source <> 'public_booking' and v_appointment.customer_notification_consent_at is null)
     or exists (
       select 1 from jsonb_array_elements(v_job.occurrences) occurrence
       left join public.appointments a on a.id = (occurrence->>'id')::uuid
       where a.id is null or a.workspace_id <> v_job.workspace_id or a.status <> v_status or a.email_revision <> (occurrence->>'revision')::bigint
     ) then
    update public.booking_decision_email_outbox set status = 'superseded', finalized_at = now(), processing_at = null where id = p_id;
    delete from private.booking_email_links where outbox_id = p_id;
    return jsonb_build_object('deliver', false);
  end if;
  if v_job.decision in ('accepted', 'customer_confirmed') then
    select true, l.token, l.token_id into v_link_exists, v_token, v_token_id from private.booking_email_links l where l.outbox_id = p_id;
    if v_link_exists then
      if not exists (select 1 from public.appointment_access_tokens t where t.id = v_token_id and t.revoked_at is null and t.expires_at > now()) then
        update public.booking_decision_email_outbox set status = 'superseded', finalized_at = now(), processing_at = null where id = p_id;
        delete from private.booking_email_links where outbox_id = p_id;
        return jsonb_build_object('deliver', false);
      end if;
    else
      v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
      v_expires := least(greatest(now() + interval '7 days', v_appointment.starts_at + interval '7 days'), now() + interval '180 days');
      insert into public.appointment_access_tokens(appointment_id, token_hash, purpose, expires_at)
        values(v_appointment.id, encode(sha256(convert_to(v_token,'UTF8')),'hex'), 'manage', v_expires) returning id into v_token_id;
      insert into private.booking_email_links(outbox_id, token_id, token) values(p_id, v_token_id, v_token);
    end if;
  end if;
  select coalesce(jsonb_agg(item->'startsAt' order by item->>'startsAt'), jsonb_build_array(v_job.starts_at)) into v_dates
    from jsonb_array_elements(v_job.occurrences) item;
  return jsonb_build_object('deliver', true, 'manageToken', v_token,
    'decision', v_job.decision, 'locale', v_job.locale, 'recipient', v_job.recipient,
    'workspaceName', v_job.workspace_name, 'serviceName', v_appointment.service_name_snapshot,
    'startsAt', v_job.starts_at, 'timezone', v_job.timezone, 'customerName', v_job.customer_name,
    'durationMinutes', v_appointment.duration_minutes_snapshot, 'priceAmount', v_appointment.price_amount_snapshot,
    'currency', v_appointment.currency_snapshot, 'occurrenceStarts', v_dates);
end;
$$;
revoke all on function public.prepare_booking_email_delivery(uuid,integer) from public, anon, authenticated;
grant execute on function public.prepare_booking_email_delivery(uuid,integer) to service_role;
revoke all on function private.advance_appointment_email_revision() from public, anon, authenticated, service_role;
revoke all on function private.enqueue_appointment_email(public.appointments,text) from public, anon, authenticated, service_role;
revoke all on function private.queue_appointment_event_emails() from public, anon, authenticated, service_role;
revoke all on function private.queue_consented_appointment_email() from public, anon, authenticated, service_role;

create function private.clear_finalized_booking_email_link()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('failed','superseded') then
    update public.appointment_access_tokens set revoked_at = coalesce(revoked_at, now())
     where id in (select l.token_id from private.booking_email_links l where l.outbox_id = new.id);
  end if;
  if new.status in ('accepted_by_provider','failed','superseded') then
    delete from private.booking_email_links where outbox_id = new.id;
  end if;
  return new;
end;
$$;
create trigger booking_email_clear_raw_link after update of status on public.booking_decision_email_outbox
for each row execute function private.clear_finalized_booking_email_link();
revoke all on function private.clear_finalized_booking_email_link() from public, anon, authenticated, service_role;

create or replace function public.purge_expired_booking_decision_emails()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.booking_decision_email_outbox
   where (
     status in ('accepted_by_provider', 'failed', 'superseded')
     and finalized_at < now() - interval '30 days'
   )
      or (
        status in ('pending', 'not_configured')
        and created_at < now() - interval '90 days'
      )
      or (
        status = 'processing'
        and created_at < now() - interval '90 days'
        and processing_at < now() - interval '10 minutes'
      );

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
