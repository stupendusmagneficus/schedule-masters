# Appointment email events (SCH-145)

## Event/recipient contract

These are transactional appointment messages, never marketing. The public form
already explains this use of its required email. A manual appointment
requires the existing appointment-level notification consent and a valid address;
creating a manual booking without email remains valid.

| Action | Customer | Master (workspace owner) |
| --- | --- | --- |
| Public request created | `request_received`: awaiting decision, no management CTA | `master_request_received`: new request |
| Master accepts pending request | `accepted`, management link | No email for their own action |
| Master declines pending request | `declined`, no link or promise of another slot | No email for their own action |
| Manual confirmed booking, consent recorded | `accepted`, management link | No email for their own action |
| Master cancels a confirmed booking | `cancelled_by_master` | No email for their own action |
| Customer confirms through an existing master-issued link | `customer_confirmed`, management link | `master_customer_confirmed` |
| Customer cancels through a management link | `cancelled_by_customer` | `master_customer_cancelled` |
| Master cancels future occurrences of a series | One `cancelled_by_master` summary per customer/series/transaction, listing affected dates | No email for their own action |

No-op retries do not create new audit events or email jobs. Consent is currently
recorded by the existing master link-sharing flow. Granting it can queue the
manual booking email; sharing alone is not proof of actual email delivery. The
owner recipient is the first verified workspace owner, ordered by membership
creation/id; there is no broadcast to arbitrary members. Owner copy uses signup
metadata locale with EN fallback. Customer copy uses the appointment locale.
Missing/invalid addresses produce no job. A changed recipient before delivery
supersedes a queued job rather than sending private booking details to the old
address. Cancelled messages list service/date/time, without suggesting a charge.

## Transactions, revisions and retries

Audit-event and consent triggers enqueue in the same transaction as the action.
Existing accepted/declined rows from the status RPC retain their IDs and response
contract. A unique appointment/decision key prevents duplicate notifications.
Series cancellations additionally use a series/customer/transaction key and
collect occurrence IDs, dates and revisions in one job. A later independent
cancellation is a different event. Existing historical appointments are not
backfilled into new lifecycle notifications by this migration.

The worker claims a bounded batch, reserves budget, then calls the service-only
`prepare_booking_email_delivery` immediately before the provider request. It
checks the claim attempt, current status/revision, time, recipient, consent and
all series occurrences. Stale jobs become terminal `superseded`, release their
reservation with actual usage zero, and never reach the provider. An outdated
worker attempt cannot prepare a newer claim. `superseded` follows the existing
30-day terminal retention policy; pending/unconfigured jobs retain the 90-day
policy. Already accepted provider requests cannot be recalled: a cancellation
that commits after the final check/in-flight send is represented by a subsequent
cancellation email. This cross-system boundary cannot be made one DB transaction.

A job's first prepare timestamp also bounds uncertain retries to 23 hours.
[Resend retains idempotency keys for 24 hours](https://resend.com/changelog/idempotency-keys);
after the conservative window the job fails without another send, rather than
risking a duplicate after provider deduplication expires. Operators should review
that failure; the system does not pretend an unknown provider result means a
confirmed delivery.

Revisions advance on status, rescheduling and material service snapshot changes.
The multi-service creation transaction can finish its initial snapshots without
invalidating its own newly queued request messages. Private notes are excluded
from all email payloads. Provider idempotency stays bound to the outbox ID.

## Management links

Pending-request receipts have **no management link**, so an automatic email
cannot let the customer bypass the master's decision. Confirmed customer emails
receive a server-generated 128-hex-character token using the existing hash,
manage purpose, revocation and expiry rules (7 days after the appointment, capped
at 180 days from issue). The public token table stores only SHA-256 hashes.

Retry-stable raw tokens exist only in `private.booking_email_links`, which has no
client or service-role direct table grants and is not in the exposed API schema.
Only the service-only prepare RPC can return one. Terminal delivery deletes the
private material; failure/supersession also revokes that token. Acceptance retains
the public hash until normal expiry/revocation, so an emailed link still works.
Manual link rotation and appointment cancellation/rescheduling revoke queued
links too. Retries of a valid job reuse the same token and provider payload.

`BOOKING_EMAIL_BOOKING_URL` must be the approved HTTPS public booking base URL,
without credentials, query or fragment. Invalid/missing configuration fails
before queue claim when delivery is enabled. The token is added to `#token=…`,
not the query string, and never appears in worker responses, error categories,
analytics, or diagnostic logs. Provider bodies contain the link by design and
must never be logged. No customer note, master note or cancellation reason is
included in an email.

## Rollout and verification

Keep `BOOKING_EMAIL_DELIVERY_ENABLED=false`, stop/drain the old worker, apply
`20261031000100_appointment_email_events.sql`, deploy the updated worker and set
`BOOKING_EMAIL_BOOKING_URL`. Then use the existing controlled-recipient allowlist
before enabling regular delivery. Old workers understand only two decisions and
must not process new lifecycle rows. Delivery/provider setup still belongs to
SCH-146; this implementation sends nothing to a real inbox during tests.

The migration is additive and does no table-wide data backfill. The new nullable
unique event key needs an index on the existing outbox; schedule the migration
with delivery stopped. Production-volume lock timing has not been measured.
Rollback is forward-only: disable delivery first, then deploy a corrective
migration/worker. Never edit an already deployed migration or downgrade the
worker while lifecycle rows can be claimed.

Verification: Supabase integration tests exercise creation, decisions, consent,
missing email, client retries, series coalescing, grants, private link handling and
stale claims. Deno tests cover all five-language templates, safe URLs/contracts,
supersession before sending, budgeting and provider failures. Fixture previews
use fake customer data and fake tokens only. Physical device/real inbox and
provider webhooks are separate rollout evidence, not proved by these tests.
