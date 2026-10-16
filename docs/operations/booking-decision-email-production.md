# Booking decision email production runbook

This runbook is for SCH-100. Keep general delivery disabled until the domain is
verified and both production smoke tests pass.

## Cost and provider

Use the existing Resend integration for the first release. Current Resend Free
pricing is $0 for up to 3,000 emails per month and 100 emails per day, with up
to three sending domains. The Pro plan is currently $20/month for 50,000 emails
and $0.90 per additional 1,000. Keep the account on Free and do not enable a
paid plan, add-ons, or pay-as-you-go without an explicit budget decision. The
domain registration or DNS provider may have a separate cost.

Source: [Resend pricing](https://resend.com/pricing).

## Domain and DNS

1. Use a sending subdomain such as `notify.<owned-domain>` and an address such
   as `bookings@notify.<owned-domain>`.
2. Add the subdomain in Resend. Copy the exact verification, SPF, and DKIM
   records Resend provides into the DNS provider. Do not change root-domain MX
   or existing mail records.
3. Add a DMARC record for the sending domain with monitoring policy (`p=none`)
   first. Check that the domain owner does not already have a DMARC record at
   that name; DNS must not contain duplicate DMARC records.
4. Wait for Resend to verify the domain and confirm that the visible sender is
   aligned with the verified domain.

DNS record names and values are provider-generated. Never copy example values
from this repository into DNS.

## Secrets and worker

Apply the database migration before deploying the new Edge Function; the
delivery worker uses the new `claim_booking_decision_emails_for_delivery` RPC.
Deploy `send-booking-decision-emails` after SCH-100 is reviewed. In Supabase
Edge Function Secrets, configure `RESEND_API_KEY`, `BOOKING_EMAIL_FROM`, and
`BOOKING_EMAIL_DELIVERY_ENABLED=false`. Supabase provides its project URL and
service-role key to Edge Functions; never put either in app configuration,
GitHub logs, or a client bundle.

For the database scheduler, store the worker URL and service-role bearer token
in Supabase Vault. Do not put a literal token in a migration or `cron.job`
command. Give only the database owner/scheduler the ability to read the
decrypted values.

Enable `pg_cron` and `pg_net` in the Supabase project. Store the full Edge
Function URL in Vault under `booking_email_worker_url`, and the service-role
token under `booking_email_worker_token`. Then create the scheduled job in the
Supabase SQL editor:

```sql
select cron.schedule(
  'booking-decision-email-worker',
  '* * * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'booking_email_worker_url'
      ),
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'apikey', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'booking_email_worker_token'
        ),
        'authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'booking_email_worker_token'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $$
);
```

Do not run this statement until both Vault values exist. The worker processes a
maximum of 20 jobs per invocation; database claims are locked with `skip
locked`, so retries and overlapping invocations do not claim the same job
concurrently.

Schedule daily outbox cleanup after deploying the retention migration:

```sql
select cron.schedule(
  'booking-decision-email-outbox-retention',
  '17 3 * * *',
  $$ select public.purge_expired_booking_decision_emails(); $$
);
```

The cleanup deletes only outbox rows. It does not delete appointments or
customer records.

Before enabling delivery, verify the cron history and confirm a disabled call
returns `configured: false` without contacting Resend.

## Production smoke test

1. Confirm a controlled test address is allowed to receive the test messages.
2. Set `BOOKING_EMAIL_TEST_RECIPIENTS` to that address (comma-separated list
   only if more than one controlled inbox is required). An invalid or empty
   configured allowlist causes the worker to fail closed. The claim RPC then
   selects only matching recipients; all other outbox rows remain untouched.
3. Create two production booking requests using controlled test inboxes, then
   accept one and decline the other. Verify locale, service, date/time, sender,
   SPF/DKIM/DMARC, and receipt in the inbox. Verify a repeated worker call does
   not create a duplicate.
4. Remove `BOOKING_EMAIL_TEST_RECIPIENTS`, then set
   `BOOKING_EMAIL_DELIVERY_ENABLED=true` only after the smoke tests pass.
5. Confirm ordinary requests deliver, review provider and worker status, and
   keep the account on the no-cost plan/limits agreed above. If a test fails,
   set the feature flag back to `false`; queued records remain available for
   recovery.

## Retention policy

The approved policy limits how long customer email and appointment details
remain in the outbox:

- Delete `accepted_by_provider` and terminal `failed` rows 30 days after their
  final status (`finalized_at`).
- Delete `not_configured` and retryable `pending` rows 90 days after creation.
- Delete a `processing` row only after it is at least 90 days old and its claim
  has been stale for more than 10 minutes.
- Run `purge_expired_booking_decision_emails()` daily using Supabase Cron. The
  function removes outbox data only; appointments and customer records remain.

For historical terminal rows without an exact final-status timestamp, the
backfill uses the provider-accepted timestamp when available and migration
time otherwise, giving those older failed rows a fresh 30-day retention
window. Resend's provider-side logs have a separate 30-day retention period.

## Rollback and operations

- Set `BOOKING_EMAIL_DELIVERY_ENABLED=false` to stop external sending while
  retaining queued records.
- Keep the scheduled worker in place only if its disabled behavior is still
  useful; otherwise pause the `booking-decision-email-worker` job in Supabase
  Cron. Keep the daily retention job enabled so the approved retention policy
  continues to apply.
- `accepted_by_provider` means Resend accepted the API request, not that the
  recipient's inbox accepted or displayed it.
- Inspect Supabase Function logs and Cron run history. Logs must not include
  names, email addresses, message bodies, or provider response bodies.

Sources: [Supabase Cron](https://supabase.com/docs/guides/cron),
[Supabase Vault](https://supabase.com/docs/guides/database/vault), and
[Resend domain setup](https://resend.com/docs/dashboard/domains/introduction).
