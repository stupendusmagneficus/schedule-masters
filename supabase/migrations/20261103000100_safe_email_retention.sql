-- Keep processing claims until the worker finalizes or an operator resolves them.
-- A claim age alone cannot prove that an external provider request has ended.
create or replace function public.purge_expired_booking_decision_emails()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with expired as materialized (
    select id from public.booking_decision_email_outbox
     where (status in ('accepted_by_provider', 'failed', 'superseded')
            and finalized_at < now() - interval '30 days')
        or (status in ('pending', 'not_configured')
            and created_at < now() - interval '90 days')
     for update skip locked
  )
  delete from public.booking_decision_email_outbox as job
   using expired
   where job.id = expired.id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
