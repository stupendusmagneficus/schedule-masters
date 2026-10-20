# Backend release (SCH-140)

## Verified inventory · 20 October 2026

Source baseline: `fe3dceb4f371f01e295ddf54ee6cc94dfde56949`.
These observations came from authenticated, read-only Supabase CLI commands and
local client configuration. They are a snapshot, not a permanent health claim.

| Item | Shared development / pilot | Production |
| --- | --- | --- |
| Project | `jakksxrebisudkecednm`, `schedule-app`, eu-west-2 | No separate project visible to the current CLI account |
| Supabase URL | `https://jakksxrebisudkecednm.supabase.co` | Unconfigured |
| Project status | `ACTIVE_HEALTHY` | Unverified |
| Mobile / booking-web local backend | Both match the pilot URL; public keys present; demo disabled | Unconfigured |
| Migrations | All 54 local versions match remote, through `20261027000100` | Unverified |
| Translation function | ACTIVE, version 1, JWT verification enabled | Unverified |
| Booking email worker | Absent; direct route probe returned HTTP 404 | Unverified |
| Provider configuration | `OPENAI_API_KEY`, `RESEND_API_KEY`, `BOOKING_EMAIL_FROM`, `BOOKING_EMAIL_DELIVERY_ENABLED` absent | Unverified |
| Built-in server secrets | Supabase URL, DB URL, anon/service-role and current key sets present; values not recorded | Unverified |
| PostgREST metadata | All 42 direct client RPCs and six required workspace columns present | Unverified |
| Hosted app URLs / build revision | Not established by local configuration | Unverified |
| Auth redirects / SMTP / template | Hosted configuration not yet verified | Unverified |
| Cron / Vault | Not yet verified | Unverified |

Commands: `supabase projects list --output json`, `supabase migration list
--linked`, `supabase functions list --project-ref … --output json`, and
`supabase secrets list --project-ref … --output json`. Record secret **names and
presence only**; never save values or digests in release artifacts.

## Configure the GitHub environments once

Create `pilot` and `production` environments in repository Settings → Environments.
Restrict deployment branches to `main`. Configure required reviewers for
production and prevent self-review where the repository plan supports it. The
workflow references the environment but cannot provision or prove its reviewer
rules. Do not enable production release until those rules have been checked.

Use a separate production Supabase project. The validator rejects using the
shared pilot project as production, and rejects a pilot release targeting another
project. A future pilot project change requires updating the documented constant
in `scripts/deployment/config.mjs` and reviewing the inventory.

Environment variables:

- `SUPABASE_PROJECT_REF`
- `EXPO_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`

Environment secrets:

- `SUPABASE_ACCESS_TOKEN`: deployment account with the smallest available project
  scope; do not use a personal organization owner token when a restricted account
  is available. GitHub's job token has read-only contents/actions permissions.
- `SUPABASE_DB_PASSWORD`: selected project's database password.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only API metadata inspection; never include
  it in a client bundle or command argument.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
  public client credentials, stored here for consistent environment selection.

The deployed clients must use these same values in their own build configuration.
The backend workflow validates the supplied values; it cannot inspect already
published Expo/Next.js bundles. Keep provider keys only in Supabase Function
secrets, outside these client variables.

## Release procedure

1. Merge reviewed changes into `main` and wait for its complete CI run to succeed.
2. Run **Deploy backend** manually on `main` and choose the environment. Production
   must pass the environment's reviewer gate. The workflow requires successful CI
   for the exact commit, validates matching client projects, and serializes releases
   per environment. It never cancels a deployment midway.
3. The workflow links the explicit target, prints a migration dry run, applies
   pending migrations **without seed data**, then deploys both named Edge Functions.
   Both retain JWT verification from `supabase/config.toml`. It does not run a
   database reset, change hosted Auth, configure Cron, or alter provider secrets.
4. The metadata check uses a server credential to check every direct literal RPC
   reference in mobile/booking-web source and the required workspace columns.
   It distinguishes missing schema/cache from HTTP/network errors. Unauthenticated
   function probes must return 401/403. These checks do not execute mutations or
   charge providers. An existing function's internal health and user permissions
   still need real acceptance testing. A gateway may reject a missing function
   before route resolution; verify both names/versions in the release inventory.
The workflow also checks the management inventory: both named functions must be
ACTIVE and have JWT verification enabled, so gateway rejection alone is insufficient.

5. Download the release artifact (commit, migration inventory, function versions).
   Confirm both functions are ACTIVE. Release client builds from this same commit
   using the checked environment values; their hosting/EAS releases are managed
   separately. Do not treat a successful backend workflow as client deployment.
6. Sign in to the real master app, open its real booking slug without `demo=1`,
   and complete the controlled acceptance scenarios from SCH-157. Record the app
   URLs, build revision, workspace and non-sensitive results. A metadata match
   does not prove business behavior or delivery.

Use `yarn deployment:check` to compare `apps/mobile/.env` and
`apps/booking-web/.env` locally (pilot default). It only prints project metadata.
Use `yarn deployment:api` with `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` supplied through a secure process environment for
read-only metadata verification. Do not paste secret values into shell history.
These commands do not load the root `.env`; each app owns its configuration.

## Schema cache or partial release failure

If the metadata check reports missing RPCs/columns after successful migrations,
compare the artifact against the target project's migration history. In the
selected project's SQL editor, an authorized operator can request:

```sql
NOTIFY pgrst, 'reload schema';
```

Retry verification after the cache refresh. Do not replace the real backend with
demo data or silently ignore a missing column. If migrations succeeded but one
function deployment failed, fix/redeploy that function from the same revision,
then repeat verification before releasing clients. The workflow intentionally
stops on failure and does not publish client builds.

## External integrations and rollback

Email delivery stays disabled unless an operator explicitly enables
`BOOKING_EMAIL_DELIVERY_ENABLED=true`. First follow the controlled recipient,
DNS, Vault and Cron checks in [the email runbook](booking-decision-email-production.md)
and SCH-146. Translation provider activation requires SCH-148–150, including
budget limits. Deployment does not enable either provider automatically.

Keep the previous successful client build and function revision. For a function
regression, redeploy its previous reviewed source with the pinned CLI and explicit
project ref after checking compatibility with the current database. The normal
workflow deploys the current `main`; it is not an arbitrary-revision rollback tool.
Roll clients back through the corresponding hosting/EAS delivery system. Disable
external sends or stop the affected Cron job during an email incident, following
the email runbook. Function secrets persist across deployments.

Use forward corrective migrations for a database regression. Never run `db reset`
or automatically reverse migrations against hosted data. Restore from backup only
through the approved incident/restore procedure (SCH-155). Record the last good
revision, affected migrations/functions and verification results in the incident.

References: [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments)
and [Function deployment](https://supabase.com/docs/guides/functions/deploy).
