# Local database restore probe

On 2026-11-02, a disposable Supabase CLI 2.117.0 environment built from main
revision `e555644` was used for a restore probe. Its source contained only the
repository's local demo seed. A PostgreSQL custom-format dump was restored into
a separate empty database on the same disposable database server. No hosted
backup, production data, external provider, or real customer data was used.

## Findings

- A restore of the full database using the local `postgres` role failed when
  creating a Realtime function because the role could not set a server parameter.
  This is an observed local setup limitation, not a statement about hosted plans.
- Creating a dump and restoring it with `--no-acl` changed the anonymous role's
  EXECUTE permission on `get_master_customer_profile(uuid, uuid)` from denied
  to allowed. The number of public/private functions executable by that role
  changed from 205 to 277. Do not use this mode as a safe restoration procedure.
- A second dump and restore preserving owners and ACLs succeeded using the
  disposable server's `supabase_admin` role. The demo workspace, service and
  customer were present, and the two sampled access checks matched the source
  (the profile function remained denied; the function count was 205).

## Boundaries and follow-up

The second database was on the same server and reused its existing roles and
extensions; this is not a clean-server recovery, complete permissions audit,
or proof of hosted backup availability. The local superuser and restore process
must not be assumed available on hosted Supabase. This is not an approved
production restore procedure and does not establish RPO or RTO.

An older snapshot can contain customer information later anonymized and tokens
later revoked. Before restoring actual data, define and test how to reapply
deletions and revoke links created before the restore; restoring a snapshot
alone does not preserve later privacy operations. Validate access controls,
RLS, authentication, booking and financial records in a separately isolated
environment before routing traffic. Complete a synthetic-data restore drill and
a hosted-plan recovery test under SCH-155 before marking the task complete.
