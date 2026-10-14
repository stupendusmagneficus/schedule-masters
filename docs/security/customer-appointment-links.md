# Customer appointment links

The master creates a one-time, 128-character random token only after confirming
that the customer agreed to receive messages about the appointment. The raw
token is returned once and shared through the device share sheet. The URL keeps
it in the fragment (`#token=…`), so browsers do not send it to the web server
or include it in a referrer. The booking page removes the fragment before
loading appointment details and skips analytics for link visits.

Only a SHA-256 hash is stored in `appointment_access_tokens`. A link normally
expires seven days after the appointment, capped at 180 days from issue. For
appointments scheduled farther in the future, the owner can issue a fresh link
after the existing one expires.
Issuing a replacement revokes the previous link. Cancelling or rescheduling an
appointment revokes active links as well. Revoked and expired hashes are kept
for 90 days, then pruned the next time a customer link is issued in that
workspace. Deleting an appointment cascades to its link hashes and event log.

The public RPC returns only the workspace name, service, appointment time,
status, timezone, and available actions. It never returns customer name,
email, phone, notes, or price. The customer can confirm a pending appointment
or cancel a pending/confirmed one. Rescheduling is intentionally unavailable.
Repeating a committed confirm/cancel request returns the original outcome, so
a lost response does not turn a successful cancellation into a misleading
failure.

MVP delivery uses the native share sheet only. A `manual_required` event is
recorded when a link is created; opening or failing to open the share sheet is
recorded separately. These events contain no recipient address or provider
error text, and opening the share sheet is never represented as delivery.
Automatic email, push, and reminder delivery require a provider and a separate
delivery worker before they can be enabled.
