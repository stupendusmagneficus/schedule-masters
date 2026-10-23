# Email delivery status (SCH-147)

## Contract and rollout

Deploy `20261031000200_booking_email_delivery.sql`, the matching
`send-booking-decision-emails` worker and `booking-email-webhook` function.
Keep regular sending disabled until SCH-146 inbox/provider acceptance is complete.
Before applying the migration, pause new worker invocations and resolve all
previously prepared nonterminal jobs using the old worker. The migration refuses
to proceed while such jobs remain (including paused/retryable jobs). This avoids
changing the body behind an existing provider idempotency key when adding the
new outbox tag. Do not bypass the guard by resetting attempts or preparation time.
With delivery never enabled and no prepared jobs, there is nothing to drain.
Set `RESEND_WEBHOOK_SECRET` in Edge Function Secrets, using the secret generated
for this webhook endpoint by Resend. Never use the send API key as signing secret.
The callback endpoint is `/functions/v1/booking-email-webhook`. Its gateway JWT
check is disabled because Resend sends Svix signatures; the handler authenticates
every request before database access. The other functions still require JWTs.

Subscribe to `email.sent`, `email.delivery_delayed`, `email.delivered`,
`email.failed`, `email.suppressed`, `email.bounced`, and `email.complained`.
Open/click tracking is not needed or persisted. Resend payloads can contain PII;
do not enable request-body logging or paste real callbacks into tickets.

References: [signature verification](https://resend.com/docs/webhooks/verify-webhooks-requests),
[Svix exact-byte contract and test vector](https://docs.svix.com/receiving/verifying-payloads/how-manual),
[event definitions](https://resend.com/docs/webhooks/event-types),
[delivery payload/tags](https://resend.com/docs/webhooks/emails/delivered).

## Correlation and races

The send request has the existing idempotency key and an immutable `outbox_id`
tag. The worker records the returned UUID through the service-only,
attempt-checked finish RPC. HTTP success without a valid ID is not delivery.
The provider message ID is unique across outbox rows.

A signed callback can arrive before the send response. Its tag identifies an
existing prepared job, binds its provider ID, and finalizes provider acceptance
without another send. The subsequent matching finish is idempotent. A callback
without a tag can match an already recorded provider ID. A conflicting ID or an
unknown/deleted/superseded job is ignored: callbacks never insert appointments,
customers, queue records, tokens, or recipient addresses. Historical rows lacking
provider correlation stay at their known state; no historical delivery is guessed.

## Verification and persistence

The handler verifies raw UTF-8 bytes using WebCrypto HMAC-SHA256 and Svix headers.
Timestamp tolerance is five minutes in either direction. Multiple v1 signatures
support provider key rotation. Bodies are stream-limited to 64 KiB, including
chunked requests. No CORS/cookie authentication is used.

Valid known events are deduplicated transactionally by `svix-id` in a private
table. Only event ID, outbox FK, event type and occurrence time are stored. No
email address, bounce diagnostic, subject, body, IP or raw signature is retained.
Rows cascade away with outbox retention/customer anonymization. Replays after
erasure cannot recreate them. The public outbox still has no client table grants.

Database/network failures return 503 so the provider can retry; invalid signatures
return 401, invalid supported payloads 400, oversized bodies 413. Duplicates,
unsupported event types and unmatched/deleted jobs return 200 with an empty body.
Responses and logs do not disclose provider payloads or contact information.

## State and recovery

Queue state and delivery evidence are separate. `accepted_by_provider` means the
provider accepted the send; `delivered` means the destination mail server accepted
it, not that a person read it or that it reached their inbox folder.

Reordered callbacks use conservative precedence:
`sent < delayed < delivered < failed < suppressed < bounced < complained`.
The same state retains the latest occurrence timestamp. A late sent/delivered
event cannot hide a bounce or complaint. Sanitized receipts retain each accepted
event until outbox cleanup; no unbounded public event history is exposed.

Appointment details show up to five customer email statuses through a
workspace-authorized RPC, without recipient/provider IDs or message bodies.
Opening/status changes refresh them; automatic polling is bounded to five reads
at 15-second intervals while the panel is mounted (background reads skipped).
The quiet retry action only refreshes status; it does not send another email.
Failures advise contacting the customer directly using existing contact/share
actions. Automatic sends retain the existing five-attempt/budget/23-hour limits;
bounces, complaints and suppressed messages are never manually requeued here.

Rollback: disable sending, preserve the matching worker/schema, and deploy a
forward fix. No destructive downgrade or production-sized lock benchmark was
performed. Real signed provider callbacks and inbox rendering remain rollout
evidence for SCH-146, not established by synthetic tests.
