# Customer data anonymization

## Scope

The master can remove a customer from the customer directory. Because
appointments reference the customer and payment history must remain available,
the operation anonymizes the customer instead of physically deleting the row.
This is a technical behavior description, not a legal retention policy.

## Operation

The mobile app asks for explicit confirmation and calls
`anonymize_master_customer(workspace_id, customer_id)`. The security-definer RPC
requires membership in the supplied workspace, scopes every related-row change
to that workspace, and treats retries or missing customer IDs as a successful
no-op.

The operation removes the customer name and contact values, normalized contact
values, profile notes, marketing consent timestamp, and customer auth-user link.
It replaces the required name with the generic value `Anonymized customer` and
sets `anonymized_at`.

For related records, it:

- clears customer and master notes, cancellation reasons, and appointment-event
  reason text;
- deletes waiting-list entries, which are no longer actionable without contact
  details;
- deletes queued notification jobs and booking-decision email outbox rows so
  they cannot disclose or send the erased address;
- revokes customer appointment-management tokens;
- retains appointment IDs, service snapshots, dates, statuses, and financial
  amounts for the workspace's operational history.

Pending public booking requests remain visible to the master so they can still
be resolved. They show `Anonymized customer` and no phone or email. The customer
directory and customer-history profile no longer return the anonymized customer.

## Verification

The Supabase integration test covers workspace authorization, retry behavior,
PII removal, pending-request redaction, waiting-list removal, notification
cleanup, token revocation, and retained appointment/payment history. Storage
backups and data retained by external email providers are outside this RPC and
must be covered by the product's separate retention and legal review.
