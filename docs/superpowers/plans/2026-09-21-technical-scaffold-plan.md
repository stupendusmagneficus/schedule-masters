# Technical Scaffold Implementation Plan

## Step 1 — Root workspace and quality tooling

- Add the Yarn 4 workspace manifest, Corepack pin, node-modules linker, Turborepo tasks, ignore rules, linting, and formatting.
- Acceptance: `yarn install --immutable`, typecheck, lint, test, and build are defined at the root.

## Step 2 — Applications

- Add the minimal Expo TypeScript app and Next.js App Router booking web app.
- Acceptance: each app has a documented dev command and a generic health-check surface; neither app imports the other.

## Step 3 — Shared packages

- Add neutral `@schedule-app/*` packages for domain, validation, i18n, api, types, and config.
- Acceptance: explicit package entrypoints exist, domain remains runtime-agnostic, and smoke tests cover the initial contracts.

## Step 4 — Supabase placeholders

- Add CLI configuration, empty migrations/functions directories, seed placeholder, and safe public environment example.
- Acceptance: no product schema, RLS, service-role key, or production credential is committed.

## Step 5 — Documentation and CI

- Document architecture, contribution rules, setup, and the approved Linear decision hub. Add pull-request CI for install, typecheck, lint, test, and build.
- Acceptance: documentation is in English and CI uses the same Yarn commands as local development.

## Step 6 — Verification

- Run the clean-install quality gates, start both health-check surfaces, inspect the diff, scan for secrets, and prepare a PR from a feature branch.
