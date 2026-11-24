-- Scheduled retention for operational records (audit F-017). Appointments,
-- customers, finances and platform budget usage are not retention targets.
--   * public booking IP rate-limit rows (IP addresses): 1 day; the limit reads 5 minutes
--   * public / manual / recurring booking idempotency records: 30 days
--   * expired or revoked client link tokens: 90 days (same as the lazy cleanup)
--   * AI translation requests: older than the 12-month quota window
--   * booking email outbox: existing purge_expired_booking_decision_emails()

create extension if not exists pg_cron with schema pg_catalog;

create function public.run_data_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rate_limits integer;
  v_public_requests integer;
  v_master_requests integer;
  v_recurring_requests integer;
  v_tokens integer;
  v_translation_requests integer;
  v_emails integer;
begin
  delete from private.public_booking_rate_limits
   where request_at < now() - interval '1 day';
  get diagnostics v_rate_limits = row_count;

  delete from public.public_booking_requests
   where created_at < now() - interval '30 days';
  get diagnostics v_public_requests = row_count;

  delete from private.master_booking_requests
   where created_at < now() - interval '30 days';
  get diagnostics v_master_requests = row_count;

  delete from private.master_recurring_booking_requests
   where created_at < now() - interval '30 days';
  get diagnostics v_recurring_requests = row_count;

  delete from public.appointment_access_tokens
   where expires_at < now() - interval '90 days'
      or revoked_at < now() - interval '90 days';
  get diagnostics v_tokens = row_count;

  delete from public.service_translation_requests
   where created_at < date_trunc('month', now() at time zone 'UTC')
                      at time zone 'UTC' - interval '12 months';
  get diagnostics v_translation_requests = row_count;

  v_emails := public.purge_expired_booking_decision_emails();

  return jsonb_build_object(
    'rateLimits', v_rate_limits,
    'bookingRequests', v_public_requests + v_master_requests + v_recurring_requests,
    'appointmentAccessTokens', v_tokens,
    'translationRequests', v_translation_requests,
    'bookingEmails', v_emails
  );
end;
$$;

revoke all on function public.run_data_retention() from public, anon, authenticated;
grant execute on function public.run_data_retention() to service_role;

-- Daily at 03:15 UTC; re-running this migration updates the same named job.
select cron.schedule(
  'chvilio-data-retention',
  '15 3 * * *',
  'select public.run_data_retention()'
);

-- Read by the scheduled pilot health check (scripts/operations/pilot-health.mjs).
create function public.get_data_retention_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'scheduled', exists (
      select 1 from cron.job j
       where j.jobname = 'chvilio-data-retention' and j.active
    ),
    'lastRunAt', (
      select max(d.end_time) from cron.job_run_details d
        join cron.job j on j.jobid = d.jobid
       where j.jobname = 'chvilio-data-retention' and d.status = 'succeeded'
    ),
    'lastFailureAt', (
      select max(d.end_time) from cron.job_run_details d
        join cron.job j on j.jobid = d.jobid
       where j.jobname = 'chvilio-data-retention' and d.status = 'failed'
    )
  );
$$;

revoke all on function public.get_data_retention_status() from public, anon, authenticated;
grant execute on function public.get_data_retention_status() to service_role;
