-- SCH-100: allow a production smoke test to claim only controlled recipients.
-- With a NULL allowlist the worker keeps its normal behavior and processes the
-- full queue. A configured allowlist narrows the claim without changing other
-- outbox rows or their statuses.

alter table public.booking_decision_email_outbox
  add column finalized_at timestamptz;

create function public.claim_booking_decision_emails_for_delivery(
  p_batch_size integer default 20,
  p_recipient_allowlist text[] default null
)
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

  update public.booking_decision_email_outbox as email
     set status = 'failed',
         processing_at = null,
         finalized_at = now(),
         last_error = 'provider_unavailable'
   where email.status = 'processing'
     and email.processing_at < now() - interval '10 minutes'
     and email.attempts >= 5;

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
       and (
         p_recipient_allowlist is null
         or lower(e.recipient) = any(p_recipient_allowlist)
       )
     order by e.created_at
     for update skip locked
     limit p_batch_size
  ), claimed as (
    update public.booking_decision_email_outbox e
       set status = 'processing',
           attempts = e.attempts + 1,
           processing_at = now(),
           finalized_at = null,
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

revoke all on function public.claim_booking_decision_emails_for_delivery(integer, text[])
  from public, anon, authenticated;
grant execute on function public.claim_booking_decision_emails_for_delivery(integer, text[])
  to service_role;

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
         finalized_at = case when v_status in ('accepted_by_provider', 'failed') then now() else null end,
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
     status in ('accepted_by_provider', 'failed')
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

revoke all on function public.purge_expired_booking_decision_emails()
  from public, anon, authenticated;
grant execute on function public.purge_expired_booking_decision_emails()
  to service_role;
