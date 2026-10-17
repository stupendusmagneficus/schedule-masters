drop function public.claim_booking_decision_emails_for_delivery(integer, text[]);

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
  attempts integer,
  duration_minutes integer,
  price_amount numeric,
  currency text
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
         c.service_name, c.starts_at, c.timezone, c.attempts,
         a.duration_minutes_snapshot,
         a.price_amount_snapshot,
         a.currency_snapshot::text
    from claimed c
    join public.appointments a
      on a.id = c.appointment_id
     and a.workspace_id = c.workspace_id;
end;
$$;

revoke all on function public.claim_booking_decision_emails_for_delivery(integer, text[])
  from public, anon, authenticated;
grant execute on function public.claim_booking_decision_emails_for_delivery(integer, text[])
  to service_role;
