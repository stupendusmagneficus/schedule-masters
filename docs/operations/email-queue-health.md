# Email queue health check

SCH-156 adds a read-only check for the booking email outbox. It does not send
emails, change jobs, or call a provider. Run it from a trusted operator or
scheduler with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in its environment:

```sh
node scripts/operations/email-queue-health.mjs
```

Store the service-role key in a secret manager, not in a client bundle, command
history, repository, or log. The endpoint accepts only the service role. The
script emits a JSON status with fixed reason codes and no customer data. Exit
code 0 means healthy, 1 means a threshold was crossed, and 2 means the check
itself failed or is misconfigured.

- `pending_overdue`: an eligible pending job is more than 15 minutes overdue.
- `processing_stale`: a processing claim is older than 10 minutes.
- `delivery_failed`: a job was finalized as failed in the last 24 hours. This
  indication remains until the rolling window passes, even after recovery.

A job waiting for its retry time is not overdue. Jobs marked `not_configured`
are excluded: delivery is intentionally disabled until the sender is verified.
The report contains only aggregate counts and ages. It cannot establish that
Cron is running when the queue is empty, detect all provider errors, confirm
inbox delivery, or send an alert. An independent scheduler and alert channel are
still required to detect a stopped database, worker or email provider. Do not
rely on Resend alone to signal a Resend outage.

If unhealthy, check the configured worker, scheduler history, provider status,
queue retry state and recent sanitized failure categories. Do not manually
resend a job without checking the existing claim and provider idempotency. The
booking email production runbook describes disabling delivery and recovery.
Roll back by stopping the check before dropping its RPC in a new migration.
