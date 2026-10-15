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
status are tracked separately in SCH-97.
