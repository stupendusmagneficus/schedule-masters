# Master booking requests

The Today dashboard lists appointments created by public booking that are
still `pending`. This queue is distinct from the waitlist: a pending request
already reserves its requested time; a waitlist entry asks to be considered
for a time that might become free later.

The app reads requests through `list_master_pending_booking_requests`.
The security-definer RPC checks workspace membership, joins customer data only
inside the same workspace, and returns only pending public bookings. Direct
anonymous access to appointment and customer tables remains unavailable.

Master decisions use the existing `set_appointment_status` lifecycle:

- accept changes `pending` to `confirmed`;
- decline changes `pending` to `cancelled_by_master`;
- the RPC locks the appointment and enforces valid transitions and workspace
  membership;
- the database overlap constraint keeps pending and confirmed appointments
  from being double-booked while the request is awaiting a decision.

This screen does not send the client a decision message. Delivery and channel
status are tracked separately in SCH-97. Public requests now require a valid
email address; an email is still optional when a master adds a customer
manually. The public form explains that the address is used only for updates
about this request and is not used for marketing.

When a public request changes from `pending` to `confirmed` or
`cancelled_by_master`, the database transaction creates one row in
`booking_decision_email_outbox`. The unique appointment/decision key prevents
duplicate jobs if the status request is retried. The transactional email
worker processes this outbox using provider idempotency keys, retries transient
provider failures up to five attempts, and stores only safe error codes.

The master may also transfer a pending public request to the waiting list. This
operation atomically creates a workspace-scoped waiting-list entry from the
request's customer, service, and requested local time, then declines the
original request through the normal status lifecycle. Retrying the action
returns the same entry; it does not create another one. The customer receives
no separate waiting-list notification, and the UI does not imply that the
waiting-list slot is reserved.

Outbox states deliberately distinguish `not_configured` from `pending`,
`processing`, `accepted_by_provider`, and `failed`. `accepted_by_provider` means
the email provider accepted the message; it does not claim that the recipient's
mail server delivered it. A verified sender domain, delivery worker schedule,
and production smoke test are still required before enabling real delivery.
