# Pilot health check and data retention

## Scheduled retention

Migration `20261124000500_scheduled_data_retention.sql` enables `pg_cron` and
schedules `chvilio-data-retention` daily at 03:15 UTC. It runs
`public.run_data_retention()` (service role only), which deletes:

| Data | Kept for |
| --- | --- |
| Public booking IP rate-limit rows | 1 day (the limit reads a 5-minute window) |
| Public, manual and recurring booking idempotency records | 30 days |
| Expired or revoked client link tokens | 90 days after expiry or revocation |
| AI translation requests | 12 months before the current UTC month |
| Booking email outbox | `purge_expired_booking_decision_emails()`: 30 days after a final state, 90 days for pending or unconfigured |

Appointments, customers, finances and platform budget usage are not deleted by
this job. Change a horizon with a new migration and update this table.

## Hourly health check

`.github/workflows/pilot-health.yml` runs `scripts/operations/pilot-health.mjs`
every hour against the `pilot` environment. It reads, never writes:

- the public booking page (`BOOKING_WEB_URL`, default `https://chvilio-web.vercel.app/`) returns 200;
- `get_email_queue_health`: no overdue pending email, no stale claim, no recent failure;
- `get_data_retention_status`: the retention job is scheduled, its last run did not fail and it ran within 26 hours.

A failed run is the alert. GitHub emails the account that last changed the
workflow's `schedule`; check Settings → Notifications → Actions is enabled for
failed workflows. The run output lists only reason codes, never secrets:

| Reason | First action |
| --- | --- |
| `booking_web_unavailable` | Open the booking URL and the Vercel deployment log |
| `pending_overdue`, `processing_stale`, `delivery_failed` | See `email-queue-health.md` |
| `retention_not_scheduled` | `pg_cron` or the job is missing on hosted; re-run Deploy backend and check `cron.job` |
| `retention_failed`, `retention_overdue` | Inspect `cron.job_run_details` for `chvilio-data-retention` |

Exit code 2 ("Pilot health check unavailable") means configuration or the
Supabase API is unreachable; treat it as an outage until proven otherwise.
