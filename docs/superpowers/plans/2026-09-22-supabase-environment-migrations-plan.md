# Supabase Environment and Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the monorepo to Supabase, establish a reproducible local database workflow, and add the first typed PostgreSQL migration foundation without exposing secrets.

**Architecture:** Local Supabase CLI runs the development database through Docker. The hosted free Supabase project is used only as a shared development/pilot environment. Database changes are committed as immutable SQL migrations, and generated TypeScript types are derived from the database schema.

**Tech Stack:** Supabase CLI, Docker, PostgreSQL, SQL migrations, TypeScript, Yarn workspaces, Turborepo.

---

### Task 1: Establish Supabase project and local CLI configuration

**Files:**
- Modify: `supabase/config.toml`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `README.md`
- Create: `docs/development/supabase.md`

- [ ] **Step 1: Confirm the hosted project reference**

Use the existing project reference `jakksxrebisudkecednm`. Never commit access tokens, database passwords, or service-role keys.

- [ ] **Step 2: Add reproducible package scripts**

Add scripts for local Supabase start, stop, reset, status, migration creation, and type generation. Scripts must call the CLI through `npx supabase` until the team standardizes a globally installed CLI.

- [ ] **Step 3: Document local and hosted environments**

Document that local Supabase is the default for development, the hosted free project is shared development/pilot infrastructure, and production will use a separate project later.

- [ ] **Step 4: Verify CLI and Docker prerequisites**

Run `npx supabase --version` and `docker info`. Expected: Supabase CLI prints a version and Docker is reachable.

### Task 2: Add the initial domain migration

**Files:**
- Create: `supabase/migrations/<timestamp>_create_mvp_schema.sql`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Write the migration for the approved SCH-11 model**

Create tables for workspaces, workspace members, services, customers, availability rules and breaks, availability exceptions, booking links, appointments, appointment access tokens, and notification jobs. Use UUID primary keys, `timestamptz` for concrete appointments, `time` for local recurring rules, numeric values for money, foreign keys, check constraints, and updated-at triggers where needed.

- [ ] **Step 2: Add booking integrity constraints**

Enable `btree_gist` and add a partial exclusion constraint preventing overlapping pending or confirmed appointments within the same workspace using the half-open range `[starts_at, ends_at)`.

- [ ] **Step 3: Add indexes from the approved schema**

Add workspace membership, service, customer lookup, appointment, access-token, notification queue, and booking-link indexes. Every index must correspond to a known query or tenant-isolation path.

- [ ] **Step 4: Add safe local seed data**

Seed only deterministic fake data for local development. Do not use real customer information, production identifiers, or credentials.

### Task 3: Add Supabase client and generated database types

**Files:**
- Create: `packages/api/src/supabase/client.ts`
- Create: `packages/api/src/supabase/database.types.ts`
- Modify: `packages/api/package.json`
- Modify: `.env.example`

- [ ] **Step 1: Add the public client dependency**

Add `@supabase/supabase-js` to `@schedule-app/api`. The client must accept the public project URL and anon/publishable key only.

- [ ] **Step 2: Create a typed browser-safe client factory**

Expose a factory that requires `SUPABASE_URL` and the publishable key at runtime and exports the generated `Database` type. Do not expose a secret/service-role client to mobile or web applications.

- [ ] **Step 3: Generate and verify types**

Generate `database.types.ts` from the local schema and document the command used to regenerate it. The generated file must be reproducible and reviewed whenever migrations change.

### Task 4: Validate migrations locally and in CI

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `CONTRIBUTING.md`
- Modify: `README.md`

- [ ] **Step 1: Run the local migration lifecycle**

Run `npx supabase start`, `npx supabase db reset`, `npx supabase status`, and the project typecheck/tests. Expected: migrations apply cleanly, seed data is available, and generated types compile.

- [ ] **Step 2: Validate the database integrity rules**

Add SQL or integration checks proving that a valid appointment can be inserted and an overlapping pending/confirmed appointment is rejected.

- [ ] **Step 3: Add CI checks that do not require production secrets**

CI should start local Supabase, reset the database, and run schema/type checks. Hosted project credentials must not be required for pull requests.

- [ ] **Step 4: Document recovery commands**

Document how a developer resets local state, reapplies migrations, regenerates types, and diagnoses a failed migration.

### Task 5: Review and delivery

- [ ] **Step 1: Run typecheck, lint, tests, build, and migration checks**
- [ ] **Step 2: Run the security review for secrets, RLS boundaries, and unsafe client keys**
- [ ] **Step 3: Perform the structured code review against SCH-46 acceptance criteria**
- [ ] **Step 4: Open the PR and link it to SCH-46**

## Scope notes

This task establishes infrastructure and the initial schema foundation. It does not implement booking UI, authentication flows, final RLS policies, notification delivery, Stripe billing, or production deployment. Those remain separate implementation tasks.
