# Booking decision email delivery

## Current behavior

- Public online booking requires a syntactically valid email address. The form
  explains that the address is used for the decision about this booking and
  that marketing emails are not sent.
- A master's customer profile can still omit email.
- Accepting or declining a pending public booking creates one durable outbox
  row in the same database transaction as the status change.
- Manual appointments and later cancellations of already confirmed bookings do
  not create a booking-decision email.
- Email content is localized to the language selected on the public booking
  page (EN, CZ, SK, RU, UK). Declined messages do not claim another time is available.
- The Edge Function `send-booking-decision-emails` uses Resend behind an
  explicit feature flag. It is safe to deploy before provider setup: it leaves
  notifications in `not_configured` and does not call a mail provider.
- For a production smoke test, `BOOKING_EMAIL_TEST_RECIPIENTS` can restrict
  which outbox recipients the worker claims. An invalid configured allowlist
  fails closed; when unset, the worker processes the regular queue.
- No production delivery is enabled by this code change. See the Linear
  Infrastructure project task and
  [production runbook](../operations/booking-decision-email-production.md)
  for domain, secrets, scheduling, retention, and smoke-test steps.

## Outbox states

| State | Meaning |
| --- | --- |
| `not_configured` | The decision is stored, but delivery is disabled or missing sender configuration. |
| `pending` | The job can be retried by the worker. |
| `processing` | A worker has claimed the job; stale claims become eligible after ten minutes. |
| `accepted_by_provider` | Resend accepted the request and returned a message ID. This is not inbox delivery confirmation. |
| `failed` | A permanent provider error occurred or five attempts were exhausted. |

The worker is invoked by an authenticated scheduler with the Supabase service
role bearer token. It reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`BOOKING_EMAIL_DELIVERY_ENABLED`, `RESEND_API_KEY`, and `BOOKING_EMAIL_FROM`.
During the controlled production smoke test only, it may also read
`BOOKING_EMAIL_TEST_RECIPIENTS` as a comma-separated allowlist.
Optional `BOOKING_EMAIL_REPLY_TO` is one approved, monitored support address
(plain address, no display name). If configured, it is used as Resend's reply-to
and as a localized support link in HTML/plain text. A malformed configured value
returns `invalid_reply_to` before claiming jobs; when absent, no support address
is invented. Use the product support mailbox, not an unverified master contact.
Keep the feature flag false and do not set provider secrets until the sending
domain and production smoke test are ready. Never put secrets in app clients or
logs.

The Resend idempotency key is derived from the immutable outbox ID. Only
provider status codes are retained as safe error categories; provider response
bodies, addresses, names, and message contents are not written to logs.
Transient failures use increasing retry delays and stop after five attempts.
The outbox contains recipient and appointment details needed to send the
message; define and implement a retention period before production delivery is
enabled.

## Local and CI verification

Supabase integration tests check required email validation and transactional,
idempotent queue creation for both decisions. Deno tests use a fake fetcher to
check authentication, the disabled-delivery path, provider idempotency, and
transient-error retry handling. They never send real email.

## Locale expansion rollout (SCH-141)

Deploy the worker version supporting all five languages before enabling delivery
of SK/UK jobs. Apply `20261028000100_public_booking_five_locales.sql`, then verify
single/multiple-service requests and decisions before publishing clients. Keep
delivery disabled during the initial rollout if the worker is not deployed.
The migration expands constraints without changing existing locale values, RPC
signatures or grants. Generated types remain strings because these fields are
PostgreSQL text columns with CHECK constraints.

## Branded content (SCH-144)

Decision and Auth emails share `_shared/emailLayout.ts`, an email adapter of the
approved design tokens. Confirmed decisions show the real workspace name in the
header, localized date/time and explicit workspace timezone, hours/minutes, and
the stored multi-service total. User-provided names are HTML-escaped. Both
decisions include a localized subject/preheader and a plain-text alternative.
Declines retain their existing wording without promising another available slot.

The decision outbox currently contains no safe customer-management URL. The
template therefore exposes no guessed or expired management CTA; the event/link
contract is tracked in SCH-145. This change does not enable extra lifecycle
messages or production delivery. The sender remains `BOOKING_EMAIL_FROM`, which
must use the verified sending domain. Configure hosted Auth with the same
approved brand/sender/support policy; see `supabase/AUTH_CONFIRMATION.md`.
