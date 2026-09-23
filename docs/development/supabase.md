# Supabase Development Workflow

## Environments

- Local Supabase runs through Docker and is the default environment for schema development and automated tests.
- The hosted project `schedule-app` (`jakksxrebisudkecednm`) is the shared development and pilot environment.
- Production must use a separate Supabase project when the product is ready for public launch.

Do not use the hosted project for destructive local experiments. Do not commit database passwords, access tokens, or service-role keys.

## Prerequisites

- Docker Desktop is running.
- Node.js matches `.nvmrc`.
- Corepack is enabled.
- Supabase CLI is invoked through the pinned `npx supabase@2.117.0` version used by the repository scripts and CI.

## Local commands

```bash
yarn supabase:start
yarn supabase:status
yarn supabase:reset
yarn supabase:types
yarn supabase:stop
```

`supabase:reset` recreates the local database, applies every committed migration in order, and runs `supabase/seed.sql`. Seed data is fake and local-only.

## Migration rules

1. Every schema change is a new migration in `supabase/migrations/`.
2. Never edit a migration that has already been applied to a shared environment.
3. Test a migration with `yarn supabase:reset` before opening a pull request.
4. Keep schema changes and data backfills in separate migrations.
5. Regenerate `packages/api/src/supabase/database.types.ts` after schema changes.
6. Review generated types together with the migration that produced them.

## Hosted project access

Authenticate locally when hosted project operations are needed:

```bash
npx supabase@2.117.0 login
npx supabase@2.117.0 link --project-ref jakksxrebisudkecednm
```

The login token is managed by the local Supabase CLI and must not be pasted into the repository or chat. Linking is not required for local development.

## Client keys

The mobile and web clients may use only the public project URL and anon/publishable key. A service-role key is server-only and must never be bundled into Expo or Next.js browser code.
## Mobile development

Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set the public Supabase URL and anon key. The mobile app uses Supabase Auth with persistent AsyncStorage sessions. Never put the service-role key in the mobile app.

The first authenticated setup creates the master workspace, booking link, first service, and Monday–Friday availability through the `bootstrap_master_workspace` RPC. The RPC is authenticated and protected by `SECURITY DEFINER`; direct anonymous table access remains disabled.
