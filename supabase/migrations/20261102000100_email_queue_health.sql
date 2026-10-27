-- Read-only operations report. No customer data, addresses, or tokens leave the database.
create function public.get_email_queue_health()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'pending_count', count(*) filter (where status = 'pending' and next_attempt_at <= now()),
    'oldest_pending_seconds', case when count(*) filter (where status = 'pending' and next_attempt_at <= now()) = 0 then null else greatest(0, extract(epoch from (now() - min(next_attempt_at) filter (where status = 'pending' and next_attempt_at <= now()))))::bigint end,
    'stale_processing_count', count(*) filter (where status = 'processing' and processing_at < now() - interval '10 minutes'),
    'failed_recent_count', count(*) filter (where status = 'failed' and finalized_at >= now() - interval '24 hours')
  ) from public.booking_decision_email_outbox;
$$;
revoke all on function public.get_email_queue_health() from public, anon, authenticated;
grant execute on function public.get_email_queue_health() to service_role;
