# Integration data retention and recovery inventory

This inventory records repository behavior for SCH-155; it does not assert that
hosted jobs, backups, or provider retention have been configured or verified.

| Data | Current repository behavior | Remaining work |
| --- | --- | --- |
| Booking email outbox and associated private links/webhook events | Terminal records are eligible after 30 days; pending/unconfigured after 90 days. Processing records are retained until finalized. Related link and webhook rows cascade with the outbox. Purged daily by `chvilio-data-retention` (see `pilot-health.md`). | Monitor stale claims (hourly pilot health check). An active external send cannot be ruled out merely by claim age. |
| Appointment access token hashes | Expired or revoked tokens older than 90 days are cleaned when issuing a link for the workspace. | Verify scheduled cleanup for inactive workspaces and preserve active tokens. |
| Service translation requests | Requests older than 12 months before the current UTC month are removed on a later request in that workspace. | Verify cleanup for inactive workspaces while preserving quota calculations. |
| Public booking IP rate-limit rows | Rate limiting reads a five-minute window. Rows older than 1 day are deleted daily by `chvilio-data-retention`. | Confirm the job runs on hosted (pilot health check). |
| Public, manual and recurring booking idempotency requests | Request and response records are kept for replay for 30 days, then deleted daily by `chvilio-data-retention`. | Confirm the job runs on hosted (pilot health check). |
| Platform integration usage and alert records | Used for daily/monthly budget calculations and threshold alerts; no scheduled deletion was found in repository migrations. | Agree on retention without changing current budgets, unsettled reservations or pending alerts. |
| Provider logs and stored backups | External to these database tables. | Verify actual provider policy and hosted backup/export availability separately. |

Appointments and financial history are not retention targets. Changing or
scheduling cleanup in a hosted environment requires a verified backup and a
review of the chosen horizons. For recovery, validate a restore in an isolated
environment, including customer anonymization and revoked links, before making
any claim about the hosted service's achievable RPO or RTO. No hosted restore
or scheduled job is established by this inventory.
