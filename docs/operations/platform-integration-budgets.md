# Platform integration budgets

SCH-150 adds fail-closed daily and monthly limits for OpenAI translation spend
and Resend email volume. It does not select a paid plan or authorize a spend
amount. Both integrations remain blocked by the global budget until an operator
enables their budget and disables its kill switch.

## Configuration

Apply the migration and deploy the `send-platform-budget-alerts` Edge Function.
Set these Edge Function secrets before enabling AI or alert delivery:

- `PLATFORM_BUDGET_ALERTS_ENABLED=true`
- `PLATFORM_BUDGET_ALERT_EMAIL=<operations mailbox>`
- `RESEND_API_KEY=<Resend API key>`
- `BOOKING_EMAIL_FROM=<verified sender>`
- For AI translation: `OPENAI_API_KEY`, `OPENAI_MAX_REQUEST_COST_USD`,
  `OPENAI_INPUT_USD_PER_MILLION_TOKENS`, and
  `OPENAI_OUTPUT_USD_PER_MILLION_TOKENS`.

Choose OpenAI daily and monthly USD limits, the maximum reservation per
translation, and token rates from the current OpenAI pricing for the configured
model. The code uses a conservative input/output token estimate; if the usage
object or rates are missing, it charges the full reservation. Keep the maximum
reservation high enough to cover every accepted request. Missing AI limits or
pricing configuration causes the translation worker to refuse calls.

The migration seeds both integrations disabled with the kill switch on. After
choosing reviewed limits, an operator can configure them through the Supabase
SQL editor. Replace the placeholders with approved positive values:

```sql
update public.platform_integration_budgets
set daily_limit = <approved_daily_usd>,
    monthly_limit = <approved_monthly_usd>,
    enabled = true,
    kill_switch = false,
    updated_at = now()
where provider = 'openai_translation';

update public.platform_integration_budgets
set enabled = true,
    kill_switch = false,
    updated_at = now()
where provider = 'resend_email';
```

Resend defaults to 96 customer emails per day and 2,872 per month. The
remaining 4 daily / 128 monthly sends are reserved for threshold alerts,
keeping the combined ceiling within the documented 100/day and 3,000/month
free tier. This assumes this project is the only sender using that Resend
account; any other traffic must be subtracted from these limits.

## Alerts and recovery

The database creates one deduplicated outbox alert at each 80% and 100% daily
and monthly threshold. The alert worker sends a plain-text summary to the
operations mailbox and uses a provider idempotency key. It contains no customer
or appointment details. Failed jobs return to pending and stale claims become
eligible after 10 minutes.

Store the worker URL and service-role token in Supabase Vault as
`platform_budget_alert_worker_url` and
`platform_budget_alert_worker_token`. Schedule a retry every 10 minutes with
`pg_cron` and `pg_net` (the function remains inert until the alert secrets are
configured):

```sql
select cron.schedule(
  'platform-budget-alert-worker',
  '*/10 * * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'platform_budget_alert_worker_url'
      ),
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'apikey', (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'platform_budget_alert_worker_token'
        ),
        'authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'platform_budget_alert_worker_token'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $$
);
```

To stop either integration immediately, set its `kill_switch = true` in
`platform_integration_budgets`. This takes effect on the next reservation and
does not delete queued booking emails. At 100%, new provider calls are denied;
already accepted upstream calls may still settle afterward.

## Operations and limits

- Confirm the selected OpenAI rates and maximum request reservation whenever
  the model or provider pricing changes.
- Monitor the pending alert outbox and Supabase Cron history. Alert delivery
  retries on the next scheduled run.
- Reservations with unknown provider usage are charged at their full reserved
  amount, including timeouts and provider errors. This avoids treating failed
  requests as free.
- Daily and monthly usage windows are UTC.
- Usage rows store provider, reserved/actual amount, and timestamps only. They
  do not store service text, customer data, or translation prompts.
- RPCs and tables are inaccessible to client roles; only service-role Edge
  Functions can reserve and settle usage or send alerts.
- The migration does not turn on Resend delivery. Continue to use the separate
  booking email production runbook for domain verification and its smoke test.
